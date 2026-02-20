import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { useEffect } from "react";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

const DEFAULT_SITE_URL = "https://bunli.dev";

export const Route = createRootRoute({
  head: () => {
    const siteUrl = (import.meta.env.SITE_URL as string | undefined) ?? DEFAULT_SITE_URL;

    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "Bunli - The Minimal CLI Framework for Bun" },
        {
          name: "description",
          content:
            "Build type-safe CLIs with Bunli. Zero config, full TypeScript support, powered by Bun.",
        },
        { property: "og:title", content: "Bunli - The Minimal CLI Framework for Bun" },
        {
          property: "og:description",
          content: "Build type-safe CLIs with zero configuration.",
        },
        { property: "og:type", content: "website" },
        { property: "og:url", content: siteUrl },
      ],
      links: [{ rel: "stylesheet", href: appCss }],
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <RootProvider>{children}</RootProvider>
        <Toaster richColors position="top-right" />
        <Scripts />
      </body>
    </html>
  );
}
