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

/**
 * Generates SKILL.md and installs to canonical + agent directories.
 * Skips if the hash matches a previous install.
 */
export async function syncSkills(
  cliName: string,
  commands: Map<string, Command<any, any>>,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const { global: isGlobal = true, description, cwd = process.cwd() } = options
  const base = isGlobal ? os.homedir() : cwd
  const canonicalBase = path.join(base, '.agents', 'skills')

  // Generate content and hash
  const content = generateSkillFile(cliName, commands, { description })
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 16)

  // Check staleness
  const prevHash = readHash(cliName)
  if (prevHash === hash) {
    return { paths: [], agents: [], updated: false }
  }

  const skillName = cliName.replace(/\s+/g, '-')
  const canonicalDir = path.join(canonicalBase, skillName)

  // Write to canonical location
  await fsp.mkdir(canonicalDir, { recursive: true })
  await fsp.writeFile(path.join(canonicalDir, 'SKILL.md'), content)
  const paths = [canonicalDir]

  // Create symlinks for non-universal agents
  const detected = options.agents ?? detectAgents(builtinAgents)
  const agentInstalls: AgentInstall[] = []

  for (const agent of detected) {
    if (agent.universal) continue
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
  writeHash(cliName, hash)

  return { paths, agents: agentInstalls, updated: true }
}

/** Returns the hash file path for a CLI. */
function hashPath(name: string): string {
  const dir = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share')
  return path.join(dir, 'bunli', `${name}-skills.json`)
}

function writeHash(name: string, hash: string) {
  const file = hashPath(name)
  const dir = path.dirname(file)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(file, JSON.stringify({ hash, at: new Date().toISOString() }) + '\n')
}

function readHash(name: string): string | undefined {
  try {
    const data = JSON.parse(fs.readFileSync(hashPath(name), 'utf-8'))
    return data.hash
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
