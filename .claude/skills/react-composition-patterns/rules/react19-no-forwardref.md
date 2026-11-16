---
title: React 19 Refs And Context Reads
impact: MEDIUM
impactDescription: uses the new APIs without breaking compatibility or context semantics
tags: react19, refs, context, hooks
---

## React 19 Refs And Context Reads

> React 19+ only. For React 18-compatible components, keep the compatibility APIs required by the
> supported peer range.

React 19 introduced two independent capabilities:

1. Function components can receive `ref` as a prop.
2. `use(Context)` can read context from a condition or loop.

Do not combine these into a single migration rule. Ref forwarding and context consumption solve
unrelated problems.

Official references:

- [React 19: ref as a prop](https://react.dev/blog/2024/12/05/react-19#ref-as-a-prop)
- [`forwardRef`](https://react.dev/reference/react/forwardRef)
- [`useContext`](https://react.dev/reference/react/useContext)
- [`use`](https://react.dev/reference/react/use)

## Ref As A Prop

Prefer a typed `ref` prop for new React 19-only function components:

```tsx
type ComposerInputProps = React.ComponentPropsWithRef<"input">;

function ComposerInput({ ref, ...props }: ComposerInputProps) {
  return <input ref={ref} {...props} />;
}
```

`forwardRef` is not invalid in React 19. It remains exported, runtime-supported, and typed. React's
docs say it is no longer necessary for new React 19 function components and will be deprecated in a
future release.

Keep `forwardRef` when a library supports React 18, when an existing public component type depends
on it, or while a deliberate migration is incomplete:

```tsx
const ComposerInput = forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<"input">>(
  function ComposerInput(props, ref) {
    return <input ref={ref} {...props} />;
  },
);
```

Do not mass-rewrite working compatibility components merely because the app runtime moved to
React 19. Update the supported React range, public types, tests, and call sites together.

## Reading Context

For an ordinary unconditional read at the top level of a function component or custom Hook, prefer
`useContext`. It communicates the specific dependency and follows the familiar Rules of Hooks:

```tsx
const ComposerContext = createContext<ComposerContextValue | null>(null);

function useComposer() {
  const value = useContext(ComposerContext);
  if (value === null) throw new Error("useComposer must be used within ComposerProvider");
  return value;
}
```

Use `use(Context)` when its placement flexibility is the reason for choosing it. Unlike Hooks, `use`
can appear inside a condition or loop, but it must still run while React is rendering a component or
Hook:

```tsx
function OptionalComposerStatus({ show }: { show: boolean }) {
  if (!show) return null;

  const value = use(ComposerContext);
  if (value === null) throw new Error("OptionalComposerStatus requires ComposerProvider");

  const { state } = value;
  return <span>{state.status}</span>;
}
```

If the context default is nullable, guard the value in either form. Do not use `use(Context)` as a
mechanical replacement for every `useContext` call.

### Server Component Boundary

Reading context with `use(Context)` is not supported in React Server Components. Put the context
provider/consumer in a Client Component boundary, or pass serializable server data as props. This
limitation is specific to reading context; `use(Promise)` has separate Server/Client Component
guidance.
