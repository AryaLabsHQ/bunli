import { useScopedKeyboard, createKeyMatcher, useTuiTheme } from "@bunli/runtime/app";
import type { KeyEvent, ScrollBoxRenderable } from "@opentui/core";
import { useCallback, useId, useMemo, useRef, useState } from "react";

export interface PagerProps {
  content: string;
  title?: string;
  showLineNumbers?: boolean;
  height?: number | `${number}%` | "auto";
  width?: number | `${number}%` | "auto";
  scopeId?: string;
  keyboardEnabled?: boolean;
  onQuit?: () => void;
}

type PagerMode = "normal" | "search";

const pagerKeymap = createKeyMatcher({
  scrollDown: ["down", "j"],
  scrollUp: ["up", "k"],
  halfPageDown: ["d"],
  halfPageUp: ["u"],
  top: ["g", "home"],
  bottom: ["end"],
  search: ["/"],
  nextMatch: ["n"],
  prevMatch: ["shift+n"],
  quit: ["q", "escape"],
});

function padLineNumber(lineNum: number, totalLines: number): string {
  const width = String(totalLines).length;
  return String(lineNum).padStart(width, " ");
}

function findMatchIndices(lines: string[], query: string): number[] {
  if (!query) return [];
  const lowerQuery = query.toLowerCase();
  const indices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(lowerQuery)) {
      indices.push(i);
    }
  }
  return indices;
}

export function Pager({
  content,
  title,
  showLineNumbers = false,
  height,
  width,
  scopeId,
  keyboardEnabled = true,
  onQuit,
}: PagerProps) {
  const { tokens } = useTuiTheme();
  const reactScopeId = useId();
  const keyboardScopeId = scopeId ?? `pager:${reactScopeId}`;

  const scrollRef = useRef<ScrollBoxRenderable>(null);

  const [mode, setMode] = useState<PagerMode>("normal");
  const [searchQuery, setSearchQuery] = useState("");
  const [matchIndices, setMatchIndices] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const lines = useMemo(() => content.split("\n"), [content]);

  const scrollToLine = useCallback((lineIndex: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = lineIndex;
    }
  }, []);

  const isMatchLine = useCallback(
    (lineIndex: number) => {
      return matchIndices.includes(lineIndex);
    },
    [matchIndices],
  );

  const executeSearch = useCallback(() => {
    const indices = findMatchIndices(lines, searchQuery);
    setMatchIndices(indices);
    setCurrentMatchIndex(0);
    setMode("normal");
    if (indices.length > 0) {
      scrollToLine(indices[0]);
    }
  }, [lines, searchQuery, scrollToLine]);

  const navigateToMatch = useCallback(
    (direction: "next" | "prev") => {
      if (matchIndices.length === 0) return;
      let nextIndex: number;
      if (direction === "next") {
        nextIndex = (currentMatchIndex + 1) % matchIndices.length;
      } else {
        nextIndex = (currentMatchIndex - 1 + matchIndices.length) % matchIndices.length;
      }
      setCurrentMatchIndex(nextIndex);
      scrollToLine(matchIndices[nextIndex]);
    },
    [matchIndices, currentMatchIndex, scrollToLine],
  );

  useScopedKeyboard(
    keyboardScopeId,
    (key: KeyEvent) => {
      if (mode === "search") {
        if (key.name === "escape") {
          setSearchQuery("");
          setMode("normal");
          return true;
        }
        if (key.name === "return" || key.sequence === "\r" || key.sequence === "\n") {
          executeSearch();
          return true;
        }
        return false;
      }

      // Normal mode
      if (pagerKeymap.match("scrollDown", key)) {
        scrollToLine((scrollRef.current?.scrollTop ?? 0) + 1);
        return true;
      }

      if (pagerKeymap.match("scrollUp", key)) {
        scrollToLine(Math.max(0, (scrollRef.current?.scrollTop ?? 0) - 1));
        return true;
      }

      // ctrl+d for half page down
      if (key.ctrl && key.name === "d") {
        const halfPage = Math.max(1, Math.floor(lines.length / 4));
        scrollToLine((scrollRef.current?.scrollTop ?? 0) + halfPage);
        return true;
      }

      // ctrl+u for half page up
      if (key.ctrl && key.name === "u") {
        const halfPage = Math.max(1, Math.floor(lines.length / 4));
        scrollToLine(Math.max(0, (scrollRef.current?.scrollTop ?? 0) - halfPage));
        return true;
      }

      if (pagerKeymap.match("halfPageDown", key) && !key.ctrl) {
        const halfPage = Math.max(1, Math.floor(lines.length / 4));
        scrollToLine((scrollRef.current?.scrollTop ?? 0) + halfPage);
        return true;
      }

      if (pagerKeymap.match("halfPageUp", key) && !key.ctrl) {
        const halfPage = Math.max(1, Math.floor(lines.length / 4));
        scrollToLine(Math.max(0, (scrollRef.current?.scrollTop ?? 0) - halfPage));
        return true;
      }

      if (pagerKeymap.match("top", key)) {
        scrollToLine(0);
        return true;
      }

      // Shift+G for bottom
      if ((key.name === "g" && key.shift) || key.name === "G") {
        scrollToLine(Math.max(0, lines.length - 1));
        return true;
      }

      if (pagerKeymap.match("bottom", key)) {
        scrollToLine(Math.max(0, lines.length - 1));
        return true;
      }

      if (pagerKeymap.match("search", key)) {
        setMode("search");
        setSearchQuery("");
        return true;
      }

      if (pagerKeymap.match("nextMatch", key)) {
        navigateToMatch("next");
        return true;
      }

      if (pagerKeymap.match("prevMatch", key)) {
        navigateToMatch("prev");
        return true;
      }

      if (pagerKeymap.match("quit", key)) {
        onQuit?.();
        return true;
      }

      return false;
    },
    { active: keyboardEnabled },
  );

  return (
    <box
      border
      height={height}
      width={width}
      style={{
        flexDirection: "column",
        borderColor: keyboardEnabled ? tokens.accent : tokens.border,
      }}
    >
      {title && <text content={title} fg={tokens.textPrimary} />}

      <scrollbox
        ref={scrollRef}
        flexGrow={1}
        focused={keyboardEnabled}
        scrollY
        viewportOptions={{ width: "100%" }}
        contentOptions={{ width: "100%" }}
        scrollbarOptions={{
          visible: true,
          trackOptions: {
            backgroundColor: tokens.backgroundMuted,
            foregroundColor: keyboardEnabled ? tokens.accent : tokens.borderMuted,
          },
        }}
      >
        {lines.map((line, i) => (
          <text
            key={i}
            content={showLineNumbers ? `${padLineNumber(i + 1, lines.length)} ${line}` : line}
            fg={isMatchLine(i) ? tokens.accent : tokens.textPrimary}
          />
        ))}
      </scrollbox>

      {mode === "search" && (
        <box style={{ flexDirection: "row" }}>
          <text content="/" fg={tokens.accent} />
          <input
            value={searchQuery}
            placeholder="Search..."
            onInput={setSearchQuery}
            onSubmit={() => executeSearch()}
            focused={true}
          />
        </box>
      )}

      <text
        content={
          matchIndices.length > 0 ? `Match ${currentMatchIndex + 1}/${matchIndices.length}` : ""
        }
        fg={tokens.textMuted}
      />
    </box>
  );
}
