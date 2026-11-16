---
title: JavaScript and DOM Micro-Optimization Policy
impact: LOW-MEDIUM
impactDescription:
  replaces thirteen example-driven rules with one policy plus the React-specific traps
tags: javascript, dom, optimization, policy, measurement
---

## JavaScript and DOM Micro-Optimization Policy

**Policy: do not restructure working JavaScript for speed without a measurement that names the
cost.** Loop shape, lookup structure, and iteration count are almost never a React app's bottleneck
— waterfalls, bundle size, and re-render breadth are. Spend the effort there first (categories 1, 2,
and 5), and reach for anything below only when a profile points at it.

The standard techniques are assumed knowledge and do not need worked examples: return early instead
of nesting, use a `Set`/`Map` for repeated membership or key lookups instead of `Array.includes` in
a loop, build an index `Map` once instead of a nested scan, combine `filter().map()` into one pass
or `flatMap` when the intermediate array is large, compare cheap discriminators like `length` before
expensive deep comparisons, and use a single pass for min/max rather than sorting. Apply them when
writing new code because they are usually also the clearer form — not as a refactor of code that
already works.

What follows is the subset with a consequence beyond speed, which is why these are worth stating.

### `.sort()` mutates — use `.toSorted()` on props and state

This is a correctness rule, not a performance one. `.sort()` and `.reverse()` mutate in place, so
sorting a prop or state array edits data React expects to be read-only. The render may look right
and the bug surfaces later as a stale closure or a skipped re-render.

```tsx
// Wrong: mutates the users prop
const sorted = useMemo(() => users.sort(byName), [users]);

// Right: new array
const sorted = useMemo(() => users.toSorted(byName), [users]);
```

The immutable pairs are `.toSorted()`, `.toReversed()`, `.toSpliced()`, and `.with()`. All are
available in Chrome 110+, Safari 16+, Firefox 115+, and Node 20+. Below that, `[...items].sort(...)`
is the equivalent.

### Batch DOM reads and writes separately

Interleaving a layout-triggering read (`offsetHeight`, `getBoundingClientRect`, `getComputedStyle`)
with a write forces a synchronous layout on every iteration. Do all reads, then all writes. For
multiple style changes on one element, set a class or `cssText` once rather than assigning
properties individually.

This matters in React mainly inside `useEffect`, `useLayoutEffect`, and imperative ref code, since
that is where the app touches the DOM directly.

### Hoist values whose identity is a dependency

A `new RegExp(...)`, object, array, or function created during render gets a new identity every
render. That is harmless on its own, but it invalidates any `useMemo`/`useEffect` dependency array
or `memo()` comparison it feeds. Hoist to module scope when the value is constant, or `useMemo` it
when it depends on props.

With React Compiler enabled this class of problem is handled for you — see
[rerender-memo.md](rerender-memo.md).

### Treat `localStorage` and `sessionStorage` as synchronous I/O

They block the main thread and cannot be read during SSR. Read once and keep the value in state or a
module-level cache rather than reading per render or per loop iteration. When the value affects
first paint, a pre-paint inline script is the usual mechanism — see the theme discussion in
`tanstack-start`'s `references/patterns/no-ui-flash.md`.

### Memoizing pure function results

A module-level `Map` keyed by the input works for a pure function with a bounded key space. Two
things to get right: the cache is process-lifetime, so on a server it is shared across requests and
users — never key it on anything request-scoped or user-scoped — and it grows without bound unless
you cap it. For per-request sharing use request middleware context instead
([server-cache-react.md](server-cache-react.md)).
