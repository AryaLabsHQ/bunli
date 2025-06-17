'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';

const traditionalCode = `// 50+ lines of boilerplate
const yargs = require('yargs')
const { hideBin } = require('yargs/helpers')

yargs(hideBin(process.argv))
  .command('serve [port]', 'start server', (yargs) => {
    return yargs
      .positional('port', {
        describe: 'port to bind',
        default: 5000,
        type: 'number'
      })
  }, (argv) => {
    // No type safety
    console.log(\`Server on \${argv.port}\`)
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging'
  })
  .parse()`;

const bunliCode = `// Clean and type-safe
import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'serve',
  description: 'Start the server',
  options: {
    port: option(
      z.coerce.number().default(5000),
      { description: 'Port to bind', short: 'p' }
    ),
    verbose: option(
      z.coerce.boolean().default(false),
      { description: 'Run with verbose logging', short: 'v' }
    )
  },
  handler: ({ flags }) => {
    // flags.port is number
    // flags.verbose is boolean
    console.log(\`Server on \${flags.port}\`)
  }
})`;

export function CodeComparison() {
  const [activeTab, setActiveTab] = useState('bunli');

  return (
    <section className="px-6 py-24 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            See the Difference
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Less boilerplate, more productivity
          </p>
        </div>

        <div className="mx-auto max-w-5xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="traditional">Traditional CLI</TabsTrigger>
              <TabsTrigger value="bunli">With Bunli</TabsTrigger>
            </TabsList>
            
            <TabsContent value="traditional" className="mt-6">
              <div className="rounded-lg border bg-card overflow-hidden">
                <div className="flex items-center gap-2 border-b px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                  </div>
                  <span className="ml-2 text-sm text-muted-foreground">traditional-cli.js</span>
                </div>
                <DynamicCodeBlock
                  code={traditionalCode}
                  lang="javascript"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="bunli" className="mt-6">
              <div className="rounded-lg border bg-card overflow-hidden">
                <div className="flex items-center gap-2 border-b px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                  </div>
                  <span className="ml-2 text-sm text-muted-foreground">bunli-cli.ts</span>
                </div>
                <DynamicCodeBlock
                  code={bunliCode}
                  lang="typescript"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="text-center p-6 rounded-lg bg-muted/30">
              <div className="text-4xl font-bold text-primary">80%</div>
              <div className="mt-2 text-sm text-muted-foreground">Less boilerplate</div>
            </div>
            <div className="text-center p-6 rounded-lg bg-muted/30">
              <div className="text-4xl font-bold text-primary">100%</div>
              <div className="mt-2 text-sm text-muted-foreground">Type safe</div>
            </div>
            <div className="text-center p-6 rounded-lg bg-muted/30">
              <div className="text-4xl font-bold text-primary">10x</div>
              <div className="mt-2 text-sm text-muted-foreground">Faster development</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}