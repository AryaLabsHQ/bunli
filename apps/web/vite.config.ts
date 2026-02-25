import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import mdx from "fumadocs-mdx/vite";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig(async ({ mode }) => {
  const isTest = mode === "test";

  return {
    server: {
      port: 3080,
      allowedHosts: ["localhost", "127.0.0.1"],
    },
    resolve: {
      alias: {
        "@": appRoot,
      },
    },
    plugins: [
      viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
      ...(isTest ? [] : [cloudflare({ viteEnvironment: { name: "ssr" } })]),
      mdx(await import("./source.config")),
      tailwindcss(),
      tanstackStart({
        srcDirectory: "src",
        start: { entry: "./start.tsx" },
        server: { entry: "./server.ts" },
      }),
      viteReact(),
    ],
  };
});
