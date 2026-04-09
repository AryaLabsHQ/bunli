import { defineGroup } from "@bunli/core";

import chooseCommand from "./prompt/choose.js";
import confirmCommand from "./prompt/confirm.js";
import fileCommand from "./prompt/file.js";
import filterCommand from "./prompt/filter.js";
import formatCommand from "./prompt/format.js";
import inputCommand from "./prompt/input.js";
import joinCommand from "./prompt/join.js";
import logCommand from "./prompt/log.js";
import pagerCommand from "./prompt/pager.js";
import spinCommand from "./prompt/spin.js";
import styleCommand from "./prompt/style.js";
import writeCommand from "./prompt/write.js";

export default defineGroup({
  name: "shell",
  description: "Shell UI helpers for scripts and terminal workflows",
  commands: [
    confirmCommand,
    chooseCommand,
    filterCommand,
    spinCommand,
    pagerCommand,
    fileCommand,
    styleCommand,
    joinCommand,
    inputCommand,
    writeCommand,
    formatCommand,
    logCommand,
  ],
});
