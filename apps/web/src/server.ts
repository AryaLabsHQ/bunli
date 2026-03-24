import handler from "@tanstack/react-start/server-entry";
import apiApp from "./api/app";

export { Sandbox } from "./durable-objects/sandbox";
export { WorkbenchLimiter } from "./durable-objects/workbench-limiter";

export interface CloudflareRequestContext {
  cloudflare: {
    env: Env;
    ctx: ExecutionContext;
  };
}

declare module "@tanstack/react-start" {
  interface Register {
    server: {
      requestContext: CloudflareRequestContext;
    };
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader?.toLowerCase() === "websocket") {
      return apiApp.fetch(request, env, ctx);
    }

    return handler.fetch(request, {
      context: {
        cloudflare: { env, ctx },
      },
    });
  },
};
