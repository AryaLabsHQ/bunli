import { createContext, useCallback, useContext, useEffect } from 'react'
import type { FormErrors } from './form-engine.js'

export interface FormFieldRegistration {
  name: string
  defaultValue?: unknown
  submitOnEnter?: boolean
}

export interface FormContextValue {
  values: Record<string, unknown>
  errors: FormErrors
  touched: Record<string, boolean>
  activeFieldName: string | null
  registerField: (field: FormFieldRegistration) => void
  unregisterField: (name: string) => void
  setFieldValue: (name: string, value: unknown) => void
  markTouched: (name: string) => void
  focusField: (name: string) => void
}

export const FormContext = createContext<FormContextValue | null>(null)

export function useFormContext(): FormContextValue {
  const context = useContext(FormContext)
  if (!context) {
    throw new Error('Interactive form fields must be rendered inside <Form>.')
  }
  return context
}

export interface UseFormFieldOptions<T> {
  defaultValue?: T
  submitOnEnter?: boolean
}

export interface UseFormFieldResult<T> {
  value: T
  error?: string
  touched: boolean
  focused: boolean
  setValue: (value: T) => void
  focus: () => void
  blur: () => void
}

export function useFormField<T = unknown>(
  name: string,
  options: UseFormFieldOptions<T> = {}
): UseFormFieldResult<T> {
  const context = useFormContext()

  useEffect(() => {
    context.registerField({
      name,
      defaultValue: options.defaultValue,
      submitOnEnter: options.submitOnEnter
    })

    return () => {
      context.unregisterField(name)
    }
  }, [context, name, options.defaultValue, options.submitOnEnter])

  const setValue = useCallback(
    (value: T) => {
      context.setFieldValue(name, value)
    },
    [context, name]
  )

  const focus = useCallback(() => {
    context.focusField(name)
  }, [context, name])

  const blur = useCallback(() => {
    context.markTouched(name)
  }, [context, name])

  const value = (context.values[name] ?? options.defaultValue ?? '') as T

  return {
    value,
    error: context.errors[name],
    touched: Boolean(context.touched[name]),
    focused: context.activeFieldName === name,
    setValue,
    focus,
    blur
  }
}
