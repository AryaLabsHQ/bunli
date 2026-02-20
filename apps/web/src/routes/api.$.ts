import { createFileRoute } from "@tanstack/react-router";
import apiApp from "../api/app";
import type { CloudflareRequestContext } from "../server";

async function handle({
  request,
  context,
}: {
  request: Request;
  context: CloudflareRequestContext;
}) {
  const { env, ctx } = context.cloudflare;
  return apiApp.fetch(request, env, ctx);
}

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      HEAD: handle,
      GET: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
      OPTIONS: handle,
    },
  },
});
