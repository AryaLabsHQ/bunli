---
"bunli": patch
"@bunli/core": patch
"@bunli/generator": patch
"@bunli/plugin-ai-detect": patch
"@bunli/plugin-completions": patch
"@bunli/plugin-config": patch
"@bunli/plugin-mcp": patch
"@bunli/test": patch
"@bunli/tui": patch
"@bunli/utils": patch
"create-bunli": patch
---

Fix npm releases by rewriting `workspace:*` internal dependency ranges to real semver ranges at publish time.
