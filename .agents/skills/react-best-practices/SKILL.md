---
name: react-best-practices
description:
  "React 19 performance and rendering rules for TanStack Start apps. Use when writing, reviewing, or
  refactoring components, bundles, waterfalls, re-renders, hydration, Suspense, or SSR loaders. For
  HttpApi data fetching and atoms use tanstack-start."
license: MIT
---

# React best practices

Performance review guide for React applications on TanStack Start. Contains 50 rules across 8
categories. Treat impact labels as triage hints, not measured guarantees.

For AtomHttpApi queries, mutations, dehydration, and router SSR flags, load `tanstack-start` first.
This skill covers React rendering and bundle performance only.

## Review protocol

1. Confirm the installed React and TanStack Start versions. Confirm whether the path is a Client
   Component, ordinary SSR, a loader or server function, or React Server Component execution.
2. Preserve correctness, request isolation, authorization boundaries, and framework ownership before
   optimizing.
3. Reproduce the suspected cost with React Profiler, browser performance tools, or build output.
4. Apply the smallest relevant rule. Then measure the same interaction again. Do not assume an
   impact label or example benchmark transfers to the current app.

## Rule categories by priority

| Priority | Category                   | Impact      | Prefix       |
| -------- | -------------------------- | ----------- | ------------ |
| 1        | Eliminating waterfalls     | CRITICAL    | `async-`     |
| 2        | Bundle size optimization   | CRITICAL    | `bundle-`    |
| 3        | Server and SSR performance | HIGH        | `server-`    |
| 4        | Client-side data fetching  | MEDIUM-HIGH | `client-`    |
| 5        | Re-render optimization     | MEDIUM      | `rerender-`  |
| 6        | Rendering performance      | MEDIUM      | `rendering-` |
| 7        | JavaScript performance     | LOW-MEDIUM  | `js-`        |
| 8        | Advanced patterns          | LOW         | `advanced-`  |

## Quick reference

### 1. Eliminating waterfalls

CRITICAL.

- `async-defer-await`. Move await into branches where actually used.
- `async-parallel`. Use `Promise.all()` for independent operations.
- `async-dependencies`. Use better-all for partial dependencies.
- `async-api-routes`. Start promises early in loaders and server functions.
- `async-suspense-boundaries`. Use Suspense for lazy routes and heavy children.

### 2. Bundle size optimization

CRITICAL.

- `bundle-barrel-imports`. Import directly. Avoid barrel files.
- `bundle-dynamic-imports`. Use `React.lazy` for heavy components.
- `bundle-defer-third-party`. Load analytics and logging after hydration.
- `bundle-conditional`. Load modules only when the feature is activated.
- `bundle-preload`. Preload on hover or focus for perceived speed.

### 3. Server and SSR performance

HIGH.

- `server-auth-server-fn`. Authenticate inside every `createServerFn` handler.
- `server-cache-react`. Use `React.cache` only inside RSC render execution. Use request context
  elsewhere.
- `server-cache-lru`. Bound and isolate deliberate cross-request caches.
- `server-dedup-props`. Avoid duplicate derived data in loader returns.
- `server-hoist-static-io`. Hoist static I/O only where the runtime supports it. Workers load assets
  at build time or fetch them inside a handler.
- `server-serialization`. Minimize loader and route context payload.
- `server-parallel-fetching`. Parallelize fetches inside route loaders; keep data out of
  `beforeLoad`.
- `server-nonblocking-side-effects`. Defer logging and analytics after response.

### 4. Client-side data fetching

MEDIUM-HIGH.

- `client-atom-dedup`. Use atom registry for automatic deduplication.
- `client-event-listeners`. Deduplicate global event listeners.
- `client-passive-event-listeners`. Use passive listeners for scroll.
- `client-localstorage-schema`. Version and minimize localStorage data.

### 5. Re-render optimization

MEDIUM.

- `rerender-defer-reads`. Do not subscribe to state only used in callbacks.
- `rerender-memo`. Extract expensive work into memoized components.
- `rerender-memo-with-default-value`. Hoist default non-primitive props.
- `rerender-dependencies`. Use primitive dependencies in effects.
- `rerender-derived-state`. Subscribe to derived booleans, not raw values.
- `rerender-derived-state-no-effect`. Derive state during render, not effects.
- `rerender-functional-setstate`. Use functional setState for stable callbacks.
- `rerender-lazy-state-init`. Pass a function to `useState` for expensive values.
- `rerender-simple-expression-in-memo`. Avoid memo for simple primitives.
- `rerender-move-effect-to-event`. Put interaction logic in event handlers.
- `rerender-transitions`. Use `startTransition` for non-urgent updates.
- `rerender-use-ref-transient-values`. Use refs for transient frequent values.
- `rerender-no-inline-components`. Do not define components inside components.

### 6. Rendering performance

MEDIUM.

- `rendering-animate-svg-wrapper`. Animate a div wrapper, not the SVG element.
- `rendering-content-visibility`. Use `content-visibility` for long lists.
- `rendering-hoist-jsx`. Extract static JSX outside components.
- `rendering-svg-precision`. Reduce SVG coordinate precision.
- `rendering-hydration-no-flicker`. Use an inline script for client-only data. For flash of the
  wrong UI, see the `tanstack-start` skill `references/patterns/no-ui-flash.md`.
- `rendering-hydration-suppress-warning`. Suppress expected mismatches.
- `rendering-activity`. Use Activity component for show/hide.
- `rendering-conditional-render`. Use ternary, not `&&`, for conditionals.
- `rendering-usetransition-loading`. Prefer `useTransition` for loading state.
- `rendering-resource-hints`. Use React DOM resource hints for preloading.
- `rendering-script-defer-async`. Use `defer` or `async` on script tags.

### 7. JavaScript performance

LOW-MEDIUM.

- `js-performance-policy`. Do not restructure working JavaScript for speed without a measurement.
  Covers four cases with a consequence beyond speed. `.sort()` mutating props or state. Use
  `.toSorted()` instead. Batch DOM reads before writes. Hoist values whose identity feeds a
  dependency array. Treat `localStorage` as synchronous I/O.

### 8. Advanced patterns

LOW.

- `advanced-event-handler-refs`. Store event handlers in refs.
- `advanced-init-once`. Initialize app once per app load.
- `advanced-use-latest`. `useEffectEvent` for stable callback refs without re-running effects.

## How to use

Read individual rule files for detailed explanations and code examples.

```text
rules/async-parallel.md
rules/bundle-barrel-imports.md
```

Each rule file contains a brief explanation of why it matters, an incorrect code example, a correct
code example, and additional context.

Load only the rules relevant to the task. Do not read the full `rules/` tree unless auditing or
doing a broad perf review.
