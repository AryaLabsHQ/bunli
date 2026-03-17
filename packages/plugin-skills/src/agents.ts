import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

/** Agent configuration for skill installation. */
export interface Agent {
  /** Display name. */
  name: string
  /** Absolute path to the global skills directory. */
  globalSkillsDir: string
  /** Project-relative skills directory path. */
  projectSkillsDir: string
  /** Whether this agent uses the canonical `.agents/skills` path. */
  universal: boolean
  /** Checks if the agent is installed on the system. */
  detect(): boolean
}

const home = os.homedir()
const configHome = process.env.XDG_CONFIG_HOME || path.join(home, '.config')
const claudeHome = process.env.CLAUDE_CONFIG_DIR?.trim() || path.join(home, '.claude')
const codexHome = process.env.CODEX_HOME?.trim() || path.join(home, '.codex')

/** All known agent definitions. */
export const builtinAgents: Agent[] = [
  // Universal agents (project skillsDir = .agents/skills)
  {
    name: 'Amp',
    globalSkillsDir: path.join(configHome, 'agents', 'skills'),
    projectSkillsDir: '.agents/skills',
    universal: true,
    detect: () => fs.existsSync(path.join(configHome, 'amp')),
  },
  {
    name: 'Cline',
    globalSkillsDir: path.join(home, '.agents', 'skills'),
    projectSkillsDir: '.agents/skills',
    universal: true,
    detect: () => fs.existsSync(path.join(home, '.cline')),
  },
  {
    name: 'Codex',
    globalSkillsDir: path.join(codexHome, 'skills'),
    projectSkillsDir: '.agents/skills',
    universal: true,
    detect: () => fs.existsSync(codexHome),
  },
  {
    name: 'Cursor',
    globalSkillsDir: path.join(home, '.cursor', 'skills'),
    projectSkillsDir: '.agents/skills',
    universal: true,
    detect: () => fs.existsSync(path.join(home, '.cursor')),
  },
  {
    name: 'Gemini CLI',
    globalSkillsDir: path.join(home, '.gemini', 'skills'),
    projectSkillsDir: '.agents/skills',
    universal: true,
    detect: () => fs.existsSync(path.join(home, '.gemini')),
  },
  {
    name: 'GitHub Copilot',
    globalSkillsDir: path.join(home, '.copilot', 'skills'),
    projectSkillsDir: '.agents/skills',
    universal: true,
    detect: () => fs.existsSync(path.join(home, '.copilot')),
  },
  {
    name: 'Kimi CLI',
    globalSkillsDir: path.join(configHome, 'agents', 'skills'),
    projectSkillsDir: '.agents/skills',
    universal: true,
    detect: () => fs.existsSync(path.join(home, '.kimi')),
  },
  {
    name: 'OpenCode',
    globalSkillsDir: path.join(configHome, 'opencode', 'skills'),
    projectSkillsDir: '.agents/skills',
    universal: true,
    detect: () => fs.existsSync(path.join(configHome, 'opencode')),
  },

  // Non-universal agents (need symlink from their skills dir to canonical)
  {
    name: 'Claude Code',
    globalSkillsDir: path.join(claudeHome, 'skills'),
    projectSkillsDir: '.claude/skills',
    universal: false,
    detect: () => fs.existsSync(claudeHome),
  },
  {
    name: 'Windsurf',
    globalSkillsDir: path.join(home, '.codeium', 'windsurf', 'skills'),
    projectSkillsDir: '.windsurf/skills',
    universal: false,
    detect: () => fs.existsSync(path.join(home, '.codeium', 'windsurf')),
  },
  {
    name: 'Continue',
    globalSkillsDir: path.join(home, '.continue', 'skills'),
    projectSkillsDir: '.continue/skills',
    universal: false,
    detect: () => fs.existsSync(path.join(home, '.continue')),
  },
  {
    name: 'Roo',
    globalSkillsDir: path.join(home, '.roo', 'skills'),
    projectSkillsDir: '.roo/skills',
    universal: false,
    detect: () => fs.existsSync(path.join(home, '.roo')),
  },
  {
    name: 'Kilo',
    globalSkillsDir: path.join(home, '.kilocode', 'skills'),
    projectSkillsDir: '.kilocode/skills',
    universal: false,
    detect: () => fs.existsSync(path.join(home, '.kilocode')),
  },
  {
    name: 'Goose',
    globalSkillsDir: path.join(configHome, 'goose', 'skills'),
    projectSkillsDir: '.goose/skills',
    universal: false,
    detect: () => fs.existsSync(path.join(configHome, 'goose')),
  },
  {
    name: 'Augment',
    globalSkillsDir: path.join(home, '.augment', 'skills'),
    projectSkillsDir: '.augment/skills',
    universal: false,
    detect: () => fs.existsSync(path.join(home, '.augment')),
  },
  {
    name: 'Trae',
    globalSkillsDir: path.join(home, '.trae', 'skills'),
    projectSkillsDir: '.trae/skills',
    universal: false,
    detect: () => fs.existsSync(path.join(home, '.trae')),
  },
  {
    name: 'Junie',
    globalSkillsDir: path.join(home, '.junie', 'skills'),
    projectSkillsDir: '.junie/skills',
    universal: false,
    detect: () => fs.existsSync(path.join(home, '.junie')),
  },
  {
    name: 'Crush',
    globalSkillsDir: path.join(configHome, 'crush', 'skills'),
    projectSkillsDir: '.crush/skills',
    universal: false,
    detect: () => fs.existsSync(path.join(configHome, 'crush')),
  },
  {
    name: 'Kiro CLI',
    globalSkillsDir: path.join(home, '.kiro', 'skills'),
    projectSkillsDir: '.kiro/skills',
    universal: false,
    detect: () => fs.existsSync(path.join(home, '.kiro')),
  },
  {
    name: 'Qwen Code',
    globalSkillsDir: path.join(home, '.qwen', 'skills'),
    projectSkillsDir: '.qwen/skills',
    universal: false,
    detect: () => fs.existsSync(path.join(home, '.qwen')),
  },
  {
    name: 'OpenHands',
    globalSkillsDir: path.join(home, '.openhands', 'skills'),
    projectSkillsDir: '.openhands/skills',
    universal: false,
    detect: () => fs.existsSync(path.join(home, '.openhands')),
  },
]

/** Detects which agents are installed on the system. */
export function detectAgents(agents: Agent[] = builtinAgents): Agent[] {
  return agents.filter((a) => a.detect())
}
