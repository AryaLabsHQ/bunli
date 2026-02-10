# @bunli/utils

Utility functions for building CLI applications with Bunli.

## Installation

```bash
bun add @bunli/utils
```

## Features

- 🎨 **Colors** - Terminal colors and styling
- 💬 **Prompts** - Interactive prompts and confirmations
- ⏳ **Spinners** - Loading indicators
- 📋 **Formatting** - Tables, lists, and text formatting
- 🔍 **Validation** - Input validation helpers

## Usage

### Colors

Style your terminal output:

```typescript
import { colors } from '@bunli/utils'

console.log(colors.green('✓ Success!'))
console.log(colors.red('✗ Error!'))
console.log(colors.blue('ℹ Info'))
console.log(colors.yellow('⚠ Warning'))
console.log(colors.bold('Bold text'))
console.log(colors.dim('Dimmed text'))
```

### Prompts (Clack-backed)

Interactive user input (implemented on top of `@clack/prompts`):

```typescript
import { prompt } from '@bunli/utils'

// Text input
const name = await prompt('What is your name?', {
  default: 'Anonymous',
  validate: (value) => value.length > 0 || 'Name is required'
})

// Confirmation
const proceed = await prompt.confirm('Do you want to continue?', { default: true })

// Selection
const choice = await prompt.select('Choose your favorite framework', {
  options: [
    { label: 'Bun', value: 'bun' },
    { label: 'Node.js', value: 'node' },
    { label: 'Deno', value: 'deno' }
  ]
})
```

Advanced: Clack primitives are available under `prompt.clack` (or from `@bunli/utils`):

```typescript
import { prompt } from '@bunli/utils'

prompt.clack.intro('Setup')
const value = await prompt.clack.text({ message: 'Name' })
if (prompt.clack.isCancel(value)) {
  prompt.clack.cancel('Cancelled')
  return
}
prompt.clack.outro('Done')
```

### Spinners

Show progress for long-running tasks:

```typescript
import { spinner } from '@bunli/utils'

const spin = spinner()
spin.start('Loading...')

// Do some work
await someAsyncTask()

spin.success('Done!')
// or
spin.error('Failed!')
// or
spin.stop()
```

### Tables

Display structured data:

```typescript
import { table } from '@bunli/utils'

const data = [
  { name: 'John', age: 30, city: 'New York' },
  { name: 'Jane', age: 25, city: 'London' },
  { name: 'Bob', age: 35, city: 'Paris' }
]

console.log(table(data))
```

### Lists

Format lists with bullets or numbers:

```typescript
import { list } from '@bunli/utils'

// Bullet list
console.log(list([
  'First item',
  'Second item',
  'Third item'
]))

// Numbered list
console.log(list([
  'First step',
  'Second step',
  'Third step'
], { ordered: true }))
```

## API Reference

### Colors
- `colors.red(text)` - Red text
- `colors.green(text)` - Green text
- `colors.blue(text)` - Blue text
- `colors.yellow(text)` - Yellow text
- `colors.cyan(text)` - Cyan text
- `colors.magenta(text)` - Magenta text
- `colors.bold(text)` - Bold text
- `colors.dim(text)` - Dimmed text
- `colors.underline(text)` - Underlined text

### Prompts
- `prompt(options)` - Text input prompt
- `confirm(options)` - Yes/no confirmation
- `select(options)` - Single selection from list
- `multiselect(options)` - Multiple selection from list

### Spinners
- `spinner(options)` - Create a new spinner instance
- `spinner.start(message)` - Start spinning with message
- `spinner.success(message)` - Stop with success message
- `spinner.error(message)` - Stop with error message
- `spinner.stop()` - Stop spinning

### Formatting
- `table(data, options)` - Format data as table
- `list(items, options)` - Format items as list
- `tree(data, options)` - Format hierarchical data as tree

## License

MIT © Arya Labs, Inc.
