import type { StandardSchemaV1 } from '@standard-schema/spec'

export interface CoercionResult {
  value: unknown
  coerced: boolean
}

const BOOLEAN_TRUE = new Set(['true', 'yes', '1'])
const BOOLEAN_FALSE = new Set(['false', 'no', '0'])
const BOOLEAN_LITERALS = new Set([...BOOLEAN_TRUE, ...BOOLEAN_FALSE])

const NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/

/**
 * Attempt to coerce a raw CLI string value to match a schema.
 *
 * Pipeline: Boolean → Number → Date → raw string fallback.
 * At each step the transformed value is validated against the schema.
 * If the schema accepts the coerced value we return early; otherwise we
 * try the next coercion. This function never throws — the caller decides
 * how to handle a failed coercion.
 */
export async function coerceValue(
  raw: string | undefined,
  schema: StandardSchemaV1
): Promise<CoercionResult> {
  // undefined means the flag was not provided — let the schema handle defaults
  if (raw === undefined) {
    const result = await schema['~standard'].validate(undefined)
    if (!result.issues) {
      return { value: 'value' in result ? result.value : undefined, coerced: false }
    }
    return { value: undefined, coerced: false }
  }

  // 1. Boolean coercion
  const lower = raw.toLowerCase()
  if (BOOLEAN_LITERALS.has(lower)) {
    const boolValue = BOOLEAN_TRUE.has(lower)
    const result = await schema['~standard'].validate(boolValue)
    if (!result.issues) {
      return { value: 'value' in result ? result.value : boolValue, coerced: true }
    }
  }

  // 2. Number coercion
  if (NUMBER_PATTERN.test(raw)) {
    const numValue = Number(raw)
    if (Number.isFinite(numValue)) {
      const result = await schema['~standard'].validate(numValue)
      if (!result.issues) {
        return { value: 'value' in result ? result.value : numValue, coerced: true }
      }
    }
  }

  // 3. Date coercion
  const dateValue = new Date(raw)
  if (!Number.isNaN(dateValue.getTime())) {
    const result = await schema['~standard'].validate(dateValue)
    if (!result.issues) {
      return { value: 'value' in result ? result.value : dateValue, coerced: true }
    }
  }

  // 4. Raw string fallback
  const result = await schema['~standard'].validate(raw)
  if (!result.issues) {
    return { value: 'value' in result ? result.value : raw, coerced: true }
  }

  // Nothing worked — return raw, not coerced
  return { value: raw, coerced: false }
}

/**
 * Coerce an array of raw CLI string values (for repeatable flags).
 * Each element is coerced individually, then the assembled array is
 * validated against the schema as a whole.
 */
export async function coerceArray(
  rawValues: unknown[],
  schema: StandardSchemaV1
): Promise<CoercionResult> {
  // Try coercion strategies in order of specificity:
  // 1. Boolean coercion (true/false/yes/no/1/0)
  // 2. Number coercion
  // 3. Raw strings

  // Strategy 1: Boolean coercion for all elements
  const boolCoerced = rawValues.map((item) => {
    if (typeof item !== 'string') return item
    const lower = item.toLowerCase()
    if (BOOLEAN_LITERALS.has(lower)) return BOOLEAN_TRUE.has(lower)
    return item
  })
  const boolResult = await schema['~standard'].validate(boolCoerced)
  if (!boolResult.issues) {
    return { value: 'value' in boolResult ? boolResult.value : boolCoerced, coerced: true }
  }

  // Strategy 2: Number coercion for all elements
  const numCoerced = rawValues.map((item) => {
    if (typeof item !== 'string') return item
    if (NUMBER_PATTERN.test(item)) {
      const num = Number(item)
      if (Number.isFinite(num)) return num
    }
    return item
  })
  const numResult = await schema['~standard'].validate(numCoerced)
  if (!numResult.issues) {
    return { value: 'value' in numResult ? numResult.value : numCoerced, coerced: true }
  }

  // Strategy 3: Raw string values
  const rawResult = await schema['~standard'].validate(rawValues)
  if (!rawResult.issues) {
    return { value: 'value' in rawResult ? rawResult.value : rawValues, coerced: false }
  }

  return { value: rawValues, coerced: false }
}
