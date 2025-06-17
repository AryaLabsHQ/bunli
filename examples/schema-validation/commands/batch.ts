import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { validateFields } from '@bunli/utils'

export default defineCommand({
  name: 'batch',
  description: 'Demonstrates batch field validation with aggregated errors',
  options: {
    data: option(
      z.string().describe('JSON data to validate'),
      { short: 'd', description: 'Data to validate in JSON format' }
    )
  },
  handler: async ({ flags, colors, prompt }) => {
    // Define schemas for different fields
    const schemas = {
      name: z.string().min(2, 'Name must be at least 2 characters'),
      email: z.string().email('Invalid email format'),
      age: z.coerce.number().int().positive('Age must be a positive number'),
      website: z.string().url('Invalid URL format').optional(),
      role: z.enum(['admin', 'user', 'guest'], {
        errorMap: () => ({ message: 'Role must be admin, user, or guest' })
      })
    }
    
    let data: Record<string, unknown>
    
    if (flags.data) {
      try {
        data = JSON.parse(flags.data)
      } catch {
        console.error(colors.red('Invalid JSON format'))
        return
      }
    } else {
      // Interactive mode
      console.log(colors.bold('Enter data to validate:'))
      data = {
        name: await prompt('Name:'),
        email: await prompt('Email:'),
        age: await prompt('Age:'),
        website: await prompt('Website (optional):') || undefined,
        role: await prompt('Role (admin/user/guest):')
      }
    }
    
    console.log()
    console.log(colors.bold('Validating fields...'))
    console.log()
    
    const result = await validateFields(schemas, data)
    
    if ('errors' in result) {
      console.log(colors.red('❌ Validation failed:'))
      console.log()
      
      for (const [field, errors] of Object.entries(result.errors)) {
        console.log(colors.yellow(`${field}:`))
        for (const error of errors) {
          console.log(colors.dim(`  • ${error}`))
        }
      }
      
      console.log()
      console.log(colors.dim('Fix the errors above and try again.'))
    } else {
      console.log(colors.green('✅ All fields valid!'))
      console.log()
      console.log(colors.bold('Validated data:'))
      console.log(JSON.stringify(result, null, 2))
    }
  }
})