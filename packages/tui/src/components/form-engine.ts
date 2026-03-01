import type { StandardSchemaV1 } from '@standard-schema/spec'

export type FormErrors = Record<string, string>

export interface FormIssue {
  message: string
  path?: readonly PropertyKey[]
}

export function toFormErrors(issues: readonly FormIssue[]): FormErrors {
  const errors: FormErrors = {}

  for (const issue of issues) {
    const fieldName = Array.isArray(issue.path) && issue.path.length > 0
      ? String(issue.path[0])
      : '_form'

    if (!errors[fieldName]) {
      errors[fieldName] = issue.message
    }
  }

  return errors
}

export type ValidationResult<TValue> =
  | { ok: true; value: TValue; errors: FormErrors }
  | { ok: false; errors: FormErrors; issues: readonly FormIssue[] }

export async function validateFormValues<TSchema extends StandardSchemaV1>(
  schema: TSchema,
  values: unknown
): Promise<ValidationResult<StandardSchemaV1.InferOutput<TSchema>>> {
  const result = await schema['~standard'].validate(values)

  if ('issues' in result && result.issues) {
    const issues = result.issues as readonly FormIssue[]
    return {
      ok: false,
      errors: toFormErrors(issues),
      issues
    }
  }

  if (!('value' in result)) {
    return {
      ok: false,
      errors: { _form: 'Schema validation did not return a value' },
      issues: [{ message: 'Schema validation did not return a value' }]
    }
  }

  return {
    ok: true,
    value: result.value as StandardSchemaV1.InferOutput<TSchema>,
    errors: {}
  }
}
