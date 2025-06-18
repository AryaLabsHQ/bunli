# @bunli/plugin-ai-detect

AI agent detection plugin for Bunli CLI framework. Detects when your CLI is running inside AI coding assistants like Claude, Cursor, GitHub Copilot, and more.

## Installation

```bash
bun add @bunli/plugin-ai-detect
```

## Usage

```typescript
import { createCLI } from '@bunli/core'
import { aiAgentPlugin } from '@bunli/plugin-ai-detect'

const cli = await createCLI({
  name: 'my-cli',
  version: '1.0.0',
  plugins: [
    aiAgentPlugin({
      verbose: true // Log when AI agents are detected
    })
  ]
})

// In your commands, you can access the detection results
cli.command({
  name: 'info',
  handler: async ({ context }) => {
    if (context?.store.isAIAgent) {
      console.log('Running in AI agent:', context.store.aiAgents.join(', '))
      console.log('Detected env vars:', context.store.aiAgentEnvVars.join(', '))
    }
  }
})
```

## Options

```typescript
interface AIDetectPluginOptions {
  /**
   * Additional custom AI agents to detect
   */
  customAgents?: AIAgentInfo[]
  
  /**
   * Whether to log detection results
   * Default: false
   */
  verbose?: boolean
}

interface AIAgentInfo {
  name: string
  envVars: string[]
  detect: (env: NodeJS.ProcessEnv) => boolean
}
```

## Built-in Detections

The plugin detects the following AI agents out of the box:

- **Claude**: Detects Claude Code via `CLAUDECODE` environment variable
- **Cursor**: Detects Cursor via `CURSOR_TRACE_ID` environment variable

## Custom Agents

You can add detection for additional AI agents:

```typescript
aiAgentPlugin({
  customAgents: [
    {
      name: 'github-copilot',
      envVars: ['GITHUB_COPILOT_ENABLED'],
      detect: (env) => !!env.GITHUB_COPILOT_ENABLED
    },
    {
      name: 'my-custom-ai',
      envVars: ['MY_AI_ACTIVE', 'MY_AI_VERSION'],
      detect: (env) => env.MY_AI_ACTIVE === 'true'
    }
  ]
})
```

## Store Properties

The plugin provides the following typed properties in the command context store:

```typescript
interface AIDetectStore {
  /** Whether any AI agent was detected */
  isAIAgent: boolean
  
  /** List of detected AI agent names */
  aiAgents: string[]
  
  /** Environment variables that triggered detection */
  aiAgentEnvVars: string[]
}
```

## Environment Extensions

The plugin also extends the environment info:

```typescript
// These properties are added to context.env
interface EnvironmentInfo {
  isAIAgent: boolean
  aiAgents: string[]
}
```

## Use Cases

- **Telemetry**: Track which AI assistants are using your CLI
- **Feature Flags**: Enable special features for AI environments
- **Debugging**: Add extra logging when running in AI assistants
- **Optimization**: Adjust output formatting for AI consumption

## License

MIT © Arya Labs, Inc.