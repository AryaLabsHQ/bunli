import path from 'node:path'
import crypto from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

type ExtractedFence = {
  lang: string
  content: string
  fenceIndex: number
}

function isTsLang(lang: string): boolean {
  const l = lang.toLowerCase()
  return l === 'ts' || l === 'tsx' || l === 'typescript'
}

function extractFences(input: string): ExtractedFence[] {
  const lines = input.split(/\r?\n/)
  const out: ExtractedFence[] = []

  let inFence = false
  let fenceLang = ''
  let fenceLines: string[] = []
  let fenceIndex = 0

  for (const line of lines) {
    const open = line.match(/^\s*```([^\n]*)\s*$/)
    if (!inFence && open) {
      inFence = true
      fenceIndex++
      const info = (open[1] ?? '').trim()
      fenceLang = info.split(/\s+/)[0] ?? ''
      fenceLines = []
      continue
    }

    if (inFence && line.match(/^\s*```\s*$/)) {
      out.push({
        lang: fenceLang,
        content: fenceLines.join('\n'),
        fenceIndex,
      })
      inFence = false
      fenceLang = ''
      fenceLines = []
      continue
    }

    if (inFence) fenceLines.push(line)
  }

  return out
}

type VirtualFile = {
  virtualPath: string
  code: string
}

function splitMultiFile(content: string, defaultExt: 'ts' | 'tsx'): VirtualFile[] {
  const lines = content.split(/\r?\n/)

  const markerRe = /^\s*\/\/\s*([^\s]+?\.(?:ts|tsx|js|jsx))\s*$/
  let currentPath: string | null = null
  let buf: string[] = []
  const files: VirtualFile[] = []

  const flush = () => {
    const code = buf.join('\n').trimEnd()
    if (!code) {
      buf = []
      return
    }

    const virtualPath = currentPath ?? `snippet.${defaultExt}`
    files.push({ virtualPath, code })
    buf = []
  }

  for (const line of lines) {
    const m = line.match(markerRe)
    if (m) {
      flush()
      currentPath = m[1]!.replace(/^\.?\//, '')
      continue
    }
    buf.push(line)
  }

  flush()
  return files
}

function ensureModule(code: string): string {
  // Avoid cross-file global collisions when snippets are scripts.
  if (/\b(import|export)\b/.test(code)) return code
  return `${code}\n\nexport {}\n`
}

function shouldTypecheckFence(docRelPath: string, content: string): boolean {
  // Skip fences that are clearly shell/output transcripts or fragments not meant to compile.
  if (/^\s*\$\s+/m.test(content)) return false
  if (/^\s*Usage:\s*$/m.test(content)) return false
  if (/^\s*Validation errors:\s*$/m.test(content)) return false
  if (/\{\s*\.\.\.\s*\}/.test(content)) return false
  if (/\bimport\s*\(/.test(content)) return false
  if (/\bvalibot\b/.test(content)) return false
  if (/\bany-standard-schema-lib\b/.test(content)) return false

  // Skip config/option fragments (reference-style excerpts).
  {
    const firstRealLine = content
      .split(/\r?\n/)
      .map(l => l.trim())
      .find(l => l.length > 0 && !l.startsWith('//') && !l.startsWith('/*'))
    if (firstRealLine && /^options\s*:/.test(firstRealLine)) return false
  }

  const markerRe = /^\s*\/\/\s*([^\s]+?\.(?:ts|tsx|js|jsx))\s*$/m
  const hasMarkers = markerRe.test(content)

  // Heuristic: only typecheck fences that look like real modules.
  if (!/^\s*(import|export)\b/m.test(content)) return false

  // Focus on Bunli core API drift (avoid pulling in unrelated dependency graphs).
  if (!content.includes("@bunli/core")) return false

  // If the snippet references local modules but doesn't include multi-file markers, it's not self-contained.
  if (!hasMarkers && /(from\s+['"]\.{1,2}\/|import\(['"]\.{1,2}\/)/.test(content)) return false

  return true
}

function looksLikeTSX(content: string): boolean {
  // Very lightweight JSX heuristic.
  return (
    /<[A-Za-z][\w-]*(\s|>)/.test(content) &&
    (/\breturn\s*\(/.test(content) || /=>\s*\(/.test(content) || /\breturn\s*</.test(content))
  )
}

async function listDocFiles(): Promise<string[]> {
  const globs = [
    // High-signal docs where copy/paste correctness matters most.
    'apps/web/content/docs/getting-started.mdx',
    'apps/web/content/docs/core-concepts/commands.mdx',
    'apps/web/content/docs/core-concepts/plugins.mdx',
    'apps/web/content/docs/core-concepts/configuration.mdx',
    'apps/web/content/docs/packages/core.mdx',
    'packages/core/README.md',
  ]

  const files = new Set<string>()
  for (const pattern of globs) {
    for await (const p of new Bun.Glob(pattern).scan({ dot: true })) {
      files.add(p)
    }
  }
  return [...files].sort()
}

function shortHash(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex').slice(0, 10)
}

function safeDirName(relPath: string): string {
  // Keep it stable and filesystem-safe.
  return relPath.replace(/[^a-zA-Z0-9._-]+/g, '_')
}

async function main() {
  const repoRoot = process.cwd()
  const outDir = path.join(repoRoot, '.bunli', '_docs-snippets')

  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })

  const docFiles = await listDocFiles()
  const written: string[] = []

  for (const relPath of docFiles) {
    const absPath = path.join(repoRoot, relPath)
    const text = await readFile(absPath, 'utf8')
    const fences = extractFences(text).filter(
      f => isTsLang(f.lang) && shouldTypecheckFence(relPath, f.content)
    )

    for (const fence of fences) {
      const defaultExt =
        fence.lang.toLowerCase() === 'tsx' || looksLikeTSX(fence.content) ? 'tsx' : 'ts'
      const virtualFiles = splitMultiFile(fence.content, defaultExt)
      if (virtualFiles.length === 0) continue

      const groupKey = `${relPath}:${fence.fenceIndex}`
      const groupDir = path.join(outDir, safeDirName(relPath), `block-${fence.fenceIndex}-${shortHash(groupKey)}`)
      await mkdir(groupDir, { recursive: true })

      for (const vf of virtualFiles) {
        const vpath = vf.virtualPath.replace(/^\.?\//, '')
        const fileAbs = path.join(groupDir, vpath)
        await mkdir(path.dirname(fileAbs), { recursive: true })

        const normalized = ensureModule(vf.code)
        await writeFile(fileAbs, normalized, 'utf8')
        written.push(path.relative(repoRoot, fileAbs))
      }
    }
  }

  // Write an isolated tsconfig for snippets.
  const tsconfigPath = path.join(outDir, 'tsconfig.json')
  await writeFile(
    tsconfigPath,
    JSON.stringify(
      {
        compilerOptions: {
          noEmit: true,
          strict: true,
          skipLibCheck: true,
          target: 'ESNext',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          resolvePackageJsonExports: true,
          resolvePackageJsonImports: true,
          jsx: 'react-jsx',
          allowJs: true,
          allowImportingTsExtensions: true,
          verbatimModuleSyntax: true,
          types: ['bun', 'node'],
        },
        include: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
      },
      null,
      2
    ),
    'utf8'
  )

  if (written.length === 0) {
    console.log('[docs-snippets] No TypeScript fences found to typecheck.')
    return
  }

  const result = spawnSync('bunx', ['tsc', '-p', tsconfigPath], {
    stdio: 'inherit',
    env: process.env,
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

await main()
