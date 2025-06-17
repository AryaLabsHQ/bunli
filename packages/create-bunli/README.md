# create-bunli

Scaffold new Bunli CLI projects with ease.

## Quick Start

```bash
# Using bunx (recommended)
bunx create-bunli my-cli

# Using npm
npm create bunli@latest my-cli

# Using yarn
yarn create bunli my-cli

# Using pnpm
pnpm create bunli my-cli
```

## Features

- 🚀 **Fast scaffolding** - Get started in seconds
- 📦 **Multiple templates** - Choose from basic, advanced, or monorepo setups
- 🔧 **TypeScript ready** - Full TypeScript support out of the box
- 🧪 **Testing included** - Comes with @bunli/test for CLI testing
- 🎨 **Best practices** - Follows Bunli conventions and patterns
- 🌐 **Flexible sources** - Use bundled templates or any GitHub repository

## Usage

### Basic Usage

Create a new project with the default template:

```bash
bunx create-bunli my-cli
```

### Using Templates

Choose from bundled templates:

```bash
# Basic single-command CLI
bunx create-bunli my-cli --template basic

# Advanced multi-command CLI with subcommands
bunx create-bunli my-cli --template advanced

# Monorepo setup with Turborepo
bunx create-bunli my-cli --template monorepo
```

### Using External Templates

Use any GitHub repository as a template:

```bash
# GitHub repository
bunx create-bunli my-cli --template username/repo

# With full GitHub URL
bunx create-bunli my-cli --template github:username/repo

# Specific branch or tag
bunx create-bunli my-cli --template username/repo#branch
```

### Options

```bash
bunx create-bunli [name] [options]

Options:
  -t, --template <template>    Project template (default: "basic")
  -d, --dir <dir>             Directory to create project in
  -p, --package-manager <pm>   Package manager (bun, npm, yarn, pnpm) (default: "bun")
  -g, --git                   Initialize git repository (default: true)
  -i, --install               Install dependencies (default: true)
  --offline                   Use cached templates when available
  -h, --help                  Display help
  -v, --version               Display version
```

### Examples

```bash
# Create in current directory
bunx create-bunli .

# Create with specific package manager
bunx create-bunli my-cli --package-manager pnpm

# Create without installing dependencies
bunx create-bunli my-cli --no-install

# Create in custom directory
bunx create-bunli my-cli --dir ~/projects/my-cli

# Use external template
bunx create-bunli my-cli --template pvtnbr/bunli-starter
```

## Templates

### Basic Template

Perfect for simple CLI tools with a single command.

**Features:**
- Single command setup
- TypeScript configuration
- Test setup with @bunli/test
- Build script using bunli

**Structure:**
```
my-cli/
├── src/
│   ├── index.ts         # CLI entry point
│   └── commands/
│       └── hello.ts     # Example command
├── test/
│   └── hello.test.ts    # Example test
├── package.json
├── tsconfig.json
└── README.md
```

### Advanced Template

For complex CLIs with multiple commands and features.

**Features:**
- Multiple commands with subcommands
- Configuration management
- File validation system
- Built-in development server
- Advanced command examples

**Commands included:**
- `init` - Initialize configuration
- `validate` - Validate files with rules
- `serve` - Start development server
- `config` - Manage configuration

**Structure:**
```
my-cli/
├── src/
│   ├── index.ts         # CLI entry point
│   ├── commands/        # Command implementations
│   │   ├── init.ts
│   │   ├── validate.ts
│   │   ├── serve.ts
│   │   └── config.ts
│   └── utils/          # Utility functions
│       ├── config.ts
│       ├── validator.ts
│       └── glob.ts
├── test/
├── package.json
├── tsconfig.json
└── README.md
```

### Monorepo Template

For large projects with multiple packages.

**Features:**
- Turborepo configuration
- Multiple packages setup
- Shared dependencies
- Changeset support
- Parallel builds

**Structure:**
```
my-cli/
├── packages/
│   ├── cli/            # Main CLI package
│   ├── core/           # Core functionality
│   └── utils/          # Shared utilities
├── turbo.json          # Turborepo config
├── package.json        # Root package.json
├── tsconfig.json       # Root TypeScript config
└── README.md
```

## Creating Custom Templates

Templates can include a `template.json` manifest:

```json
{
  "name": "my-template",
  "description": "My custom template",
  "variables": [
    {
      "name": "projectName",
      "message": "Project name",
      "type": "string",
      "default": "my-project"
    },
    {
      "name": "license",
      "message": "License",
      "type": "select",
      "choices": ["MIT", "Apache-2.0", "GPL-3.0"]
    }
  ]
}
```

### Template Variables

Use these variables in your template files:

- `{{projectName}}` - The project name
- `{{description}}` - Project description
- `{{author}}` - Author name
- `{{license}}` - License type
- `{{year}}` - Current year
- `{{packageManager}}` - Selected package manager

Variables can be used in file contents and filenames:
- `__projectName__.config.js` → `my-app.config.js`

## Programmatic Usage

```typescript
import { createProject } from 'create-bunli'

await createProject({
  name: 'my-cli',
  template: 'advanced',
  packageManager: 'bun',
  install: true,
  git: true
})
```

## Development

```bash
# Clone the repository
git clone https://github.com/AryaLabsHQ/bunli.git
cd bunli/packages/create-bunli

# Install dependencies
bun install

# Run in development
bun dev

# Run tests
bun test

# Build
bun run build
```

## Troubleshooting

### Template not found

If you get a "template not found" error, ensure:
- The template name is correct
- For GitHub templates, the repository exists and is public
- You have internet connection (for external templates)

### Installation fails

If dependency installation fails:
- Check your internet connection
- Ensure the package manager is installed
- Try running with `--no-install` and install manually

### Permission errors

If you get permission errors:
- Ensure you have write access to the target directory
- Try running in a different directory
- Check disk space availability

## Contributing

Contributions are welcome! Please read our [Contributing Guide](../../CONTRIBUTING.md) for details.

### Adding a New Template

1. Create a new directory in `templates/`
2. Add all template files
3. Create a `template.json` manifest
4. Test the template thoroughly
5. Submit a pull request

## License

MIT © [Arya Labs, Inc.](../../LICENSE)