import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { FitAddon, Terminal } from "ghostty-web";
import { getThemeById, DEFAULT_THEME_ID } from "../../lib/themes.js";

interface TerminalDimensions {
  cols: number;
  rows: number;
}

interface UseGhosttyTerminalResult {
  containerRef: RefObject<HTMLDivElement | null>;
  ready: boolean;
  write: (chunk: string) => void;
  clear: () => void;
  focus: () => void;
  onData: (handler: (chunk: string) => void) => () => void;
  getDimensions: () => TerminalDimensions | null;
  fit: () => void;
}

export function useGhosttyTerminal(themeId: string = DEFAULT_THEME_ID): UseGhosttyTerminalResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const dataHandlersRef = useRef(new Set<(chunk: string) => void>());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    async function boot(): Promise<void> {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const ghostty = await import("ghostty-web");
      await ghostty.init();

      if (cancelled || !containerRef.current) {
        return;
      }

      const themeData = getThemeById(themeId);
      const terminal = new ghostty.Terminal({
        cursorBlink: true,
        convertEol: true,
        fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 13,
        theme: themeData?.terminal ?? getThemeById(DEFAULT_THEME_ID)!.terminal,
      });
      const fitAddon = new ghostty.FitAddon();
      terminal.loadAddon(fitAddon);

      // Preserve scroll position — terminal.open() can steal focus and scroll
      const scrollY = window.scrollY;
      terminal.open(containerRef.current);
      fitAddon.fit();
      window.scrollTo({ top: scrollY, behavior: "instant" });

      // Prevent clicks on the terminal from scrolling the page
      const terminalEl = terminal.element;
      if (terminalEl) {
        terminalEl.addEventListener("focus", () => {
          window.scrollTo({ top: window.scrollY, behavior: "instant" });
        }, true);
        terminalEl.addEventListener("mousedown", (e) => {
          const sy = window.scrollY;
          requestAnimationFrame(() => {
            if (window.scrollY !== sy) {
              window.scrollTo({ top: sy, behavior: "instant" });
            }
          });
        });
      }

      terminal.onData((chunk) => {
        for (const handler of dataHandlersRef.current) {
          handler(chunk);
        }
      });

      resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
      });
      resizeObserver.observe(containerRef.current);

      terminalRef.current = terminal;
      fitAddonRef.current = fitAddon;
      setReady(true);

      terminal.writeln("bunli workbench terminal ready");
      terminal.writeln("Use scripted mode anonymously or sign in for real sandbox execution.");
      terminal.writeln("");
    }

    void boot();

    return () => {
      cancelled = true;
      setReady(false);
      resizeObserver?.disconnect();
      resizeObserver = null;
      terminalRef.current?.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      dataHandlersRef.current.clear();
    };
  }, []);

  // Runtime theme switching
  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) {
      return;
    }
    const palette = getThemeById(themeId)?.terminal;
    if (palette) {
      terminal.renderer?.setTheme(palette);
    }
  }, [themeId]);

  const write = useCallback((chunk: string) => {
    terminalRef.current?.write(chunk);
  }, []);

  const clear = useCallback(() => {
    terminalRef.current?.clear();
  }, []);

  const focus = useCallback(() => {
    const el = terminalRef.current?.element;
    if (el) {
      el.focus({ preventScroll: true });
    }
  }, []);

  const onData = useCallback((handler: (chunk: string) => void) => {
    dataHandlersRef.current.add(handler);
    return () => {
      dataHandlersRef.current.delete(handler);
    };
  }, []);

  const getDimensions = useCallback((): TerminalDimensions | null => {
    const terminal = terminalRef.current;
    if (!terminal) {
      return null;
    }

    return {
      cols: terminal.cols,
      rows: terminal.rows,
    };
  }, []);

  const fit = useCallback(() => {
    fitAddonRef.current?.fit();
  }, []);

  return {
    containerRef,
    ready,
    write,
    clear,
    focus,
    onData,
    getDimensions,
    fit,
  };
}
