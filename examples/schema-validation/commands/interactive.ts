import { defineCommand } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'interactive',
  description: 'Interactive prompts with validation using schema option',
  handler: async ({ prompt, colors }) => {
    console.log(colors.bold('🔮 Interactive Form with Validation'))
    console.log(colors.dim('Invalid inputs will show errors and retry automatically'))
    console.log()
    
    // Email validation
    const email = await prompt('Enter your email:', {
      schema: z.string().email('Please enter a valid email address')
    })
    
    // Age validation with custom messages
    const age = await prompt('Enter your age:', {
      schema: z.coerce.number({
        invalid_type_error: 'Age must be a number',
        required_error: 'Age is required'
      })
        .int('Age must be a whole number')
        .min(13, 'You must be at least 13 years old')
        .max(120, 'Please enter a realistic age')
    })
    
    // Website validation (optional)
    const website = await prompt('Enter your website (optional, press enter to skip):', {
      schema: z.union([
        z.string().url('Please enter a valid URL (e.g., https://example.com)'),
        z.literal('')
      ])
    })
    
    // Phone validation with regex
    const phone = await prompt('Enter your phone number (10 digits):', {
      schema: z.string()
        .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits')
        .transform(val => {
          // Format as (xxx) xxx-xxxx
          return `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`
        })
    })
    
    // Username validation
    const username = await prompt('Choose a username:', {
      schema: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username must be at most 20 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
        .transform(val => val.toLowerCase())
    })
    
    // Password validation with schema
    const password = await prompt.password('Choose a password:', {
      schema: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
    })
    
    console.log()
    console.log(colors.green('✅ Registration complete!'))
    console.log()
    console.log(colors.bold('Your information:'))
    console.log(colors.dim('Email:'), email)
    console.log(colors.dim('Age:'), age)
    console.log(colors.dim('Phone:'), phone)
    console.log(colors.dim('Username:'), username)
    console.log(colors.dim('Password:'), '*'.repeat(password.length))
    if (website) {
      console.log(colors.dim('Website:'), website)
    }
  }
})