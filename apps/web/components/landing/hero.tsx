"use client";

import { useEffect, useRef, useState } from "react";

const TYPED_COMMAND = "$ bun create bunli my-cli";

const TERMINAL_OUTPUT = [
  { delay: 60, text: "", type: "empty" },
  { delay: 120, text: "  Creating project in /my-cli...", type: "info" },
  { delay: 220, text: "  ✓ Scaffolded project structure", type: "success" },
  { delay: 320, text: "  ✓ Generated tsconfig.json", type: "success" },
  { delay: 420, text: "  ✓ Generated bunli.config.ts", type: "success" },
  { delay: 520, text: "  ✓ Installed dependencies (0.31s)", type: "success" },
  { delay: 640, text: "", type: "empty" },
  { delay: 700, text: "  Ready. Run: cd my-cli && bunli dev", type: "ready" },
];

type OutputLine = {
  delay: number;
  text: string;
  type: string;
};

function useTypewriter(text: string, speed = 38, startDelay = 400) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let interval: ReturnType<typeof setInterval>;
    let i = 0;

    timeout = setTimeout(() => {
      interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [text, speed, startDelay]);

  return { displayed, done };
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function OutputLineComponent({
  line,
  index,
  visible,
}: {
  line: OutputLine;
  index: number;
  visible: boolean;
}) {
  const colorMap: Record<string, string> = {
    success: "text-accent",
    info: "text-terminal-foreground/70",
    ready: "text-accent font-semibold",
    empty: "",
  };

  if (!visible) return null;

  return (
    <div
      className={`font-mono text-sm leading-6 ${colorMap[line.type] ?? "text-terminal-foreground/60"} fade-in-up`}
      style={{ animationDelay: `${index * 30}ms`, animationFillMode: "both" }}
    >
      {line.text}
    </div>
  );
}

export function Hero() {
  const reduced = useReducedMotion();
  const { displayed, done } = useTypewriter(TYPED_COMMAND, reduced ? 0 : 38, reduced ? 0 : 400);

  const [visibleLines, setVisibleLines] = useState<boolean[]>(
    Array(TERMINAL_OUTPUT.length).fill(false),
  );
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!done) return;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (reduced) {
      setVisibleLines(Array(TERMINAL_OUTPUT.length).fill(true));
      return;
    }

    TERMINAL_OUTPUT.forEach((line, i) => {
      const t = setTimeout(() => {
        setVisibleLines((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, line.delay);
      timersRef.current.push(t);
    });

    return () => timersRef.current.forEach(clearTimeout);
  }, [done, reduced]);

  const showOutput = reduced || done;

  return (
    <section
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-24"
      aria-label="Hero"
    >
      {/* Grid texture */}
      <div
        className="grid-texture pointer-events-none absolute inset-0 opacity-[0.035]"
        aria-hidden="true"
      />

      {/* Faint horizontal rule top */}
      <div className="bg-terminal-border absolute top-0 right-0 left-0 h-px" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-10">
        {/* Tagline */}
        <div className="flex flex-col gap-2">
          <p className="text-terminal-muted font-mono text-xs tracking-widest uppercase">
            {"// the cli framework for bun"}
          </p>
          <h1 className="text-foreground font-mono text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
            The comprehensive
            <br />
            <span className="text-accent">CLI framework for Bun.</span>
          </h1>
          <p className="text-muted-foreground mt-1 max-w-xl font-sans text-base leading-relaxed">
            Composable plugins, interactive terminal UI, and a complete toolchain from dev to
            release. Everything you need to ship production CLIs with Bun.
          </p>
        </div>

        {/* Terminal window */}
        <div
          className="border-terminal-border bg-terminal w-full rounded-none border"
          role="region"
          aria-label="Terminal demo"
        >
          {/* Terminal header bar */}
          <div className="border-terminal-border flex items-center gap-3 border-b px-4 py-2">
            <span className="text-terminal-muted font-mono text-xs">~/my-cli</span>
            <span className="text-terminal-muted ml-auto font-mono text-xs">bash</span>
          </div>

          {/* Terminal body */}
          <div className="min-h-[200px] p-4 sm:p-6">
            {/* Typed command line */}
            <div className="flex items-center gap-2 font-mono text-sm sm:text-base">
              <span className="text-accent select-none" aria-hidden="true">
                $
              </span>
              <span className="text-terminal-foreground tracking-wide">
                {reduced ? TYPED_COMMAND.slice(2) : displayed.slice(2)}
              </span>
              {!done && !reduced && (
                <span
                  className="bg-accent cursor-blink ml-0.5 inline-block h-[1.1em] w-[2px] align-middle"
                  aria-hidden="true"
                />
              )}
              {(done || reduced) && (
                <span
                  className="bg-accent/50 cursor-blink ml-0.5 inline-block h-[1.1em] w-[2px] align-middle"
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Output lines */}
            {showOutput && (
              <div className="mt-3 space-y-0.5">
                {TERMINAL_OUTPUT.map((line, i) => (
                  <OutputLineComponent key={i} line={line} index={i} visible={visibleLines[i]} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href="/docs/getting-started"
            className="group border-accent text-accent hover:bg-accent hover:text-background focus-visible:outline-accent inline-flex items-center gap-3 border px-5 py-3 font-mono text-sm transition-colors duration-150 focus-visible:outline focus-visible:outline-2"
          >
            <span className="text-accent/60 group-hover:text-background/60 transition-colors">
              [enter]
            </span>
            <span>get started</span>
          </a>
          <a
            href="/docs"
            className="group border-terminal-border text-terminal-foreground hover:border-terminal-foreground focus-visible:outline-accent inline-flex items-center gap-3 border px-5 py-3 font-mono text-sm transition-colors duration-150 focus-visible:outline focus-visible:outline-2"
          >
            <span className="text-terminal-muted group-hover:text-terminal-foreground/60 transition-colors">
              [tab]
            </span>
            <span>view docs</span>
          </a>
        </div>

        {/* Stats bar — terminal output style */}
        <div
          className="border-terminal-border text-terminal-muted border-t pt-6 font-mono text-xs"
          aria-label="Framework stats"
        >
          <span className="text-accent/60 mr-2" aria-hidden="true">
            {">"}
          </span>
          <span>
            version<span className="text-terminal-foreground ml-2">0.8.2</span>
          </span>
          <span className="text-terminal-border mx-4" aria-hidden="true">
            │
          </span>
          <span>
            license<span className="text-terminal-foreground ml-2">MIT</span>
          </span>
          <span className="text-terminal-border mx-4" aria-hidden="true">
            │
          </span>
          <span>
            runtime<span className="text-accent ml-2">bun ≥1.0</span>
          </span>
          <span className="text-terminal-border mx-4" aria-hidden="true">
            │
          </span>
          <span>
            types<span className="text-accent ml-2">included</span>
          </span>
        </div>
      </div>

      {/* Bottom rule */}
      <div
        className="bg-terminal-border absolute right-0 bottom-0 left-0 h-px"
        aria-hidden="true"
      />
    </section>
  );
}
