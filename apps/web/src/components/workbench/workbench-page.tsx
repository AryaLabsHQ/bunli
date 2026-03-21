import Editor from "@monaco-editor/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_SOURCE_FILE, type RunPreset } from "../../api/workbench/constants";
import type {
  WorkbenchErrorResponse,
  WorkbenchFileSyncResponse,
  WorkbenchRunFinishResponse,
  WorkbenchRunResponse,
  WorkbenchSessionResponse,
} from "../../api/workbench/types";
import { useTheme } from "next-themes";
import { signIn, signOut, useSession } from "../../lib/auth-client";
import { getEditorThemeName, registerEditorThemes, registerExtraLibs } from "../../lib/monaco-setup.js";
import { useGhosttyTerminal } from "./use-ghostty-terminal";

interface SessionState {
  sandboxId: string;
  sessionId: string;
}

type ConnectionState = "disconnected" | "connecting" | "connected";

const decoder = new TextDecoder();
const PTY_CONNECT_TIMEOUT_MS = 12_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      window.clearTimeout(timer);
      resolve();
    }, ms);
  });
}

async function parseResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

interface WorkbenchPageProps {
  embedded?: boolean;
}

export function WorkbenchPage({ embedded = false }: WorkbenchPageProps = {}) {
  const { data: authState } = useSession();
  const isAuthenticated = Boolean(authState?.user?.id);
  const { theme } = useTheme();

  const [sourceCode, setSourceCode] = useState(DEFAULT_SOURCE_FILE);
  const [preset, setPreset] = useState<RunPreset>("framework");
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [scriptedBusy, setScriptedBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [runBusy, setRunBusy] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const runTimerRef = useRef<number | null>(null);
  const activeRunIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const terminal = useGhosttyTerminal(theme ?? "vesper");

  useEffect(() => {
    activeRunIdRef.current = activeRunId;
  }, [activeRunId]);

  useEffect(() => {
    sessionIdRef.current = sessionState?.sessionId ?? null;
  }, [sessionState]);

  const connectionLabel = useMemo(() => {
    if (connectionState === "connected") {
      return "Connected";
    }
    if (connectionState === "connecting") {
      return "Connecting";
    }
    return "Disconnected";
  }, [connectionState]);

  const clearRunTimer = useCallback(() => {
    if (runTimerRef.current !== null) {
      window.clearTimeout(runTimerRef.current);
      runTimerRef.current = null;
    }
  }, []);

  const appendLine = useCallback(
    (line: string) => {
      terminal.write(`${line}\r\n`);
    },
    [terminal]
  );

  const notifyPtyDisconnect = useCallback(async (sessionId: string | null) => {
    if (!sessionId || !isAuthenticated) {
      return;
    }

    try {
      await fetch("/api/workbench/pty/disconnect", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      });
    } catch {
      // best-effort observability event
    }
  }, [isAuthenticated]);

  const finishRun = useCallback(
    async (runId: string) => {
      clearRunTimer();
      setActiveRunId((current) => (current === runId ? null : current));

      if (!isAuthenticated) {
        return;
      }

      try {
        const response = await fetch("/api/workbench/run/finish", {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ runId }),
        });

        if (response.ok) {
          const payload = await parseResponse<WorkbenchRunFinishResponse>(response);
          if (payload.ok) {
            appendLine(`[run ${payload.runId}] complete`);
          }
        }
      } catch {
        appendLine("[run] failed to finalize on server");
      }
    },
    [appendLine, clearRunTimer, isAuthenticated]
  );

  const handleSocketMessage = useCallback(
    (chunk: string) => {
      const trimmed = chunk.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          const status = JSON.parse(trimmed) as {
            type?: "ready" | "error" | "exit";
            code?: number;
            message?: string;
          };

          if (status.type === "ready") {
            appendLine("[pty] ready");
            return;
          }

          if (status.type === "error") {
            appendLine(`[pty:error] ${status.message ?? "Unknown error"}`);
            const runId = activeRunIdRef.current;
            if (runId) {
              void finishRun(runId);
            }
            return;
          }

          if (status.type === "exit") {
            appendLine(`[pty] exit ${status.code ?? 0}`);
            const runId = activeRunIdRef.current;
            if (runId) {
              void finishRun(runId);
            }
            return;
          }
        } catch {
          // Not a JSON status frame, treat as terminal data.
        }
      }

      terminal.write(chunk);
    },
    [appendLine, finishRun, terminal]
  );

  const closeSocket = useCallback(() => {
    const ws = wsRef.current;
    wsRef.current = null;
    if (!ws) {
      return;
    }

    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    ws.close(1000, "client-close");
  }, []);

  const connectPty = useCallback(
    async (sessionId: string): Promise<boolean> => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        return true;
      }

      setConnectionState("connecting");

      return await new Promise<boolean>((resolve) => {
        let settled = false;
        let opened = false;

        const settle = (ok: boolean) => {
          if (settled) {
            return;
          }
          settled = true;
          resolve(ok);
        };

        const wsUrl = new URL("/api/workbench/pty", window.location.origin);
        wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
        wsUrl.searchParams.set("sessionId", sessionId);

        const dims = terminal.getDimensions();
        if (dims) {
          wsUrl.searchParams.set("cols", String(dims.cols));
          wsUrl.searchParams.set("rows", String(dims.rows));
        }

        const socket = new WebSocket(wsUrl);
        socket.binaryType = "arraybuffer";
        wsRef.current = socket;
        const timeoutId = window.setTimeout(() => {
          appendLine(`[pty] connect timeout after ${PTY_CONNECT_TIMEOUT_MS}ms`);
          if (wsRef.current === socket) {
            wsRef.current = null;
          }
          setConnectionState("disconnected");
          try {
            socket.close(1000, "connect-timeout");
          } catch {
            // ignore close failure
          }
          settle(false);
        }, PTY_CONNECT_TIMEOUT_MS);

        socket.onopen = () => {
          opened = true;
          window.clearTimeout(timeoutId);
          setConnectionState("connected");
          appendLine("[pty] websocket connected");
          settle(true);
        };

        socket.onmessage = (event) => {
          if (typeof event.data === "string") {
            handleSocketMessage(event.data);
            return;
          }

          if (event.data instanceof ArrayBuffer) {
            handleSocketMessage(decoder.decode(event.data));
            return;
          }

          if (event.data instanceof Blob) {
            void event.data.arrayBuffer().then((data) => {
              handleSocketMessage(decoder.decode(data));
            });
          }
        };

        socket.onerror = () => {
          window.clearTimeout(timeoutId);
          appendLine("[pty] websocket error");
          if (wsRef.current === socket) {
            wsRef.current = null;
          }
          setConnectionState("disconnected");
          try {
            socket.close(1011, "socket-error");
          } catch {
            // ignore close failure
          }
          settle(false);
        };

        socket.onclose = () => {
          window.clearTimeout(timeoutId);
          const disconnectedSessionId = sessionIdRef.current;
          if (wsRef.current === socket) {
            wsRef.current = null;
          }
          setConnectionState("disconnected");
          if (opened) {
            appendLine("[pty] websocket disconnected");
            void notifyPtyDisconnect(disconnectedSessionId);

            const runId = activeRunIdRef.current;
            if (runId) {
              void finishRun(runId);
            }
          } else {
            appendLine("[pty] websocket closed before ready");
          }

          settle(false);
        };
      });
    },
    [appendLine, finishRun, handleSocketMessage, notifyPtyDisconnect, terminal]
  );

  const ensureSession = useCallback(async (): Promise<SessionState | null> => {
    if (!isAuthenticated) {
      appendLine("Authentication is required for sandbox execution.");
      return null;
    }

    if (sessionState) {
      return sessionState;
    }

    setSessionBusy(true);
    try {
      const response = await fetch("/api/workbench/session", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const payload = await parseResponse<WorkbenchErrorResponse>(response);
        toast.error(payload.message);
        appendLine(`[session] ${payload.code}: ${payload.message}`);
        return null;
      }

      const payload = await parseResponse<WorkbenchSessionResponse>(response);
      const next = {
        sandboxId: payload.sandboxId,
        sessionId: payload.sessionId,
      };

      setSessionState(next);
      appendLine(`[session] ready: ${payload.sessionId}`);
      return next;
    } catch {
      toast.error("Failed to initialize workbench session");
      appendLine("[session] failed to initialize");
      return null;
    } finally {
      setSessionBusy(false);
    }
  }, [appendLine, isAuthenticated, sessionState]);

  const syncSourceFile = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) {
      appendLine("Anonymous mode does not sync files to sandbox.");
      return false;
    }

    const readySession = await ensureSession();
    if (!readySession) {
      return false;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/workbench/files/src/index.ts", {
        method: "PUT",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ content: sourceCode }),
      });

      if (!response.ok) {
        const payload = await parseResponse<WorkbenchErrorResponse>(response);
        appendLine(`[sync] ${payload.code}: ${payload.message}`);
        toast.error(payload.message);
        return false;
      }

      const payload = await parseResponse<WorkbenchFileSyncResponse>(response);
      appendLine(`[sync] ${payload.path} (${payload.bytes} bytes)`);
      return true;
    } catch {
      appendLine("[sync] failed");
      return false;
    } finally {
      setSaving(false);
    }
  }, [appendLine, ensureSession, isAuthenticated, sourceCode]);

  const runScriptedReplay = useCallback(async () => {
    if (scriptedBusy) {
      return;
    }

    setScriptedBusy(true);
    terminal.focus();
    appendLine("$ bun --version");

    const frames = [
      "1.2.2",
      "$ bun run /workspace/demo/src/index.ts hello -n bunli",
      "Hello, bunli!",
      "",
      "$ bun run /workspace/demo/src/index.ts hello -n bunli -l",
      "HELLO, BUNLI!",
      "",
      "[scripted] Sign in to run in a real Cloudflare sandbox.",
    ];

    for (const frame of frames) {
      await sleep(180);
      appendLine(frame);
    }

    setScriptedBusy(false);
  }, [appendLine, scriptedBusy, terminal]);

  const runPreset = useCallback(async () => {
    if (!terminal.ready || runBusy) {
      return;
    }

    if (!isAuthenticated) {
      await runScriptedReplay();
      return;
    }

    setRunBusy(true);

    try {
      terminal.focus();
      const readySession = await ensureSession();
      if (!readySession) {
        return;
      }

      const syncOk = await syncSourceFile();
      if (!syncOk) {
        return;
      }

      const connected = await connectPty(readySession.sessionId);
      if (!connected) {
        appendLine("[run] PTY connection failed");
        return;
      }

      const response = await fetch("/api/workbench/run", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ preset }),
      });

      if (!response.ok) {
        const payload = await parseResponse<WorkbenchErrorResponse>(response);
        appendLine(`[run] ${payload.code}: ${payload.message}`);
        toast.error(payload.message);
        return;
      }

      const payload = await parseResponse<WorkbenchRunResponse>(response);
      setActiveRunId(payload.runId);

      appendLine(`$ ${payload.command}`);
      wsRef.current?.send(`${payload.command}\n`);

      clearRunTimer();
      runTimerRef.current = window.setTimeout(() => {
        appendLine(`[run] timeout reached (${payload.timeoutMs}ms), sending Ctrl+C`);
        wsRef.current?.send("\u0003");

        const runId = activeRunIdRef.current;
        if (runId) {
          void finishRun(runId);
        }
      }, payload.timeoutMs + 250);
    } finally {
      setRunBusy(false);
    }
  }, [
    appendLine,
    clearRunTimer,
    connectPty,
    ensureSession,
    finishRun,
    isAuthenticated,
    preset,
    runBusy,
    runScriptedReplay,
    syncSourceFile,
    terminal,
  ]);

  useEffect(() => {
    const unsubscribe = terminal.onData((chunk) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(chunk);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [terminal]);

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }

    setSessionState(null);
    setActiveRunId(null);
    setConnectionState("disconnected");
    closeSocket();
  }, [closeSocket, isAuthenticated]);

  useEffect(() => {
    return () => {
      clearRunTimer();
      closeSocket();
    };
  }, [clearRunTimer, closeSocket]);

  const handleGithubSignIn = async () => {
    try {
      await signIn.social({
        provider: "github",
        callbackURL: "/",
      });
    } catch {
      toast.error("GitHub sign-in failed");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setSessionState(null);
      setActiveRunId(null);
      setConnectionState("disconnected");
      closeSocket();
      window.location.href = "/";
    } catch {
      toast.error("Failed to sign out");
    }
  };

  return (
    <div className={embedded ? "w-full" : "mx-auto w-full max-w-5xl px-4 py-12 md:px-8 md:py-16"}>
      {/* Header bar — terminal style */}
      <div className="flex items-center gap-3 border border-terminal-border bg-terminal px-4 py-2">
        <span className="font-mono text-xs text-terminal-muted">~/workbench</span>
        <span className="font-mono text-xs text-terminal-muted ml-auto">
          {isAuthenticated ? "authenticated" : "anonymous"}
          <span className="mx-2 text-terminal-border" aria-hidden="true">│</span>
          {connectionLabel.toLowerCase()}
        </span>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3 border-x border-terminal-border bg-terminal/50 px-4 py-2">
        <span className="font-mono text-xs text-terminal-muted mr-auto">
          Edit code in Monaco, run it in a real Bun sandbox.
        </span>
        <a
          href="/docs"
          className="font-mono text-xs text-terminal-muted hover:text-terminal-foreground border border-terminal-border px-3 py-1.5 transition-colors"
        >
          docs
        </a>
        {isAuthenticated ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="font-mono text-xs text-terminal-muted hover:text-terminal-foreground border border-terminal-border px-3 py-1.5 transition-colors"
          >
            sign out
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGithubSignIn}
            className="font-mono text-xs text-accent border border-accent/40 hover:bg-accent hover:text-background px-3 py-1.5 transition-colors"
          >
            sign in with github
          </button>
        )}
      </div>

      <section className="grid gap-0 lg:grid-cols-2">
        {/* Editor pane */}
        <article className="flex min-h-[540px] flex-col overflow-hidden border border-terminal-border bg-terminal">
          <header className="flex items-center justify-between border-b border-terminal-border px-4 py-2">
            <span className="font-mono text-xs text-terminal-foreground">src/index.ts</span>
            <span className="font-mono text-xs text-terminal-muted">/workspace/demo/src/index.ts</span>
          </header>

          <div className="min-h-[420px] flex-1">
            <Editor
              height="100%"
              language="typescript"
              theme={getEditorThemeName(theme ?? "vesper")}
              value={sourceCode}
              onChange={(value) => setSourceCode(value ?? "")}
              beforeMount={(monaco) => {
                registerExtraLibs(monaco);
                registerEditorThemes(monaco);
              }}
              onMount={(editor, monaco) => {
                editor.addAction({
                  id: "bunli-run-preset",
                  label: "Run Preset",
                  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
                  run: () => { void runPreset(); },
                });
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
                tabSize: 2,
                smoothScrolling: true,
                wordWrap: "on",
                scrollBeyondLastLine: false,
                padding: { top: 12 },
              }}
            />
          </div>
        </article>

        {/* Terminal pane */}
        <article className="flex min-h-[540px] flex-col overflow-hidden border border-terminal-border lg:border-l-0 bg-terminal">
          <header className="flex items-center justify-between border-b border-terminal-border px-4 py-2">
            <span className="font-mono text-xs text-terminal-foreground">terminal</span>
            <span className="font-mono text-xs text-terminal-muted">
              {isAuthenticated ? "live" : "scripted"}
            </span>
          </header>

          <div className="flex flex-wrap gap-2 border-b border-terminal-border px-3 py-2">
            <select
              value={preset}
              onChange={(event) => setPreset(event.target.value as RunPreset)}
              className="h-7 min-w-[140px] border border-terminal-border bg-terminal px-2 font-mono text-xs text-terminal-foreground"
            >
              <option value="framework">framework</option>
              <option value="toolchain">toolchain</option>
            </select>

            <button
              type="button"
              onClick={() => terminal.clear()}
              className="font-mono text-xs text-terminal-muted hover:text-terminal-foreground border border-terminal-border px-2.5 py-1 transition-colors"
            >
              clear
            </button>

            <button
              type="button"
              onClick={() => { void syncSourceFile(); }}
              disabled={!isAuthenticated || saving}
              className="font-mono text-xs text-terminal-muted hover:text-terminal-foreground border border-terminal-border px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "syncing..." : "sync"}
            </button>

            <button
              type="button"
              onClick={() => { void ensureSession(); }}
              disabled={!isAuthenticated || sessionBusy}
              className="font-mono text-xs text-terminal-muted hover:text-terminal-foreground border border-terminal-border px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sessionBusy ? "init..." : "init session"}
            </button>

            <button
              type="button"
              onClick={() => {
                if (sessionState) {
                  void connectPty(sessionState.sessionId);
                }
              }}
              disabled={!isAuthenticated || !sessionState || connectionState === "connecting"}
              className="font-mono text-xs text-terminal-muted hover:text-terminal-foreground border border-terminal-border px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {connectionState === "connecting" ? "connecting..." : "pty"}
            </button>

            <button
              type="button"
              onClick={() => { void runPreset(); }}
              disabled={runBusy || scriptedBusy || activeRunId !== null}
              className="font-mono text-xs text-accent border border-accent/40 hover:bg-accent hover:text-background px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {runBusy || scriptedBusy
                ? "running..."
                : activeRunId
                  ? "in progress"
                  : "run"}
            </button>
          </div>

          <div ref={terminal.containerRef} className="min-h-[360px] flex-1 bg-terminal p-1" />

          <footer className="border-t border-terminal-border px-3 py-1.5 font-mono text-xs text-terminal-muted">
            <span className="text-accent/60 mr-1.5" aria-hidden="true">{'>'}</span>
            {terminal.ready ? "ready" : "starting..."}
            {sessionState ? (
              <>
                <span className="mx-2 text-terminal-border" aria-hidden="true">│</span>
                session {sessionState.sessionId}
              </>
            ) : null}
          </footer>
        </article>
      </section>

      {/* Bottom hint */}
      <div className="border-x border-b border-terminal-border bg-terminal px-4 py-2 font-mono text-xs text-terminal-muted text-center">
        <span className="text-accent/60">[cmd+enter]</span> to run
      </div>
    </div>
  );
}
