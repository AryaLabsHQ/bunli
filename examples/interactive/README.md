# Interactive CLI Examples

This example demonstrates interactive features in Bunli using prompts, spinners, and progress indicators.

## Features Demonstrated

- Text prompts with validation
- Select prompts (single choice)
- Confirmation prompts
- Password prompts
- Progress spinners
- Multi-step processes
- Conditional prompts
- Colored output

## Commands

### `setup` - Interactive Setup Wizard
A comprehensive setup wizard that guides users through project configuration.

```bash
# Run the full wizard
bun cli.ts setup

# Use a preset to skip some prompts
bun cli.ts setup --preset minimal
bun cli.ts setup -p standard
bun cli.ts setup -p full
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
# Deploy to staging
bun cli.ts deploy -e staging

# Deploy to production, skip tests
bun cli.ts deploy -e production --skip tests

# Skip multiple steps
bun cli.ts deploy -e staging -s tests,cache
```

Features:
- Step-by-step progress indicators
- Substeps visualization
- Warning when steps are skipped
- Post-deployment log viewing

### `survey` - Interactive Survey
Demonstrates all prompt types in a survey format.

```bash
bun cli.ts survey
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

## Best Practices

1. **Validation**: Always validate user input
2. **Defaults**: Provide sensible defaults
3. **Feedback**: Show clear progress and results
4. **Errors**: Handle errors gracefully
5. **Colors**: Use colors to enhance readability
6. **Confirmations**: Ask for confirmation on destructive actions