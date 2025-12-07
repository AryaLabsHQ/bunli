import './global.css';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Bunli - The Minimal CLI Framework for Bun',
    template: '%s | Bunli',
  },
  description: 'Build type-safe CLIs with Bunli. Zero config, full TypeScript support, powered by Bun.',
  keywords: ['cli', 'bun', 'typescript', 'command-line', 'terminal', 'developer-tools', 'type-safe', 'minimal'],
  authors: [{ name: 'Arya Labs, Inc.' }],
  openGraph: {
    title: 'Bunli - The Minimal CLI Framework for Bun',
    description: 'Build type-safe CLIs with zero configuration',
    url: 'https://bunli.dev',
    siteName: 'Bunli',
    type: 'website',
    images: [{ url: '/og-image.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bunli - The Minimal CLI Framework for Bun',
    description: 'Build type-safe CLIs with zero configuration',
    images: ['/og-image.png'],
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen font-sans">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
