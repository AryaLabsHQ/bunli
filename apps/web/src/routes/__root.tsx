import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
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
        { title: "bunli.dev | Sandbox Workbench" },
        {
          name: "description",
          content:
            "Run and iterate on Bunli scripts in a secure Cloudflare sandbox workbench with live docs.",
        },
        { property: "og:title", content: "bunli.dev | Sandbox Workbench" },
        {
          property: "og:description",
          content: "Experiment with Bun + Bunli in a guided workbench.",
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
