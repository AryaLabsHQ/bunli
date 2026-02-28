import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import { FormContext, type FormFieldRegistration } from './form-context.js'
import { useScopedKeyboard } from './focus-scope.js'
import { validateFormValues, type FormErrors } from './form-engine.js'
import { createKeyMatcher } from './keymap.js'
import { useTuiTheme } from './theme.js'

export interface FormProps<TSchema extends StandardSchemaV1 = StandardSchemaV1> {
  title: string
  schema: TSchema
  onSubmit: (values: StandardSchemaV1.InferOutput<TSchema>) => void | Promise<void>
  onCancel?: () => void
  onReset?: () => void
  onValidationError?: (errors: FormErrors) => void
  onDirtyChange?: (isDirty: boolean, dirtyFields: string[]) => void
  onSubmitStateChange?: (state: { isSubmitting: boolean; isValidating: boolean }) => void
  initialValues?: Partial<StandardSchemaV1.InferOutput<TSchema>>
  validateOnChange?: boolean
  submitHint?: string
  resetHint?: string
  scopeId?: string
  children: React.ReactNode
}

const formKeymap = createKeyMatcher({
  cancel: ['escape'],
  nextField: ['tab'],
  previousField: ['shift+tab'],
  submitShortcut: ['ctrl+s'],
  resetShortcut: ['ctrl+r'],
  nextError: ['f8'],
  previousError: ['shift+f8'],
  submit: ['enter']
})

function areValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true

  if (
    typeof left === 'object' &&
    left !== null &&
    typeof right === 'object' &&
    right !== null
  ) {
    try {
      return JSON.stringify(left) === JSON.stringify(right)
    } catch {
      return false
    }
  }

  return false
}

