import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { useEffect } from "react";
import { Toaster } from "sonner";

import { ThemeProvider } from "../lib/theme-provider.js";

import appCss from "../styles.css?url";

const DEFAULT_SITE_URL = "https://bunli.dev";

export const Route = createRootRoute({
  head: () => {
    const siteUrl = (import.meta.env.SITE_URL as string | undefined) ?? DEFAULT_SITE_URL;

    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "Bunli - The CLI Framework for Bun" },
        {
          name: "description",
          content:
            "Build powerful, type-safe CLIs with Bunli. Composable plugins, interactive TUI, full toolchain — powered by Bun.",
        },
        { property: "og:title", content: "Bunli - The CLI Framework for Bun" },
        {
          property: "og:description",
          content: "Composable plugins, interactive TUI, full toolchain — powered by Bun.",
        },
        { property: "og:type", content: "website" },
        { property: "og:url", content: siteUrl },
      ],
      links: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossOrigin: "anonymous",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
        },
        { rel: "stylesheet", href: appCss },
      ],
    };
  },
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (import.meta.env.DEV) {
      import("react-grab/core").then(({ init }) => {
        init({ activationKey: "Meta+c" });
      });
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <RootProvider>{children}</RootProvider>
        </ThemeProvider>
        <Toaster richColors position="top-right" />
        <Scripts />
      </body>
    </html>
  );
}
