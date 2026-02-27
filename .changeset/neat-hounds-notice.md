---
"bunli": major
"@bunli/core": major
"@bunli/generator": patch
---

feat!: simplify command/group authoring and codegen discovery for subcommand DX.

- Introduce a clearer command group model and align manual registration around default-exported command/group modules.
- Improve generator/scanner discovery for registered identifiers, alias chains, nested references, and circular detection.
- Fix completion/codegen edge cases including non-code import traversal and multi-entry build handling.
