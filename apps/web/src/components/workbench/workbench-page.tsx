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
import { signIn, signOut, useSession } from "../../lib/auth-client";
import { useGhosttyTerminal } from "./use-ghostty-terminal";

interface SessionState {
  sandboxId: string;
  sessionId: string;
}

type ConnectionState = "disconnected" | "connecting" | "connected";

const decoder = new TextDecoder();

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

export function WorkbenchPage() {
  const { data: authState } = useSession();
  const isAuthenticated = Boolean(authState?.user?.id);

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

  const terminal = useGhosttyTerminal();

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

        socket.onopen = () => {
          setConnectionState("connected");
          appendLine("[pty] websocket connected");
          resolve(true);
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
          appendLine("[pty] websocket error");
        };

        socket.onclose = () => {
          const disconnectedSessionId = sessionIdRef.current;
          wsRef.current = null;
          setConnectionState("disconnected");
          appendLine("[pty] websocket disconnected");
          void notifyPtyDisconnect(disconnectedSessionId);

          const runId = activeRunIdRef.current;
          if (runId) {
            void finishRun(runId);
          }

          resolve(false);
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
      "$ bunli --version",
      "0.5.3",
      "$ bun run /workspace/demo/src/index.ts",
      "Hello from bunli sandbox workbench",
      "",
      "[scripted mode] Sign in to run this inside a real Cloudflare sandbox.",
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
    <main className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-10">
      <section className="workbench-card mb-5 flex flex-wrap items-center justify-between gap-4 p-4 md:p-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">bunli workbench</h1>
          <p className="mt-1 text-sm text-[var(--workbench-muted)]">
            Monaco + Ghostty terminal on a single Cloudflare Worker with mounted Hono APIs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a className="workbench-link" href="/docs" target="_blank" rel="noreferrer">
            Docs
          </a>
          {isAuthenticated ? (
            <button className="workbench-btn" type="button" onClick={handleSignOut}>
              Sign out
            </button>
          ) : (
            <button className="workbench-btn" type="button" onClick={handleGithubSignIn}>
              Sign in with GitHub
            </button>
          )}
        </div>
      </section>

      <section className="workbench-shell">
        <article className="workbench-card flex min-h-[540px] flex-col overflow-hidden">
          <header className="workbench-header">
            <div>
              <strong>src/index.ts</strong>
            </div>
            <div className="workbench-meta">/workspace/demo/src/index.ts</div>
          </header>

          <div className="workbench-editor">
            <Editor
              height="100%"
              language="typescript"
              theme="vs-dark"
              value={sourceCode}
              onChange={(value) => setSourceCode(value ?? "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                tabSize: 2,
                smoothScrolling: true,
                wordWrap: "on",
                scrollBeyondLastLine: false,
              }}
            />
          </div>
        </article>

        <article className="workbench-card flex min-h-[540px] flex-col overflow-hidden">
          <header className="workbench-header">
            <div>
              <strong>Terminal</strong>
            </div>
            <div className="workbench-meta">
              {isAuthenticated ? "Authenticated" : "Scripted demo"} • {connectionLabel}
            </div>
          </header>

          <div className="workbench-controls">
            <select
              value={preset}
              onChange={(event) => setPreset(event.target.value as RunPreset)}
              className="workbench-select"
            >
              <option value="framework">Framework preset</option>
              <option value="toolchain">Toolchain preset</option>
            </select>

            <button className="workbench-btn" type="button" onClick={() => terminal.clear()}>
              Clear
            </button>

            <button
              className="workbench-btn"
              type="button"
              onClick={() => {
                void syncSourceFile();
              }}
              disabled={!isAuthenticated || saving}
            >
              {saving ? "Syncing..." : "Sync file"}
            </button>

            <button
              className="workbench-btn"
              type="button"
              onClick={() => {
                void ensureSession();
              }}
              disabled={!isAuthenticated || sessionBusy}
            >
              {sessionBusy ? "Session..." : "Init session"}
            </button>

            <button
              className="workbench-btn"
              type="button"
              onClick={() => {
                if (sessionState) {
                  void connectPty(sessionState.sessionId);
                }
              }}
              disabled={!isAuthenticated || !sessionState || connectionState === "connecting"}
            >
              {connectionState === "connecting" ? "Connecting..." : "Connect PTY"}
            </button>

            <button
              className="workbench-btn workbench-btn-accent"
              type="button"
              onClick={() => {
                void runPreset();
              }}
              disabled={runBusy || scriptedBusy || activeRunId !== null}
            >
              {runBusy || scriptedBusy
                ? "Running..."
                : activeRunId
                  ? "Run in progress"
                  : "Run preset"}
            </button>
          </div>

          <div ref={terminal.containerRef} className="workbench-terminal" />

          <footer className="workbench-footer">
            <span>
              {terminal.ready ? "Terminal ready" : "Starting terminal..."}
              {sessionState ? ` • session ${sessionState.sessionId}` : ""}
            </span>
          </footer>
        </article>
      </section>
    </main>
  );
}
