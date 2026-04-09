import { describe, expect, test } from "bun:test";

import {
  buildWorkbenchExecCommand,
  getPresetCommand,
  getWorkbenchFilePath,
  getWorkbenchSandboxNetwork,
} from "../src/api/workbench/constants";

describe("workbench constants", () => {
  test("uses runtime env overrides for workspace paths and network mode", () => {
    const env = {
      WORKBENCH_WORKSPACE_DIR: "/tmp/workbench",
      WORKBENCH_SANDBOX_NETWORK: "on",
    };

    expect(getWorkbenchFilePath(env)).toBe("/tmp/workbench/src/index.ts");
    expect(getPresetCommand("framework", env)).toBe("bun run /tmp/workbench/src/index.ts");
    expect(getWorkbenchSandboxNetwork(env)).toBe("on");
  });

  test("renders a shell command with a closed emit_frame function", () => {
    const command = buildWorkbenchExecCommand("framework", "run-1", "token-1");

    expect(command).toContain('"$1"; }');
    expect(command).toContain("\ntrap ");
  });
});
