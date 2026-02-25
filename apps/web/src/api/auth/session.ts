import { createAuth } from "./auth";

export class AuthRequiredError extends Error {
  code = "AUTH_REQUIRED" as const;

  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
}

export interface AuthSession {
  user: AuthUser;
  session?: {
    id?: string;
  };
}

export async function resolveSession(request: Request, env: Env): Promise<AuthSession | null> {
  const auth = createAuth(env);
  const session = await auth.api.getSession({
    headers: new Headers({
      cookie: request.headers.get("cookie") || "",
    }),
  });

  if (!session?.user?.id) {
    return null;
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
    session: {
      id: session.session?.id,
    },
  };
}

export async function requireSession(request: Request, env: Env): Promise<AuthSession> {
  const session = await resolveSession(request, env);
  if (!session) {
    throw new AuthRequiredError();
  }
  return session;
}
