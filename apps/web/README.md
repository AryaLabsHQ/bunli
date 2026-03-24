# @bunli/web

TanStack Start + Cloudflare Workers web app for bunli.dev.

## Stack

- TanStack Start (SSR/UI routes)
- Hono mounted API under `/api/*`
- Better Auth (`/api/auth/*`)
- Cloudflare Sandbox + Durable Objects for workbench execution
- Fumadocs + MDX content under `/docs/*`

## Local development

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
bun run build
```

## Deploy

```bash
bun run deploy
```

The deploy script uses `dist/server/wrangler.json` when TanStack Start generates it, so Worker deploys are deterministic.

## Key routes

- `/` workbench UI (scripted anonymous mode + authenticated sandbox mode)
- `/docs/*` docs pages
- `/api/search` docs search index
- `/api/workbench/*` sandbox control-plane endpoints
- `/api/workbench/pty?sessionId=...` PTY WebSocket endpoint
