"use client";

import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { useEffect, useRef, useState } from "react";

const traditionalCode = `// traditional-cli.js
const yargs = require('yargs')
const { hideBin } = require('yargs/helpers')

const argv = yargs(hideBin(process.argv))
  .command('greet', 'Greet someone', {
    name: {
      alias: 'n',
      type: 'string',
      description: 'Name to greet',
      demandOption: true,
    },
    excited: {
      alias: 'e',
      type: 'boolean',
      default: false,
      description: 'Add excitement',
    },
  })
  .help()
  .argv

if (argv._[0] === 'greet') {
  const greeting = \`Hello, \${argv.name}\${argv.excited ? '!' : '.'}\`
  console.log(greeting)
}`;

const bunliCode = `// bunli-cli.ts
import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'greet',
  description: 'Greet someone',
  options: {
    name: option(z.string().min(1), {
      description: 'Name to greet',
      short: 'n',
    }),
    excited: option(z.coerce.boolean().default(false), {
      description: 'Add excitement',
      short: 'e',
    }),
  },
  handler: async ({ flags }) => {
    const greeting = \`Hello, \${flags.name}\${flags.excited ? '!' : '.'}\`
    console.log(greeting)
  },
})`;

function CodePane({
  title,
  code,
  lang,
  isActive,
  delay = 0,
}: {
  title: string;
  code: string;
  lang: string;
  isActive: boolean;
  delay?: number;
}) {
  return (
    <div
      className={`bg-terminal border-terminal-border min-w-0 flex-1 border transition-all duration-500 ${
        isActive ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Terminal header */}
      <div className="border-terminal-border flex items-center gap-3 border-b px-4 py-2">
        <span className="text-terminal-muted font-mono text-xs">{title}</span>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto p-4 [&_figure]:!m-0 [&_figure]:!border-0 [&_pre]:!m-0 [&_pre]:!bg-transparent [&_pre]:!p-0">
        <DynamicCodeBlock code={code} lang={lang} />
      </div>
    </div>
  );
}

export function CodeComparison() {
  const [isVisible, setIsVisible] = useState(false);
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

  return (
    <section ref={sectionRef} className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div
          className={`mb-12 transition-all duration-500 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <div className="text-terminal-muted mb-2 font-mono text-sm">
            <span className="text-accent">{">"}</span> comparing approaches
          </div>
          <h2 className="text-foreground font-mono text-2xl md:text-3xl">
            less boilerplate, more building
          </h2>
        </div>

        {/* Code panes - side by side on desktop, stacked on mobile */}
        <div className="flex flex-col gap-4 lg:flex-row">
          <CodePane
            title="traditional-cli.js"
            code={traditionalCode}
            lang="javascript"
            isActive={isVisible}
            delay={100}
          />
          <CodePane
            title="bunli-cli.ts"
            code={bunliCode}
            lang="typescript"
            isActive={isVisible}
            delay={250}
          />
        </div>

        {/* Stats as terminal output */}
        <div
          className={`mt-8 font-mono text-sm transition-all duration-500 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
          style={{ transitionDelay: "400ms" }}
        >
          <div className="bg-terminal border-terminal-border border px-4 py-3">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <span>
                <span className="text-accent">{">"}</span>{" "}
                <span className="text-terminal-muted">plugins:</span>{" "}
                <span className="text-foreground">5 built-in</span>
              </span>
              <span className="text-terminal-border hidden sm:inline">│</span>
              <span>
                <span className="text-terminal-muted">tui:</span>{" "}
                <span className="text-foreground">React-powered</span>
              </span>
              <span className="text-terminal-border hidden sm:inline">│</span>
              <span>
                <span className="text-terminal-muted">toolchain:</span>{" "}
                <span className="text-foreground">full</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
