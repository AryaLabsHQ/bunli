'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Check, Copy } from 'lucide-react'

interface TerminalLine {
  type: 'command' | 'output'
  text: string
  copyable?: boolean
}

const terminalLines: TerminalLine[] = [
  { type: 'command', text: 'bun create bunli my-cli', copyable: true },
  { type: 'output', text: 'Creating project in ./my-cli...' },
  { type: 'output', text: 'Installing dependencies...' },
  { type: 'output', text: 'Project created successfully' },
  { type: 'command', text: 'cd my-cli', copyable: true },
  { type: 'command', text: 'bunli dev', copyable: true },
  { type: 'output', text: 'Watching for changes...' },
  { type: 'output', text: 'Ready! Try running: ./my-cli --help' },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-terminal-border rounded"
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-400" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-terminal-muted" />
      )}
    </button>
  )
}

export function QuickStart() {
  const [isVisible, setIsVisible] = useState(false)
  const [visibleLines, setVisibleLines] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          setIsVisible(true)
          hasAnimated.current = true
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      setVisibleLines(terminalLines.length)
      return
    }

    let currentLine = 0
    const interval = setInterval(() => {
      currentLine++
      setVisibleLines(currentLine)
      if (currentLine >= terminalLines.length) {
        clearInterval(interval)
      }
    }, 400)

    return () => clearInterval(interval)
  }, [isVisible])

  return (
    <section ref={sectionRef} className="relative py-24 md:py-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div
          className={`mb-12 transition-all duration-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="font-mono text-terminal-muted text-sm mb-2">
            <span className="text-accent">{'>'}</span> quick start
          </div>
          <h2 className="font-mono text-2xl md:text-3xl text-foreground">
            from zero to cli in seconds
          </h2>
        </div>

        {/* Terminal window */}
        <div
          className={`bg-terminal border border-terminal-border transition-all duration-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '150ms' }}
        >
          {/* Terminal header */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-terminal-border">
            <span className="font-mono text-xs text-terminal-muted">~</span>
            <span className="font-mono text-xs text-terminal-muted ml-auto">bash</span>
          </div>

          {/* Terminal content */}
          <div className="p-4 md:p-6 min-h-[280px]">
            <div className="font-mono text-sm space-y-1">
              {terminalLines.map((line, index) => (
                <div
                  key={index}
                  className={`group flex items-center gap-2 transition-all duration-300 ${
                    index < visibleLines
                      ? 'opacity-100 translate-x-0'
                      : 'opacity-0 -translate-x-2'
                  }`}
                >
                  {line.type === 'command' ? (
                    <>
                      <span className="text-accent shrink-0">$</span>
                      <span className="text-terminal-foreground flex-1">{line.text}</span>
                      {line.copyable && <CopyButton text={line.text} />}
                    </>
                  ) : (
                    <>
                      <span className="text-green-400 shrink-0">{'✓'}</span>
                      <span className="text-terminal-muted">{line.text}</span>
                    </>
                  )}
                </div>
              ))}

              {/* Blinking cursor at the end */}
              {visibleLines >= terminalLines.length && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-accent">$</span>
                  <span className="w-2 h-4 bg-accent cursor-blink" aria-hidden="true" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hint text */}
        <div
          className={`mt-6 font-mono text-sm text-terminal-muted text-center transition-all duration-500 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDelay: '600ms' }}
        >
          <span className="text-foreground">hover</span> to copy commands
        </div>
      </div>
    </section>
  )
}
