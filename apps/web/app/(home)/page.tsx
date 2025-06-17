import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Terminal, 
  Zap, 
  Package, 
  Shield,
  Sparkles,
  Code2,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Rocket
} from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="mr-1 h-3 w-3" />
              Built for Bun
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              The Complete CLI Development{' '}
              <span className="text-primary">Ecosystem</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Build production-ready, type-safe CLIs with strong type inference, 
              validation, and cross-platform distribution. Zero dependencies, 
              maximum performance.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/docs/getting-started">
                <Button size="lg" className="gap-2">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button variant="outline" size="lg">
                  View Documentation
                </Button>
              </Link>
            </div>
          </div>

          {/* Code Preview */}
          <div className="mx-auto mt-16 max-w-3xl">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="ml-2 text-sm text-muted-foreground">cli.ts</span>
              </div>
              <pre className="text-sm"><code>{`import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'deploy',
  options: {
    env: option(
      z.enum(['dev', 'staging', 'prod']),
      { description: 'Target environment' }
    )
  },
  handler: async ({ flags, shell }) => {
    await shell\`git push \${flags.env} main\`
    console.log(\`✅ Deployed to \${flags.env}\`)
  }
})`}</code></pre>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-24 sm:py-32 lg:px-8 bg-muted/30">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything You Need
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From scaffolding to distribution, Bunli has you covered
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Type-Safe by Default</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Full TypeScript support with automatic type inference. 
                No manual type annotations needed.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Zero Dependencies</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Pure Bun/TypeScript implementation. No external dependencies 
                means faster installs and smaller bundles.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Schema Validation</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Built-in Standard Schema support. Use Zod, Valibot, or any 
                validation library you prefer.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Terminal className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Bun Shell Native</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                First-class Bun Shell integration for running commands with 
                automatic escaping and piping.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Code2 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Interactive Prompts</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Beautiful prompts, spinners, and colors. Build interactive 
                CLIs with great user experience.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Rocket className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Production Ready</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Automated builds, GitHub releases, and cross-platform 
                distribution out of the box.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
              Get Started in Seconds
            </h2>
            
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Create a new CLI project</h3>
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <code className="text-sm">bunx create-bunli my-cli</code>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Start development</h3>
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <code className="text-sm">cd my-cli && bunli dev</code>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Build for production</h3>
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <code className="text-sm">bunli build --all</code>
                  </div>
                </div>
              </div>
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

      {/* Ecosystem */}
      <section className="px-6 py-24 sm:py-32 lg:px-8 bg-muted/30">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Complete Ecosystem
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Everything you need to build, test, and distribute CLIs
            </p>
          </div>

          <div className="mx-auto max-w-5xl space-y-4">
            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">@bunli/core</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    The core CLI framework with type-safe command definitions
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="secondary">TypeScript</Badge>
                    <Badge variant="secondary">Zero deps</Badge>
                  </div>
                </div>
                <Link href="/docs/packages/core">
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">@bunli/utils</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Prompts, spinners, colors, and formatting utilities
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="secondary">Interactive</Badge>
                    <Badge variant="secondary">TTY aware</Badge>
                  </div>
                </div>
                <Link href="/docs/packages/utils">
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">@bunli/test</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Comprehensive testing utilities for CLI applications
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="secondary">Mock prompts</Badge>
                    <Badge variant="secondary">Test matchers</Badge>
                  </div>
                </div>
                <Link href="/docs/packages/test">
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">create-bunli</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Scaffold new CLI projects with templates
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="secondary">Templates</Badge>
                    <Badge variant="secondary">External repos</Badge>
                  </div>
                </div>
                <Link href="/docs/packages/create-bunli">
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">bunli</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    CLI toolchain for development, building, and releasing
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="secondary">Hot reload</Badge>
                    <Badge variant="secondary">Multi-platform</Badge>
                  </div>
                </div>
                <Link href="/docs/packages/cli">
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Ready to Build Your CLI?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join developers building fast, type-safe CLIs with Bunli
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/docs/getting-started">
                <Button size="lg" className="gap-2">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="https://github.com/AryaLabsHQ/bunli">
                <Button size="lg" variant="outline" className="gap-2">
                  <GitBranch className="h-4 w-4" />
                  View on GitHub
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}