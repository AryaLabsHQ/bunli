import { Sandbox as CloudflareSandbox } from "@cloudflare/sandbox";
import {
  getWorkbenchSandboxNetwork,
  workbenchConfig,
} from "../api/workbench/constants";

export class Sandbox extends CloudflareSandbox {
  sleepAfter = workbenchConfig.sleepAfter;
  enableInternet = getWorkbenchSandboxNetwork() === "on";
}
