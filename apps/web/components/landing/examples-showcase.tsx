'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';

const examples = {
  validation: {
    title: 'Schema Validation',
    code: `import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'deploy',
  description: 'Deploy to environment',
  options: {
    env: option(
      z.enum(['dev', 'staging', 'prod']),
      { description: 'Target environment' }
    ),
    port: option(
      z.coerce.number().min(1000).max(9999),
      { description: 'Port number (1000-9999)' }
    ),
    force: option(
      z.coerce.boolean().default(false),
      { description: 'Force deployment', short: 'f' }
    )
  },
  handler: ({ flags }) => {
    // TypeScript knows:
    // flags.env is 'dev' | 'staging' | 'prod'
    // flags.port is number (1000-9999)
    // flags.force is boolean
    console.log(\`Deploying to \${flags.env}:\${flags.port}\`)
  }
})`
  },
  prompts: {
    title: 'Interactive Prompts',
    code: `import { defineCommand } from '@bunli/core'
import { prompt, confirm } from '@bunli/utils'

export default defineCommand({
  name: 'init',
  handler: async () => {
    const name = await prompt({
      message: 'Project name:',
      validate: (value) => value.length > 0
    })
    
    const typescript = await confirm({
      message: 'Use TypeScript?',
      default: true
    })
    
    console.log(\`Creating \${name} with \${
      typescript ? 'TypeScript' : 'JavaScript'
    }\`)
  }
})`
  },
  multiCommand: {
    title: 'Multi-Command CLI',
    code: `import { createCLI } from '@bunli/core'
import dev from './commands/dev'
import build from './commands/build'
import test from './commands/test'

const cli = createCLI({
  name: 'my-tool',
  version: '1.0.0',
  description: 'My awesome CLI tool',
  commands: [dev, build, test]
})

cli.run()`
  },
  testing: {
    title: 'Testing Your CLI',
    code: `import { expect, test } from 'bun:test'
import { runCommand } from '@bunli/test'
import greet from './greet'

test('greet command', async () => {
  const { stdout, exitCode } = await runCommand(greet, {
    flags: { name: 'World' }
  })
  
  expect(stdout).toContain('Hello World')
  expect(exitCode).toBe(0)
})

test('greet with excitement', async () => {
  const { stdout } = await runCommand(greet, {
    flags: { name: 'Bun', excited: true }
  })
  
  expect(stdout).toContain('Hello! Bun')
})`
  }
};

export function ExamplesShowcase() {
  const [activeTab, setActiveTab] = useState('validation');

  return (
    <section className="px-6 py-24 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Powerful Features, Simple API
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to build production-ready CLIs
          </p>
        </div>

        <div className="mx-auto max-w-5xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="validation">Validation</TabsTrigger>
              <TabsTrigger value="prompts">Prompts</TabsTrigger>
              <TabsTrigger value="multiCommand">Multi-Command</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
            </TabsList>
            
            {Object.entries(examples).map(([key, example]) => (
              <TabsContent key={key} value={key} className="mt-6">
                <div className="rounded-lg border bg-card overflow-hidden">
                  <div className="flex items-center gap-2 border-b px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                    </div>
                    <span className="ml-2 text-sm text-muted-foreground">{example.title}</span>
                  </div>
                  <DynamicCodeBlock
                    code={example.code}
                    lang="typescript"
                    filename={`${key}.ts`}
                    className="[&_pre]:!bg-transparent [&_pre]:!p-4"
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </section>
  );
}