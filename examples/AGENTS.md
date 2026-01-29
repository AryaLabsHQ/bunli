# Examples

**Working CLI examples demonstrating Bunli patterns.**

## AVAILABLE EXAMPLES

| Example | Purpose | Key Patterns |
|---------|---------|--------------|
| `hello-world` | Minimal CLI | Basic command, flag options |
| `dev-server` | Server management | Multiple commands, plugin usage |
| `git-tool` | Git integration | Shell execution, prompts |
| `task-runner` | Task automation | Complex option validation |

## RUNNING EXAMPLES

```bash
cd examples/[example-name]
bun run src/index.ts [command] --[flags]
```

## TEMPLATES

See `packages/create-bunli/templates/` for project scaffolds:
- `basic/` - Minimal CLI setup
- `advanced/` - Full-featured with plugins
- `monorepo/` - Multi-package setup
