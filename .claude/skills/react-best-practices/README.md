# React Best Practices

A structured rule set for React performance on TanStack Start, optimized for agent workflows.

## Structure

- `SKILL.md` — Agent entrypoint (routing, categories, quick reference)
- `rules/` — One file per rule (source of truth)
  - `_sections.md` — Section metadata (titles, impacts, descriptions)
  - `_template.md` — Template for creating new rules
  - `area-description.md` — Individual rule files

## Creating a New Rule

1. Copy `rules/_template.md` to `rules/area-description.md`
2. Choose the appropriate area prefix:
   - `async-` for Eliminating Waterfalls (Section 1)
   - `bundle-` for Bundle Size Optimization (Section 2)
   - `server-` for Server & SSR Performance (Section 3)
   - `client-` for Client-Side Data Fetching (Section 4)
   - `rerender-` for Re-render Optimization (Section 5)
   - `rendering-` for Rendering Performance (Section 6)
   - `js-` for JavaScript Performance (Section 7)
   - `advanced-` for Advanced Patterns (Section 8)
3. Fill in the frontmatter and content

## Rule File Structure

Each rule file should follow this structure:

````markdown
---
title: Rule Title Here
impact: MEDIUM
impactDescription: Optional description
tags: tag1, tag2, tag3
---

## Rule Title Here

Brief explanation of the rule and why it matters.

**Incorrect (description of what's wrong):**

```typescript
// Bad code example
```
````

**Correct (description of what's right):**

```typescript
// Good code example
```

## File Naming Convention

- Files starting with `_` are special metadata/templates
- Rule files: `area-description.md` (e.g., `async-parallel.md`)
- Section is inferred from filename prefix
- Rules are sorted alphabetically by title within each section

## Impact Levels

- `CRITICAL` - Highest priority, major performance gains
- `HIGH` - Significant performance improvements
- `MEDIUM-HIGH` - Moderate-high gains
- `MEDIUM` - Moderate performance improvements
- `LOW-MEDIUM` - Low-medium gains
- `LOW` - Incremental improvements

## Stack

Tailored for **TanStack Start + React 19**. Pair with the `tanstack-start` skill for AtomHttpApi,
dehydration, and router SSR configuration.
