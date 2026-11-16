---
name: react-composition-patterns
description:
  React composition patterns that scale. Use when refactoring components with boolean prop
  proliferation, building flexible component libraries, or designing reusable APIs. Triggers on
  tasks involving compound components, render props, context providers, or component architecture.
  Includes React 19 API changes.
license: MIT
---

# React composition patterns

Composition patterns for building flexible, maintainable React components. Avoid boolean prop
proliferation by using compound components, lifting state, and composing internals. These patterns
make codebases easier for both humans and AI agents to work with as they scale.

## When to apply

Reference these guidelines when:

- Refactoring components with many boolean props
- Building reusable component libraries
- Designing flexible component APIs
- Reviewing component architecture
- Working with compound components or context providers

## Rule categories by priority

| Priority | Category                | Impact | Prefix          |
| -------- | ----------------------- | ------ | --------------- |
| 1        | Component architecture  | HIGH   | `architecture-` |
| 2        | State management        | MEDIUM | `state-`        |
| 3        | Implementation patterns | MEDIUM | `patterns-`     |
| 4        | React 19 APIs           | MEDIUM | `react19-`      |

## Quick reference

### 1. Component architecture

HIGH.

- `architecture-avoid-boolean-props`. Avoid boolean props that encode structural modes. Keep genuine
  binary state explicit.
- `architecture-compound-components`. Structure complex components with shared context.

### 2. State management

MEDIUM.

- `state-decouple-implementation`. Keep shared-state storage details behind the provider contract.
- `state-context-interface`. Define a generic interface with state, actions, and meta for dependency
  injection.
- `state-lift-state`. Move state into provider components for sibling access.

### 3. Implementation patterns

MEDIUM.

- `patterns-explicit-variants`. Create explicit variant components instead of boolean modes.
- `patterns-children-over-render-props`. Use children for composition instead of `renderX` props.

### 4. React 19 APIs

MEDIUM. React 19 and later only. Skip this section if using React 18 or earlier.

- `react19-no-forwardref`. Prefer ref-as-prop for new React 19 function components. Keep
  `forwardRef` where compatibility requires it. Use `useContext` for ordinary reads. Use
  `use(Context)` when conditional placement is useful.

## How to use

Read individual rule files for detailed explanations and code examples.

```text
rules/architecture-avoid-boolean-props.md
rules/state-context-interface.md
```

Each rule file contains a brief explanation of why it matters, an incorrect code example, a correct
code example, and additional context.

Load only the rules relevant to the task. Do not read the full `rules/` tree unless auditing or
doing a broad perf review.
