import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

// Demonstrates basic type validation and coercion
export default defineCommand({
  name: 'basic',
  description: 'Basic type validation examples',
  options: {
    // String with length validation
    username: option(
      z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username cannot exceed 20 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
      { short: 'u', description: 'Your username' }
    ),
    
    // Number with range validation
    age: option(
      z.coerce.number()
        .int('Age must be a whole number')
        .min(1, 'Age must be at least 1')
        .max(150, 'Age must be realistic'),
      { short: 'a', description: 'Your age' }
    ),
    
    // Boolean with coercion
    subscribe: option(
      z.coerce.boolean().default(false),
      { short: 's', description: 'Subscribe to newsletter' }
    ),
    
    // Enum validation
    role: option(
      z.enum(['admin', 'user', 'guest']).default('user'),
      { short: 'r', description: 'User role' }
    ),
    
    // Optional with validation
    email: option(
      z.string().email('Invalid email format').optional(),
      { short: 'e', description: 'Email address (optional)' }
    )
  },
  
  handler: async ({ flags, colors }) => {
    console.log(colors.bold('Validated Input:'))
    console.log(colors.dim('━'.repeat(40)))
    console.log(`Username: ${colors.cyan(flags.username)}`)
    console.log(`Age: ${colors.yellow(flags.age.toString())}`)
    console.log(`Role: ${colors.magenta(flags.role)}`)
    console.log(`Subscribe: ${flags.subscribe ? colors.green('Yes') : colors.red('No')}`)
    if (flags.email) {
      console.log(`Email: ${colors.blue(flags.email)}`)
    }
    console.log(colors.dim('━'.repeat(40)))
  }
})