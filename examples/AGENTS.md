# examples

**Working example CLIs.**

## EXAMPLES

| Example       | Description                     |
| ------------- | ------------------------------- |
| `hello-world` | Minimal CLI                     |
| `dev-server`  | Development server with plugins |
| `git-tool`    | Git utilities                   |
| `task-runner` | Task automation                 |

## LEARNING PROGRESSION

1. **hello-world** — Single command, basic setup (start here)
2. **dev-server** — Plugin system, store access, spinner patterns
3. **git-tool** — Flat command structure with options, shell integration, aliases
4. **task-runner** — Multi-command organization, error handling

## RUNNING

```bash
cd examples/hello-world
bun install
bun run dev          # Hot reload development
bun run build        # Production build
./dist/cli           # Run built executable
```

## ADDING NEW EXAMPLES

1. Create directory in `examples/`
2. Add `README.md` with features demonstrated, usage, key concepts
3. Create MDX documentation in `apps/web/content/docs/examples/`
4. Update `apps/web/content/docs/examples/index.mdx`
