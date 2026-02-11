import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function docsLayoutOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <span className="font-semibold">Bunli</span>,
    },
    links: [
      {
        text: "Documentation",
        url: "/docs",
        active: "nested-url",
      },
      {
        text: "GitHub",
        url: "https://github.com/AryaLabsHQ/bunli",
        external: true,
      },
      {
        text: "npm",
        url: "https://www.npmjs.com/package/bunli",
        external: true,
      },
    ],
  };
}
