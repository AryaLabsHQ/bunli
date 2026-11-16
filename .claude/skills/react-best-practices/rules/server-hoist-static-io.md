---
title: Hoist Static I/O to Module Level
impact: HIGH
impactDescription: avoids repeated file/network I/O per request
tags: server, io, performance, server-functions, workers
---

## Hoist Static I/O to Module Level

On Node servers, static asset I/O can run once at module initialization when the assets are shared
across requests. The examples below use Node file I/O. Cloudflare Workers require `fetch` inside a
handler; use the Worker guidance at the end of this rule.

**Node server with repeated file reads:**

```typescript
import { readFile } from "node:fs/promises";

export const generateOgImage = createServerFn({ method: "GET" }).handler(async () => {
  const fontData = await readFile(new URL("./fonts/Inter.woff2", import.meta.url));
  const logoData = await readFile(new URL("./images/logo.png", import.meta.url));

  return renderOgImage({ fontData, logoData });
});
```

**Correct on a Node server: loads once at module initialization**

```typescript
import { readFile } from "node:fs/promises";

const fontData = readFile(new URL("./fonts/Inter.woff2", import.meta.url));
const logoData = readFile(new URL("./images/logo.png", import.meta.url));

export const generateOgImage = createServerFn({ method: "GET" }).handler(async () => {
  const [font, logo] = await Promise.all([fontData, logoData]);
  return renderOgImage({ fontData: font, logoData: logo });
});
```

**General pattern: loading config or templates**

```typescript
// Incorrect: reads config on every call
export async function processRequest(data: Data) {
  const config = JSON.parse(await fs.readFile("./config.json", "utf-8"));
  const template = await fs.readFile("./template.html", "utf-8");
  return render(template, data, config);
}

// Correct: loads once at module level
const configPromise = fs.readFile("./config.json", "utf-8").then(JSON.parse);
const templatePromise = fs.readFile("./template.html", "utf-8");

export async function processRequest(data: Data) {
  const [config, template] = await Promise.all([configPromise, templatePromise]);
  return render(template, data, config);
}
```

**When to use this pattern:**

- Loading fonts for OG image generation
- Loading static logos, icons, or watermarks
- Reading configuration files that don't change at runtime
- Loading email templates or other static templates

**When NOT to use:**

- Assets that vary per request or user
- Files that may change during runtime (use caching with TTL instead)
- Large files that would consume too much memory if kept loaded
- Sensitive data that shouldn't persist in memory

**On Cloudflare Workers:** Import static asset bytes at build time where the bundler supports it, or
fetch them inside the handler. An isolate cache may retain resolved, request-independent bytes. Do
not share in-flight fetch promises or response streams across requests. See the `cloudflare` skill
for request lifetimes and cache ownership.

Reference:
[Cloudflare fetch runtime API](https://developers.cloudflare.com/workers/runtime-apis/fetch/).
