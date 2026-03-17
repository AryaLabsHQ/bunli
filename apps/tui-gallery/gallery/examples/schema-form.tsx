import { useMemo, useState } from 'react'
import { z } from 'zod'
import {
  KeyValueList,
  SchemaForm,
  type SchemaField,
  Stack
} from '@bunli/tui/interactive'
import type { GalleryRenderContext } from '../model.js'

const scaffoldSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  packageManager: z.enum(['bun', 'npm', 'pnpm']),
  features: z.array(z.string()).min(1, 'Pick at least one feature'),
  port: z.coerce.number().min(3000).max(9999),
  notes: z.string().optional().default(''),
  createEnvFile: z.coerce.boolean(),
  adminSecret: z.string().optional().default('')
})

type ScaffoldValues = z.infer<typeof scaffoldSchema>

export function SchemaFormExample({
  focusToken,
  previewWidth,
  stateKey
}: GalleryRenderContext) {
  const [status, setStatus] = useState('SchemaForm turns field metadata into a complete interactive form.')
  const [lastSubmitted, setLastSubmitted] = useState<ScaffoldValues | null>(null)

  const initialValues: Partial<ScaffoldValues> = stateKey === 'service'
    ? {
        name: 'bunli-api',
        packageManager: 'pnpm',
        features: ['auth', 'db'],
        port: 4100,
        createEnvFile: true,
        notes: 'Service-oriented starter with auth and persistence.'
      }
    : {
        name: 'bunli-docs',
        packageManager: 'bun',
        features: ['docs'],
        port: 3000,
        createEnvFile: false,
        notes: 'Documentation-focused workspace starter.'
      }

  const fields = useMemo<SchemaField<typeof scaffoldSchema>[]>(() => [
    {
      kind: 'text',
      name: 'name',
      label: 'Project name',
      required: true,
      description: 'Used as the base workspace or package identifier.',
      placeholder: 'bunli-docs'
    },
    {
      kind: 'select',
      name: 'packageManager',
      label: 'Package manager',
      required: true,
      description: 'Choose the install tool for the scaffolded project.',
      options: [
        { name: 'Bun', value: 'bun', description: 'Fastest Bun-native setup' },
        { name: 'npm', value: 'npm', description: 'Broadest ecosystem default' },
        { name: 'pnpm', value: 'pnpm', description: 'Workspace-oriented package manager' }
      ]
    },
    {
      kind: 'multiselect',
      name: 'features',
      label: 'Starter features',
      required: true,
      description: 'Toggle the capability set included in the scaffold.',
      options: [
        { name: 'Docs', value: 'docs', description: 'Documentation starter' },
        { name: 'Auth', value: 'auth', description: 'Authentication wiring' },
        { name: 'Database', value: 'db', description: 'Persistence setup' },
        { name: 'Analytics', value: 'analytics', description: 'Telemetry baseline' }
      ]
    },
    {
      kind: 'number',
      name: 'port',
      label: 'Local port',
      required: true,
      description: 'The dev server port for the scaffolded app.'
    },
    {
      kind: 'checkbox',
      name: 'createEnvFile',
      label: 'Create .env.local',
      description: 'Generate a starter environment file with placeholders.'
    },
    {
      kind: 'password',
      name: 'adminSecret',
      label: 'Admin secret',
      description: 'Only needed when auth is enabled.',
      placeholder: 'Optional bootstrap secret',
      visibleWhen: (values) => Array.isArray(values.features) && values.features.includes('auth'),
      deriveDefault: (values) => Array.isArray(values.features) && values.features.includes('auth')
        ? 'bunli-admin'
        : undefined
    },
    {
      kind: 'textarea',
      name: 'notes',
      label: 'Notes',
      description: 'Longer scaffold instructions or context for the generated project.',
      placeholder: 'Optional notes for the scaffold recipe...'
    }
  ], [])

  return (
    <Stack gap={1}>
      <text content='Schema Form' />
      <text content='Field metadata, visibility, and derived defaults wrapped in a higher-level authoring API.' />
      <SchemaForm
        title='Project Scaffold'
        scopeId={`gallery:schema-form:${focusToken}`}
        schema={scaffoldSchema}
        fields={fields}
        initialValues={initialValues}
        submitHint='Enter/Ctrl+S submit'
        resetHint='Ctrl+R reset'
        onSubmit={(values) => {
          setLastSubmitted(values)
          setStatus(`Prepared scaffold for ${values.name} on port ${values.port}.`)
        }}
        onValidationError={() => {
          setStatus('Validation failed. Check the required fields and selected features.')
        }}
        onCancel={() => {
          setStatus('Cancelled schema-form editing.')
        }}
      />
      <KeyValueList
        items={[
          { key: 'status', value: status },
          { key: 'profile', value: stateKey === 'service' ? 'service starter' : 'docs starter' },
          { key: 'features', value: lastSubmitted?.features?.join(', ') ?? initialValues.features?.join(', ') ?? 'none' },
          { key: 'auth secret', value: lastSubmitted?.adminSecret ? 'configured' : 'not required' }
        ]}
        maxLineWidth={Math.max(36, previewWidth - 6)}
        fillWidth
      />
    </Stack>
  )
}
