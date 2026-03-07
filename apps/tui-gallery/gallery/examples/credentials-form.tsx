import { useState } from 'react'
import { z } from 'zod'
import { Form, Input, KeyValueList, PasswordField, Stack } from '@bunli/tui/interactive'
import type { GalleryRenderContext } from '../model.js'

const credentialsSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

export function CredentialsFormExample({
  focusToken,
  previewWidth,
  stateKey
}: GalleryRenderContext) {
  const [status, setStatus] = useState('Fill both fields and press Enter or Ctrl+S to submit.')
  const [lastSubmitted, setLastSubmitted] = useState<{ username: string; passwordLength: number } | null>(null)

  const mode = stateKey === 'validation' ? 'validation' : 'credentials'

  return (
    <Stack gap={1}>
      <text content='Credentials Form' />
      <text content='Input + PasswordField + schema validation' />
      <Form
        title={mode === 'validation' ? 'Validation Stress Test' : 'Credentials'}
        scopeId={`gallery:credentials:${focusToken}`}
        schema={credentialsSchema}
        initialValues={mode === 'validation' ? { username: 'a', password: '123' } : { username: 'deploy-bot' }}
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
          setStatus('Cancelled form interaction.')
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
        maxLineWidth={Math.max(36, previewWidth - 6)}
        fillWidth
      />
    </Stack>
  )
}
