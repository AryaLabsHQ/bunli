import type { Command, CLIOption } from "../types.js";
import { toJsonSchema, resolveTypeName } from "./schema.js";

/**
 * Generates a compact markdown command index for `--llms`.
 */
export function renderIndex(
  cliName: string,
  commands: Map<string, Command<any, any>>,
  description?: string,
): string {
  const lines: string[] = [`# ${cliName}`];
  if (description) lines.push("", description);
  lines.push("");
  lines.push("| Command | Description |");
  lines.push("|---------|-------------|");

  for (const [name, cmd] of getTopLevelCommands(commands)) {
    const signature = buildSignature(cliName, name, cmd);
    lines.push(`| \`${signature}\` | ${cmd.description ?? ""} |`);
  }

  lines.push(
    "",
    `Run \`${cliName} --llms-full\` for full manifest. Run \`${cliName} <command> --help\` for usage details.`,
  );
  return lines.join("\n");
}

/**
 * Generates a full manifest for `--llms-full`.
 */
export function renderFull(
  cliName: string,
  commands: Map<string, Command<any, any>>,
  description?: string,
): string {
  const sections: string[] = [`# ${cliName}`];
  if (description) sections.push(description);

  for (const [name, cmd] of getTopLevelCommands(commands)) {
    sections.push(...collectCommandSections(cliName, name, cmd));
  }

  return sections.join("\n\n");
}

function getTopLevelCommands(
  commands: Map<string, Command<any, any>>,
): Array<[string, Command<any, any>]> {
  const seen = new Set<Command<any, any>>();
  const topLevel: Array<[string, Command<any, any>]> = [];
  for (const [name, cmd] of commands) {
    if (name.includes(" ")) continue;
    if (isAliasName(name, cmd)) continue;
    if (seen.has(cmd)) continue;
    seen.add(cmd);
    topLevel.push([name, cmd]);
  }
  return topLevel;
}

function isAliasName(name: string, cmd: Command<any, any>): boolean {
  if (!cmd.alias) return false;
  const aliases = Array.isArray(cmd.alias) ? cmd.alias : [cmd.alias];
  return aliases.includes(name);
}

function collectCommandSections(
  cliName: string,
  cmdName: string,
  cmd: Command<any, any>,
): string[] {
  const sections = [renderCommandFull(cliName, cmdName, cmd)];
  if (!cmd.commands) return sections;

  for (const sub of cmd.commands) {
    sections.push(...collectCommandSections(cliName, `${cmdName} ${sub.name}`, sub));
  }

  return sections;
}

function buildSignature(cliName: string, cmdName: string, cmd: Command<any, any>): string {
  const base = `${cliName} ${cmdName}`;
  if (!cmd.options || Object.keys(cmd.options).length === 0) return base;
  return `${base} [options]`;
}

function renderCommandFull(cliName: string, cmdName: string, cmd: Command<any, any>): string {
  const fullName = `${cliName} ${cmdName}`;
  const parts: string[] = [];

  let heading = `## ${fullName}`;
  if (cmd.description) heading += `\n\n${cmd.description}`;
  parts.push(heading);

  // Options table
  if (cmd.options && Object.keys(cmd.options).length > 0) {
    const rows: string[] = [];
    for (const [key, opt] of Object.entries(cmd.options)) {
      const option = opt as CLIOption<any>;
      const jsonSchema = toJsonSchema(option.schema);
      const type = resolveTypeName(jsonSchema);
      const def = jsonSchema && jsonSchema.default !== undefined ? String(jsonSchema.default) : "";
      const flag = option.short ? `--${key}, -${option.short}` : `--${key}`;
      const desc = option.description ?? "";
      rows.push(`| \`${flag}\` | \`${type}\` | ${def ? `\`${def}\`` : ""} | ${desc} |`);
    }
    parts.push(
      `### Options\n\n| Flag | Type | Default | Description |\n|------|------|---------|-------------|\n${rows.join("\n")}`,
    );
  }

  // Subcommands
  if (cmd.commands && cmd.commands.length > 0) {
    const rows = cmd.commands.map((sub) => {
      return `| \`${sub.name}\` | ${sub.description ?? ""} |`;
    });
    parts.push(
      `### Subcommands\n\n| Command | Description |\n|---------|-------------|\n${rows.join("\n")}`,
    );
  }

  return parts.join("\n\n");
}

export { toJsonSchema, resolveTypeName } from "./schema.js";
