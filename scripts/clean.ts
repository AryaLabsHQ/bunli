import { $, Glob } from 'bun'

async function clean(globPath: string) {
  const glob = new Glob(globPath)
  for await (const file of glob.scan({ dot: true, onlyFiles: false })) {
    await $`rm -rf ${file}`
  }
}

await clean('.turbo')
await clean('packages/*/dist')
await clean('packages/*/.turbo') 
await clean('packages/*/*.tsbuildinfo')