import './global.css';
import { RootProvider } from 'fumadocs-ui/provider';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Bunli - Complete CLI Development Ecosystem for Bun',
    template: '%s | Bunli',
  },
  description: 'Build production-ready, type-safe CLIs with strong type inference, validation, and cross-platform distribution',
  keywords: ['cli', 'bun', 'typescript', 'command-line', 'terminal', 'developer-tools'],
  authors: [{ name: 'Bunli Team' }],
  openGraph: {
    title: 'Bunli - Complete CLI Development Ecosystem for Bun',
    description: 'Build production-ready, type-safe CLIs with strong type inference, validation, and cross-platform distribution',
    url: 'https://bunli.dev',
    siteName: 'Bunli',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bunli - Complete CLI Development Ecosystem for Bun',
    description: 'Build production-ready, type-safe CLIs with strong type inference, validation, and cross-platform distribution',
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
