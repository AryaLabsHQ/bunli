import { displayWidth } from "@bunli/runtime/app";

function chunkWord(word: string, maxWidth: number): string[] {
  if (maxWidth <= 1 || displayWidth(word) <= maxWidth) {
    return [word];
  }

  const chunks: string[] = [];
  let current = "";

  for (const char of word) {
    const next = `${current}${char}`;
    if (current.length > 0 && displayWidth(next) > maxWidth) {
      chunks.push(current);
      current = char;
      continue;
    }
    current = next;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

export function wrapTextLines(
  text: string,
  maxWidth: number,
  options?: {
    firstPrefix?: string;
    restPrefix?: string;
  },
): string[] {
  const firstPrefix = options?.firstPrefix ?? "";
  const restPrefix = options?.restPrefix ?? firstPrefix;
  const firstWidth = Math.max(1, maxWidth - displayWidth(firstPrefix));
  const restWidth = Math.max(1, maxWidth - displayWidth(restPrefix));
  const rawWords = text.trim().split(/\s+/).filter(Boolean);
  const words = rawWords.flatMap((word) => chunkWord(word, Math.max(firstWidth, restWidth)));

  if (words.length === 0) {
    return [firstPrefix];
  }

  const lines: string[] = [];
  let current = "";
  let currentWidth = firstWidth;
  let prefix = firstPrefix;

  for (const word of words) {
    const candidate = current.length > 0 ? `${current} ${word}` : word;
    if (current.length > 0 && displayWidth(candidate) > currentWidth) {
      lines.push(`${prefix}${current}`);
      current = word;
      prefix = restPrefix;
      currentWidth = restWidth;
      continue;
    }
    current = candidate;
  }

  if (current.length > 0) {
    lines.push(`${prefix}${current}`);
  }

  return lines;
}

export function wrapPathLines(path: string, maxWidth: number, indent = "  "): string[] {
  const segments = path.split("/").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const segment of segments) {
    const candidate = current.length > 0 ? `${current}/${segment}` : segment;
    if (current.length > 0 && displayWidth(`${indent}${candidate}`) > maxWidth) {
      lines.push(`${indent}${current}/`);
      current = segment;
      continue;
    }
    current = candidate;
  }

  if (current.length > 0) {
    lines.push(`${indent}${current}`);
  }

  if (lines.length === 0) {
    return [`${indent}${path}`];
  }

  return lines;
}
