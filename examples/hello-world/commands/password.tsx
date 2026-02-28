import { defineCommand, option } from '@bunli/core'
import {
  Card,
  Container,
  Form,
  Input,
  KeyValueList,
  PasswordField,
  SectionHeader,
  ThemeProvider,
  useKeyboard,
  useRenderer
} from '@bunli/tui/interactive'
import { useState } from 'react'
import { z } from 'zod'

type ThemeMode = 'dark' | 'light'

const credentialsSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

function PasswordScreen({ theme }: { theme: ThemeMode }) {
  const renderer = useRenderer()
  const [status, setStatus] = useState('Fill both fields and press Enter (or Ctrl+S) to submit.')
  const [lastSubmitted, setLastSubmitted] = useState<{
    username: string
    passwordLength: number
  } | null>(null)

  useKeyboard((key) => {
    if (key.ctrl || key.meta || key.option) return
    if (key.name !== 'q' && key.name !== 'escape') return
    key.stopPropagation?.()
    if (!renderer.isDestroyed) {
      renderer.destroy()
    }
  })

  return (
    <ThemeProvider theme={theme}>
      <Container border padding={1}>
        <SectionHeader title='@bunli/tui password input showcase' trailing={<text content='q/esc to quit' />} />
        <Card title='Credentials Form' tone='accent' emphasis='outline'>
          <text content='Input + PasswordField + schema validation' />
          <Form
            title='Credentials'
            scopeId='password-showcase:form'
            schema={credentialsSchema}
            submitHint='Enter/Ctrl+S submit'
            resetHint='Ctrl+R reset'
            onSubmit={(values) => {
              setLastSubmitted({
                username: values.username,
                passwordLength: values.password.length
              })
              setStatus(`Submitted credentials for ${values.username}`)
            }}
            onValidationError={() => {
              setStatus('Validation errors found. Fix highlighted fields.')
            }}
            onCancel={() => {
              setStatus('Form cancelled.')
            }}
          >
            <Input
              name='username'
              label='Username'
              required
              placeholder='deploy-bot'
              description='Identity for deployment and release actions.'
            />
            <PasswordField
              name='password'
              label='Password / Token'
              required
              placeholder='Enter at least 8 characters'
              description='Input is captured by PasswordField and validated by schema.'
            />
          </Form>
          <KeyValueList
            items={[
              { key: 'status', value: status },
              { key: 'last user', value: lastSubmitted?.username ?? 'none' },
              { key: 'secret length', value: lastSubmitted ? `${lastSubmitted.passwordLength} chars` : 'n/a' }
            ]}
            maxLineWidth={76}
            fillWidth
          />
        </Card>
      </Container>
    </ThemeProvider>
  )
}

const passwordCommand = defineCommand({
  name: 'password' as const,
  description: 'Showcase password input components in @bunli/tui',
  options: {
    theme: option(z.enum(['dark', 'light']).default('dark'), {
      short: 'm',
      description: 'Theme preset'
    })
  },
  render: ({ flags }) => <PasswordScreen theme={flags.theme as ThemeMode} />,
  handler: async ({ colors }) => {
    console.log(colors.bold('Run with --tui to view the password input showcase'))
    console.log('Example: bun cli.ts password --tui')
  }
})

export default passwordCommand
