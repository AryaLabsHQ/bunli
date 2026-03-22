import { createAuthClient } from "better-auth/react";

function resolveAuthBaseUrl(): string | undefined {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return import.meta.env.SITE_URL as string | undefined;
}

export const authClient = createAuthClient({
  baseURL: resolveAuthBaseUrl(),
  basePath: "/api/auth",
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signOut, useSession } = authClient;
