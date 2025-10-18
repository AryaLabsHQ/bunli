import { defineCommand } from '@bunli/core'
import { useState } from 'react'
import { FormField, SelectField } from '@bunli/tui'
import type { SelectOption } from '@opentui/core'

function ConfigureUI({ command }: any) {
  const [apiUrl, setApiUrl] = useState('')
  const [region, setRegion] = useState('us-east')
  
  const regions: SelectOption[] = [
    { name: 'US East', value: 'us-east', description: 'US East region' },
    { name: 'US West', value: 'us-west', description: 'US West region' },
    { name: 'EU West', value: 'eu-west', description: 'EU West region' }
  ]
  
  const handleSubmit = (values: Record<string, any>) => {
    console.log('Configuration saved:', { apiUrl, region })
    process.exit(0)
  }
  
  const handleCancel = () => {
    console.log('Configuration cancelled')
    process.exit(0)
  }
  
  return (
    <box title="Configure Settings" border padding={2} style={{ flexDirection: 'column' }}>
      <FormField
        label="API URL"
        name="apiUrl"
        placeholder="https://api.example.com"
        required
        value={apiUrl}
        onChange={setApiUrl}
      />
      <SelectField
        label="Region"
        name="region"
        options={regions}
        onChange={setRegion}
      />
      <box style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
        <text content="Press Ctrl+C to exit" />
      </box>
    </box>
  )
}

export const configureCommand = defineCommand({
  name: 'configure',
  description: 'Configure application settings',
  render: () => <ConfigureUI />,
  handler: async () => {
    // CLI mode handler - simple prompts
    console.log('Configuration settings:')
    console.log('API URL: https://api.example.com')
    console.log('Region: us-east')
    console.log('Configuration saved!')
  }
})