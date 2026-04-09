#!/usr/bin/env bun
import { createCLI } from "@bunli/core";

import galleryCommand from "./commands/gallery.js";

const cli = await createCLI();

cli.command(galleryCommand);
await cli.run();
