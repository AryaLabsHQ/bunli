import { runTuiRender as runRuntimeTuiRender } from "@bunli/runtime/renderer";

import type { RenderArgs } from "../types.js";

export async function runTuiRender(args: RenderArgs<any, any>): Promise<void> {
  await runRuntimeTuiRender(args);
}
