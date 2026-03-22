import Editor from "@monaco-editor/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { type RunPreset, WORKBENCH_PROTOCOL_PREFIX } from "../../api/workbench/constants";
import type {
  WorkbenchErrorResponse,
  WorkbenchFileSyncResponse,
  WorkbenchRunAbortResponse,
  WorkbenchRunFinishResponse,
  WorkbenchRunResponse,
  WorkbenchSessionResponse,
} from "../../api/workbench/types";
import { useTheme } from "next-themes";
import { signIn, signOut, useSession } from "../../lib/auth-client";
import { fetchDefaultSource, getEditorThemeName, registerEditorThemes, registerExtraLibs } from "../../lib/monaco-setup.js";
import { useGhosttyTerminal } from "./use-ghostty-terminal";

interface SessionState {
  sandboxId: string;
  sessionId: string;
}

type ConnectionState = "disconnected" | "connecting" | "connected";

const decoder = new TextDecoder();
const PTY_CONNECT_TIMEOUT_MS = 12_000;
const DEFAULT_PROTOCOL_PREFIX = WORKBENCH_PROTOCOL_PREFIX;

interface WorkbenchProtocolStatus {
  type?: "ready" | "error" | "exit";
  runId?: string;
  completionToken?: string;
  code?: number;
  message?: string;
}

interface WorkbenchRunPayload extends WorkbenchRunResponse {
  execCommand?: string;
  protocolPrefix?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      window.clearTimeout(timer);
      resolve();
    }, ms);
  });
}

