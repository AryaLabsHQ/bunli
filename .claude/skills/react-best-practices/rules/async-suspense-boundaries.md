---
title: Strategic Suspense Boundaries
impact: HIGH
impactDescription: faster initial paint
tags: async, suspense, lazy-loading, layout-shift, tanstack-start
---

## Strategic Suspense Boundaries

Use Suspense to show shell UI immediately while lazy routes or heavy child components load. Do not
block the entire layout waiting for code or data that only one region needs.

**Incorrect (entire page waits for lazy editor chunk):**

```tsx
import { MonacoEditor } from "./monaco-editor";

function CodePage() {
  return (
    <div>
      <Sidebar />
      <Header />
      <MonacoEditor /> {/* ~300KB blocks shell paint */}
      <Footer />
    </div>
  );
}
```

**Correct (shell renders, editor streams in):**

```tsx
import { lazy, Suspense } from "react";

const MonacoEditor = lazy(() =>
  import("./monaco-editor").then((m) => ({ default: m.MonacoEditor })),
);

function CodePage() {
  return (
    <div>
      <Sidebar />
      <Header />
      <Suspense fallback={<EditorSkeleton />}>
        <MonacoEditor />
      </Suspense>
      <Footer />
    </div>
  );
}
```

**Correct (TanStack Router route-level chunk loading):**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/code")({
  ssr: false,
  pendingComponent: () => <EditorSkeleton />,
  component: lazyRouteComponent(() => import("./code-page")),
});
```

`pendingComponent` covers **route chunk** load. For HttpApi data on dashboard routes, use atom
`onInitial` / `Result` loading UI (see `tanstack-start`) — not Suspense around fetch logic.

**Alternative (share a promise across components with `use()`):**

```tsx
function Page() {
  const dataPromise = fetchBootstrap();

  return (
    <div>
      <Sidebar />
      <Suspense fallback={<Skeleton />}>
        <DataDisplay dataPromise={dataPromise} />
        <DataSummary dataPromise={dataPromise} />
      </Suspense>
    </div>
  );
}

function DataDisplay({ dataPromise }: { dataPromise: Promise<Data> }) {
  const data = use(dataPromise);
  return <div>{data.content}</div>;
}
```

**When NOT to use:**

- Critical above-the-fold SEO content on SSR marketing routes (use route `loader` + `head()`
  instead)
- Small, fast loads where Suspense overhead isn't worth it
- When avoiding layout shift is more important than faster shell paint
