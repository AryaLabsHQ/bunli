import type { StandardSchemaV1 } from '@standard-schema/spec'
import { access, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import { extname } from 'node:path'

export interface FileValidatorOptions {
  mustExist?: boolean
  extensions?: string[]
}

export interface DirectoryValidatorOptions {
  mustExist?: boolean
}

/**
 * Wrap a string schema with file-path validation.
 *
 * The inner schema validates the raw string first (e.g. non-empty, pattern).
 * Then, if `mustExist` is true, an `fs.access` + `fs.stat` check ensures the
 * path exists and is a regular file.  If `extensions` is provided, the file
 * extension is checked against the allow-list.
 */
export function file(
  schema: StandardSchemaV1<string, string>,
  opts?: FileValidatorOptions
): StandardSchemaV1<string, string> {
  const mustExist = opts?.mustExist ?? false
  const extensions = opts?.extensions

  return {
    '~standard': {
      version: 1,
      vendor: 'bunli',
      validate: async (value: unknown) => {
        // Run inner schema first
        const inner = await schema['~standard'].validate(value)
        if (inner.issues) return inner

        const path = ('value' in inner ? inner.value : value) as string

        // Check extension
        if (extensions && extensions.length > 0) {
          const ext = extname(path)
          if (!extensions.includes(ext)) {
            return {
              issues: [{
                message: `File must have one of these extensions: ${extensions.join(', ')}. Got '${ext || '(none)'}'`
              }]
            }
          }
        }

        // Check existence
        if (mustExist) {
          try {
            await access(path, constants.R_OK)
            const stats = await stat(path)
            if (!stats.isFile()) {
              return {
                issues: [{ message: `Path '${path}' exists but is not a file` }]
              }
            }
          } catch {
            return {
              issues: [{ message: `File '${path}' does not exist or is not readable` }]
            }
          }
        }

        return { value: path }
      }
    }
  } as StandardSchemaV1<string, string>
}

/**
 * Wrap a string schema with directory-path validation.
 *
 * The inner schema validates the raw string first.  Then, if `mustExist` is
 * true, an `fs.access` + `fs.stat` check ensures the path exists and is a
 * directory.
 */
export function directory(
  schema: StandardSchemaV1<string, string>,
  opts?: DirectoryValidatorOptions
): StandardSchemaV1<string, string> {
  const mustExist = opts?.mustExist ?? false

  return {
    '~standard': {
      version: 1,
      vendor: 'bunli',
      validate: async (value: unknown) => {
        // Run inner schema first
        const inner = await schema['~standard'].validate(value)
        if (inner.issues) return inner

        const path = ('value' in inner ? inner.value : value) as string

        if (mustExist) {
          try {
            await access(path, constants.R_OK)
            const stats = await stat(path)
            if (!stats.isDirectory()) {
              return {
                issues: [{ message: `Path '${path}' exists but is not a directory` }]
              }
            }
          } catch {
            return {
              issues: [{ message: `Directory '${path}' does not exist or is not readable` }]
            }
          }
        }

        return { value: path }
      }
    }
  } as StandardSchemaV1<string, string>
}
