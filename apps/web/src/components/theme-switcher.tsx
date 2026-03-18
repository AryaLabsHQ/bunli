'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { ChevronDown, Check } from 'lucide-react'
import { themes } from '../lib/themes.js'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const currentTheme = themes.find((t) => t.id === theme) ?? themes[0]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-2 py-1.5 rounded-none border border-transparent hover:border-border hover:bg-muted/50 transition-colors text-xs font-mono text-foreground"
        aria-label="Switch theme"
        aria-expanded={open}
      >
        <span
          className="block h-3 w-3 shrink-0 rounded-none"
          style={{ backgroundColor: currentTheme.accent }}
        />
        <span className="hidden sm:inline">{currentTheme.name}</span>
        <ChevronDown
          className={`hidden sm:block h-3 w-3 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-none border border-border bg-card shadow-lg">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
              Theme
            </span>
            <span className="ml-auto font-mono text-xs text-foreground">
              {currentTheme.name}
            </span>
          </div>

          {/* Theme list */}
          <div className="p-1">
            {themes.map((t) => {
              const isActive = t.id === theme
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTheme(t.id)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center gap-3 rounded-none px-2 py-2 text-left transition-colors ${
                    isActive
                      ? 'bg-accent/10 text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <span
                    className={`block h-4 w-4 shrink-0 rounded-none ${isActive ? 'ring-2 ring-accent ring-offset-1 ring-offset-card' : ''}`}
                    style={{ backgroundColor: t.accent }}
                  />
                  <span className="font-mono text-xs">{t.name}</span>
                  {t.id === 'vesper' && (
                    <span className="ml-1 rounded-none border border-border/50 bg-muted/50 px-1 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      default
                    </span>
                  )}
                  {isActive && (
                    <Check className="ml-auto h-3 w-3 shrink-0 text-accent" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
