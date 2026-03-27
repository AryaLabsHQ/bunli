import type * as Monaco from "monaco-editor";
import { themes } from "./themes.js";

const DEFAULT_EDITOR_SOURCE = `import { createCLI, defineCommand, defineOption } from '@bunli/core'
import { z } from 'zod'

const hello = defineCommand({
  name: 'hello',
  description: 'Say hello',
  options: {
    name: defineOption(z.string().default('bunli'), { short: 'n' }),
    excited: defineOption(z.boolean().default(false), { short: 'e' }),
  },
  handler: async ({ flags, colors }) => {
    const suffix = flags.excited ? '!' : '.'
    console.log(colors.green(\`Hello, \${flags.name}\${suffix}\`))
  },
})

if (Bun.argv.length <= 2) {
  Bun.argv.push('hello', '-n', 'bunli')
}

const cli = await createCLI({
  name: 'workbench',
  version: '0.1.0',
  description: 'Runnable bunli workbench demo',
})

cli.command(hello)

await cli.run()
`;

// ---------------------------------------------------------------------------
// 1. Type acquisition — fetch real types from static assets at runtime.
//    Assets are copied to public/playground/ by scripts/copy-playground-assets.ts
// ---------------------------------------------------------------------------

/**
 * Fetch the default editor source from the playground assets.
 * Falls back to a minimal inline example if the fetch fails.
 */
export async function fetchDefaultSource(): Promise<string> {
  try {
    const res = await fetch("/playground/templates/index.ts");
    if (res.ok) return await res.text();
  } catch {
    // offline or asset missing
  }
  return DEFAULT_EDITOR_SOURCE;
}

/**
 * Wrap raw .d.ts content in a `declare module` block.
 * Strips relative imports/exports since Monaco can't resolve them.
 */
