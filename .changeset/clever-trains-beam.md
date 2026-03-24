---
"@bunli/core": minor
"@bunli/utils": minor
"@bunli/test": minor
"create-bunli": minor
"@bunli/plugin-completions": patch
"@bunli/plugin-skills": minor
"@bunli/store": minor
---

Add a new agent-oriented framework layer across Bunli.

- Add multi-format output support to `@bunli/core` with `--format`, handler `output()` helpers, agent-aware defaults, `--llms` / `--llms-full` manifests, richer command errors, help rendering extraction, recursive manifest generation, alias-safe manifest output, plugin `preRun` / `postRun` hooks, and XDG-aware plugin paths.
- Add XDG directory helpers to `@bunli/utils`.
- Add `createTestCLI`, type-level inference tests, and direct stdout/stderr capture support to `@bunli/test`.
- Add post-create step orchestration to `create-bunli` for install, git init, editor open, and arbitrary command steps.
- Vendor the completions engine into `@bunli/plugin-completions`, removing the external `@bomb.sh/tab` dependency.
- Add `@bunli/plugin-skills` for generating and syncing `SKILL.md` files for detected agents, including force mode, target-scoped staleness checks, and global installs for agent-specific skill directories.
- Add `@bunli/store` as a typed file-backed JSON persistence package with atomic replace writes and validation hooks.
