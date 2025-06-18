# Interactive CLI Examples

This example demonstrates interactive features in Bunli using prompts, spinners, and progress indicators.

## Getting Started

```bash
# Install dependencies
bun install

# Start development mode with hot reload
bun run dev

# Build for production
bun run build
```

## Features Demonstrated

- Text prompts with validation
- Select prompts (single choice)
- Confirmation prompts
- Password prompts
- Progress spinners
- Multi-step processes
- Conditional prompts
- Colored output
- Hot reload development
- Production builds

## Commands

### `setup` - Interactive Setup Wizard
A comprehensive setup wizard that guides users through project configuration.

```bash
# Run in development mode (with hot reload)
bun run dev setup

# Use a preset to skip some prompts
bun run dev setup --preset minimal
bun run dev setup -p standard
bun run dev setup -p full

# Or run the built version
./dist/cli setup --preset minimal
```

Features:
- Validates project name input
- Select from project types
- Multiple feature confirmations
- Conditional database selection
- Final configuration review

### `deploy` - Deployment with Progress
Shows detailed progress during deployment with ability to skip steps.

```bash
# Deploy to staging (development mode)
bun run dev deploy -e staging

# Deploy to production, skip tests
bun run dev deploy -e production --skip tests

# Skip multiple steps
bun run dev deploy -e staging -s tests,cache

# Using built executable
./dist/cli deploy -e production
```

Features:
- Step-by-step progress indicators
- Substeps visualization
- Warning when steps are skipped
- Post-deployment log viewing

### `survey` - Interactive Survey
Demonstrates all prompt types in a survey format.

```bash
# Run in development mode
bun run dev survey

# Or use the built version
./dist/cli survey
```

Features:
- Text input with validation
- Single select from options
- Multiple confirmations
- Password input
- Rating selection
- Optional feedback
- Result summary

## Prompt Types

### Text Prompt
```typescript
const name = await prompt('What is your name?', {
  default: 'Anonymous',
  validate: (val) => val.length >= 2 || 'Too short'
})
```

### Select Prompt
```typescript
const choice = await prompt.select('Choose one:', {
  options: [
    { value: 'a', label: 'Option A', hint: 'Recommended' },
    { value: 'b', label: 'Option B' }
  ],
  default: 'a'
})
```

### Confirm Prompt
```typescript
const confirmed = await prompt.confirm('Continue?', {
  default: true  // Default to yes
})
```

### Password Prompt
```typescript
const secret = await prompt.password('Enter password:', {
  validate: (val) => val.length >= 8 || 'Too short'
})
```

## Progress Indicators

### Spinner
```typescript
const spin = spinner('Loading...')
spin.start()

// Update message
spin.update('Processing...')

// Success
spin.succeed('Done!')

// Or failure
spin.fail('Error occurred')
```

### Multi-step Progress
See the `deploy` command for an example of showing progress through multiple steps with substeps.

## Building and Distribution

```bash
# Build for current platform
bun run build

# Build for multiple platforms
bunli build --targets darwin-arm64,linux-x64,windows-x64

# Build with custom output directory
bunli build --outdir ./bin

# The built executables will be in:
# ./dist/cli (or ./dist/cli.exe on Windows)
```

## Configuration

The `bunli.config.ts` file defines build and development settings:

```typescript
export default defineConfig({
  name: 'interactive-cli',
  version: '1.0.0',
  build: {
    entry: './cli.ts',
    outdir: './dist',
    targets: ['native'], // Build for current platform
    minify: true
  }
})
```

## Best Practices

1. **Validation**: Always validate user input
2. **Defaults**: Provide sensible defaults
3. **Feedback**: Show clear progress and results
4. **Errors**: Handle errors gracefully
5. **Colors**: Use colors to enhance readability
6. **Confirmations**: Ask for confirmation on destructive actions