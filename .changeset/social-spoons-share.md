---
"@bunli/runtime": patch
"@bunli/utils": patch
"@bunli/core": patch
"bunli": patch
"@bunli/tui": patch
---

rename useAppRuntime/AppRuntimeProvider to useRuntime/RuntimeProvider and update all usage/docs. Also harden OpenTUI teardown and improve bunli build target preflight/error output.
