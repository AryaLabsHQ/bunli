---
title: Minimize Loader and Route Context Payload
impact: HIGH
impactDescription: reduces data transfer size
tags: server, loaders, serialization, route-context
---

## Minimize Loader and Route Context Payload

Loader data and `beforeLoad` context are serialized for SSR and client navigations. Only return
fields the route tree actually uses.

**Incorrect (serializes entire record):**

```tsx
export const Route = createFileRoute("/profile/$userId")({
  loader: async ({ params }) => {
    const user = await fetchUser(params.userId); // 50 fields
    return { user };
  },
});

function ProfilePage() {
  const { user } = Route.useLoaderData();
  return <div>{user.name}</div>; // uses 1 field
}
```

**Correct (return only needed fields):**

```tsx
export const Route = createFileRoute("/profile/$userId")({
  loader: async ({ params }) => {
    const user = await fetchUser(params.userId);
    return { name: user.name, avatarUrl: user.avatarUrl };
  },
});

function ProfilePage() {
  const { name, avatarUrl } = Route.useLoaderData();
  return (
    <div>
      <img src={avatarUrl} alt="" />
      {name}
    </div>
  );
}
```

**For HttpApi dashboard data:** Prefer atom queries with narrow schemas instead of fat route loaders
when the route is `ssr: false` (see `tanstack-start`).
