import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { FitAddon, Terminal } from "ghostty-web";

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

export function useGhosttyTerminal(): UseGhosttyTerminalResult {
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

      const terminal = new ghostty.Terminal({
        cursorBlink: true,
        convertEol: true,
        fontFamily: "Iosevka Term, ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 13,
        theme: {
          background: "#0a0f1f",
          foreground: "#d8e2ff",
          cursor: "#49d4a7",
          selectionBackground: "#334c84",
        },
      });
      const fitAddon = new ghostty.FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(containerRef.current);
      fitAddon.fit();

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

  const write = useCallback((chunk: string) => {
    terminalRef.current?.write(chunk);
  }, []);

  const clear = useCallback(() => {
    terminalRef.current?.clear();
  }, []);

  const focus = useCallback(() => {
    terminalRef.current?.focus();
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
