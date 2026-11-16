---
title: Authenticate createServerFn Handlers Like API Routes
impact: CRITICAL
impactDescription: prevents unauthorized access to server mutations
tags: server, server-functions, authentication, security, authorization, tanstack-start
---

## Authenticate createServerFn Handlers Like API Routes

**Impact: CRITICAL (prevents unauthorized access to server mutations)**

`createServerFn` handlers are exposed as public RPC endpoints. Always verify authentication and
authorization **inside** each handler — do not rely solely on `beforeLoad`, layout routes, or UI
guards, because server functions can be invoked directly. Pair with `createCsrfMiddleware` in
`start.tsx` (see `tanstack-start`).

**Incorrect (no authentication check):**

```typescript
import { createServerFn } from "@tanstack/react-start";

export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    // Anyone can call this RPC
    await db.user.delete({ where: { id: data.userId } });
    return { success: true };
  });
```

**Correct (authentication inside the handler):**

```typescript
import { createServerFn } from "@tanstack/react-start";
import { verifySession } from "@/lib/auth";
import { unauthorized } from "@/lib/errors";

export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const session = await verifySession();
    if (!session) {
      throw unauthorized("Must be logged in");
    }
    if (session.user.role !== "admin" && session.user.id !== data.userId) {
      throw unauthorized("Cannot delete other users");
    }
    await db.user.delete({ where: { id: data.userId } });
    return { success: true };
  });
```

**With input validation:**

```typescript
import { Schema } from "effect";

const UpdateProfileSchema = Schema.Struct({
  userId: Schema.String,
  name: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(100)),
  email: Schema.String.check(Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
});

export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator(Schema.decodeUnknownSync(UpdateProfileSchema))
  .handler(async ({ data }) => {
    const session = await verifySession();
    if (!session) throw unauthorized("Must be logged in");
    if (session.user.id !== data.userId) {
      throw unauthorized("Can only update own profile");
    }
    await db.user.update({
      where: { id: data.userId },
      data: { name: data.name, email: data.email },
    });
    return { success: true };
  });
```

Reference: TanStack Start server functions — see `tanstack-start` skill
(`references/tanstack/server-functions.md`).
