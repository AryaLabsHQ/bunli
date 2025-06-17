# Schema Validation Examples

This example demonstrates the full power of schema-driven validation in Bunli using Zod.

## Features Demonstrated

- Basic type validation (string, number, boolean, enum)
- Complex validation patterns (email, URL, IP, regex)
- Custom validation with `.refine()`
- Data transformation with `.transform()`
- Chaining validations with `.pipe()`
- Error messages customization

## Commands

### `basic` - Basic Type Validation
Shows simple validation for common types with constraints.

```bash
# Valid usage
bun cli.ts basic -u john_doe -a 25 -r admin -s

# Invalid examples (will show errors)
bun cli.ts basic -u ab              # Too short
bun cli.ts basic -a 200            # Out of range
bun cli.ts basic -e invalid-email  # Invalid format
```

### `validation` - Complex Validation
Demonstrates advanced validation patterns.

```bash
# Valid usage
bun cli.ts validation \
  -w https://example.com/webhook \
  -p SecurePass123 \
  -d 2024-03-15 \
  -t "web,api,backend"

# With optional host
bun cli.ts validation \
  -w https://api.example.com \
  -p MyPass123 \
  -h 192.168.1.1 \
  -d 2024-12-25 \
  -t "prod,critical"
```

### `transform` - Data Transformation
Shows how schemas can transform input data.

```bash
# JSON parsing
bun cli.ts transform \
  -c '{"name":"myapp","port":3000,"enabled":true}' \
  -e dev \
  -m 512m

# With variables
bun cli.ts transform \
  -c '{"name":"api"}' \
  -e staging \
  -m 2g \
  -v "API_KEY=secret,DB_HOST=localhost"
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
# Example error
bun cli.ts basic -u a
# Error: Username must be at least 3 characters

bun cli.ts validation -p weak
# Error: Password must be at least 8 characters
```