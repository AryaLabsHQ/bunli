---
"bunli": major
"@bunli/core": major
"@bunli/utils": major
"@bunli/tui": major
"create-bunli": major
---

Ship the `@bunli/tui` component-library cutover and remove clack prompt ownership.

- move prompt runtime ownership to `@bunli/tui` with inline + interactive modes
- drop `@bunli/utils` prompt/clack exports and update usage across the toolchain
- add schema-driven interactive form engine and expanded themed interactive component primitives
- add charts (`bar`, `line`, `sparkline`) and subpath exports (`/prompt`, `/inline`, `/interactive`, `/charts`)
