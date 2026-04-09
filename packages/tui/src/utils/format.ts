export type FormatType = "markdown" | "code" | "emoji" | "template";

// ANSI escape codes
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const ITALIC = "\x1b[3m";
const UNDERLINE = "\x1b[4m";
const STRIKETHROUGH = "\x1b[9m";

function bold(s: string): string {
  return `${BOLD}${s}${RESET}`;
}

function dim(s: string): string {
  return `${DIM}${s}${RESET}`;
}

function italic(s: string): string {
  return `${ITALIC}${s}${RESET}`;
}

function underline(s: string): string {
  return `${UNDERLINE}${s}${RESET}`;
}

function strikethrough(s: string): string {
  return `${STRIKETHROUGH}${s}${RESET}`;
}

function colored(s: string, r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m${s}${RESET}`;
}

// --- formatMarkdown ---

function applyInlineFormats(line: string): string {
  // Bold: **text** or __text__
  line = line.replace(/\*\*(.+?)\*\*/g, (_match, content) => bold(content));
  line = line.replace(/__(.+?)__/g, (_match, content) => bold(content));

  // Strikethrough: ~~text~~
  line = line.replace(/~~(.+?)~~/g, (_match, content) => strikethrough(content));

  // Inline code: `code`
  line = line.replace(/`([^`]+)`/g, (_match, content) => dim(content));

  // Links: [text](url)
  line = line.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, text, url) => underline(text) + dim(` (${url})`),
  );

  // Italic: *text* (not bold) or _text_ (not bold)
  line = line.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, (_match, content) => italic(content));
  line = line.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, (_match, content) => italic(content));

  return line;
}

/**
 * Format markdown text for terminal display using ANSI codes.
 */