function wrapAsModule(moduleName: string, ...sources: string[]): string {
  const combined = sources
    .join("\n")
    .replace(/^.*(?:import|export).*from\s+['"]\.\.?\/.*['"].*$/gm, "")
    .replace(/^.*import\s+type.*from\s+['"]@bunli\/(?:runtime|utils).*['"].*$/gm, "")
    .replace(/^.*import\s+type.*from\s+['"]@standard-schema\/.*['"].*$/gm, "")
    .replace(/^.*import\s+type.*from\s+['"]better-result['"].*$/gm, "")
    .replace(/^\/\/# sourceMappingURL=.*$/gm, "")
    .replace(/StandardSchemaV1/g, "any");

  return `declare module "${moduleName}" {\n${combined}\n}`;
}

/**
 * Minimal zod types — covers the builder API surface used in bunli commands.
 */
const ZOD_MODULE = `
declare module "zod" {
  interface ZodType<Output = any> {
    optional(): ZodType<Output | undefined>;
    default(value: Output): ZodType<Output>;
    describe(description: string): this;
    transform<T>(fn: (val: Output) => T): ZodType<T>;
  }
  interface ZodString extends ZodType<string> {
    min(n: number, msg?: string): ZodString;
    max(n: number, msg?: string): ZodString;
    email(msg?: string): ZodString;
    url(msg?: string): ZodString;
    regex(re: RegExp, msg?: string): ZodString;
  }
  interface ZodNumber extends ZodType<number> {
    min(n: number, msg?: string): ZodNumber;
    max(n: number, msg?: string): ZodNumber;
    int(msg?: string): ZodNumber;
    positive(msg?: string): ZodNumber;
  }
  interface ZodBoolean extends ZodType<boolean> {}
  interface ZodEnum<T extends [string, ...string[]] = [string, ...string[]]> extends ZodType<T[number]> {}
  export const z: {
    string(): ZodString;
    number(): ZodNumber;
    boolean(): ZodBoolean;
    enum<T extends [string, ...string[]]>(values: T): ZodEnum<T>;
    coerce: { string(): ZodString; number(): ZodNumber; boolean(): ZodBoolean };
    object(shape: Record<string, ZodType>): ZodType;
    array(schema: ZodType): ZodType;
    union(types: ZodType[]): ZodType;
    literal(value: string | number | boolean): ZodType;
  };
  export { z as default };
}
`;

type MonacoTypescriptApi = typeof Monaco.typescript;

/**
 * Fetch type definitions from static assets and register with Monaco.
 * Called asynchronously after the editor mounts.
 */
async function fetchAndRegisterTypes(ts: MonacoTypescriptApi): Promise<void> {
  const typeFiles = ["types.d.ts", "cli.d.ts"];
  const sources: string[] = [];

  for (const file of typeFiles) {
    try {
      const res = await fetch(`/playground/types/${file}`);
      if (res.ok) {
        sources.push(await res.text());
      }
    } catch {
      // degrade gracefully
    }
  }

  if (sources.length > 0) {
    const bunliModule = wrapAsModule("@bunli/core", ...sources);
    ts.typescriptDefaults.addExtraLib(bunliModule, "file:///node_modules/@bunli/core/index.d.ts");
  }
}

export function registerExtraLibs(monaco: typeof Monaco): void {
  const ts: MonacoTypescriptApi = monaco.typescript;

  ts.typescriptDefaults.setCompilerOptions({
    target: ts.ScriptTarget?.ESNext ?? 99,
    module: ts.ModuleKind?.ESNext ?? 99,
    moduleResolution: ts.ModuleResolutionKind?.Classic ?? 1,
    allowNonTsExtensions: true,
    allowJs: true,
    strict: true,
    esModuleInterop: true,
    jsx: ts.JsxEmit?.React ?? 2,
  });

  ts.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    diagnosticCodesToIgnore: [
      1375, // top-level await
      1378, // top-level await module option
      2307, // cannot find module (fallback for unresolved imports)
    ],
  });

  // Register zod types synchronously (small, inline)
  ts.typescriptDefaults.addExtraLib(ZOD_MODULE, "file:///node_modules/zod/index.d.ts");

  // Bun globals (minimal)
  ts.typescriptDefaults.addExtraLib(
    `declare var Bun: { argv: string[]; version: string; env: Record<string, string | undefined> };\n` +
    `declare var process: { env: Record<string, string | undefined>; cwd(): string; exit(code?: number): never };\n`,
    "file:///node_modules/@types/bun/globals.d.ts"
  );

  // Fetch real @bunli/core types from static assets (async, non-blocking)
  void fetchAndRegisterTypes(ts);
}

// ---------------------------------------------------------------------------
// 2. Monaco editor themes — one per page theme
// ---------------------------------------------------------------------------

interface ThemeColors {
  bg: string;
  fg: string;
  selection: string;
  lineHighlight: string;
  lineNumber: string;
  lineNumberActive: string;
  cursor: string;
  comment: string;
  keyword: string;
  string: string;
  number: string;
  type: string;
  function: string;
  variable: string;
  constant: string;
  operator: string;
  regexp: string;
}

const THEME_PALETTE: Record<string, ThemeColors> = {
  vesper: {
    bg: "#101010", fg: "#FFFFFF", selection: "#161616", lineHighlight: "#1a1a1a",
    lineNumber: "#505050", lineNumberActive: "#a0a0a0", cursor: "#D3A37B",
    comment: "#505050", keyword: "#D3A37B", string: "#98C379", number: "#FF8080",
    type: "#DBAB93", function: "#FFFFFF", variable: "#F2F2F2", constant: "#FF8080",
    operator: "#A0A0A0", regexp: "#FF9797",
  },
  monokai: {
    bg: "#272822", fg: "#F8F8F2", selection: "#49483E", lineHighlight: "#3E3D32",
    lineNumber: "#75715E", lineNumberActive: "#F8F8F2", cursor: "#F8F8F0",
    comment: "#75715E", keyword: "#F92672", string: "#E6DB74", number: "#AE81FF",
    type: "#66D9EF", function: "#A6E22E", variable: "#F8F8F2", constant: "#AE81FF",
    operator: "#F92672", regexp: "#E6DB74",
  },
  dracula: {
    bg: "#282A36", fg: "#F8F8F2", selection: "#44475A", lineHighlight: "#343746",
    lineNumber: "#6272A4", lineNumberActive: "#F8F8F2", cursor: "#F8F8F2",
    comment: "#6272A4", keyword: "#FF79C6", string: "#F1FA8C", number: "#BD93F9",
    type: "#8BE9FD", function: "#50FA7B", variable: "#F8F8F2", constant: "#BD93F9",
    operator: "#FF79C6", regexp: "#F1FA8C",
  },
  nord: {
    bg: "#2E3440", fg: "#D8DEE9", selection: "#434C5E", lineHighlight: "#3B4252",
    lineNumber: "#4C566A", lineNumberActive: "#D8DEE9", cursor: "#D8DEE9",
    comment: "#616E88", keyword: "#81A1C1", string: "#A3BE8C", number: "#B48EAD",
    type: "#8FBCBB", function: "#88C0D0", variable: "#D8DEE9", constant: "#B48EAD",
    operator: "#81A1C1", regexp: "#EBCB8B",
  },
  catppuccin: {
    bg: "#1E1E2E", fg: "#CDD6F4", selection: "#585B70", lineHighlight: "#313244",
    lineNumber: "#585B70", lineNumberActive: "#CDD6F4", cursor: "#F5E0DC",
    comment: "#6C7086", keyword: "#CBA6F7", string: "#A6E3A1", number: "#FAB387",
    type: "#89B4FA", function: "#89DCEB", variable: "#CDD6F4", constant: "#FAB387",
    operator: "#89DCEB", regexp: "#F9E2AF",
  },
  tokyonight: {
    bg: "#16161E", fg: "#A9B1D6", selection: "#515C7E", lineHighlight: "#1E202E",
    lineNumber: "#3B4261", lineNumberActive: "#A9B1D6", cursor: "#C0CAF5",
    comment: "#565F89", keyword: "#BB9AF7", string: "#9ECE6A", number: "#FF9E64",
    type: "#7DCFFF", function: "#7AA2F7", variable: "#C0CAF5", constant: "#FF9E64",
    operator: "#89DDFF", regexp: "#B4F9F8",
  },
  gruvbox: {
    bg: "#1D2021", fg: "#EBD5B2", selection: "#504945", lineHighlight: "#32302F",
    lineNumber: "#665C54", lineNumberActive: "#EBD5B2", cursor: "#EBD5B2",
    comment: "#928374", keyword: "#FB4934", string: "#B8BB26", number: "#D3869B",
    type: "#83A598", function: "#FABD2F", variable: "#EBD5B2", constant: "#D3869B",
    operator: "#FE8019", regexp: "#B8BB26",
  },
  solarized: {
    bg: "#002B36", fg: "#839496", selection: "#073642", lineHighlight: "#073642",
    lineNumber: "#586E75", lineNumberActive: "#93A1A1", cursor: "#D33682",
    comment: "#586E75", keyword: "#859900", string: "#2AA198", number: "#D33682",
    type: "#268BD2", function: "#B58900", variable: "#839496", constant: "#CB4B16",
    operator: "#859900", regexp: "#DC322F",
  },
  github: {
    bg: "#242A31", fg: "#D1D5DA", selection: "#3B5070", lineHighlight: "#2B3139",
    lineNumber: "#6A737D", lineNumberActive: "#D1D5DA", cursor: "#79B8FF",
    comment: "#6A737D", keyword: "#F97583", string: "#9ECBFF", number: "#79B8FF",
    type: "#B392F0", function: "#E1E4E8", variable: "#D1D5DA", constant: "#79B8FF",
    operator: "#F97583", regexp: "#DBEDFF",
  },
};

function stripHash(hex: string): string {
  return hex.startsWith("#") ? hex.slice(1) : hex;
}

function buildMonacoTheme(colors: ThemeColors): Monaco.editor.IStandaloneThemeData {
  return {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: stripHash(colors.fg), background: stripHash(colors.bg) },
      { token: "comment", foreground: stripHash(colors.comment), fontStyle: "italic" },
      { token: "comment.doc", foreground: stripHash(colors.comment), fontStyle: "italic" },
      { token: "keyword", foreground: stripHash(colors.keyword) },
      { token: "keyword.flow", foreground: stripHash(colors.keyword) },
      { token: "string", foreground: stripHash(colors.string) },
      { token: "string.key.json", foreground: stripHash(colors.variable) },
      { token: "string.value.json", foreground: stripHash(colors.string) },
      { token: "number", foreground: stripHash(colors.number) },
      { token: "number.hex", foreground: stripHash(colors.number) },
      { token: "type", foreground: stripHash(colors.type) },
      { token: "type.identifier", foreground: stripHash(colors.type) },
      { token: "variable", foreground: stripHash(colors.variable) },
      { token: "variable.predefined", foreground: stripHash(colors.constant) },
      { token: "variable.parameter", foreground: stripHash(colors.variable) },
      { token: "constant", foreground: stripHash(colors.constant) },
      { token: "delimiter", foreground: stripHash(colors.fg) },
      { token: "delimiter.bracket", foreground: stripHash(colors.fg) },
      { token: "identifier", foreground: stripHash(colors.fg) },
      { token: "regexp", foreground: stripHash(colors.regexp) },
      { token: "annotation", foreground: stripHash(colors.type) },
      { token: "tag", foreground: stripHash(colors.keyword) },
      { token: "attribute.name", foreground: stripHash(colors.variable) },
      { token: "attribute.value", foreground: stripHash(colors.string) },
      { token: "invalid", foreground: "FF0000" },
      { token: "emphasis", fontStyle: "italic" },
      { token: "strong", fontStyle: "bold" },
    ],
    colors: {
      "editor.background": colors.bg,
      "editor.foreground": colors.fg,
      "editor.selectionBackground": colors.selection,
      "editor.lineHighlightBackground": colors.lineHighlight,
      "editor.lineHighlightBorder": "#00000000",
      "editorLineNumber.foreground": colors.lineNumber,
      "editorLineNumber.activeForeground": colors.lineNumberActive,
      "editorCursor.foreground": colors.cursor,
      "editorIndentGuide.background1": colors.lineHighlight,
      "editorIndentGuide.activeBackground1": colors.lineNumber,
      "editorBracketMatch.background": colors.selection,
      "editorBracketMatch.border": "#00000000",
      "editorWidget.background": colors.bg,
      "editorWidget.border": colors.lineHighlight,
      "editorHoverWidget.background": colors.bg,
      "editorHoverWidget.border": colors.lineHighlight,
      "editorSuggestWidget.background": colors.bg,
      "editorSuggestWidget.border": colors.lineHighlight,
      "editorSuggestWidget.selectedBackground": colors.selection,
      "editorOverviewRuler.border": "#00000000",
      "scrollbarSlider.background": colors.selection + "80",
      "scrollbarSlider.hoverBackground": colors.selection + "B0",
      "scrollbarSlider.activeBackground": colors.selection,
    },
  };
}

export function registerEditorThemes(monaco: typeof Monaco): void {
  for (const theme of themes) {
    const palette = THEME_PALETTE[theme.id];
    if (palette) {
      monaco.editor.defineTheme(`bunli-${theme.id}`, buildMonacoTheme(palette));
    }
  }
}

export function getEditorThemeName(themeId: string): string {
  return `bunli-${themeId}`;
}
