'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Star } from 'lucide-react'

export function CTASection() {
  const [isVisible, setIsVisible] = useState(false)
  const [stars, setStars] = useState<number | null>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
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
    fetch('https://api.github.com/repos/AryaLabsHQ/bunli')
      .then(res => res.json() as Promise<{ stargazers_count?: number }>)
      .then(data => {
        if (data.stargazers_count) {
          setStars(data.stargazers_count);
        }
      })
      .catch(() => {
        setStars(2300);
      });
  }, [])

  const handleGetStarted = useCallback(() => {
    window.location.href = '/docs/getting-started'
  }, [])

  return (
    <section ref={sectionRef} className="relative py-24 md:py-32">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* ASCII border top */}
        <div
          className={`font-mono text-terminal-muted text-sm mb-12 transition-all duration-500 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        >
          {'─'.repeat(40)}
        </div>

        {/* Terminal prompt */}
        <div
          className={`bg-terminal border border-terminal-border inline-block transition-all duration-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '100ms' }}
        >
          <div className="px-6 py-4 md:px-8 md:py-5">
            <button
              onClick={handleGetStarted}
              className="font-mono text-lg md:text-xl flex items-center gap-2 group"
            >
              <span className="text-accent">$</span>
              <span className="text-terminal-foreground group-hover:text-accent transition-colors">
                bun create bunli my-cli
              </span>
              <span
                className="w-2.5 h-5 bg-accent cursor-blink"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {/* Action hint */}
        <div
          className={`mt-8 font-mono text-terminal-muted text-sm transition-all duration-500 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDelay: '200ms' }}
        >
          press{' '}
          <kbd className="inline-flex items-center px-2 py-0.5 bg-terminal border border-terminal-border text-terminal-foreground text-xs">
            enter
          </kbd>{' '}
          to get started
        </div>

        {/* GitHub stars */}
        <div
          className={`mt-12 flex items-center justify-center gap-6 transition-all duration-500 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDelay: '300ms' }}
        >
          <a
            href="https://github.com/AryaLabsHQ/bunli"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-terminal-muted hover:text-terminal-foreground transition-colors flex items-center gap-2"
          >
            <Star className="w-4 h-4" />
            <span>{stars ?? '...'}</span>
          </a>
          <span className="text-terminal-border">|</span>
          <a
            href="https://github.com/AryaLabsHQ/bunli"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-terminal-muted hover:text-terminal-foreground transition-colors"
          >
            view on github
          </a>
        </div>

        {/* ASCII border bottom */}
        <div
          className={`font-mono text-terminal-muted text-sm mt-12 transition-all duration-500 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDelay: '400ms' }}
          aria-hidden="true"
        >
          {'─'.repeat(40)}
        </div>
      </div>
    </section>
  )
}
