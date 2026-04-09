import { defineConfig, type BunliConfig, type BunliConfigInput } from "@bunli/core";

const config: BunliConfigInput = {
  name: "tui-gallery",
  version: "0.1.0",
  description: "Terminal gallery for Bunli UI components and runtime recipes",
  plugins: [],
  commands: {
    entry: "./cli.ts",
    directory: "./commands",
  },
  build: {
    entry: "./cli.ts",
    outdir: "./dist",
    targets: [],
    compress: false,
    minify: true,
    sourcemap: true,
  },
  tui: {
    renderer: {
      bufferMode: "alternate",
      useMouse: true,
      enableMouseMovement: true,
    },
  },
};

const bunliConfig: BunliConfig = defineConfig(config);

export default bunliConfig;
