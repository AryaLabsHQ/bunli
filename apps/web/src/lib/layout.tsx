import type { SVGProps } from "react";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { ThemeSwitcher } from "../components/theme-switcher.js";

function GitHubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 1024 1024" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z"
        transform="scale(64)"
        fill="currentColor"
      />
    </svg>
  );
}

function NpmIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 2500 2500">
      <path fill="currentColor" d="M0 0h2500v2500H0z" />
      <path
        fill="var(--background, #101010)"
        d="M1241.5 268.5h-973v1962.9h972.9V763.5h495v1467.9h495V268.5z"
      />
    </svg>
  );
}

function ThemeSwitchWithColorPicker() {
  return (
    <div className="flex items-center gap-1">
      <ThemeSwitcher />
    </div>
  );
}

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
    themeSwitch: {
      component: <ThemeSwitchWithColorPicker />,
    },
    links: [
      {
        text: "Documentation",
        url: "/docs",
        active: "nested-url",
      },
      {
        icon: <GitHubIcon width={16} height={16} />,
        text: "GitHub",
        url: "https://github.com/AryaLabsHQ/bunli",
        external: true,
      },
      {
        icon: <NpmIcon width={16} height={16} />,
        text: "npm",
        url: "https://www.npmjs.com/package/bunli",
        external: true,
      },
    ],
  };
}
