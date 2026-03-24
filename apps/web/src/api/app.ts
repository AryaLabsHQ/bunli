import { Hono } from "hono";
import { createFromSource } from "fumadocs-core/search/server";
import { source } from "../lib/source";
import { createAuth } from "./auth/auth";
import { createWorkbenchRouter } from "./workbench/router";

const app = new Hono<{ Bindings: Env }>().basePath("/api");

const searchApi = createFromSource(source);
const workbenchApp = createWorkbenchRouter();

app.get("/health", (c) => {
  return c.json({ status: "ok", service: "bunli-web-api" });
});

app.all("/auth/*", async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

app.get("/search", async (c) => {
  return searchApi.GET(c.req.raw);
});

app.route("/workbench", workbenchApp);

app.notFound((c) => {
  return c.json({ ok: false, code: "NOT_FOUND", message: "API route not found" }, 404);
});

export default app;
