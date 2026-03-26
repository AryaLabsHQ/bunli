import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A declarative step to run after scaffolding completes.
 * Steps are executed sequentially in array order by {@link runSteps}.
 */
export type Step =
  | { readonly type: 'install' }
  | { readonly type: 'git-init'; readonly commit?: string }
  | { readonly type: 'open-editor' }
  | { readonly type: 'command'; readonly cmd: string; readonly cwd?: string }

export type PackageManager = 'bun' | 'npm' | 'pnpm' | 'yarn'

const LOCKFILE_MAP: ReadonlyArray<readonly [string, PackageManager]> = [
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['package-lock.json', 'npm'],
] as const

/**
 * Detect the package manager for a project directory.
 *
 * 1. Lockfile probe (bun -> pnpm -> yarn -> npm)
 * 2. npm_config_user_agent environment variable
 * 3. Default to "bun" (this is a Bun-first framework)
 */
export function detectPackageManager(cwd?: string): PackageManager {
  const dir = cwd ?? process.cwd()

  for (const [lockfile, manager] of LOCKFILE_MAP) {
    if (existsSync(join(dir, lockfile))) {
      return manager
    }
  }

  const userAgent = process.env.npm_config_user_agent
  if (userAgent) {
    if (userAgent.startsWith('bun')) return 'bun'
    if (userAgent.startsWith('pnpm')) return 'pnpm'
    if (userAgent.startsWith('yarn')) return 'yarn'
    if (userAgent.startsWith('npm')) return 'npm'
  }

  return 'bun'
}

/**
 * Check whether a directory is inside an existing git repository.
 */
export function isInGitRepo(cwd?: string): boolean {
  try {
    const result = Bun.spawnSync(
      ['git', 'rev-parse', '--is-inside-work-tree'],
      { cwd: cwd ?? process.cwd(), stdout: 'ignore', stderr: 'ignore' }
    )
    return result.exitCode === 0
  } catch {
    return false
  }
}

/**
 * Execute an array of post-scaffold steps sequentially.
 * If any step fails, the error propagates immediately (remaining steps are skipped).
 */
export async function runSteps(dir: string, steps: Step[]): Promise<void> {
  for (const step of steps) {
    switch (step.type) {
      case 'install':
        await runInstall(dir)
        break
      case 'git-init':
        await runGitInit(dir, step.commit)
        break
      case 'open-editor':
        await runOpenEditor(dir)
        break
      case 'command':
        await runCommand(step.cmd, step.cwd ?? dir)
        break
    }
  }
}

async function runInstall(cwd: string): Promise<void> {
  const pm = detectPackageManager(cwd)
  const proc = Bun.spawn([pm, 'install'], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const exitCode = await proc.exited
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text()
    throw new Error(`"${pm} install" exited with code ${exitCode}${stderr ? `: ${stderr.trim()}` : ''}`)
  }
}

async function runGitInit(cwd: string, commit?: string): Promise<void> {
  await spawnChecked(['git', 'init'], cwd, 'git init')

  if (commit) {
    await ensureGitIdentity(cwd)
    await spawnChecked(['git', 'add', '.'], cwd, 'git add')
    await spawnChecked(['git', 'commit', '-m', commit], cwd, 'git commit')
  }
}

async function runOpenEditor(cwd: string): Promise<void> {
  const editor = process.env.EDITOR || 'code'

  try {
    const proc = Bun.spawn([editor, cwd], {
      stdout: 'ignore',
      stderr: 'ignore',
    })
    const raceResult = await Promise.race([
      proc.exited.then((code) => ({ kind: 'exited' as const, code })),
      new Promise<{ kind: 'timeout' }>((resolve) =>
        setTimeout(() => resolve({ kind: 'timeout' }), 500)
      ),
    ])

    if (raceResult.kind === 'exited' && raceResult.code !== 0) {
      console.warn(`Warning: could not open editor "${editor}" (exit code ${raceResult.code})`)
    }
  } catch {
    console.warn(`Warning: could not open editor "${editor}"`)
  }
}

export function getCommandSpawnArgs(cmd: string, platform: NodeJS.Platform = process.platform): string[] {
  return platform === 'win32'
    ? ['cmd', '/d', '/s', '/c', cmd]
    : ['sh', '-c', cmd]
}

async function runCommand(cmd: string, cwd: string): Promise<void> {
  const proc = Bun.spawn(getCommandSpawnArgs(cmd), {
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const exitCode = await proc.exited
  if (exitCode !== 0) {
    throw new Error(`Command "${cmd}" exited with code ${exitCode}`)
  }
}

async function ensureGitIdentity(cwd: string): Promise<void> {
  const hasName = Bun.spawnSync(['git', 'config', 'user.name'], { cwd }).exitCode === 0
  const hasEmail = Bun.spawnSync(['git', 'config', 'user.email'], { cwd }).exitCode === 0

  if (!hasName) {
    await spawnChecked(['git', 'config', 'user.name', 'Bunli'], cwd, 'git config user.name')
  }
  if (!hasEmail) {
    await spawnChecked(
      ['git', 'config', 'user.email', 'bunli@scaffolded.project'],
      cwd,
      'git config user.email'
    )
  }
}

async function spawnChecked(cmd: string[], cwd: string, label: string): Promise<void> {
  const proc = Bun.spawn(cmd, {
    cwd,
    stdout: 'ignore',
    stderr: 'pipe',
  })
  const exitCode = await proc.exited
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text()
    throw new Error(
      `"${label}" failed with exit code ${exitCode}${stderr ? `: ${stderr.trim()}` : ''}`
    )
  }
}
