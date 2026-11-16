---
title: Defer Non-Critical Third-Party Libraries
impact: MEDIUM
impactDescription: loads after hydration
tags: bundle, third-party, analytics, defer
---

## Defer Non-Critical Third-Party Libraries

Analytics, logging, and error tracking don't block user interaction. Load them after hydration with
dynamic `import()`.

**Incorrect (blocks initial bundle):**

```tsx
import posthog from "posthog-js";

export function RootDocument({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY);
  }, []);

  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

**Correct (loads after hydration):**

```tsx
import { useEffect } from "react";

export function RootDocument({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void import("posthog-js").then(({ default: posthog }) => {
      posthog.init(import.meta.env.VITE_POSTHOG_KEY);
    });
  }, []);

  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

**Not a substitute: `React.lazy`.** A lazy component still renders during SSR, so its `import()`
runs on the server and browser-only analytics code can execute there. If you want a lazy wrapper,
render it only after mount:

```tsx
import { lazy, Suspense, useEffect, useState } from "react";

const Analytics = lazy(() => import("./analytics").then((m) => ({ default: m.Analytics })));

export function DeferredAnalytics() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <Analytics />
    </Suspense>
  );
}
```
