import type { PromptOptions, ConfirmOptions, SelectOptions, MultiSelectOptions } from './types.js'
import { colors } from './colors.js'
import { SchemaError } from '@standard-schema/utils'
import { clack, PromptCancelledError } from './prompts/clack.js'

import type { Option as ClackOption } from '@clack/prompts'

function toClackOption<T>(o: { label: string; value: T; hint?: string; disabled?: boolean }): ClackOption<T> {
  if (o.hint !== undefined && o.disabled !== undefined) {
    return ({ value: o.value, label: o.label, hint: o.hint, disabled: o.disabled } as unknown) as ClackOption<T>
  }
  if (o.hint !== undefined) {
    return ({ value: o.value, label: o.label, hint: o.hint } as unknown) as ClackOption<T>
  }
  if (o.disabled !== undefined) {
    return ({ value: o.value, label: o.label, disabled: o.disabled } as unknown) as ClackOption<T>
  }
  return ({ value: o.value, label: o.label } as unknown) as ClackOption<T>
}

function cancelAndThrow(message?: string): never {
  clack.cancel(message ?? 'Cancelled')
  throw new PromptCancelledError(message ?? 'Cancelled')
}

async function validateWithSchema<TOut = unknown>(value: string, options: PromptOptions): Promise<TOut> {
  const result = await options.schema!['~standard'].validate(value)
  if (result.issues) {
    throw new SchemaError(result.issues)
  }
  return result.value as TOut
}

function renderSchemaIssues(error: unknown) {
  if (!(error instanceof SchemaError)) return
  console.error(colors.red('Invalid input:'))
  for (const issue of error.issues) {
    console.error(colors.dim(`  • ${issue.message}`))
  }
  console.error()
}

export async function prompt<T = string>(message: string, options: PromptOptions = {}): Promise<T> {
  while (true) {
    const value = await clack.text({
      message,
      placeholder: options.placeholder,
      defaultValue: options.default,
      validate: options.validate
        ? (v) => {
            const input = (v ?? '').trim()
            const res = options.validate?.(input)
            if (res === true) return undefined
            if (typeof res === 'string') return res
            return 'Invalid input'
          }
        : undefined
    })

    if (clack.isCancel(value)) cancelAndThrow()

    const input = (value ?? '').trim()

    if (options.schema) {
      try {
        return await validateWithSchema<T>(input, options)
      } catch (err) {
        renderSchemaIssues(err)
        continue
      }
    }

    return input as T
  }
}

export async function confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  const value = await clack.confirm({
    message,
    initialValue: options.default
  })
  if (clack.isCancel(value)) cancelAndThrow()
  return value
}

export async function select<T = string>(message: string, options: SelectOptions<T>): Promise<T> {
  const mappedOptions: ClackOption<T>[] = options.options.map((o) =>
    toClackOption<T>({ value: o.value, label: o.label, hint: o.hint, disabled: o.disabled })
  )

  const value = await clack.select<T>({
    message,
    options: mappedOptions,
    initialValue: options.default
  })
  if (clack.isCancel(value)) cancelAndThrow()
  return value
}

export async function multiselect<T = string>(message: string, options: MultiSelectOptions<T>): Promise<T[]> {
  const mappedOptions: ClackOption<T>[] = options.options.map((o) =>
    toClackOption<T>({ value: o.value, label: o.label, hint: o.hint, disabled: o.disabled })
  )

  while (true) {
    const value = await clack.multiselect<T>({
      message,
      options: mappedOptions,
      initialValues: options.initialValues,
      required: (options.min ?? 0) > 0
    })

    if (clack.isCancel(value)) cancelAndThrow()

    const picked = value ?? []
    const min = options.min ?? 0
    const max = options.max

    if (min > 0 && picked.length < min) {
      console.error(colors.red(`Please select at least ${min} option(s).`))
      continue
    }
    if (typeof max === 'number' && picked.length > max) {
      console.error(colors.red(`Please select at most ${max} option(s).`))
      continue
    }

    return picked
  }
}

export async function password<T = string>(message: string, options: PromptOptions = {}): Promise<T> {
  while (true) {
    const value = await clack.password({
      message,
      validate: options.validate
        ? (v) => {
            const input = (v ?? '').trim()
            const res = options.validate?.(input)
            if (res === true) return undefined
            if (typeof res === 'string') return res
            return 'Invalid input'
          }
        : undefined
    })

    if (clack.isCancel(value)) cancelAndThrow()

    const input = (value ?? '').trim()

    if (options.schema) {
      try {
        return await validateWithSchema<T>(input, options)
      } catch (err) {
        renderSchemaIssues(err)
        continue
      }
    }

    return input as T
  }
}
