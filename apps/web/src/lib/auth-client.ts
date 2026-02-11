import { createAuthClient } from "better-auth/react";

const defaultSiteUrl = "http://localhost:3000";
const configuredSiteUrl = (import.meta.env.SITE_URL as string | undefined) ?? defaultSiteUrl;

export const authClient = createAuthClient({
  baseURL: configuredSiteUrl,
  basePath: "/api/auth",
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signOut, useSession } = authClient;
