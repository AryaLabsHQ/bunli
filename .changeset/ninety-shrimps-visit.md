---
"bunli": patch
"@bunli/core": patch
"@bunli/generator": patch
---

feat: add binary release support for npm package publishing

- Add release.binary config for per-platform npm packages
- Generate ESM shim that dispatches to correct platform binary
- Improve boolean flag handling (--flag=false form)
- Add unit and E2E tests for release command
