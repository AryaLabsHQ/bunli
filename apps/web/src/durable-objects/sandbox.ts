import { Sandbox as CloudflareSandbox } from "@cloudflare/sandbox";
import { workbenchConfig } from "../api/workbench/constants";

export class Sandbox extends CloudflareSandbox {
  sleepAfter = workbenchConfig.sleepAfter;
  enableInternet = workbenchConfig.sandboxNetwork === "on";
}
