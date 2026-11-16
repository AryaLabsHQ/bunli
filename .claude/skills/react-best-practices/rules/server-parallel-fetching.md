---
title: Parallel Data Fetching in Route Loaders
impact: CRITICAL
impactDescription: eliminates server-side waterfalls
tags: server, loaders, parallel-fetching, composition, tanstack-start
---

## Parallel Data Fetching in Route Loaders

TanStack Router runs the `loader`s of every matched route (the parent layout and its child) in
parallel, and runs `beforeLoad` serially from the top down. A waterfall comes from sequential
`await`s inside one loader, or from data work placed in `beforeLoad`. Only routes on the matched
branch load: sibling routes are never matched together, and rendering a component does not run
another route's loader.

**Incorrect (sequential awaits in one loader):**

```tsx
export const Route = createFileRoute("/dashboard")({
  loader: async () => {
    const header = await fetchHeader();
    const sidebar = await fetchSidebarItems(); // starts only after the header resolves
    return { header, sidebar };
  },
});
```

**Incorrect (data fetch in `beforeLoad` blocks every child loader):**

```tsx
export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => ({ shell: await fetchShellConfig() }),
});
```

Keep `beforeLoad` for auth and redirects; move the fetch to `loader` so it runs alongside the child
route's loader.

**Correct (parallelize inside a single loader):**

```tsx
export const Route = createFileRoute("/marketing/")({
  loader: async () => {
    const [hero, pricing, testimonials] = await Promise.all([
      fetchHero(),
      fetchPricing(),
      fetchTestimonials(),
    ]);
    return { hero, pricing, testimonials };
  },
});
```

**Dashboard HttpApi data:** Prefer parallel atom registry prefetch (see `tanstack-start`
dehydration) over serial `await` in one mega-loader when the dashboard route uses `ssr: false`.
