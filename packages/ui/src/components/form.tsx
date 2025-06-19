/**
 * Form component with progressive disclosure
 */

import React, { useState, useEffect, useRef } from 'react'
import { Box, Text, Column } from '@bunli/renderer'
import { PromptInput, PromptConfirm, PromptSelect } from './prompt.js'
import type { StandardSchemaV1 } from '@standard-schema/spec'

export interface FormField {
  name: string
  type: 'text' | 'password' | 'confirm' | 'select'
  message: string
  defaultValue?: any
  schema?: StandardSchemaV1
  options?: Array<{ value: any; label: string; hint?: string }>
  when?: (values: Record<string, any>) => boolean
}

export interface ProgressiveFormProps {
  /**
   * Form fields
   */
  fields: FormField[]
  /**
   * Called when form is submitted
   */
  onSubmit?: (values: Record<string, any>) => void
  /**
   * Called when form is cancelled
   */
  onCancel?: () => void
  /**
   * Form title
   */
  title?: string
  /**
   * Form description
   */
  description?: string
}

export function ProgressiveForm({
  fields,
  onSubmit,
  onCancel,
  title,
  description
}: ProgressiveFormProps) {
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0)
  const [values, setValues] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tempValue, setTempValue] = useState('')
  
  // Find next visible field
  const findNextField = (fromIndex: number): number => {
    for (let i = fromIndex; i < fields.length; i++) {
      const field = fields[i]
      if (field && (!field.when || field.when(values))) {
        return i
      }
    }
    return fields.length
  }
  
  // Reset temp value when moving to a new field
  useEffect(() => {
    setTempValue('')
  }, [currentFieldIndex])
  
  const currentField = fields[currentFieldIndex]
  const isVisible = !currentField?.when || currentField.when(values)
  
  // Skip to next visible field if current is hidden
  useEffect(() => {
    if (currentField && !isVisible) {
      const nextIndex = findNextField(currentFieldIndex + 1)
      if (nextIndex < fields.length) {
        setCurrentFieldIndex(nextIndex)
      } else {
        // All fields complete
        onSubmit?.(values)
      }
    }
  }, [currentFieldIndex, isVisible, values])
  
  const handleFieldSubmit = (value: any) => {
    if (!currentField) return
    
    // Save value
    setValues(prev => ({ ...prev, [currentField.name]: value }))
    setTempValue('')
    
    // Move to next field
    const nextIndex = findNextField(currentFieldIndex + 1)
    if (nextIndex < fields.length) {
      setCurrentFieldIndex(nextIndex)
    } else {
      // All fields complete
      onSubmit?.({ ...values, [currentField.name]: value })
    }
  }
  
  // Render completed fields
  const completedFields = fields.slice(0, currentFieldIndex).filter(
    field => !field.when || field.when(values)
  )
  
  return (
    <Column gap={1}>
      {title && (
        <Box style={{ marginBottom: 1 }}>
          <Text style={{ bold: true, color: 'magenta' }}>📋 {title}</Text>
          {description && (
            <Text style={{ dim: true }}>{description}</Text>
          )}
        </Box>
      )}
      
      {/* Show completed fields */}
      {completedFields.map(field => {
        const value = values[field.name]
        let displayValue = value
        
        if (field.type === 'password') {
          displayValue = '•'.repeat(value?.length || 0)
        } else if (field.type === 'confirm') {
          displayValue = value ? 'yes' : 'no'
        } else if (field.type === 'select' && field.options) {
          const option = field.options.find(o => o.value === value)
          displayValue = option?.label || value
        }
        
        return (
          <Text key={field.name} style={{ dim: true }}>
            {field.message} {displayValue}
          </Text>
        )
      })}
      
      {/* Current field */}
      {currentField && isVisible && (
        <Box key={currentField.name}>
          {currentField.type === 'text' && (
            <PromptInput
              message={currentField.message}
              value={tempValue}
              onChange={setTempValue}
              onSubmit={handleFieldSubmit}
              defaultValue={currentField.defaultValue}
              schema={currentField.schema}
              error={errors[currentField.name]}
              autoFocus
            />
          )}
          
          {currentField.type === 'password' && (
            <PromptInput
              message={currentField.message}
              value={tempValue}
              onChange={setTempValue}
              onSubmit={handleFieldSubmit}
              schema={currentField.schema}
              error={errors[currentField.name]}
              password
              autoFocus
            />
          )}
          
          {currentField.type === 'confirm' && (
            <PromptConfirm
              message={currentField.message}
              defaultValue={currentField.defaultValue}
              onConfirm={handleFieldSubmit}
              autoFocus
            />
          )}
          
          {currentField.type === 'select' && currentField.options && (
            <PromptSelect
              message={currentField.message}
              options={currentField.options}
              onSelect={handleFieldSubmit}
              autoFocus
            />
          )}
        </Box>
      )}
    </Column>
  )
}

/**
 * Simple form that shows all fields at once
 */
export interface SimpleFormProps {
  /**
   * Form fields
   */
  fields: FormField[]
  /**
   * Form values
   */
  values: Record<string, any>
  /**
   * Called when a value changes
   */
  onChange: (name: string, value: any) => void
  /**
   * Field errors
   */
  errors?: Record<string, string>
  /**
   * Currently focused field
   */
  focusedField?: string
}

export function SimpleForm({
  fields,
  values,
  onChange,
  errors = {},
  focusedField
}: SimpleFormProps) {
  return (
    <Column gap={2}>
      {fields.map(field => {
        const isVisible = !field.when || field.when(values)
        if (!isVisible) return null
        
        const isFocused = focusedField === field.name
        
        return (
          <Box key={field.name}>
            {field.type === 'text' && (
              <PromptInput
                message={field.message}
                value={values[field.name] || ''}
                onChange={value => onChange(field.name, value)}
                defaultValue={field.defaultValue}
                schema={field.schema}
                error={errors[field.name]}
                autoFocus={isFocused}
              />
            )}
            
            {field.type === 'password' && (
              <PromptInput
                message={field.message}
                value={values[field.name] || ''}
                onChange={value => onChange(field.name, value)}
                schema={field.schema}
                error={errors[field.name]}
                password
                autoFocus={isFocused}
              />
            )}
            
            {field.type === 'select' && field.options && (
              <Box>
                <Text>{field.message}</Text>
                {field.options.map((option, i) => {
                  const isSelected = values[field.name] === option.value
                  return (
                    <Text key={i} style={{ 
                      color: isSelected ? 'cyan' : undefined,
                      dim: !isSelected
                    }}>
                      {isSelected ? '❯' : ' '} {option.label}
                    </Text>
                  )
                })}
              </Box>
            )}
          </Box>
        )
      })}
    </Column>
  )
}