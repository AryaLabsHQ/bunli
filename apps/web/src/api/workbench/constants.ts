export const WORKBENCH_WORKSPACE = "/workspace/demo";
export const WORKBENCH_FILE_PATH = `${WORKBENCH_WORKSPACE}/src/index.ts`;
export const WORKBENCH_SRC_DIR = `${WORKBENCH_WORKSPACE}/src`;
export const WORKBENCH_RUN_TIMEOUT_MS = 10_000;
export const WORKBENCH_SLEEP_AFTER = "10m";
export const WORKBENCH_SESSION_TTL_SECONDS = 60 * 30;

export type RunPreset = "framework" | "toolchain";

export const PRESET_COMMANDS: Record<RunPreset, string> = {
  framework: "bun run /workspace/demo/src/index.ts",
  toolchain: "bun --version && bunli --version && bunli --help",
};

export const DEFAULT_SOURCE_FILE = `const timestamp = new Date().toISOString();
const args = Bun.argv.slice(2);

console.log("Hello from bunli sandbox workbench");
console.log("Timestamp:", timestamp);
console.log("Args:", args.length ? args.join(", ") : "(none)");
`;
