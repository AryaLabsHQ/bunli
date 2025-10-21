# Schema Validation Examples

This example demonstrates the full power of schema-driven validation in Bunli using Zod.

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

- Basic type validation (string, number, boolean, enum)
- Complex validation patterns (email, URL, IP, regex)
- Custom validation with `.refine()`
- Data transformation with `.transform()`
- Chaining validations with `.pipe()`
- Error messages customization
- Development with hot reload
- Production builds
- Generated types preserve schema information

## Commands

### `basic` - Basic Type Validation
Shows simple validation for common types with constraints.

```bash
# Valid usage (development mode)
bun run dev basic -u john_doe -a 25 -r admin -s

# Invalid examples (will show errors)
bun run dev basic -u ab              # Too short
bun run dev basic -a 200            # Out of range
bun run dev basic -e invalid-email  # Invalid format

# Using built executable
./dist/cli basic -u john_doe -a 25 -r admin
```

### `validation` - Complex Validation
Demonstrates advanced validation patterns.

```bash
# Valid usage (development mode)
bun run dev validation \
  -w https://example.com/webhook \
  -p SecurePass123 \
  -d 2024-03-15 \
  -t "web,api,backend"

# With optional host
bun run dev validation \
  -w https://api.example.com \
  -p MyPass123 \
  -h 192.168.1.1 \
  -d 2024-12-25 \
  -t "prod,critical"

# Production build
./dist/cli validation -w https://api.example.com -p MyPass123
```

### `transform` - Data Transformation
Shows how schemas can transform input data.

```bash
# JSON parsing (development mode)
bun run dev transform \
  -c '{"name":"myapp","port":3000,"enabled":true}' \
  -e dev \
  -m 512m

# With variables
bun run dev transform \
  -c '{"name":"api"}' \
  -e staging \
  -m 2g \
  -v "API_KEY=secret,DB_HOST=localhost"

# Production executable
./dist/cli transform -c '{"name":"prod-app"}' -e production -m 4g
```

## Key Concepts

1. **Validation Chains**: Use `.pipe()` to chain multiple validations
2. **Custom Messages**: Provide user-friendly error messages
3. **Type Coercion**: Use `z.coerce` for automatic type conversion
4. **Transformation**: Transform and validate data in one step
5. **Composition**: Build complex schemas from simple ones

## Error Handling

Bunli automatically catches validation errors and displays helpful messages:

```bash
# Example errors in development mode
bun run dev basic -u a
# Error: Username must be at least 3 characters

bun run dev validation -p weak
# Error: Password must be at least 8 characters
```

## Building and Distribution

The example includes a `bunli.config.ts` for easy building:

```bash
# Build for current platform
bun run build

# Build for specific platforms
bunli build --targets darwin-arm64,linux-x64

# Test the built executable
./dist/cli basic -u test_user -a 30
```

## Generated Types and Schema Validation

This example includes type generation that preserves all schema information:

```typescript
// Generated in commands.gen.ts
import { getCommandApi, listCommands } from './commands.gen'

// Get command with full schema information
const basicApi = getCommandApi('basic')
console.log(basicApi.options)
// {
//   username: {
//     type: 'string',
//     required: true,
//     description: 'Username (3-20 characters)',
//     minLength: 3,
//     maxLength: 20,
//     pattern: '^[a-zA-Z0-9_]+$'
//   },
//   age: {
//     type: 'number',
//     required: true,
//     description: 'Age (18-120)',
//     min: 18,
//     max: 120
//   }
// }

// Type-safe schema extraction
function extractValidationRules(commandName: string) {
  const command = getCommandApi(commandName)
  const rules = {}
  
  for (const [optionName, option] of Object.entries(command.options)) {
    rules[optionName] = {
      type: option.type,
      required: option.required,
      constraints: {
        min: option.min,
        max: option.max,
        pattern: option.pattern
      }
    }
  }
  
  return rules
}
```

The generated types provide:
- **Complete schema information** including validation rules
- **Type-safe option access** with full metadata
- **Schema extraction** for documentation generation
- **Validation rule discovery** for dynamic validation