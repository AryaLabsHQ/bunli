# {{projectName}}

{{description}}

## Structure

This is a monorepo managed with Bun workspaces and Turborepo.

```
.
├── packages/
│   ├── cli/          # Main CLI package
│   ├── core/         # Core functionality
│   └── utils/        # Shared utilities
├── package.json      # Root package.json
└── turbo.json       # Turborepo configuration
```

## Development

```bash
# Install dependencies
bun install

# Run all packages in development mode
bun dev

# Build all packages
bun run build

# Run tests
bun test

# Type check
bun run type-check
```

## Creating a New Package

1. Create a new directory under `packages/`
2. Add a `package.json` with the package name and dependencies
3. Add the package to the workspace in root `package.json` if needed
4. Run `bun install` to link the workspace

## Publishing

This monorepo uses [Changesets](https://github.com/changesets/changesets) for version management.

```bash
# Create a changeset
bun run changeset

# Version packages
bun run version

# Publish to npm
bun run release
```

## Scripts

- `dev` - Run all packages in development mode
- `build` - Build all packages
- `test` - Run all tests
- `type-check` - Type check all packages
- `lint` - Lint all packages
- `clean` - Clean all build artifacts
- `changeset` - Create a new changeset
- `version` - Update versions based on changesets
- `release` - Build and publish packages

## License

MIT