---
title: Extract Default Non-primitive Parameter Value from Memoized Component to Constant
impact: MEDIUM
impactDescription: restores memoization by using a constant for default value
tags: rerender, memo, optimization
---

## Extract Default Non-primitive Parameter Value from Memoized Component to Constant

When memoized component has a default value for some non-primitive optional parameter, such as an
array, function, or object, calling the component without that parameter results in broken
memoization. This is because new value instances are created on every rerender, and they do not pass
strict equality comparison in `memo()`.

To address this issue, extract the default value into a constant.

**Incorrect (`onClick` has different values on every rerender):**

```tsx
const UserAvatar = memo(function UserAvatar({ onClick = () => {} }: { onClick?: () => void }) {
  // ...
})

// Used without optional onClick
<UserAvatar />
```

**Correct (stable default value):**

```tsx
const NOOP = () => {};

const UserAvatar = memo(function UserAvatar({ onClick = NOOP }: { onClick?: () => void }) {
  // ...
})

// Used without optional onClick
<UserAvatar />
```

**Note:** If your project has [React Compiler](https://react.dev/learn/react-compiler) enabled,
manual memoization with `memo()` and `useMemo()` is not necessary — the compiler handles the default
value's identity along with everything else, so do not add `memo()` just to apply this rule. It
still applies to components already wrapped in `memo()`, which the compiler leaves in place. Check
the build before reaching for `memo()`: samva enables the compiler in `apps/web/vite.config.ts` and
lints against bailouts in `oxlint.config.ts` (`react/react-compiler` is an error), and the
`tanstack-start` skill's style rules say not to add `useMemo` / `useCallback` / `memo` for
optimization unless profiling proves need.
