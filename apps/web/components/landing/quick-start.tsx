'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, Copy } from 'lucide-react';

const steps = [
  {
    title: 'Install Bunli',
    command: 'bun add @bunli/core',
    description: 'Add Bunli to your project'
  },
  {
    title: 'Create your first command',
    command: 'bun create bunli my-cli',
    description: 'Scaffold a new CLI project'
  },
  {
    title: 'Run it',
    command: 'bun run my-cli',
    description: 'Start building immediately'
  }
];

export function QuickStart() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <section className="px-6 py-24 sm:py-32 lg:px-8 bg-muted/30">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
            Start Building in 30 Seconds
          </h2>
          
          <div className="space-y-8">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <div className="group relative rounded-lg border bg-card p-4 transition-all hover:border-primary/50">
                    <code className="text-sm">{step.command}</code>
                    <button
                      onClick={() => copyToClipboard(step.command, index)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Copy command"
                    >
                      {copiedIndex === index ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/docs/getting-started">
              <Button size="lg" variant="outline" className="gap-2">
                Read the Full Guide
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}