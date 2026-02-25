---
"@bunli/core": patch
---

Fix prompt-cancel handling in CLI execution by statically importing `PromptCancelledError` from `@bunli/utils` instead of dynamically importing it in catch blocks.

This prevents `TypeError: Right hand side of instanceof is not an object` during cancellation paths (including release prompts) and keeps cancellations exiting cleanly with code `0`.
