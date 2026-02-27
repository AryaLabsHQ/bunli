# Task Runner - Bunli CLI

A real-world task automation CLI demonstrating schema validation, interactive prompts, and complex workflows.

## Quick Start

```bash
# Install dependencies
bun install

# Run commands
bun cli.ts build --env production --memory 2g
bun cli.ts test --coverage 90 --watch
bun cli.ts deploy --environment staging
bun cli.ts setup --preset standard
```

## What This Example Shows

- **Complex validation** with Zod schemas and custom transforms
- **Interactive prompts** and multi-step wizards
- **Progress indicators** and spinners for long operations
- **Conditional flows** based on user input and options
- **Error handling** with graceful recovery
- **Real-world patterns** for task automation

## Commands

### `build` - Project Building
Demonstrates advanced validation and data transformation:

```bash
# Basic build
bun cli.ts build

# With custom configuration
bun cli.ts build -e production -c '{"minify":true}' -m 2g

# With environment variables
bun cli.ts build -v "NODE_ENV=production,API_URL=https://api.example.com"
```

**Features:**
- Environment validation (dev/staging/prod)
- JSON configuration parsing with error handling
- Memory limit parsing (512m, 2g, etc.)
- Environment variable transformation
- Watch mode for development

### `test` - Test Execution
Shows complex validation patterns and conditional logic:

```bash
# Run tests with coverage
bun cli.ts test --coverage 85 --pattern "**/*.spec.ts"

# With environment variables
bun cli.ts test -e "NODE_ENV=test,DB_URL=memory" --retries 2

# Watch mode
bun cli.ts test --watch --verbose
```

**Features:**
- Regex pattern validation
- Coverage threshold enforcement
- Environment variable parsing and validation
- Retry logic with limits
- Verbose output control

### `deploy` - Deployment Workflow
Interactive deployment with progress tracking:

```bash
# Interactive deployment
bun cli.ts deploy

# Skip specific steps
bun cli.ts deploy -e production --skip tests,cache

# Force deployment
bun cli.ts deploy --force
```

**Features:**
- Multi-step progress indicators
- Step skipping with validation
- Confirmation prompts
- Error recovery with user choice
- Post-deployment options

### `setup` - Project Setup Wizard
Comprehensive setup wizard with presets:

```bash
# Interactive setup
bun cli.ts setup

# Use presets
bun cli.ts setup --preset minimal
bun cli.ts setup --preset standard
bun cli.ts setup --preset full
```

**Features:**
- Multi-step interactive wizard
- Input validation with custom messages
- Preset configurations
- Feature selection with multiselect
- Direct prompt lifecycle usage (`intro`, `note`, `outro`, cancel checks)
- Progress simulation

## Key Concepts

### Schema Validation Patterns

```typescript
// Custom validation with refine
env: option(
  z.string()
    .refine((val) => {
      const vars = val.split(',')
      return vars.every(v => v.includes('=') && v.split('=').length === 2)
    }, 'Environment variables must be in format KEY=VALUE,KEY2=VALUE2')
)

// Data transformation
memory: option(
  z.string()
    .regex(/^\d+[kmg]?$/i, 'Memory must be a number with optional unit')
    .transform((val) => {
      const num = parseInt(val)
      const unit = val.slice(-1).toLowerCase()
      const multipliers = { k: 1024, m: 1024 * 1024, g: 1024 * 1024 * 1024 }
      return num * (multipliers[unit as keyof typeof multipliers] || 1)
    })
)
```

### Interactive Patterns

```typescript
// Confirmation with default
const confirmed = await prompt.confirm('Continue?', { default: false })

// Multiselect with options
const features = await prompt.multiselect('Features:', {
  options: [
    { value: 'testing', label: 'Testing', hint: 'Jest setup' },
    { value: 'linting', label: 'Linting', hint: 'ESLint config' }
  ],
  default: ['testing']
})

// Text input with validation
const name = await prompt.text('Project name:', {
  validate: (val) => val.length >= 2 || 'Name too short'
})

// Prompt lifecycle helpers
prompt.intro('Project Setup Wizard')
const telemetry = await prompt.confirm('Enable anonymous setup analytics?', { default: false })
prompt.outro('Setup complete')
```

### Progress Indicators

```typescript
const spin = spinner('Building project...')
spin.update('Validating configuration...')
spin.succeed('Build completed!')
// or
spin.fail('Build failed')
```

## Development

```bash
# Start development with hot reload
bun run dev build --env development

# Build for production
bun run build

# Run the built executable
./dist/cli test --coverage 80 --watch
```

## Next Steps

Ready for more complex patterns? Try the **[git-tool](../git-tool/README.md)** example to learn about:
- Nested command organization
- External tool integration
- Command aliases and shortcuts
- Shell command execution

## Project Structure

```
task-runner/
├── cli.ts              # CLI entry point
├── commands/
│   ├── build.ts        # Validation + transformation
│   ├── test.ts         # Complex validation patterns
│   ├── deploy.ts       # Interactive deployment
│   └── setup.ts        # Multi-step wizard
├── bunli.config.ts     # Configuration
├── package.json        # Dependencies
└── README.md          # This file
```

This example shows how to build production-ready task automation CLIs with Bunli's powerful validation and interaction features.
