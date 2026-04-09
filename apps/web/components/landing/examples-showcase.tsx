"use client";

import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { useEffect, useRef, useState } from "react";

interface Example {
  id: string;
  key: string;
  label: string;
  filename: string;
  code: string;
}

const examples: Example[] = [
  {
    id: "command",
    key: "1",
    label: "command",
    filename: "greet.ts",
    code: `import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'greet',
  description: 'Greet someone',
  version: '1.0.0',
  arguments: [
    {
      name: 'name',
      description: 'Name to greet',
      required: true,
      schema: z.string().min(1),
    },
  ],
  options: [
    option(z.boolean(), {
      name: 'excited',
      short: 'e',
      description: 'Add excitement',
    }),
  ],
  handler({ args, flags }) {
    const suffix = flags.excited ? '!' : '.'
    console.log(\`Hello, \${args.name}\${suffix}\`)
  },
})`,
  },
  {
    id: "plugins",
    key: "2",
    label: "plugins",
    filename: "config-plugin.ts",
    code: `import { createPlugin } from '@bunli/core/plugin'
import { configMergerPlugin } from '@bunli/plugin-config'

const configPlugin = createPlugin({
  name: 'config',
  setup(ctx) {
    ctx.registerCommand(configCommand)
  },
  beforeCommand({ store }) {
    if (store.requiresAuth && !store.authenticated) {
      throw new Error('Authentication required. Run: my-cli login')
    }
  },
})

export default configPlugin`,
  },
  {
    id: "tui",
    key: "3",
    label: "tui",
    filename: "tui-prompt.tsx",
    code: `import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'init',
  description: 'Initialize a new project',
  options: [
    option(z.string(), {
      name: 'name',
      short: 'n',
      description: 'Project name',
    }),
    option(z.enum(['minimal', 'full']), {
      name: 'template',
      short: 't',
      description: 'Project template',
    }),
  ],
  render: {
    // React TUI component — rendered in terminal
    component: InitForm,
    props: {},
  },
})`,
  },
  {
    id: "testing",
    key: "4",
    label: "testing",
    filename: "greet.test.ts",
    code: `import { test, expect } from 'bun:test'
import { testCommand } from '@bunli/test'
import greet from './greet'

test('greet outputs correct message', async () => {
  const result = await testCommand(greet, {
    args: ['World'],
    flags: { excited: false },
  })

  expect(result.stdout).toBe('Hello, World.')
  expect(result.exitCode).toBe(0)
})

test('greet with excitement', async () => {
  const result = await testCommand(greet, {
    args: ['Bunli'],
    flags: { excited: true },
  })

  expect(result.stdout).toBe('Hello, Bunli!')
  expect(result.exitCode).toBe(0)
})

test('greet validates name', async () => {
  const result = await testCommand(greet, {
    args: [''],
    flags: { excited: false },
  })

  expect(result.exitCode).not.toBe(0)
})`,
  },
];

function shouldIgnoreHotkey(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) {
    return true;
  }

  return Boolean(target.closest('[role="textbox"], .monaco-editor'));
}

export function ExamplesShowcase() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeExample, setActiveExample] = useState(examples[0]);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreHotkey(e.target)) {
        return;
      }

      const key = e.key;
      const example = examples.find((ex) => ex.key === key);
      if (example) {
        setActiveExample(example);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div
          className={`mb-12 transition-all duration-500 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <div className="text-terminal-muted mb-2 font-mono text-sm">
            <span className="text-accent">{">"}</span> examples
          </div>
          <h2 className="text-foreground font-mono text-2xl md:text-3xl">see it in action</h2>
        </div>

        {/* Terminal with tabs */}
        <div
          className={`bg-terminal border-terminal-border border transition-all duration-500 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
          style={{ transitionDelay: "150ms" }}
        >
          {/* Tab navigation */}
          <div className="border-terminal-border flex items-center overflow-x-auto border-b">
            {examples.map((example) => (
              <button
                key={example.id}
                onClick={() => setActiveExample(example)}
                className={`-mb-px shrink-0 border-b-2 px-4 py-3 font-mono text-xs transition-colors ${
                  activeExample.id === example.id
                    ? "text-accent border-accent"
                    : "text-terminal-muted hover:text-terminal-foreground border-transparent"
                }`}
              >
                <span className="text-terminal-muted mr-1">[{example.key}]</span>
                {example.label}
              </button>
            ))}
          </div>

          {/* Filename bar */}
          <div className="border-terminal-border flex items-center gap-3 border-b bg-black/20 px-4 py-2">
            <span className="text-terminal-muted font-mono text-xs">
              ~/examples/{activeExample.filename}
            </span>
          </div>

          {/* Code content */}
          <div className="overflow-x-auto">
            <DynamicCodeBlock code={activeExample.code} lang="typescript" />
          </div>
        </div>

        {/* Keyboard hint */}
        <div
          className={`text-terminal-muted mt-6 text-center font-mono text-sm transition-all duration-500 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDelay: "300ms" }}
        >
          press <span className="text-foreground">[1-4]</span> to switch examples
        </div>
      </div>
    </section>
  );
}
