'use client'

import { useEffect, useRef, useState } from 'react'

const commands = [
  {
    name: 'dev',
    description: 'Hot-reload development server',
  },
  {
    name: 'build',
    description: 'Compile your CLI to a standalone binary',
  },
  {
    name: 'test',
    description: 'Run tests with coverage and watch mode',
  },
  {
    name: 'generate',
    description: 'Generate TypeScript types from command definitions',
  },
  {
    name: 'release',
    description: 'Publish to npm with versioning and changelog',
  },
  {
    name: 'init',
    description: 'Scaffold a new bunli project',
  },
]

export function FeaturesGrid() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative py-24 md:py-32"
    >
      {/* ASCII top border */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="font-mono text-terminal-muted text-sm mb-8 select-none" aria-hidden="true">
          {'┌' + '─'.repeat(60) + '┐'}
        </div>

        {/* Terminal header */}
        <div className="bg-terminal border border-terminal-border">
          {/* Terminal title bar */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-terminal-border">
            <span className="font-mono text-xs text-terminal-muted">~/bunli</span>
            <span className="font-mono text-xs text-terminal-muted ml-auto">bunli --help</span>
          </div>

          {/* Terminal content */}
          <div className="p-6 md:p-8">
            {/* Command header */}
            <div
              className={`transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
              style={{ transitionDelay: '0ms' }}
            >
              <div className="font-mono text-terminal-foreground mb-1">
                <span className="text-accent">$</span> bunli --help
              </div>
            </div>

            {/* Help output header */}
            <div
              className={`mt-6 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
              style={{ transitionDelay: '100ms' }}
            >
              <div className="font-mono">
                <span className="text-accent font-semibold">bunli</span>
                <span className="text-terminal-muted"> v0.8.2</span>
              </div>
              <div className="font-mono text-terminal-muted mt-1">
                The CLI framework for Bun
              </div>
            </div>

            {/* Usage */}
            <div
              className={`mt-6 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
              style={{ transitionDelay: '200ms' }}
            >
              <div className="font-mono text-terminal-foreground uppercase text-sm tracking-wider mb-2">
                Commands
              </div>
              <div className="font-mono text-terminal-muted pl-2">
                bunli {'<command>'} [options]
              </div>
            </div>

            {/* Commands list */}
            <div
              className={`mt-8 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
              style={{ transitionDelay: '300ms' }}
            >
              <div className="space-y-3">
                {commands.map((cmd, index) => (
                  <div
                    key={cmd.name}
                    className={`font-mono grid grid-cols-1 md:grid-cols-[120px_1fr] gap-1 md:gap-4 transition-all duration-500 ${
                      isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                    }`}
                    style={{ transitionDelay: `${400 + index * 80}ms` }}
                  >
                    <div className="text-sm">
                      <span className="text-accent">{cmd.name}</span>
                    </div>
                    <div className="text-terminal-muted text-sm pl-4 md:pl-0">
                      {cmd.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer hint */}
            <div
              className={`mt-8 pt-6 border-t border-terminal-border transition-opacity duration-500 ${
                isVisible ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transitionDelay: '900ms' }}
            >
              <div className="font-mono text-terminal-muted text-sm">
                <span className="text-terminal-foreground">{'>'}</span> Run{' '}
                <span className="text-accent">bunli {'<command>'} --help</span> for more information
              </div>
            </div>
          </div>
        </div>

        {/* ASCII bottom border */}
        <div className="font-mono text-terminal-muted text-sm mt-8 select-none" aria-hidden="true">
          {'└' + '─'.repeat(60) + '┘'}
        </div>
      </div>
    </section>
  )
}
