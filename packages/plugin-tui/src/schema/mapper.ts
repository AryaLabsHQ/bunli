import type { Command, CLIOption } from '@bunli/core'
import type { Renderable } from '@opentui/core'
import { Form } from '../components/Form.js'
import { Input } from '../components/Input.js'
import { Select } from '../components/Select.js'
import { Checkbox } from '../components/Checkbox.js'
import { NumberInput } from '../components/NumberInput.js'
import { Component } from '../components/base/Component.js'
import type { StandardSchemaV1 } from '@standard-schema/spec'

export class SchemaUIMapper {
  async createFormFromCommand(command: Command): Promise<Form> {
    const form = new Form({
      id: `${command.name}-form`,
      title: command.name,
      description: command.description
    })
    
    if (!command.options) {
      return form
    }
    
    // Map each option to a form field
    for (const [name, option] of Object.entries(command.options)) {
      const field = await this.mapOptionToField(name, option as CLIOption)
      form.addField(field)
    }
    
    return form
  }
  
  private async mapOptionToField(name: string, option: CLIOption): Promise<Component> {
    const schema = option.schema
    const metadata = {
      id: name,
      name,
      label: option.description || name,
      required: !this.isOptional(schema)
    }
    
    // Detect schema type and create appropriate component
    if (this.isStringSchema(schema)) {
      const constraints = this.getStringConstraints(schema)
      return new Input({
        ...metadata,
        placeholder: `Enter ${name}...`,
        maxLength: constraints.maxLength,
        minLength: constraints.minLength,
        pattern: constraints.pattern
      })
    }
    
    if (this.isBooleanSchema(schema)) {
      return new Checkbox({
        ...metadata,
        defaultValue: this.getDefault(schema) ?? false
      })
    }
    
    if (this.isNumberSchema(schema)) {
      const constraints = this.getNumberConstraints(schema)
      return new NumberInput({
        ...metadata,
        min: constraints.min,
        max: constraints.max,
        step: constraints.step,
        defaultValue: this.getDefault(schema)
      })
    }
    
    if (this.isEnumSchema(schema)) {
      const values = this.getEnumValues(schema)
      return new Select({
        ...metadata,
        options: values.map(value => ({
          label: value,
          value
        })),
        defaultValue: this.getDefault(schema)
      })
    }
    
    // Default to text input for unknown types
    return new Input({
      ...metadata,
      placeholder: `Enter ${name}...`
    })
  }
  
  // Schema detection methods for Zod schemas
  private isOptional(schema: any): boolean {
    // Handle Zod optional/nullable types
    if (schema._def) {
      const typeName = schema._def.typeName
      return typeName === 'ZodOptional' || 
             typeName === 'ZodNullable' ||
             (schema._def.defaultValue !== undefined)
    }
    
    // Handle standard schema
    if (schema['~standard'] && schema['~standard'].optional) {
      return true
    }
    
    return false
  }
  
  private isStringSchema(schema: any): boolean {
    if (schema._def?.typeName === 'ZodString') return true
    if (schema._def?.innerType?._def?.typeName === 'ZodString') return true
    return false
  }
  
  private isBooleanSchema(schema: any): boolean {
    if (schema._def?.typeName === 'ZodBoolean') return true
    if (schema._def?.innerType?._def?.typeName === 'ZodBoolean') return true
    return false
  }
  
  private isNumberSchema(schema: any): boolean {
    if (schema._def?.typeName === 'ZodNumber') return true
    if (schema._def?.innerType?._def?.typeName === 'ZodNumber') return true
    return false
  }
  
  private isEnumSchema(schema: any): boolean {
    if (schema._def?.typeName === 'ZodEnum') return true
    if (schema._def?.innerType?._def?.typeName === 'ZodEnum') return true
    return false
  }
  
  private getDefault(schema: any): any {
    // Check for Zod default
    if (schema._def?.defaultValue !== undefined) {
      return typeof schema._def.defaultValue === 'function' 
        ? schema._def.defaultValue() 
        : schema._def.defaultValue
    }
    
    // Check inner type for optional schemas
    if (schema._def?.innerType?._def?.defaultValue !== undefined) {
      const defaultValue = schema._def.innerType._def.defaultValue
      return typeof defaultValue === 'function' ? defaultValue() : defaultValue
    }
    
    return undefined
  }
  
  private getEnumValues(schema: any): string[] {
    // Direct enum
    if (schema._def?.values) {
      return schema._def.values
    }
    
    // Optional enum
    if (schema._def?.innerType?._def?.values) {
      return schema._def.innerType._def.values
    }
    
    return []
  }
  
  private getStringConstraints(schema: any): {
    minLength?: number
    maxLength?: number
    pattern?: string
  } {
    const constraints: any = {}
    
    // Get the actual schema (might be wrapped in optional)
    const actualSchema = schema._def?.innerType || schema
    
    if (actualSchema._def?.checks) {
      for (const check of actualSchema._def.checks) {
        switch (check.kind) {
          case 'min':
            constraints.minLength = check.value
            break
          case 'max':
            constraints.maxLength = check.value
            break
          case 'regex':
            constraints.pattern = check.regex.source
            break
        }
      }
    }
    
    return constraints
  }
  
  private getNumberConstraints(schema: any): {
    min?: number
    max?: number
    step?: number
  } {
    const constraints: any = {}
    
    // Get the actual schema (might be wrapped in optional)
    const actualSchema = schema._def?.innerType || schema
    
    if (actualSchema._def?.checks) {
      for (const check of actualSchema._def.checks) {
        switch (check.kind) {
          case 'min':
            constraints.min = check.value
            break
          case 'max':
            constraints.max = check.value
            break
          case 'int':
            constraints.step = 1
            break
        }
      }
    }
    
    return constraints
  }
}