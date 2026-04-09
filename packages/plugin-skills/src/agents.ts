import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/** Agent configuration for skill installation. */
export interface Agent {
  /** Display name. */
  name: string;
  /** Absolute path to the global skills directory. */
  globalSkillsDir: string;
  /** Project-relative skills directory path. */
  projectSkillsDir: string;
  /** Whether this agent uses the canonical `.agents/skills` path. */
  universal: boolean;
  /** Checks if the agent is installed on the system. */
  detect(): boolean;
}

const home = os.homedir();
const configHome = process.env.XDG_CONFIG_HOME || path.join(home, ".config");
const claudeHome = process.env.CLAUDE_CONFIG_DIR?.trim() || path.join(home, ".claude");
const codexHome = process.env.CODEX_HOME?.trim() || path.join(home, ".codex");

function openclawGlobalSkillsDir(): string {
  if (fs.existsSync(path.join(home, ".openclaw"))) return path.join(home, ".openclaw/skills");
  if (fs.existsSync(path.join(home, ".clawdbot"))) return path.join(home, ".clawdbot/skills");
  if (fs.existsSync(path.join(home, ".moltbot"))) return path.join(home, ".moltbot/skills");
  return path.join(home, ".openclaw/skills");
}

/** All known agent definitions. */
export const builtinAgents: Agent[] = [
  // ── Universal agents (project skillsDir = .agents/skills) ──
  {
    name: "Amp",
    globalSkillsDir: path.join(configHome, "agents", "skills"),
    projectSkillsDir: ".agents/skills",
    universal: true,
    detect: () => fs.existsSync(path.join(configHome, "amp")),
  },
  {
    name: "Antigravity",
    globalSkillsDir: path.join(home, ".gemini/antigravity/skills"),
    projectSkillsDir: ".agents/skills",
    universal: true,
    detect: () => fs.existsSync(path.join(home, ".gemini/antigravity")),
  },
  {
    name: "Cline",
    globalSkillsDir: path.join(home, ".agents", "skills"),
    projectSkillsDir: ".agents/skills",
    universal: true,
    detect: () => fs.existsSync(path.join(home, ".cline")),
  },
  {
    name: "Codex",
    globalSkillsDir: path.join(codexHome, "skills"),
    projectSkillsDir: ".agents/skills",
    universal: true,
    detect: () => fs.existsSync(codexHome),
  },
  {
    name: "Cursor",
    globalSkillsDir: path.join(home, ".cursor", "skills"),
    projectSkillsDir: ".agents/skills",
    universal: true,
    detect: () => fs.existsSync(path.join(home, ".cursor")),
  },
  {
    name: "Deep Agents",
    globalSkillsDir: path.join(home, ".deepagents/agent/skills"),
    projectSkillsDir: ".agents/skills",
    universal: true,
    detect: () => fs.existsSync(path.join(home, ".deepagents")),
  },
  {
    name: "Gemini CLI",
    globalSkillsDir: path.join(home, ".gemini", "skills"),
    projectSkillsDir: ".agents/skills",
    universal: true,
    detect: () => fs.existsSync(path.join(home, ".gemini")),
  },
  {
    name: "GitHub Copilot",
    globalSkillsDir: path.join(home, ".copilot", "skills"),
    projectSkillsDir: ".agents/skills",
    universal: true,
    detect: () => fs.existsSync(path.join(home, ".copilot")),
  },
  {
    name: "Kimi Code CLI",
    globalSkillsDir: path.join(configHome, "agents", "skills"),
    projectSkillsDir: ".agents/skills",
    universal: true,
    detect: () => fs.existsSync(path.join(home, ".kimi")),
  },
  {
    name: "OpenCode",
    globalSkillsDir: path.join(configHome, "opencode", "skills"),
    projectSkillsDir: ".agents/skills",
    universal: true,
    detect: () => fs.existsSync(path.join(configHome, "opencode")),
  },
  {
    name: "Warp",
    globalSkillsDir: path.join(home, ".agents/skills"),
    projectSkillsDir: ".agents/skills",
    universal: true,
    detect: () => fs.existsSync(path.join(home, ".warp")),
  },

  // ── Non-universal agents ──
  {
    name: "AdaL",
    globalSkillsDir: path.join(home, ".adal/skills"),
    projectSkillsDir: ".adal/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".adal")),
  },
  {
    name: "Augment",
    globalSkillsDir: path.join(home, ".augment/skills"),
    projectSkillsDir: ".augment/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".augment")),
  },
  {
    name: "Claude Code",
    globalSkillsDir: path.join(claudeHome, "skills"),
    projectSkillsDir: ".claude/skills",
    universal: false,
    detect: () => fs.existsSync(claudeHome),
  },
  {
    name: "CodeBuddy",
    globalSkillsDir: path.join(home, ".codebuddy/skills"),
    projectSkillsDir: ".codebuddy/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".codebuddy")),
  },
  {
    name: "Command Code",
    globalSkillsDir: path.join(home, ".commandcode/skills"),
    projectSkillsDir: ".commandcode/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".commandcode")),
  },
  {
    name: "Continue",
    globalSkillsDir: path.join(home, ".continue/skills"),
    projectSkillsDir: ".continue/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".continue")),
  },
  {
    name: "Cortex Code",
    globalSkillsDir: path.join(home, ".snowflake/cortex/skills"),
    projectSkillsDir: ".cortex/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".snowflake/cortex")),
  },
  {
    name: "Crush",
    globalSkillsDir: path.join(configHome, "crush", "skills"),
    projectSkillsDir: ".crush/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(configHome, "crush")),
  },
  {
    name: "Droid",
    globalSkillsDir: path.join(home, ".factory/skills"),
    projectSkillsDir: ".factory/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".factory")),
  },
  {
    name: "Goose",
    globalSkillsDir: path.join(configHome, "goose", "skills"),
    projectSkillsDir: ".goose/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(configHome, "goose")),
  },
  {
    name: "iFlow CLI",
    globalSkillsDir: path.join(home, ".iflow/skills"),
    projectSkillsDir: ".iflow/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".iflow")),
  },
  {
    name: "Junie",
    globalSkillsDir: path.join(home, ".junie/skills"),
    projectSkillsDir: ".junie/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".junie")),
  },
  {
    name: "Kilo Code",
    globalSkillsDir: path.join(home, ".kilocode/skills"),
    projectSkillsDir: ".kilocode/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".kilocode")),
  },
  {
    name: "Kiro CLI",
    globalSkillsDir: path.join(home, ".kiro/skills"),
    projectSkillsDir: ".kiro/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".kiro")),
  },
  {
    name: "Kode",
    globalSkillsDir: path.join(home, ".kode/skills"),
    projectSkillsDir: ".kode/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".kode")),
  },
  {
    name: "MCPJam",
    globalSkillsDir: path.join(home, ".mcpjam/skills"),
    projectSkillsDir: ".mcpjam/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".mcpjam")),
  },
  {
    name: "Mistral Vibe",
    globalSkillsDir: path.join(home, ".vibe/skills"),
    projectSkillsDir: ".vibe/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".vibe")),
  },
  {
    name: "Mux",
    globalSkillsDir: path.join(home, ".mux/skills"),
    projectSkillsDir: ".mux/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".mux")),
  },
  {
    name: "Neovate",
    globalSkillsDir: path.join(home, ".neovate/skills"),
    projectSkillsDir: ".neovate/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".neovate")),
  },
  {
    name: "OpenClaw",
    globalSkillsDir: openclawGlobalSkillsDir(),
    projectSkillsDir: "skills",
    universal: false,
    detect: () =>
      fs.existsSync(path.join(home, ".openclaw")) ||
      fs.existsSync(path.join(home, ".clawdbot")) ||
      fs.existsSync(path.join(home, ".moltbot")),
  },
  {
    name: "OpenHands",
    globalSkillsDir: path.join(home, ".openhands/skills"),
    projectSkillsDir: ".openhands/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".openhands")),
  },
  {
    name: "Pi",
    globalSkillsDir: path.join(home, ".pi/agent/skills"),
    projectSkillsDir: ".pi/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".pi/agent")),
  },
  {
    name: "Pochi",
    globalSkillsDir: path.join(home, ".pochi/skills"),
    projectSkillsDir: ".pochi/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".pochi")),
  },
  {
    name: "Qoder",
    globalSkillsDir: path.join(home, ".qoder/skills"),
    projectSkillsDir: ".qoder/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".qoder")),
  },
  {
    name: "Qwen Code",
    globalSkillsDir: path.join(home, ".qwen/skills"),
    projectSkillsDir: ".qwen/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".qwen")),
  },
  {
    name: "Roo Code",
    globalSkillsDir: path.join(home, ".roo/skills"),
    projectSkillsDir: ".roo/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".roo")),
  },
  {
    name: "Trae",
    globalSkillsDir: path.join(home, ".trae/skills"),
    projectSkillsDir: ".trae/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".trae")),
  },
  {
    name: "Trae CN",
    globalSkillsDir: path.join(home, ".trae-cn/skills"),
    projectSkillsDir: ".trae/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".trae-cn")),
  },
  {
    name: "Windsurf",
    globalSkillsDir: path.join(home, ".codeium/windsurf/skills"),
    projectSkillsDir: ".windsurf/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".codeium", "windsurf")),
  },
  {
    name: "Zencoder",
    globalSkillsDir: path.join(home, ".zencoder/skills"),
    projectSkillsDir: ".zencoder/skills",
    universal: false,
    detect: () => fs.existsSync(path.join(home, ".zencoder")),
  },
];

/** Detects which agents are installed on the system. */
export function detectAgents(agents: Agent[] = builtinAgents): Agent[] {
  return agents.filter((a) => a.detect());
}
