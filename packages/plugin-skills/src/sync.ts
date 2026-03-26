import * as fs from 'node:fs'
import * as fsp from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { createHash } from 'node:crypto'
import type { Command } from '@bunli/core'
import type { Agent } from './agents.js'
import { detectAgents, builtinAgents } from './agents.js'
import { generateSkillFile } from './generate.js'

export interface SyncOptions {
  /** Working directory. Defaults to process.cwd(). */
  cwd?: string
  /** Install globally (~/.agents/skills/) instead of project-local. Defaults to true. */
  global?: boolean
  /** Regenerate and reinstall even when content hash matches. */
  force?: boolean
  /** CLI description for the skill. */
  description?: string
  /** Override detected agents. */
  agents?: Agent[]
}

export interface SyncResult {
  /** Canonical install paths. */
  paths: string[]
  /** Per-agent install details. */
  agents: AgentInstall[]
  /** Whether the skill was updated (false if hash matched). */
  updated: boolean
}

export interface AgentInstall {
  agent: string
  path: string
  mode: 'symlink' | 'copy'
}

interface SyncRuntime {
  homeDir(): string
  dataHome(): string
}

interface SyncState {
  hash: string
  agentKey?: string
}

const defaultSyncRuntime: SyncRuntime = {
  homeDir: () => os.homedir(),
  dataHome: () => process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share')
}

/**
 * Generates SKILL.md and installs to canonical + agent directories.
 * Skips if the hash matches a previous install.
 */
export async function syncSkills(
  cliName: string,
  commands: Map<string, Command<any, any>>,
  options: SyncOptions = {},
  runtime: SyncRuntime = defaultSyncRuntime
): Promise<SyncResult> {
  const {
    global: isGlobal = true,
    force = false,
    description,
    cwd = process.cwd()
  } = options
  const canonicalBase = path.join(isGlobal ? runtime.homeDir() : cwd, '.agents', 'skills')
  const cacheKey = stalenessCacheKey(cliName, isGlobal, cwd, canonicalBase)
  const skillName = cliName.replace(/\s+/g, '-')
  const canonicalDir = path.join(canonicalBase, skillName)
  const detected = options.agents ?? detectAgents(builtinAgents)
  const agentKey = computeAgentKey(detected, canonicalDir, skillName, isGlobal, cwd)

  // Generate content and hash
  const content = generateSkillFile(cliName, commands, { description })
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 16)

  // Check staleness
  const prevState = readState(cacheKey, runtime)
  if (!force && prevState?.hash === hash && prevState.agentKey === agentKey) {
    return { paths: [], agents: [], updated: false }
  }

  // Write to canonical location
  await fsp.mkdir(canonicalDir, { recursive: true })
  await fsp.writeFile(path.join(canonicalDir, 'SKILL.md'), content)
  const paths = [canonicalDir]

  // Create symlinks for non-universal agents
  const agentInstalls: AgentInstall[] = []

  for (const agent of detected) {
    const agentSkillsDir = isGlobal
      ? agent.globalSkillsDir
      : path.join(cwd, agent.projectSkillsDir)
    const agentDir = path.join(agentSkillsDir, skillName)

    if (agentDir === canonicalDir) continue

    try {
      rmForce(agentDir)
      fs.mkdirSync(path.dirname(agentDir), { recursive: true })
      const realLinkDir = resolveParent(path.dirname(agentDir))
      const realTarget = resolveParent(canonicalDir)
      const rel = path.relative(realLinkDir, realTarget)
      fs.symlinkSync(rel, agentDir)
      agentInstalls.push({ agent: agent.name, path: agentDir, mode: 'symlink' })
    } catch {
      // Fallback to copy
      try {
        fs.cpSync(canonicalDir, agentDir, { recursive: true })
        agentInstalls.push({ agent: agent.name, path: agentDir, mode: 'copy' })
      } catch { /* skip agent */ }
    }
  }

  // Write hash for staleness detection
  writeState(cacheKey, { hash, agentKey }, runtime)

  return { paths, agents: agentInstalls, updated: true }
}

function stalenessCacheKey(
  name: string,
  isGlobal: boolean,
  cwd: string,
  canonicalBase: string
): string {
  const scope = isGlobal
    ? `global:${path.resolve(canonicalBase)}`
    : `local:${path.resolve(cwd)}`
  const scopeHash = createHash('sha256').update(scope).digest('hex').slice(0, 8)
  return `${name}-${scopeHash}`
}

/** Returns the hash file path for a sync target. */
function hashPath(cacheKey: string, runtime: SyncRuntime): string {
  const dir = runtime.dataHome()
  return path.join(dir, 'bunli', `${cacheKey}-skills.json`)
}

function computeAgentKey(
  agents: Agent[],
  canonicalDir: string,
  skillName: string,
  isGlobal: boolean,
  cwd: string
): string {
  const targets = agents
    .map((agent) => isGlobal ? path.join(agent.globalSkillsDir, skillName) : path.join(cwd, agent.projectSkillsDir, skillName))
    .filter((target) => target !== canonicalDir)
    .sort()
  return createHash('sha256').update(JSON.stringify(targets)).digest('hex').slice(0, 16)
}

function writeState(
  cacheKey: string,
  state: SyncState,
  runtime: SyncRuntime = defaultSyncRuntime
) {
  const file = hashPath(cacheKey, runtime)
  const dir = path.dirname(file)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(file, JSON.stringify({ ...state, at: new Date().toISOString() }) + '\n')
}

function readState(cacheKey: string, runtime: SyncRuntime = defaultSyncRuntime): SyncState | undefined {
  try {
    const data = JSON.parse(fs.readFileSync(hashPath(cacheKey, runtime), 'utf-8'))
    if (typeof data?.hash !== 'string') return undefined
    return {
      hash: data.hash,
      agentKey: typeof data.agentKey === 'string' ? data.agentKey : undefined
    }
  } catch {
    return undefined
  }
}

function rmForce(target: string) {
  try {
    const stat = fs.lstatSync(target)
    if (stat.isSymbolicLink()) fs.unlinkSync(target)
    else fs.rmSync(target, { recursive: true, force: true })
  } catch { /* does not exist */ }
}

function resolveParent(dir: string): string {
  try {
    return fs.realpathSync(dir)
  } catch {
    const parent = path.dirname(dir)
    if (parent === dir) return dir
    try {
      return path.join(fs.realpathSync(parent), path.relative(parent, dir))
    } catch {
      return dir
    }
  }
}
