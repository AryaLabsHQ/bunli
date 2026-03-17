# @bunli/plugin-ai-detect

**AI agent detection plugin - detects AI coding assistants from environment variables.**

## OVERVIEW

Detects Claude Code, Cursor, Codex, Amp, Gemini CLI, and OpenCode. Extends Bunli's environment info with `isAIAgent` and `aiAgents`.

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Main plugin | `src/index.ts` |
| Detected agents | `AI_AGENTS` array |

## PATTERNS

```typescript
import { aiAgentPlugin } from '@bunli/plugin-ai-detect'

plugins: [aiAgentPlugin({ verbose: true })]
```

## DETECTED AGENTS

| Agent | Environment Variables |
|-------|----------------------|
| claude | `CLAUDECODE`, `CLAUDE_CODE` |
| cursor | `CURSOR_AGENT` |
| codex | `CODEX_CI`, `CODEX_THREAD_ID` |
| amp | `AMP_CURRENT_THREAD_ID` |
| gemini | `GEMINI_CLI` |
| opencode | `OPENCODE=1` |
