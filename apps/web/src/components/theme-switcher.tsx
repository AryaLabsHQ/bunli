'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { ChevronDown, Check } from 'lucide-react'
import { createPortal } from 'react-dom'
import { themes } from '../lib/themes.js'

interface DropdownPos {
  left: number
  top?: number
  bottom?: number
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<DropdownPos | null>(null)

  const currentTheme = themes.find((t) => t.id === theme) ?? themes[0]

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const spaceAbove = rect.top
    const spaceBelow = window.innerHeight - rect.bottom

    if (spaceAbove > spaceBelow) {
      // Open upward
      setPos({
        left: rect.left,
        bottom: window.innerHeight - rect.top + 6,
      })
    } else {
      // Open downward
      setPos({
        left: rect.left,
        top: rect.bottom + 6,
      })
    }
  }, [])

  useEffect(() => {
    if (!open) return

    updatePosition()

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        buttonRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, updatePosition])

  return (
    <>
      <button
        ref={buttonRef}
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

      {open && pos && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] w-56 rounded-none border border-border bg-card shadow-lg"
            style={{
              left: pos.left,
              ...(pos.bottom != null ? { bottom: pos.bottom } : {}),
              ...(pos.top != null ? { top: pos.top } : {}),
            }}
          >
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
            <div className="p-1 max-h-[60vh] overflow-y-auto">
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
          </div>,
          document.body
        )
      }
    </>
  )
}
