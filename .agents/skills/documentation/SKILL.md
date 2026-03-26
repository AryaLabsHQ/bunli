---
name: documentation
description: Quick inline check for documentation freshness. Use when you've just made code changes and want to know if any docs need updating, without a full audit. Lighter weight than the /documentation agent.
user-invocable: false
allowed-tools: Read, Grep, Glob, Bash
---

# Documentation Sync Check

You are checking whether recent code changes require documentation updates in the bunli monorepo.

**Implementation is the source of truth.** Docs follow code, never the reverse.

## Your task

1. Run `git diff --name-only HEAD` (or `git diff --name-only HEAD~1..HEAD` if working tree is clean) to identify changed implementation files.

2. For each changed file in `packages/*/src/`, determine if there's a corresponding doc in `apps/web/content/docs/`. Use this mapping:
   - `packages/core/src/cli.ts` → `docs/api/create-cli.mdx`
   - `packages/core/src/types.ts` → `docs/api/define-command.mdx`, `docs/api/option.mdx`
   - `packages/core/src/config.ts` → `docs/api/define-config.mdx`
   - `packages/core/src/plugin/` → `docs/api/plugins.mdx`, `docs/core-concepts/plugins.mdx`
   - `packages/*/` → `docs/packages/*.mdx`

3. For each matched pair, do a quick comparison: did the implementation change in a way that affects the documented API surface? (new exports, changed signatures, new options, removed features)

4. Report findings inline:
   - Which docs are likely stale
   - What specifically changed
   - Whether a full `/documentation` audit is warranted

Keep it concise. This is a quick check, not a full audit. If you find significant gaps, recommend running the full `/documentation` agent.
