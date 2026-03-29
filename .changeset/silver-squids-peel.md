---
"@bunli/plugin-mcp": patch
---

Fix the MCP plugin build by removing an invalid setup-store write. The plugin no longer tries to assign `context.store.commands` during setup, which matches the current core setup context API and restores successful builds.
