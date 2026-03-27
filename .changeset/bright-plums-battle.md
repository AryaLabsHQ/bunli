---
"@bunli/core": minor
"@bunli/test": patch
---

Add follow-up fixes for config loading, repeatable flags, and machine-readable CLI output.

- Let a complete inline `createCLI()` override win even when the on-disk Bunli config fails to load, while preserving `ConfigNotFoundError` and `ConfigLoadError` behavior for incomplete overrides.
- Add `repeatable: true` option metadata in `@bunli/core` so repeated flags can accumulate into validated arrays.
- Finish normalizing machine-readable core output by formatting built-in help, version, manifest, unknown-command, and validation error paths through the shared output system.
- Export `serializeCliError()` from `@bunli/core/output` and `@bunli/core` for structured error serialization.
- Update `@bunli/test` coverage for machine-readable output flows and align test command runtime metadata with the new output format handling.
