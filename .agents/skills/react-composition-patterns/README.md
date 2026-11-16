# React Composition Patterns

React composition patterns that scale: avoid boolean prop proliferation by using compound
components, lifting state deliberately, and composing internals.

**Agents and humans looking for the rules should read [SKILL.md](SKILL.md).** It owns the category
list, impact levels, and the per-rule index. This README is orientation only and deliberately does
not restate them — an earlier copy of that index lived here and drifted out of agreement with
SKILL.md on impact levels and rule count.

## Layout

- `SKILL.md` — entrypoint: routing, categories by priority, per-rule quick reference
- `rules/` — one file per rule, the source of truth for each rule's explanation and examples

## Adding a rule

1. Create `rules/<prefix>-<description>.md`, following the frontmatter and section shape of an
   existing rule in the same category.
2. Use the area prefix for the category it belongs to. The prefixes and their categories are listed
   in SKILL.md's priority table.
3. Add it to SKILL.md's quick reference under its category. A rule that is not indexed there is
   effectively invisible, because the SKILL.md instruction is to load only the relevant rules rather
   than read the whole tree.

## Core principles

1. **Composition over structural mode flags** — use props for values and real binary state; compose
   substantially different structure.
2. **Lift shared state deliberately** — move state to the nearest common owner, not automatically
   into global context.
3. **Use context for compound coordination** — keep leaf-local data explicit in props.
4. **Explicit variants** — create `ThreadComposer` and `EditComposer` when their structures differ.

## Related skills

- `react-best-practices` — universal React performance and correctness rules.
- `tanstack-start` — for AtomHttpApi data fetching, dehydration, and router SSR flags. Load it first
  when the question is about data rather than component shape.
