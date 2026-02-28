# @bunli/utils

Utility functions for Bunli CLIs.

## Installation

```bash
bun add @bunli/utils
```

## Scope

`@bunli/utils` now focuses on:
- terminal colors
- schema validation helpers

Prompt and spinner APIs were moved to `@bunli/tui/prompt`.

## Usage

### Colors

```typescript
import { colors } from '@bunli/utils'

console.log(colors.green('✓ Success!'))
console.log(colors.red('✗ Error!'))
console.log(colors.bold('Bold text'))
```

### Validation Helpers

```typescript
import { validate, validateFields } from '@bunli/utils'
import { z } from 'zod'

const schema = z.string().min(2)
const result = await validate(schema, 'ok')

const fields = await validateFields(
  {
    name: z.string().min(1),
    age: z.number().int().min(0)
  },
  {
    name: 'Arya',
    age: 20
  }
)
```

## Prompt APIs

Use `@bunli/tui/prompt` for prompt primitives and spinners:

```typescript
import { prompt, spinner } from '@bunli/tui/prompt'

const name = await prompt('Project name:')
const confirmed = await prompt.confirm('Continue?', { default: true })
prompt.intro('Setup')
prompt.outro('Done')

const spin = spinner('Loading...')
spin.succeed('Done')
```

## License

MIT © Arya Labs, Inc.
