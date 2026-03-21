import type * as Monaco from "monaco-editor";
import { themes } from "./themes.js";

// ---------------------------------------------------------------------------
// 1. Type stubs — gives IntelliSense for bunli, zod, and bun globals
// ---------------------------------------------------------------------------

const BUNLI_TYPES = `
declare module "bunli" {
  import type { ZodType } from "zod";

  export interface CLIOption<S = unknown> {
    schema: S;
    short?: string;
    description?: string;
  }

  export interface CommandMeta {
    name: string;
    description?: string;
    alias?: string | string[];
  }

  export interface HandlerArgs<TFlags = Record<string, unknown>> {
    flags: TFlags;
    positional: string[];
    shell: any;
    env: NodeJS.ProcessEnv;
    cwd: string;
    prompt: {
      confirm(message: string): Promise<boolean>;
    };
    spinner: {
      start(message?: string): void;
      update(message: string): void;
      succeed(message?: string): void;
      fail(message?: string): void;
      stop(): void;
    };
    colors: {
      red(s: string): string;
      green(s: string): string;
      blue(s: string): string;
      yellow(s: string): string;
      cyan(s: string): string;
      magenta(s: string): string;
      bold(s: string): string;
      dim(s: string): string;
      underline(s: string): string;
    };
    signal: AbortSignal;
  }

  export interface CommandDefinition<TOptions extends Record<string, CLIOption> = Record<string, CLIOption>> {
    name: string;
    description?: string;
    alias?: string | string[];
    options?: TOptions;
    handler?: (args: HandlerArgs<{ [K in keyof TOptions]: unknown }>) => void | Promise<void>;
    render?: (args: HandlerArgs<{ [K in keyof TOptions]: unknown }>) => any;
    commands?: CommandDefinition[];
  }

  export interface CLIConfig {
    name: string;
    version?: string;
    description?: string;
    commands?: CommandDefinition[];
    plugins?: any[];
  }

  export interface CLI {
    command(command: CommandDefinition): void;
    run(argv?: string[]): Promise<void>;
    execute(commandName: string, args?: string[]): Promise<void>;
  }

  export function defineCommand<T extends CommandDefinition>(command: T): T;
  export function defineGroup(group: { name: string; description?: string; commands: CommandDefinition[] }): CommandDefinition;
  export function option<S>(schema: S, metadata?: { short?: string; description?: string }): CLIOption<S>;
  export function createCLI(config: CLIConfig): Promise<CLI>;
  export function createPlugin<TOptions = unknown, TStore = {}>(factory: (options: TOptions) => any): (options: TOptions) => any;
  export function createPlugin<TStore = {}>(plugin: any): any;
  export function defineConfig(config: any): any;
}
`;

const ZOD_TYPES = `
declare module "zod" {
  export interface ZodType<Output = any, Def = any, Input = Output> {
    parse(data: unknown): Output;
    safeParse(data: unknown): { success: true; data: Output } | { success: false; error: any };
    optional(): ZodOptional<this>;
    default(value: Output): ZodDefault<this>;
    describe(description: string): this;
    transform<NewOut>(fn: (val: Output) => NewOut): ZodType<NewOut>;
  }

  export interface ZodString extends ZodType<string> {
    min(length: number, message?: string): ZodString;
    max(length: number, message?: string): ZodString;
    email(message?: string): ZodString;
    url(message?: string): ZodString;
    regex(regex: RegExp, message?: string): ZodString;
    optional(): ZodOptional<ZodString>;
    default(value: string): ZodDefault<ZodString>;
  }

  export interface ZodNumber extends ZodType<number> {
    min(value: number, message?: string): ZodNumber;
    max(value: number, message?: string): ZodNumber;
    int(message?: string): ZodNumber;
    positive(message?: string): ZodNumber;
    optional(): ZodOptional<ZodNumber>;
    default(value: number): ZodDefault<ZodNumber>;
  }

  export interface ZodBoolean extends ZodType<boolean> {
    optional(): ZodOptional<ZodBoolean>;
    default(value: boolean): ZodDefault<ZodBoolean>;
  }

  export interface ZodEnum<T extends [string, ...string[]] = [string, ...string[]]> extends ZodType<T[number]> {
    optional(): ZodOptional<this>;
    default(value: T[number]): ZodDefault<this>;
  }

  export interface ZodOptional<T extends ZodType> extends ZodType<T["_output"] | undefined> {}
  export interface ZodDefault<T extends ZodType> extends ZodType<T["_output"]> {}

  export interface ZodCoerce {
    string(): ZodString;
    number(): ZodNumber;
    boolean(): ZodBoolean;
  }

  export const z: {
    string(): ZodString;
    number(): ZodNumber;
    boolean(): ZodBoolean;
    enum<T extends [string, ...string[]]>(values: T): ZodEnum<T>;
    coerce: ZodCoerce;
    object(shape: Record<string, ZodType>): ZodType;
    array(schema: ZodType): ZodType;
    union(types: ZodType[]): ZodType;
    literal(value: string | number | boolean): ZodType;
  };

  export { z as default };
}
`;

const BUN_TYPES = `
declare global {
  var Bun: {
    argv: string[];
    version: string;
    file(path: string): {
      exists(): Promise<boolean>;
      text(): Promise<string>;
      json(): Promise<any>;
    };
    write(path: string, content: string | Uint8Array): Promise<number>;
    serve(options: {
      port?: number;
      hostname?: string;
      fetch(req: Request): Response | Promise<Response>;
    }): any;
    $: any;
  };
}
export {};
`;

export function registerExtraLibs(monaco: typeof Monaco): void {
  // Access the typescript contribution via the new top-level namespace
  const ts = (monaco as any).typescript ?? (monaco.languages as any).typescript;
  if (!ts?.typescriptDefaults) {
    return;
  }

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
      1375, // 'await' expressions are only allowed at the top level
      1378, // Top-level 'await' module option
    ],
  });

  ts.typescriptDefaults.addExtraLib(BUNLI_TYPES, "file:///node_modules/bunli/index.d.ts");
  ts.typescriptDefaults.addExtraLib(ZOD_TYPES, "file:///node_modules/zod/index.d.ts");
  ts.typescriptDefaults.addExtraLib(BUN_TYPES, "file:///node_modules/@types/bun/globals.d.ts");
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
