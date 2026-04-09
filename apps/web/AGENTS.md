# apps/web

**TanStack Start + Cloudflare Workers web app for bunli.dev.**

## OVERVIEW

TanStack Start (SSR/UI routes) + Vite + Cloudflare Workers. Hono API under `/api/*`, Better Auth for auth, Cloudflare Sandbox + Durable Objects for workbench execution, Fumadocs + MDX for docs.

## WHERE TO LOOK

| Task               | Location                |
| ------------------ | ----------------------- |
| Routes             | `src/routes/`           |
| Landing page       | `src/routes/index.tsx`  |
| Docs route         | `src/routes/docs.$.tsx` |
| API catch-all      | `src/routes/api.$.ts`   |
| Hono API           | `src/api/app.ts`        |
| Components         | `components/`           |
| Landing components | `components/landing/`   |
| Content            | `content/`              |
| Docs MDX           | `content/docs/`         |
| Fumadocs config    | `source.config.ts`      |
| Vite config        | `vite.config.ts`        |
| Worker config      | `wrangler.jsonc`        |

## LANDING PAGE COMPONENTS

| Component         | File                                       |
| ----------------- | ------------------------------------------ |
| Hero              | `components/landing/hero.tsx`              |
| Features grid     | `components/landing/features-grid.tsx`     |
| Code comparison   | `components/landing/code-comparison.tsx`   |
| Examples showcase | `components/landing/examples-showcase.tsx` |
| CTA               | `components/landing/cta-section.tsx`       |

## CONTENT MANAGEMENT

- MDX files with frontmatter in `content/docs/`
- Navigation via `meta.json` files
- Fumadocs processes MDX (see `source.config.ts`)
- Dynamic docs routing: `src/routes/docs.$.tsx`
- Search API: `src/api/app.ts` (Hono, `/api/search`)

## COMMANDS

```bash
cd apps/web
bun run dev      # playground assets + portless run --name bunli vite dev
bun run build    # playground assets + vite build (dev mode)
bun run deploy   # bun run build:production && wrangler deploy
```

## DEPLOYMENT

- Cloudflare Workers via `wrangler deploy`
- Worker config in `wrangler.jsonc`
- Generate CF types: `bun run cf-typegen`
- Local dev uses `.env.local` (gitignored)
