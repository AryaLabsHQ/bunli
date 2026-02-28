import { useCallback, useEffect, useMemo, useState } from 'react'
import { useKeyboard } from '@opentui/react'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import { FormContext, type FormFieldRegistration } from './form-context.js'
import { validateFormValues, type FormErrors } from './form-engine.js'

export interface FormProps<TSchema extends StandardSchemaV1 = StandardSchemaV1> {
  title: string
  schema: TSchema
  onSubmit: (values: StandardSchemaV1.InferOutput<TSchema>) => void | Promise<void>
  onCancel?: () => void
  onValidationError?: (errors: FormErrors) => void
  initialValues?: Partial<StandardSchemaV1.InferOutput<TSchema>>
  validateOnChange?: boolean
  submitHint?: string
  children: React.ReactNode
}

type KeyboardState = {
  name?: string
  shift?: boolean
  ctrl?: boolean
}

export function Form<TSchema extends StandardSchemaV1>({
  title,
  schema,
  onSubmit,
  onCancel,
  onValidationError,
  initialValues,
  validateOnChange = true,
  submitHint,
  children
}: FormProps<TSchema>) {
  const [values, setValues] = useState<Record<string, unknown>>(
    () => ({ ...(initialValues as Record<string, unknown> | undefined) })
  )
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [fieldOrder, setFieldOrder] = useState<string[]>([])
  const [fieldMeta, setFieldMeta] = useState<Record<string, FormFieldRegistration>>({})
  const [focusIndex, setFocusIndex] = useState(0)

  const activeFieldName = fieldOrder[focusIndex] ?? null

  useEffect(() => {
    setFocusIndex((prev) => {
      if (fieldOrder.length === 0) return 0
      return Math.min(prev, fieldOrder.length - 1)
    })
  }, [fieldOrder])

  const registerField = useCallback((field: FormFieldRegistration) => {
    setFieldMeta((prev) => {
      if (prev[field.name]) return prev
      return { ...prev, [field.name]: field }
    })

    setFieldOrder((prev) => {
      if (prev.includes(field.name)) return prev
      return [...prev, field.name]
    })

    if (field.defaultValue !== undefined) {
      setValues((prev) => {
        if (prev[field.name] !== undefined) return prev
        return { ...prev, [field.name]: field.defaultValue }
      })
    }
  }, [])

  const unregisterField = useCallback((name: string) => {
    setFieldMeta((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })

    setFieldOrder((prev) => prev.filter((fieldName) => fieldName !== name))
    setTouched((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
    setErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }, [])

  const runValidation = useCallback(
    async (nextValues: Record<string, unknown>, notify: boolean) => {
      const result = await validateFormValues(schema, nextValues)
      if (result.ok) {
        setErrors({})
        return result
      }

      setErrors(result.errors)
      if (notify) {
        onValidationError?.(result.errors)
      }
      return result
    },
    [schema, onValidationError]
  )

  const setFieldValue = useCallback(
    (name: string, value: unknown) => {
      setValues((prev) => {
        const nextValues = { ...prev, [name]: value }
        if (validateOnChange) {
          void runValidation(nextValues, false)
        }
        return nextValues
      })
      setTouched((prev) => ({ ...prev, [name]: true }))
    },
    [runValidation, validateOnChange]
  )

  const markTouched = useCallback((name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }))
  }, [])

  const submit = useCallback(() => {
    void (async () => {
      const result = await runValidation(values, true)
      if (!result.ok) return
      await onSubmit(result.value as StandardSchemaV1.InferOutput<TSchema>)
    })()
  }, [onSubmit, runValidation, values])

  const focusField = useCallback((name: string) => {
    const idx = fieldOrder.indexOf(name)
    if (idx >= 0) {
      setFocusIndex(idx)
    }
  }, [fieldOrder])

  useKeyboard((rawKey) => {
    const key = rawKey as KeyboardState
    if (key.name === 'escape') {
      onCancel?.()
      return
    }

    if (key.name === 'tab') {
      if (fieldOrder.length === 0) return
      setFocusIndex((prev) => {
        const delta = key.shift ? -1 : 1
        const next = prev + delta
        if (next < 0) return fieldOrder.length - 1
        if (next >= fieldOrder.length) return 0
        return next
      })
      return
    }

    if (key.ctrl && key.name === 's') {
      submit()
      return
    }

    if (key.name === 'enter') {
      if (activeFieldName) {
        const activeField = fieldMeta[activeFieldName]
        if (activeField?.submitOnEnter === false) return
      }
      submit()
    }
  })

  const contextValue = useMemo(
    () => ({
      values,
      errors,
      touched,
      activeFieldName,
      registerField,
      unregisterField,
      setFieldValue,
      markTouched,
      focusField
    }),
    [activeFieldName, errors, focusField, markTouched, registerField, setFieldValue, touched, unregisterField, values]
  )

  return (
    <FormContext.Provider value={contextValue}>
      <box title={title} border padding={2} style={{ flexDirection: 'column' }}>
        {children}
        <box style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
          {errors._form ? (
            <text content={`Validation error: ${errors._form}`} fg="#ff7675" />
          ) : (
            <text content={submitHint ?? 'Tab: next field | Enter: submit | Esc: cancel | Ctrl+S: submit'} />
          )}
        </box>
      </box>
    </FormContext.Provider>
  )
}
