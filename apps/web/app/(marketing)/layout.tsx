import './marketing.css';
import Link from 'next/link';
import type { ReactNode } from 'react';

function BunliMark() {
  return (
    <svg
      width="22"
      height="22"
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
  );
}

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="marketing dark flex min-h-screen flex-col">
      <a href="#content" className="sr-only focus:not-sr-only focus:p-3">
        Skip to content
      </a>

      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="marketing-container flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <BunliMark />
            <span>Bunli</span>
          </Link>

          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/docs" className="hover:text-foreground">
              Docs
            </Link>
            <a
              href="https://github.com/AryaLabsHQ/bunli"
              className="hover:text-foreground"
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/bunli"
              className="hover:text-foreground"
              rel="noreferrer"
              target="_blank"
            >
              npm
            </a>
          </nav>
        </div>
      </header>

      <div id="content" className="flex-1">
        {children}
      </div>

      <footer className="border-t border-border/60">
        <div className="marketing-container px-6 py-10 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>Copyright {new Date().getFullYear()} Arya Labs, Inc.</div>
            <div className="flex items-center gap-6">
              <Link href="/docs" className="hover:text-foreground">
                Documentation
              </Link>
              <a
                href="https://github.com/AryaLabsHQ/bunli"
                className="hover:text-foreground"
                rel="noreferrer"
                target="_blank"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