function getProtocolOverlapLength(buffer: string, prefix: string): number {
  const maxOverlap = Math.min(buffer.length, prefix.length - 1);
  for (let length = maxOverlap; length > 0; length -= 1) {
    if (buffer.endsWith(prefix.slice(0, length))) {
      return length;
    }
  }

  return 0;
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

  const [sourceCode, setSourceCode] = useState("");
  const [preset, setPreset] = useState<RunPreset>("framework");

  useEffect(() => {
    void fetchDefaultSource().then(setSourceCode);
  }, []);
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
  const connectPromiseRef = useRef<Promise<boolean> | null>(null);
  const protocolPrefixRef = useRef(DEFAULT_PROTOCOL_PREFIX);
  const protocolBufferRef = useRef("");

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

  const sendSocketData = useCallback(
    (data: string, label: string): boolean => {
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        appendLine(`[pty] ${label} skipped: websocket is not open`);
        return false;
      }

      try {
        socket.send(data);
        return true;
      } catch {
        appendLine(`[pty] ${label} failed`);
        return false;
      }
    },
    [appendLine]
  );

  const finishRun = useCallback(
    async (
      runId: string,
      options: {
        completionToken?: string;
        keepalive?: boolean;
        silent?: boolean;
      } = {}
    ) => {
      const { completionToken, keepalive = false, silent = false } = options;
      clearRunTimer();
      setActiveRunId((current) => (current === runId ? null : current));

      if (!isAuthenticated) {
        return;
      }

      try {
        const response = await fetch("/api/workbench/run/finish", {
          method: "POST",
          keepalive,
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ runId, completionToken }),
        });

        if (response.ok) {
          const payload = await parseResponse<WorkbenchRunFinishResponse>(response);
          if (payload.ok && payload.released && !silent) {
            appendLine(`[run ${payload.runId}] complete`);
          }
        }
      } catch {
        if (!silent) {
          appendLine("[run] failed to finalize on server");
        }
      }
    },
    [appendLine, clearRunTimer, isAuthenticated]
  );

  const abortRun = useCallback(
    async (
      runId: string,
      options: {
        keepalive?: boolean;
        silent?: boolean;
      } = {}
    ) => {
      const { keepalive = false, silent = false } = options;
      clearRunTimer();
      setActiveRunId((current) => (current === runId ? null : current));

      if (!isAuthenticated) {
        return;
      }

      try {
        const response = await fetch("/api/workbench/run/abort", {
          method: "POST",
          keepalive,
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ runId }),
        });

        if (response.ok) {
          const payload = await parseResponse<WorkbenchRunAbortResponse>(response);
          if (payload.ok && payload.released && !silent) {
            appendLine(`[run ${payload.runId}] aborted`);
          }
        }
      } catch {
        if (!silent) {
          appendLine("[run] failed to abort on server");
        }
      }
    },
    [appendLine, clearRunTimer, isAuthenticated]
  );

  const handleProtocolFrame = useCallback(
    (frame: string): boolean => {
      const protocolPrefix = protocolPrefixRef.current;
      if (!frame.startsWith(protocolPrefix)) {
        return false;
      }

      try {
        const status = JSON.parse(
          frame.slice(protocolPrefix.length)
        ) as WorkbenchProtocolStatus;

        if (status.type === "ready") {
          appendLine("[pty] ready");
          return true;
        }

        if (status.type === "error") {
          appendLine(`[pty:error] ${status.message ?? "Unknown error"}`);
          const runId = activeRunIdRef.current;
          if (runId) {
            void abortRun(runId);
          }
          return true;
        }

        if (status.type === "exit") {
          appendLine(`[pty] exit ${status.code ?? 0}`);
          const runId = status.runId ?? activeRunIdRef.current;
          if (runId) {
            void finishRun(runId, {
              completionToken: status.completionToken,
            });
          }
          return true;
        }
      } catch {
        // Treat malformed protocol lines as normal terminal output.
      }

      return false;
    },
    [abortRun, appendLine, finishRun]
  );

  const flushSocketBuffer = useCallback(
    (force = false) => {
      let buffer = protocolBufferRef.current;
      const protocolPrefix = protocolPrefixRef.current;

      while (buffer.length > 0) {
        const prefixIndex = buffer.indexOf(protocolPrefix);

        if (prefixIndex === -1) {
          const overlap = force ? 0 : getProtocolOverlapLength(buffer, protocolPrefix);
          const flushable = buffer.slice(0, buffer.length - overlap);
          if (flushable) {
            terminal.write(flushable);
          }
          buffer = buffer.slice(buffer.length - overlap);
          break;
        }

        if (prefixIndex > 0) {
          terminal.write(buffer.slice(0, prefixIndex));
          buffer = buffer.slice(prefixIndex);
          continue;
        }

        const newlineIndex = buffer.indexOf("\n");
        if (newlineIndex === -1) {
          if (force) {
            terminal.write(buffer);
            buffer = "";
          }
          break;
        }

        const frame = buffer.slice(0, newlineIndex).replace(/\r$/, "");
        buffer = buffer.slice(newlineIndex + 1);

        if (!handleProtocolFrame(frame)) {
          terminal.write(`${frame}\n`);
        }
      }

      protocolBufferRef.current = buffer;
    },
    [handleProtocolFrame, terminal]
  );

  const handleSocketMessage = useCallback(
    (chunk: string) => {
      protocolBufferRef.current += chunk;
      flushSocketBuffer();
    },
    [flushSocketBuffer]
  );

  const closeSocket = useCallback(() => {
    const ws = wsRef.current;
    wsRef.current = null;
    connectPromiseRef.current = null;
    if (!ws) {
      return;
    }

    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    ws.close(1000, "client-close");
    flushSocketBuffer(true);
  }, [flushSocketBuffer]);

  const connectPty = useCallback(
    async (sessionId: string): Promise<boolean> => {
      const currentSocket = wsRef.current;
      if (currentSocket?.readyState === WebSocket.OPEN) {
        return true;
      }
      if (currentSocket?.readyState === WebSocket.CONNECTING && connectPromiseRef.current) {
        return await connectPromiseRef.current;
      }

      setConnectionState("connecting");

      const connectPromise = new Promise<boolean>((resolve) => {
        let settled = false;
        let opened = false;

        const settle = (ok: boolean) => {
          if (settled) {
            return;
          }
          settled = true;
          if (connectPromiseRef.current === connectPromise) {
            connectPromiseRef.current = null;
          }
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
          flushSocketBuffer(true);
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
          flushSocketBuffer(true);
          if (wsRef.current === socket) {
            wsRef.current = null;
          }
          setConnectionState("disconnected");
          if (opened) {
            appendLine("[pty] websocket disconnected");
            void notifyPtyDisconnect(disconnectedSessionId);

            const runId = activeRunIdRef.current;
            if (runId) {
              void abortRun(runId);
            }
          } else {
            appendLine("[pty] websocket closed before ready");
          }

          settle(false);
        };
      });
      connectPromiseRef.current = connectPromise;
      return await connectPromise;
    },
    [abortRun, appendLine, handleSocketMessage, notifyPtyDisconnect, terminal]
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
      "Hello, bunli.",
      "",
      "$ bun run /workspace/demo/src/index.ts hello -n bunli -e",
      "Hello, bunli!",
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

      const payload = await parseResponse<WorkbenchRunPayload>(response);
      protocolPrefixRef.current = payload.protocolPrefix ?? DEFAULT_PROTOCOL_PREFIX;
      protocolBufferRef.current = "";
      setActiveRunId(payload.runId);

      const connected = await connectPty(readySession.sessionId);
      if (!connected) {
        appendLine("[run] PTY connection failed");
        await abortRun(payload.runId);
        return;
      }

      appendLine(`$ ${payload.command}`);
      const execCommand = payload.execCommand ?? payload.command;
      if (!sendSocketData(`${execCommand}\n`, "run dispatch")) {
        const runId = payload.runId;
        await abortRun(runId);
        return;
      }

      clearRunTimer();
      runTimerRef.current = window.setTimeout(() => {
        appendLine(`[run] timeout reached (${payload.timeoutMs}ms), aborting run`);
        sendSocketData("\u0003", "interrupt");

        const runId = activeRunIdRef.current;
        if (runId) {
          void abortRun(runId);
        }
      }, payload.timeoutMs + 250);
    } finally {
      setRunBusy(false);
    }
  }, [
    abortRun,
    appendLine,
    clearRunTimer,
    connectPty,
    ensureSession,
    finishRun,
    isAuthenticated,
    preset,
    runBusy,
    runScriptedReplay,
    sendSocketData,
    syncSourceFile,
    terminal,
  ]);

  useEffect(() => {
    const unsubscribe = terminal.onData((chunk) => {
      if (!activeRunIdRef.current) {
        return;
      }

      sendSocketData(chunk, "terminal input");
    });

    return () => {
      unsubscribe();
    };
  }, [sendSocketData, terminal]);

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
      const runId = activeRunIdRef.current;
      if (runId) {
        void abortRun(runId, {
          keepalive: true,
          silent: true,
        });
      }
      clearRunTimer();
      closeSocket();
    };
  }, [abortRun, clearRunTimer, closeSocket]);

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
      const runId = activeRunIdRef.current;
      if (runId) {
        await abortRun(runId, {
          keepalive: true,
          silent: true,
        });
      }

      closeSocket();
      await signOut();
      setSessionState(null);
      setActiveRunId(null);
      setConnectionState("disconnected");
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
