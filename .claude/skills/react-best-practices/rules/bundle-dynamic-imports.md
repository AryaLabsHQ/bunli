---
title: Dynamic Imports for Heavy Components
impact: CRITICAL
impactDescription: directly affects TTI and LCP
tags: bundle, dynamic-import, code-splitting, react-lazy
---

## Dynamic Imports for Heavy Components

Use `React.lazy` with `<Suspense>` to code-split large components not needed on initial render. For
browser-only editors (Monaco, Konva, maps), combine with route `ssr: false` when the parent route is
SSR-enabled.

**Incorrect (Monaco bundles with main chunk ~300KB):**

```tsx
import { MonacoEditor } from "./monaco-editor";

function CodePanel({ code }: { code: string }) {
  return <MonacoEditor value={code} />;
}
```

**Correct (Monaco loads on demand):**

```tsx
import { lazy, Suspense } from "react";

const MonacoEditor = lazy(() =>
  import("./monaco-editor").then((m) => ({ default: m.MonacoEditor })),
);

function CodePanel({ code }: { code: string }) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse bg-muted" />}>
      <MonacoEditor value={code} />
    </Suspense>
  );
}
```

**Route-level splitting (TanStack Router):**

```tsx
const CodeRoute = createFileRoute("/code")({
  ssr: false,
  component: lazyRouteComponent(() => import("./code-page")),
});
```

Reference: [React.lazy](https://react.dev/reference/react/lazy)
