import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

// Demonstrates complex validation patterns
export default defineCommand({
  name: 'validation',
  description: 'Complex validation examples',
  options: {
    // URL validation
    webhook: option(
      z.string().url('Must be a valid URL'),
      { short: 'w', description: 'Webhook URL' }
    ),
    
    // Custom validation with refine
    password: option(
      z.string()
        .min(8, 'Password must be at least 8 characters')
        .refine(
          (val) => /[A-Z]/.test(val) && /[a-z]/.test(val) && /[0-9]/.test(val),
          'Password must contain uppercase, lowercase, and numbers'
        ),
      { short: 'p', description: 'Secure password' }
    ),
    
    // IP address validation
    host: option(
      z.string().ip({ version: 'v4' }).optional().or(
        z.string().regex(/^localhost$/, 'Must be a valid IPv4 or localhost')
      ),
      { short: 'h', description: 'Host IP address' }
    ),
    
    // Date validation
    startDate: option(
      z.string().regex(
        /^\d{4}-\d{2}-\d{2}$/,
        'Date must be in YYYY-MM-DD format'
      ).refine(
        (val) => !isNaN(Date.parse(val)),
        'Must be a valid date'
      ),
      { short: 'd', description: 'Start date (YYYY-MM-DD)' }
    ),
    
    // Array validation (comma-separated)
    tags: option(
      z.string()
        .transform(val => val.split(',').map(t => t.trim()))
        .pipe(z.array(z.string().min(1)))
        .refine(
          tags => tags.length <= 5,
          'Maximum 5 tags allowed'
        ),
      { short: 't', description: 'Comma-separated tags' }
    )
  },
  
  handler: async ({ flags, colors }) => {
    console.log(colors.bold('Complex Validation Results:'))
    console.log(colors.dim('━'.repeat(50)))
    console.log(`Webhook: ${colors.cyan(flags.webhook)}`)
    console.log(`Password: ${colors.gray('***' + flags.password.slice(-4))}`)
    if (flags.host) {
      console.log(`Host: ${colors.yellow(flags.host)}`)
    }
    console.log(`Start Date: ${colors.green(flags.startDate)}`)
    console.log(`Tags: ${flags.tags.map(t => colors.magenta(t)).join(', ')}`)
    console.log(colors.dim('━'.repeat(50)))
  }
})