export function Form<TSchema extends StandardSchemaV1>({
  title,
  schema,
  onSubmit,
  onCancel,
  onReset,
  onValidationError,
  onDirtyChange,
  onSubmitStateChange,
  initialValues,
  validateOnChange = true,
  submitHint,
  resetHint,
  scopeId,
  children
}: FormProps<TSchema>) {
  const { tokens } = useTuiTheme()
  const keyboardScopeId = scopeId ?? `form:${title}`
  const initialValuesRef = useRef<Record<string, unknown>>({
    ...(initialValues as Record<string, unknown> | undefined)
  })

  const [values, setValues] = useState<Record<string, unknown>>(
    () => ({ ...initialValuesRef.current })
  )
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [fieldDefaults, setFieldDefaults] = useState<Record<string, unknown>>({})
  const [fieldOrder, setFieldOrder] = useState<string[]>([])
  const [fieldMeta, setFieldMeta] = useState<Record<string, FormFieldRegistration>>({})
  const [focusIndex, setFocusIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

  const activeFieldName = fieldOrder[focusIndex] ?? null

  useEffect(() => {
    setFocusIndex((prev) => {
      if (fieldOrder.length === 0) return 0
      return Math.min(prev, fieldOrder.length - 1)
    })
  }, [fieldOrder])

  const baselineValues = useMemo(
    () => ({ ...fieldDefaults, ...initialValuesRef.current }),
    [fieldDefaults]
  )

  const dirtyFields = useMemo(() => {
    const keys = new Set<string>([
      ...Object.keys(baselineValues),
      ...Object.keys(values)
    ])

    const next: Record<string, boolean> = {}
    for (const key of keys) {
      next[key] = !areValuesEqual(values[key], baselineValues[key])
    }
    return next
  }, [baselineValues, values])

  const isDirty = useMemo(
    () => Object.values(dirtyFields).some(Boolean),
    [dirtyFields]
  )

  useEffect(() => {
    onDirtyChange?.(
      isDirty,
      Object.entries(dirtyFields)
        .filter(([, dirty]) => dirty)
        .map(([name]) => name)
    )
  }, [dirtyFields, isDirty, onDirtyChange])

  useEffect(() => {
    onSubmitStateChange?.({ isSubmitting, isValidating })
  }, [isSubmitting, isValidating, onSubmitStateChange])

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
      setFieldDefaults((prev) => {
        if (prev[field.name] !== undefined) return prev
        return { ...prev, [field.name]: field.defaultValue }
      })

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
      setIsValidating(true)
      try {
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
      } finally {
        setIsValidating(false)
      }
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

  const focusField = useCallback((name: string) => {
    const idx = fieldOrder.indexOf(name)
    if (idx >= 0) {
      setFocusIndex(idx)
    }
  }, [fieldOrder])

  const getErrorFields = useCallback((): string[] => {
    return fieldOrder.filter((name) => Boolean(errors[name]))
  }, [errors, fieldOrder])

  const focusFirstErrorField = useCallback(
    (nextErrors: FormErrors) => {
      const firstInOrder = fieldOrder.find((name) => Boolean(nextErrors[name]))
      if (firstInOrder) {
        focusField(firstInOrder)
        return
      }

      const fallback = Object.keys(nextErrors).find((name) => name !== '_form')
      if (fallback) {
        focusField(fallback)
      }
    },
    [fieldOrder, focusField]
  )

  const submit = useCallback(() => {
    void (async () => {
      const result = await runValidation(values, true)
      if (!result.ok) {
        focusFirstErrorField(result.errors)
        return
      }

      setIsSubmitting(true)
      try {
        await onSubmit(result.value as StandardSchemaV1.InferOutput<TSchema>)
      } finally {
        setIsSubmitting(false)
      }
    })()
  }, [focusFirstErrorField, onSubmit, runValidation, values])

  const reset = useCallback(() => {
    const nextValues = { ...baselineValues }
    setValues(nextValues)
    setTouched({})
    setErrors({})
    setFocusIndex(0)
    onReset?.()
  }, [baselineValues, onReset])

  const jumpToNextError = useCallback(() => {
    const errorFields = getErrorFields()
    if (errorFields.length === 0) return

    if (!activeFieldName) {
      focusField(errorFields[0] ?? '')
      return
    }

    const currentIndex = errorFields.indexOf(activeFieldName)
    const next = errorFields[(currentIndex + 1 + errorFields.length) % errorFields.length]
    if (next) {
      focusField(next)
    }
  }, [activeFieldName, focusField, getErrorFields])

  const jumpToPreviousError = useCallback(() => {
    const errorFields = getErrorFields()
    if (errorFields.length === 0) return

    if (!activeFieldName) {
      focusField(errorFields[errorFields.length - 1] ?? '')
      return
    }

    const currentIndex = errorFields.indexOf(activeFieldName)
    const prev = errorFields[(currentIndex - 1 + errorFields.length) % errorFields.length]
    if (prev) {
      focusField(prev)
    }
  }, [activeFieldName, focusField, getErrorFields])

  useScopedKeyboard(
    keyboardScopeId,
    (key) => {
      if (formKeymap.match('cancel', key)) {
        onCancel?.()
        return true
      }

      if (formKeymap.match('nextField', key) || formKeymap.match('previousField', key)) {
        if (fieldOrder.length === 0) return
        setFocusIndex((prev) => {
          const delta = formKeymap.match('previousField', key) ? -1 : 1
          const next = prev + delta
          if (next < 0) return fieldOrder.length - 1
          if (next >= fieldOrder.length) return 0
          return next
        })
        return true
      }

      if (formKeymap.match('submitShortcut', key)) {
        submit()
        return true
      }

      if (formKeymap.match('resetShortcut', key)) {
        reset()
        return true
      }

      if (formKeymap.match('previousError', key)) {
        jumpToPreviousError()
        return true
      }

      if (formKeymap.match('nextError', key)) {
        jumpToNextError()
        return true
      }

      if (formKeymap.match('submit', key)) {
        if (activeFieldName) {
          const activeField = fieldMeta[activeFieldName]
          if (activeField?.submitOnEnter === false) return false
        }
        submit()
        return true
      }

      return false
    },
    { active: true, priority: 10 }
  )

  const footerMessage = useMemo(() => {
    if (isSubmitting) return 'Submitting...'
    if (isValidating) return 'Validating...'
    if (errors._form) return `Validation error: ${errors._form}`
    if (submitHint) return submitHint

    const dirtyLabel = isDirty ? 'dirty' : 'clean'
    return `Tab: next field | Enter: submit | Esc: cancel | Ctrl+S: submit | Ctrl+R: reset (${dirtyLabel}) | F8: next error`
  }, [errors._form, isDirty, isSubmitting, isValidating, submitHint])

  const contextValue = useMemo(
    () => ({
      values,
      errors,
      touched,
      dirtyFields,
      isDirty,
      isSubmitting,
      isValidating,
      keyboardScopeId,
      activeFieldName,
      registerField,
      unregisterField,
      setFieldValue,
      markTouched,
      focusField,
      submit,
      reset,
      getErrorFields,
      jumpToNextError,
      jumpToPreviousError
    }),
    [
      activeFieldName,
      dirtyFields,
      errors,
      focusField,
      getErrorFields,
      isDirty,
      isSubmitting,
      isValidating,
      jumpToNextError,
      jumpToPreviousError,
      keyboardScopeId,
      markTouched,
      registerField,
      reset,
      setFieldValue,
      submit,
      touched,
      unregisterField,
      values
    ]
  )

  return (
    <FormContext.Provider value={contextValue}>
      <box
        title={title}
        border
        padding={2}
        style={{
          flexDirection: 'column',
          borderColor: tokens.border,
          backgroundColor: tokens.background
        }}
      >
        {children}
        <box style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
          <text
            content={footerMessage}
            fg={errors._form ? tokens.textDanger : isDirty ? tokens.accent : tokens.textMuted}
          />
          {resetHint ? <text content={resetHint} fg={tokens.textMuted} /> : null}
        </box>
      </box>
    </FormContext.Provider>
  )
}
