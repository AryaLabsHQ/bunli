import { join } from 'node:path'
import { StoreValidationError } from './errors.js'
import { readJson, writeJson, deleteJson } from './persistence.js'
import type {
  FieldDef,
  FieldsDef,
  InferStoreConfig,
  StoreOptions,
  StoreInstance,
  StoreUpdater,
} from './types.js'

const DEFAULT_STORE_NAME = 'config'

function resolveStorePath(dirPath: string, name?: string): string {
  const storeName = name ?? DEFAULT_STORE_NAME
  return join(dirPath, `${storeName}.json`)
}

function applyFieldDefaults<F extends FieldsDef>(
  persisted: Record<string, unknown> | undefined,
  fields: F,
  pruneUnknown: boolean,
): InferStoreConfig<F> {
  const result: Record<string, unknown> = {}

  for (const [key, def] of Object.entries(fields)) {
    if (persisted && key in persisted) {
      const value = persisted[key]
      result[key] = Array.isArray(value) ? [...value] : value
    } else if ('default' in def && def.default !== undefined) {
      result[key] = Array.isArray(def.default) ? [...def.default] : def.default
    }
  }

  if (!pruneUnknown && persisted !== undefined) {
    for (const [key, value] of Object.entries(persisted)) {
      if (!(key in fields)) {
        result[key] = Array.isArray(value) ? [...value] : value
      }
    }
  }

  return result as InferStoreConfig<F>
}

function coerceByType(value: unknown, type: FieldDef['type']): unknown {
  if (type === 'number' && typeof value === 'string') {
    const num = Number(value)
    return Number.isNaN(num) ? value : num
  }
  if (type === 'boolean' && typeof value === 'string') {
    if (value === 'true' || value === '1') return true
    if (value === 'false' || value === '0') return false
    return value
  }
  return value
}

function matchesPrimitiveType(value: unknown, type: FieldDef['type']): boolean {
  return typeof value === type
}

function isArrayField(def: FieldDef): def is Extract<FieldDef, { array: true }> {
  return 'array' in def && def.array === true
}

function matchesFieldType(value: unknown, def: FieldDef): boolean {
  if (isArrayField(def)) {
    return Array.isArray(value) && value.every((item) => matchesPrimitiveType(item, def.type))
  }

  return matchesPrimitiveType(value, def.type)
}

function describeFieldType(def: FieldDef): string {
  return isArrayField(def) ? `${def.type}[]` : def.type
}

export function createStore<const F extends FieldsDef>(
  options: StoreOptions<F>,
): StoreInstance<InferStoreConfig<F>> {
  const { dirPath, name, fields, pruneUnknown } = options
  const filePath = resolveStorePath(dirPath, name)
  const shouldPrune = pruneUnknown ?? true

  function normalizeStateTypes(
    state: InferStoreConfig<F>,
  ): InferStoreConfig<F> {
    const record = state as Record<string, unknown>
    const normalized: Record<string, unknown> = { ...record }

    for (const [key, def] of Object.entries(fields)) {
      if (!(key in normalized)) continue
      const value = normalized[key]

      if (isArrayField(def) && Array.isArray(value)) {
        normalized[key] = value.map((item) => coerceByType(item, def.type))
        continue
      }

      normalized[key] = coerceByType(value, def.type)
    }

    return normalized as InferStoreConfig<F>
  }

  async function runFieldValidators(
    state: InferStoreConfig<F>,
  ): Promise<void> {
    const record = state as Record<string, unknown>

    for (const [key, def] of Object.entries(fields)) {
      const value = record[key]
      if (value === undefined) continue

      if (!matchesFieldType(value, def)) {
        throw new StoreValidationError({
          message: `Expected ${describeFieldType(def)} for "${key}"`,
          field: key
        })
      }

      if (!def.validate) continue

      try {
        await def.validate(value as never)
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Validation failed'
        throw new StoreValidationError({ message, field: key, cause })
      }
    }
  }

  async function readRaw(): Promise<InferStoreConfig<F>> {
    const persisted = await readJson(filePath)
    const merged = applyFieldDefaults(
      persisted as Record<string, unknown> | undefined,
      fields,
      shouldPrune,
    )
    return normalizeStateTypes(merged)
  }

  async function read(): Promise<InferStoreConfig<F>> {
    const merged = await readRaw()
    await runFieldValidators(merged)
    return merged
  }

  async function write(config: InferStoreConfig<F>): Promise<void> {
    const normalized = normalizeStateTypes(config)
    await runFieldValidators(normalized)
    await writeJson(filePath, normalized)
  }

  async function update(
    updater: StoreUpdater<InferStoreConfig<F>>,
  ): Promise<void> {
    const current = await readRaw()
    const updated = updater(current)
    const normalized = normalizeStateTypes(updated)
    await runFieldValidators(normalized)
    await writeJson(filePath, normalized)
  }

  async function patch(partial: Partial<InferStoreConfig<F>>): Promise<void> {
    const current = await readRaw()
    const merged = { ...current, ...partial } as InferStoreConfig<F>
    const normalized = normalizeStateTypes(merged)
    await runFieldValidators(normalized)
    await writeJson(filePath, normalized)
  }

  async function reset(): Promise<void> {
    await deleteJson(filePath)
  }

  return { read, write, update, patch, reset }
}
