import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'setup' as const,
  description: 'Interactive project setup wizard',
  options: {
    preset: option(
      z.enum(['minimal', 'standard', 'full']).optional(),
      {
        short: 'p',
        description: 'Use preset configuration'
      }
    )
  },

  handler: async ({ flags, prompt, spinner }) => {
    prompt.intro('Project Setup Wizard')
    prompt.note('Use Ctrl+C at any point to cancel.', 'Tip')

    if (flags.preset) {
      const presets = {
        minimal: {
          name: 'my-project',
          type: 'library',
          framework: 'bun',
          typescript: true,
          git: true,
          installDeps: false,
          features: []
        },
        standard: {
          name: 'my-app',
          type: 'application',
          framework: 'bun',
          typescript: true,
          git: true,
          installDeps: true,
          features: ['testing', 'linting']
        },
        full: {
          name: 'my-fullstack-app',
          type: 'application',
          framework: 'bun',
          typescript: true,
          git: true,
          installDeps: true,
          features: ['testing', 'linting', 'docker', 'ci']
        }
      } as const

      const config = presets[flags.preset]
      prompt.log.info(`Using preset: ${flags.preset}`)
      prompt.note(
        [
          `Name: ${config.name}`,
          `Type: ${config.type}`,
          `Framework: ${config.framework}`,
          `TypeScript: ${config.typescript ? 'Yes' : 'No'}`,
          `Git: ${config.git ? 'Yes' : 'No'}`,
          `Features: ${config.features.join(', ') || 'None'}`
        ].join('\n'),
        'Preset Configuration'
      )
      prompt.outro(`Preset "${flags.preset}" ready`)
      return
    }

    prompt.note('Step 1/4: Project identity', 'Step')

    const name = await prompt.text('Project name:', {
      default: 'my-project',
      validate: (val) => {
        if (!val || val.length < 2) return 'Name must be at least 2 characters'
        if (!/^[a-zA-Z0-9-_]+$/.test(val)) {
          return 'Name can only contain letters, numbers, hyphens, and underscores'
        }
        return true
      }
    })

    const type = await prompt.select('Project type:', {
      options: [
        { value: 'library', label: 'Library', hint: 'Reusable code package' },
        { value: 'application', label: 'Application', hint: 'Standalone app' },
        { value: 'monorepo', label: 'Monorepo', hint: 'Multiple packages' }
      ],
      default: 'application'
    })

    prompt.note('Step 2/4: Runtime and language', 'Step')

    const framework = await prompt.select('Runtime framework:', {
      options: [
        { value: 'bun', label: 'Bun', hint: 'Fast JavaScript runtime' },
        { value: 'node', label: 'Node.js', hint: 'Traditional Node.js' },
        { value: 'deno', label: 'Deno', hint: 'Secure by default' }
      ],
      default: 'bun'
    })

    const typescript = await prompt.confirm('Use TypeScript?', {
      default: true
    })

    const git = await prompt.confirm('Initialize Git repository?', {
      default: true
    })

    const telemetry = await prompt.confirm('Enable anonymous setup analytics?', {
      default: false
    })

    prompt.note('Step 3/4: Optional capabilities', 'Step')

    const features = await prompt.multiselect<string>('Additional features:', {
      options: [
        { value: 'testing', label: 'Testing', hint: 'Jest/Vitest setup' },
        { value: 'linting', label: 'Linting', hint: 'ESLint configuration' },
        { value: 'docker', label: 'Docker', hint: 'Containerization' },
        { value: 'ci', label: 'CI/CD', hint: 'GitHub Actions' }
      ],
      initialValues: ['testing'],
      min: 1
    })

    const installDeps = await prompt.confirm('Install dependencies now?', {
      default: true
    })

    prompt.note(
      [
        `Name: ${name}`,
        `Type: ${type}`,
        `Framework: ${framework}`,
        `TypeScript: ${typescript ? 'Yes' : 'No'}`,
        `Git: ${git ? 'Yes' : 'No'}`,
        `Telemetry: ${telemetry ? 'Enabled' : 'Disabled'}`,
        `Features: ${features.join(', ')}`,
        `Install dependencies: ${installDeps ? 'Yes' : 'No'}`
      ].join('\n'),
      'Configuration Summary'
    )

    prompt.note('Step 4/4: Confirm and create', 'Step')

    const confirmed = await prompt.confirm('Create project with this configuration?', {
      default: true
    })

    if (!confirmed) {
      prompt.cancel('Setup cancelled')
      return
    }

    const spin = spinner('Creating project...')

    try {
      const steps: string[] = [
        'Creating project directory...',
        'Initializing package.json...'
      ]

      if (typescript) steps.push('Configuring TypeScript...')
      if (git) steps.push('Initializing Git repository...')
      for (const feature of features) {
        steps.push(`Setting up ${feature}...`)
      }
      if (installDeps) steps.push('Installing dependencies...')

      for (const step of steps) {
        spin.update(step)
        await new Promise((resolve) => setTimeout(resolve, 250))
      }

      spin.succeed('Project created successfully!')
      prompt.note(
        [`cd ${name}`, 'bun run dev # Start development', 'bun run build # Build for production'].join('\n'),
        'Next Steps'
      )
      prompt.outro(`Project "${name}" is ready`)
    } catch (error) {
      spin.fail('Project creation failed')
      prompt.log.error(error instanceof Error ? error.message : String(error))
      throw error instanceof Error ? error : new Error(String(error))
    }
  }
})
