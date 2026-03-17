import { useState } from 'react'
import { z } from 'zod'
import {
  CheckboxField,
  Form,
  KeyValueList,
  MultiSelect,
  NumberField,
  Select,
  Stack,
  TextareaField
} from '@bunli/tui/interactive'
import type { GalleryRenderContext } from '../model.js'

const fieldSetSchema = z.object({
  environment: z.enum(['development', 'staging', 'production']),
  capabilities: z.array(z.string()).min(1, 'Select at least one capability'),
  retries: z.coerce.number().min(0).max(10),
  notes: z.string().min(12, 'Add a slightly longer note'),
  dryRun: z.coerce.boolean()
})

type FieldSetValues = z.infer<typeof fieldSetSchema>

const environmentOptions = [
  { name: 'Development', value: 'development', description: 'Early validation and local testing' },
  { name: 'Staging', value: 'staging', description: 'Pre-production verification' },
  { name: 'Production', value: 'production', description: 'Live rollout target' }
]

const capabilityOptions = [
  { name: 'Build', value: 'build', description: 'Compile and package outputs' },
  { name: 'Release', value: 'release', description: 'Publish the release candidate' },
  { name: 'Notify', value: 'notify', description: 'Broadcast status to subscribers' },
  { name: 'Archive', value: 'archive', description: 'Store artifacts and logs' }
]

const profiles: Record<string, FieldSetValues> = {
  baseline: {
    environment: 'staging',
    capabilities: ['build', 'notify'],
    retries: 2,
    notes: 'Run the default preview pipeline and notify the team channel.',
    dryRun: true
  },
  release: {
    environment: 'production',
    capabilities: ['build', 'release', 'notify'],
    retries: 4,
    notes: 'Promote the stable release, notify subscribers, and capture the release notes.',
    dryRun: false
  },
  editorial: {
    environment: 'development',
    capabilities: ['archive'],
    retries: 1,
    notes: 'Prepare a draft content pass and archive the generated review artifacts.',
    dryRun: true
  }
}

export function FieldSetExample({
  focusToken,
  previewWidth,
  stateKey
}: GalleryRenderContext) {
  const [status, setStatus] = useState('Move through the fields and submit to inspect the combined values.')
  const [lastSubmitted, setLastSubmitted] = useState<z.infer<typeof fieldSetSchema> | null>(null)

  const baselineProfile = profiles.baseline!
  const profileKey = stateKey in profiles ? stateKey : 'baseline'
  const initialValues = profiles[profileKey]! ?? baselineProfile

  return (
    <Stack gap={1}>
      <text content='Field Set' />
      <text content='Select, MultiSelect, NumberField, TextareaField, and CheckboxField in one composed form.' />
      <Form
        title='Operational Field Set'
        scopeId={`gallery:field-set:${focusToken}`}
        schema={fieldSetSchema}
        initialValues={initialValues}
        submitHint='Enter/Ctrl+S submit'
        resetHint='Ctrl+R reset'
        onSubmit={(values) => {
          setLastSubmitted(values)
          setStatus(`Prepared ${values.environment} run with ${values.capabilities.length} selected capabilities.`)
        }}
        onValidationError={() => {
          setStatus('Validation failed. Check required capabilities, notes, and retry bounds.')
        }}
        onCancel={() => {
          setStatus('Cancelled field-set editing.')
        }}
      >
        <Select
          name='environment'
          label='Environment'
          required
          options={[...environmentOptions]}
          description='Choose the target environment for this run.'
        />
        <MultiSelect
          name='capabilities'
          label='Capabilities'
          required
          options={capabilityOptions}
          description='Toggle one or more capabilities with Space.'
        />
        <NumberField
          name='retries'
          label='Retries'
          required
          placeholder='2'
          description='Set the maximum retry budget for the workflow.'
        />
        <TextareaField
          name='notes'
          label='Notes'
          required
          placeholder='Describe what this run is intended to do...'
          description='Longer freeform context for operators and reviewers.'
        />
        <CheckboxField
          name='dryRun'
          label='Dry run'
          description='Keep the pipeline non-destructive while testing the configuration.'
        />
      </Form>
      <KeyValueList
        items={[
          { key: 'status', value: status },
          { key: 'environment', value: lastSubmitted?.environment ?? baselineProfile.environment },
          { key: 'capabilities', value: (lastSubmitted?.capabilities ?? baselineProfile.capabilities).join(', ') },
          { key: 'retries', value: lastSubmitted?.retries ?? baselineProfile.retries },
          { key: 'dry run', value: String(lastSubmitted?.dryRun ?? baselineProfile.dryRun) }
        ]}
        maxLineWidth={Math.max(36, previewWidth - 6)}
        fillWidth
      />
    </Stack>
  )
}
