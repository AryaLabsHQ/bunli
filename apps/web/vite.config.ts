import { fileURLToPath } from "node:url";

import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import mdx from "fumadocs-mdx/vite";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const appRoot = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig(async ({ mode }) => {
  const isTest = mode === "test";

  return {
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
