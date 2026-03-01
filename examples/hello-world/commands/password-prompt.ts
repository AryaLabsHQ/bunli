import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'password-prompt' as const,
  description: 'Standard-buffer password prompt demo (clack-like inline flow)',
  options: {
    minLength: option(
      z.coerce.number().int().positive().default(8),
      { short: 'm', description: 'Minimum password length' }
    ),
    confirm: option(
      z.coerce.boolean().default(true),
      { short: 'c', description: 'Require password confirmation' }
    )
  },
  handler: async ({ prompt, colors, flags }) => {
    prompt.intro('Standard Buffer Password Prompt')
    prompt.note(
      'This flow runs in the standard terminal buffer.\nPassword entry uses canonical no-echo mode for terminal secure-input compatibility when available.',
      'Tip'
    )

    const username = await prompt.text('Username:', {
      default: 'deploy-bot',
      validate: (value) => value.trim().length >= 2 || 'Username must be at least 2 characters'
    })

    const password = await prompt.password('Password / token:', {
      validate: (value) =>
        value.length >= flags.minLength || `Password must be at least ${flags.minLength} characters`
    })

    if (flags.confirm) {
      await prompt.password('Confirm password:', {
        validate: (value) => value === password || 'Passwords do not match'
      })
    }

    const remember = await prompt.confirm('Remember for this session?', { default: false })

    const masked = '*'.repeat(password.length)
    prompt.note(
      [
        `Username: ${username}`,
        `Secret: ${masked}`,
        `Length: ${password.length}`,
        `Confirm: ${flags.confirm ? 'enabled' : 'disabled'}`,
        `Remember: ${remember ? 'yes' : 'no'}`
      ].join('\n'),
      'Captured Input'
    )

    prompt.outro(`Credential captured for ${colors.cyan(username)}`)
  }
})
