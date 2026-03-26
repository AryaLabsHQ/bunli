import { readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

export interface FilePickerEntry {
  name: string
  path: string
  isDirectory: boolean
  size?: number
  permissions?: string
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}M`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}G`
}

export function listDirectory(dirPath: string, options: {
  showHidden: boolean
  allowFiles: boolean
  allowDirectories: boolean
  fileExtensions?: string[]
}): FilePickerEntry[] {
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true })

    return entries
      .filter(entry => {
        if (!options.showHidden && entry.name.startsWith('.')) return false

        if (entry.isDirectory()) return options.allowDirectories
        if (!options.allowFiles) return false

        if (options.fileExtensions?.length) {
          return options.fileExtensions.includes(extname(entry.name))
        }
        return true
      })
      .map(entry => {
        const fullPath = join(dirPath, entry.name)
        let size: number | undefined
        let permissions: string | undefined

        try {
          const stat = statSync(fullPath)
          size = stat.size
          permissions = (stat.mode & 0o777).toString(8)
        } catch {}

        return {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          size,
          permissions
        }
      })
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.name.localeCompare(b.name)
      })
  } catch {
    return []
  }
}
