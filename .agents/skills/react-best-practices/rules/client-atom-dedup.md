---
title: Use Atom Registry for Request Deduplication
impact: MEDIUM-HIGH
impactDescription: automatic deduplication
tags: client, atoms, deduplication, data-fetching, effect
---

## Use Atom Registry for Request Deduplication

With Effect AtomHttpApi, `useAtomValue` on the same query atom shares one in-flight request and
cached result across component instances. Do not re-fetch in `useEffect` when an atom already owns
the data.

**Incorrect (no deduplication, each instance fetches):**

```tsx
function UserList() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers);
  }, []);
}
```

**Correct (multiple instances share one atom):**

```tsx
import { useAtomValue } from "@effect/atom-react";
import { UsersQuery } from "@/hooks/use-users";

function UserList() {
  const users = useAtomValue(UsersQuery);
  // ...
}
```

**For mutations:**

```tsx
import { useAtomSet } from "@effect/atom-react";
import { UpdateUserMutation } from "@/hooks/use-users";

function UpdateButton() {
  const updateUser = useAtomSet(UpdateUserMutation);
  return <button onClick={() => updateUser({ id, name })}>Update</button>;
}
```

**Legacy carve-out:** TanStack Query or SWR may remain in older routes — prefer atoms for new
HttpApi dashboard code. See `tanstack-start` for AtomHttpApi patterns, `reactivityKeys`, and
`timeToLive`.

Client-side dedup is owned by the atom registry. For server work, first distinguish RSC rendering
from ordinary SSR/server functions using [server-cache-react.md](server-cache-react.md).
