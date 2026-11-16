---
title: Use React DOM Resource Hints
impact: HIGH
impactDescription: reduces load time for critical resources
tags: rendering, preload, preconnect, prefetch, resource-hints, tanstack-start
---

## Use React DOM Resource Hints

**Impact: HIGH (reduces load time for critical resources)**

React DOM provides APIs to hint the browser about resources it will need. In TanStack Start, prefer
route `head()` `links` for static preconnect/preload; use React DOM hints when a component needs
runtime hints.

- **`prefetchDNS(href)`**: Resolve DNS for a domain you expect to connect to
- **`preconnect(href)`**: Establish connection (DNS + TCP + TLS) to a server
- **`preload(href, options)`**: Fetch a resource (stylesheet, font, script, image) you'll use soon
- **`preloadModule(href)`**: Fetch an ES module you'll use soon
- **`preinit(href, options)`**: Fetch and evaluate a stylesheet or script
- **`preinitModule(href)`**: Fetch and evaluate an ES module

**Correct (preconnect in root `head()` — idiomatic TanStack Start):**

```tsx
export const Route = createRootRoute({
  head: () => ({
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
});
```

**Correct (React DOM hints in a component):**

```tsx
import { preconnect, prefetchDNS } from "react-dom";

export function AnalyticsShell({ children }: { children: React.ReactNode }) {
  prefetchDNS("https://analytics.example.com");
  preconnect("https://api.example.com");
  return <main>{children}</main>;
}
```

**Preload likely next route (intent-based):**

```tsx
import { preloadModule } from "react-dom";

function NavLink({ to, onIntent }: Props) {
  const preload = () => preloadModule("/dashboard.js", { as: "script" });
  return (
    <a href={to} onMouseEnter={preload} onFocus={preload}>
      Dashboard
    </a>
  );
}
```

| API             | Use case                                    |
| --------------- | ------------------------------------------- |
| `prefetchDNS`   | Third-party domains you'll connect to later |
| `preconnect`    | APIs or CDNs you'll fetch from immediately  |
| `preload`       | Critical resources needed for current page  |
| `preloadModule` | JS modules for likely next navigation       |
| `preinit`       | Stylesheets/scripts that must execute early |
| `preinitModule` | ES modules that must execute early          |

Reference:
[React DOM resource preloading](https://react.dev/reference/react-dom#resource-preloading-apis)
