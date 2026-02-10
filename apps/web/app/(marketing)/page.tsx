import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CodeCard } from '@/components/marketing/code-card';
import { TerminalCard } from '@/components/marketing/terminal-card';

export default function HomePage() {
  const quickstart = `bunx create-bunli my-cli
cd my-cli
bunli dev`;

  const build = `bunli build --targets all`;

  const minimalCli = `import { createCLI, defineCommand, option } from '@bunli/core'
import { z } from 'zod'

const cli = await createCLI({
  name: 'my-cli',
  version: '0.0.0',
  description: 'Example CLI'
})

cli.command(defineCommand({
  name: 'greet',
  description: 'Greet someone',
  options: {
    name: option(z.string().min(1), { short: 'n', description: 'Name to greet' }),
    excited: option(z.coerce.boolean().default(false), { short: 'e', description: 'Add excitement' })
  },
  handler: async ({ flags }) => {
    console.log(\`Hello, \${flags.name}\${flags.excited ? '!' : '.'}\`)
  }
}))

await cli.run()`;

  const typedExecute = `// After \`bunli dev\` or \`bunli build\`, types are generated into:
//   .bunli/commands.gen.ts
//
// That enables typed programmatic execution:
await cli.execute('greet', { name: 'World', excited: true })`;

  return (
    <main className="flex flex-1 flex-col">
      <section className="px-6 pt-16 pb-10 sm:pt-20">
        <div className="marketing-container">
          <div className="grid items-start gap-10 lg:grid-cols-[1fr,1.15fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/40 px-3 py-1 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Minimal CLI framework for Bun
              </div>

              <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                Ship CLIs that feel native.
                <span className="text-primary"> Stay type-safe.</span>
              </h1>

              <p className="mt-5 max-w-prose text-pretty text-base leading-relaxed text-muted-foreground">
                Bunli is a small, type-first CLI core with a toolchain for dev, builds, and distribution.
                It is designed for copyable code and predictable output.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/docs/getting-started">
                  <Button className="h-10 px-4">Quickstart</Button>
                </Link>
                <Link href="/docs">
                  <Button variant="outline" className="h-10 px-4">
                    Docs
                  </Button>
                </Link>
                <a href="https://github.com/AryaLabsHQ/bunli" target="_blank" rel="noreferrer">
                  <Button variant="ghost" className="h-10 px-3 text-muted-foreground hover:text-foreground">
                    GitHub
                  </Button>
                </a>
              </div>

              <div className="mt-10 grid gap-4">
                <TerminalCard command={quickstart} output={'Watching for changes...\\nReady: my-cli greet --help'} />
                <TerminalCard title="Build" command={build} output="dist/ (multi-target executables)" />
              </div>
            </div>

            <div className="grid gap-4">
              <CodeCard title="Minimal CLI" filename="src/index.ts" code={minimalCli} />
              <CodeCard title="Typed Programmatic Execution" filename="src/automation.ts" code={typedExecute} />
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-14">
        <div className="marketing-container">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="panel p-6">
              <div className="text-sm font-medium">Typed flags, always</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Options are validated with Standard Schema and inferred into your handler. Prefer explicit schemas over
                hidden coercion.
              </p>
            </div>
            <div className="panel p-6">
              <div className="text-sm font-medium">Manifest loading</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Load commands from a manifest for lazy startup. Keep runtime behavior predictable and explicit.
              </p>
            </div>
            <div className="panel p-6">
              <div className="text-sm font-medium">Plugin store, typed</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Plugins can register typed store slices available in command context. No global state required.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="marketing-container">
          <div className="panel p-7 sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr,1fr] lg:items-center">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">A toolchain that stays out of your way</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Use the CLI during development, then compile to platform executables for distribution. Marketing code
                  snippets and docs are kept in sync with drift checks.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/docs/packages/cli">
                    <Button variant="outline" className="h-10 px-4">
                      bunli CLI reference
                    </Button>
                  </Link>
                  <Link href="/docs/core-concepts/commands">
                    <Button variant="ghost" className="h-10 px-3 text-muted-foreground hover:text-foreground">
                      Commands
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="grid gap-3">
                <TerminalCard
                  title="Dev"
                  command="bunli dev greet --name World --excited"
                  output="Hello, World!"
                />
                <TerminalCard title="Run tests" command="bunli test" output="✓ All tests passed" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
