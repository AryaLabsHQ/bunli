"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";

interface TerminalLine {
  type: "command" | "output";
  text: string;
  copyable?: boolean;
}

const terminalLines: TerminalLine[] = [
  { type: "command", text: "bun create bunli my-cli", copyable: true },
  { type: "output", text: "Creating project in ./my-cli..." },
  { type: "output", text: "Installing dependencies..." },
  { type: "output", text: "Project created successfully" },
  { type: "command", text: "cd my-cli", copyable: true },
  { type: "command", text: "bunli dev", copyable: true },
  { type: "output", text: "Watching for changes..." },
  { type: "output", text: "Ready! Try running: ./my-cli --help" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="hover:bg-terminal-border rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
      aria-label={copied ? "Copied" : "Copy to clipboard"}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-400" />
      ) : (
        <Copy className="text-terminal-muted h-3.5 w-3.5" />
      )}
    </button>
  );
}

export function QuickStart() {
  const [isVisible, setIsVisible] = useState(false);
  const [visibleLines, setVisibleLines] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          setIsVisible(true);
          hasAnimated.current = true;
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setVisibleLines(terminalLines.length);
      return;
    }

    let currentLine = 0;
    const interval = setInterval(() => {
      currentLine++;
      setVisibleLines(currentLine);
      if (currentLine >= terminalLines.length) {
        clearInterval(interval);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <section ref={sectionRef} className="relative py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div
          className={`mb-12 transition-all duration-500 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <div className="text-terminal-muted mb-2 font-mono text-sm">
            <span className="text-accent">{">"}</span> quick start
          </div>
          <h2 className="text-foreground font-mono text-2xl md:text-3xl">
            from zero to cli in seconds
          </h2>
        </div>

        {/* Terminal window */}
        <div
          className={`bg-terminal border-terminal-border border transition-all duration-500 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
          style={{ transitionDelay: "150ms" }}
        >
          {/* Terminal header */}
          <div className="border-terminal-border flex items-center gap-3 border-b px-4 py-2">
            <span className="text-terminal-muted font-mono text-xs">~</span>
            <span className="text-terminal-muted ml-auto font-mono text-xs">bash</span>
          </div>

          {/* Terminal content */}
          <div className="min-h-[280px] p-4 md:p-6">
            <div className="space-y-1 font-mono text-sm">
              {terminalLines.map((line, index) => (
                <div
                  key={index}
                  className={`group flex items-center gap-2 transition-all duration-300 ${
                    index < visibleLines ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
                  }`}
                >
                  {line.type === "command" ? (
                    <>
                      <span className="text-accent shrink-0">$</span>
                      <span className="text-terminal-foreground flex-1">{line.text}</span>
                      {line.copyable && <CopyButton text={line.text} />}
                    </>
                  ) : (
                    <>
                      <span className="shrink-0 text-green-400">{"✓"}</span>
                      <span className="text-terminal-muted">{line.text}</span>
                    </>
                  )}
                </div>
              ))}

              {/* Blinking cursor at the end */}
              {visibleLines >= terminalLines.length && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-accent">$</span>
                  <span className="bg-accent cursor-blink h-4 w-2" aria-hidden="true" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hint text */}
        <div
          className={`text-terminal-muted mt-6 text-center font-mono text-sm transition-all duration-500 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDelay: "600ms" }}
        >
          <span className="text-foreground">hover</span> to copy commands
        </div>
      </div>
    </section>
  );
}
