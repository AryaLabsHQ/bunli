'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles } from 'lucide-react';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';

export function Hero() {
  const code = `import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'greet',
  description: 'Greet someone',
  options: {
    name: option(
      z.string().min(1),
      { description: 'Name to greet', short: 'n' }
    ),
    excited: option(
      z.coerce.boolean().default(false),
      { description: 'Add excitement', short: 'e' }
    )
  },
  handler: async ({ flags }) => {
    const greeting = \`Hello, \${flags.name}\${flags.excited ? '!' : '.'}\`
    console.log(greeting)
  }
})`;

  const terminalOutput = `$ greet --name World --excited
Hello, World!`;

  return (
    <section className="relative overflow-hidden px-6 py-24 sm:py-32 lg:px-8">
      {/* Subtle gradient background */}
      <div className="hero-gradient absolute inset-0 pointer-events-none" />
      
      <div className="mx-auto max-w-7xl relative">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="mr-1 h-3 w-3" />
            Built for Bun
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            The Minimal CLI Framework{' '}
            <span className="text-primary">for Bun</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Type-safe, fast, and delightfully simple. Build production-ready CLIs 
            with zero configuration and full TypeScript support.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/docs/getting-started">
              <Button size="lg" className="gap-2">
                Start Building
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/docs">
              <Button variant="outline" size="lg">
                View Docs
              </Button>
            </Link>
          </div>
        </div>

        {/* Interactive Code Example */}
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="grid gap-4">
            {/* Code Display */}
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <span className="ml-2 text-sm text-muted-foreground">greet.ts</span>
              </div>
              <DynamicCodeBlock
                code={code}
                lang="typescript"
              />
            </div>

            {/* Terminal Output */}
            <div className="rounded-lg border bg-black">
              <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <span className="ml-2 text-sm text-gray-400">Terminal</span>
              </div>
              <div className="p-4">
                <pre className="font-mono text-sm text-green-400">{terminalOutput}</pre>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            ✨ Full TypeScript support with automatic type inference
          </p>
        </div>
      </div>
    </section>
  );
}