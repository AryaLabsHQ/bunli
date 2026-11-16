---
title: Avoid Duplicate Derived Data in Loader Returns
impact: LOW
impactDescription: reduces serialized payload size
tags: server, loaders, serialization, route-context
---

## Avoid Duplicate Derived Data in Loader Returns

Loader return values are serialized into the router cache and dehydrated HTML. Passing the same
underlying data twice under different derived shapes duplicates payload. Derive filtered or sorted
views in the component that consumes them.

**Incorrect (duplicates array in loader output):**

```tsx
export const Route = createFileRoute("/users")({
  loader: async () => {
    const users = await fetchUsers();
    return {
      users,
      activeUsers: users.filter((u) => u.active),
      sortedNames: users.toSorted((a, b) => a.name.localeCompare(b.name)).map((u) => u.name),
    };
  },
});
```

**Correct (return source data once):**

```tsx
export const Route = createFileRoute("/users")({
  loader: async () => {
    const users = await fetchUsers();
    return { users };
  },
});

function UsersPage() {
  const { users } = Route.useLoaderData();
  const activeUsers = users.filter((u) => u.active);
  const sortedNames = users.toSorted((a, b) => a.name.localeCompare(b.name)).map((u) => u.name);
  // ...
}
```

**Operations that inflate loader payloads:**

- Arrays: `.toSorted()`, `.filter()`, `.map()`, `.slice()`, `[...arr]`
- Objects: `{...obj}`, `structuredClone()`, `JSON.parse(JSON.stringify())`

**Exception:** Precompute in the loader when the transformation is expensive and every consumer
needs the derived shape.
