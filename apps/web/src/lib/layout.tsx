import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function docsLayoutOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Bunli Logo"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
            <path
              d="M7 9L10 12L7 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M13 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="font-bold">Bunli</span>
        </>
      ),
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