export function formatMarkdown(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let inCodeBlock = false;
  const codeBlockLines: string[] = [];

  for (const line of lines) {
    // Code block fences
    if (/^```/.test(line)) {
      if (inCodeBlock) {
        // End code block — render collected lines
        for (const codeLine of codeBlockLines) {
          result.push(dim(`  ${codeLine}`));
        }
        codeBlockLines.length = 0;
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const content = headerMatch[2];
      if (level === 1) {
        result.push(bold(colored(content, 255, 255, 255)));
      } else if (level === 2) {
        result.push(bold(content));
      } else {
        result.push(bold(dim(content)));
      }
      continue;
    }

    // Horizontal rules
    if (/^[-*_]{3,}$/.test(line)) {
      result.push("\u2500".repeat(40));
      continue;
    }

    // Unordered list items
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (ulMatch) {
      result.push(`${ulMatch[1]}\u2022 ${applyInlineFormats(ulMatch[2])}`);
      continue;
    }

    // Blockquotes
    const bqMatch = line.match(/^>\s*(.+)$/);
    if (bqMatch) {
      result.push(`\u2502 ${italic(bqMatch[1])}`);
      continue;
    }

    // Regular line — apply inline transforms
    result.push(applyInlineFormats(line));
  }

  // If code block was never closed, still render what we collected
  if (inCodeBlock) {
    for (const codeLine of codeBlockLines) {
      result.push(dim(`  ${codeLine}`));
    }
  }

  return result.join("\n");
}

// --- formatCode ---

const KEYWORDS = new Set([
  "const",
  "let",
  "var",
  "function",
  "class",
  "return",
  "if",
  "else",
  "for",
  "while",
  "import",
  "export",
  "from",
  "async",
  "await",
  "try",
  "catch",
  "throw",
  "new",
  "typeof",
  "interface",
  "type",
  "enum",
  "extends",
  "implements",
  "public",
  "private",
  "protected",
  "def",
  "fn",
  "pub",
  "use",
  "mod",
  "struct",
  "impl",
  "trait",
]);

/**
 * Format code with basic syntax highlighting for terminal display.
 */
export function formatCode(code: string, _language?: string): string {
  const lines = code.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    // Full-line comments
    const trimmed = line.trimStart();
    if (trimmed.startsWith("//") || trimmed.startsWith("#")) {
      result.push(dim(line));
      continue;
    }

    let formatted = "";
    let i = 0;
    while (i < line.length) {
      const ch = line[i];

      // Strings
      if (ch === '"' || ch === "'") {
        const quote = ch;
        let str = quote;
        i++;
        while (i < line.length && line[i] !== quote) {
          if (line[i] === "\\" && i + 1 < line.length) {
            str += line[i] + line[i + 1];
            i += 2;
          } else {
            str += line[i];
            i++;
          }
        }
        if (i < line.length) {
          str += line[i];
          i++;
        }
        formatted += colored(str, 80, 200, 120); // green
        continue;
      }

      // Numbers
      if (/[0-9]/.test(ch) && (i === 0 || /[\s(=,+\-*/]/.test(line[i - 1]))) {
        let num = "";
        while (i < line.length && /[0-9._]/.test(line[i])) {
          num += line[i];
          i++;
        }
        formatted += colored(num, 230, 200, 80); // yellow
        continue;
      }

      // Words (potential keywords)
      if (/[a-zA-Z_]/.test(ch)) {
        let word = "";
        while (i < line.length && /[a-zA-Z0-9_]/.test(line[i])) {
          word += line[i];
          i++;
        }
        if (KEYWORDS.has(word)) {
          formatted += colored(word, 100, 150, 255); // blue
        } else {
          formatted += word;
        }
        continue;
      }

      // Inline comment
      if (ch === "/" && i + 1 < line.length && line[i + 1] === "/") {
        formatted += dim(line.slice(i));
        i = line.length;
        continue;
      }

      formatted += ch;
      i++;
    }

    result.push(formatted);
  }

  return result.join("\n");
}

// --- formatEmoji ---

const EMOJI_MAP: Record<string, string> = {
  ":smile:": "\u{1F604}",
  ":laughing:": "\u{1F606}",
  ":wink:": "\u{1F609}",
  ":heart:": "\u2764\uFE0F",
  ":fire:": "\u{1F525}",
  ":rocket:": "\u{1F680}",
  ":check:": "\u2705",
  ":x:": "\u274C",
  ":warning:": "\u26A0\uFE0F",
  ":star:": "\u2B50",
  ":thumbsup:": "\u{1F44D}",
  ":thumbsdown:": "\u{1F44E}",
  ":wave:": "\u{1F44B}",
  ":clap:": "\u{1F44F}",
  ":eyes:": "\u{1F440}",
  ":tada:": "\u{1F389}",
  ":bug:": "\u{1F41B}",
  ":wrench:": "\u{1F527}",
  ":lock:": "\u{1F512}",
  ":key:": "\u{1F511}",
  ":bulb:": "\u{1F4A1}",
  ":memo:": "\u{1F4DD}",
  ":link:": "\u{1F517}",
  ":package:": "\u{1F4E6}",
  ":sparkles:": "\u2728",
  ":zap:": "\u26A1",
  ":gear:": "\u2699\uFE0F",
  ":earth:": "\u{1F30D}",
  ":clock:": "\u{1F552}",
  ":question:": "\u2753",
  ":exclamation:": "\u2757",
  ":pin:": "\u{1F4CC}",
  ":bell:": "\u{1F514}",
  ":gem:": "\u{1F48E}",
  ":shield:": "\u{1F6E1}\uFE0F",
};

/**
 * Replace emoji shortcodes with unicode emoji.
 */
export function formatEmoji(text: string): string {
  return text.replace(/:([a-z_]+):/g, (match) => EMOJI_MAP[match] ?? match);
}

// --- format dispatcher ---

/**
 * Apply a named format type.
 */
export function format(text: string, type: FormatType): string {
  switch (type) {
    case "markdown":
      return formatMarkdown(text);
    case "code":
      return formatCode(text);
    case "emoji":
      return formatEmoji(text);
    case "template":
      return text;
  }
}
