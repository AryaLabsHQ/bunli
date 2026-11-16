---
title: Use defer or async on Script Tags
impact: HIGH
impactDescription: eliminates render-blocking
tags: rendering, script, defer, async, performance, tanstack-start
---

## Use defer or async on Script Tags

**Impact: HIGH (eliminates render-blocking)**

Script tags without `defer` or `async` block HTML parsing while the script downloads and executes.
This delays First Contentful Paint and Time to Interactive.

- **`defer`**: Downloads in parallel, executes after HTML parsing completes, maintains execution
  order
- **`async`**: Downloads in parallel, executes immediately when ready, no guaranteed order

Use `defer` for scripts that depend on DOM or other scripts. Use `async` for independent scripts
like analytics.

**Incorrect (blocks rendering):**

```tsx
export function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <script src="https://example.com/analytics.js" />
      </head>
      <body>
        {children}
        {/* Missing framework Scripts — don't hand-roll the app bundle */}
      </body>
    </html>
  );
}
```

**Correct (TanStack Start document shell):**

```tsx
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  head: () => ({
    meta: [{ title: "My App" }],
    links: [{ rel: "stylesheet", href: appCss }],
    scripts: [
      // Third-party: async/defer via head() — non-blocking
      { src: "https://example.com/analytics.js", async: true },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
```

**Per-route scripts and meta:** Use each route's `head()` option (or a shared helper) for
page-specific JSON-LD, canonical URLs, and OG tags — not ad-hoc `<script>` tags in route components.

**Third-party SDKs (analytics, error tracking):** Prefer `useEffect` + dynamic `import()` in
`RootDocument` or a provider so they never enter the SSR bundle (see `bundle-defer-third-party`).

**Do not:** Add a second blocking script tag for the TanStack client bundle — `<Scripts />` owns
that.

Reference:
[MDN - Script element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#defer)
