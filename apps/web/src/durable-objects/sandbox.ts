import { Sandbox as CloudflareSandbox } from "@cloudflare/sandbox";
import { WORKBENCH_SLEEP_AFTER } from "../api/workbench/constants";

export class Sandbox extends CloudflareSandbox {
  sleepAfter = WORKBENCH_SLEEP_AFTER;
  enableInternet = false;
}
