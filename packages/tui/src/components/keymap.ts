import type { KeyEvent } from '@opentui/core'

export type KeyBinding = string | string[]

export type KeymapDefinition<TAction extends string> = {
  [K in TAction]: KeyBinding
}

const KEY_ALIASES: Record<string, string> = {
  esc: 'escape',
  '\u001b': 'escape',
  return: 'enter',
  linefeed: 'enter',
  '\r': 'enter',
  '\n': 'enter',
  spacebar: 'space',
  ' ': 'space',
  '\u0003': 'c',
  arrowup: 'up',
  arrowdown: 'down',
  arrowleft: 'left',
  arrowright: 'right'
}

function normalizeName(name: string): string {
  const trimmed = name.trim().toLowerCase()
  return KEY_ALIASES[trimmed] ?? trimmed
}

function normalizeBindingToken(binding: string): string {
  const parts = binding
    .split('+')
    .map((part) => normalizeName(part))
    .filter(Boolean)

  const base = parts.find((part) => part !== 'ctrl' && part !== 'shift' && part !== 'meta' && part !== 'alt')
  const mods = new Set(parts.filter((part) => part !== base).map((part) => (part === 'alt' ? 'meta' : part)))

  const orderedMods = ['ctrl', 'meta', 'shift'].filter((mod) => mods.has(mod))
  return [...orderedMods, base ?? ''].filter(Boolean).join('+')
}

export function eventToBinding(key: KeyEvent): string {
  const base = normalizeName(key.name || key.sequence || '')
  const mods: string[] = []

  if (key.ctrl) mods.push('ctrl')
  if (key.meta || key.option) mods.push('meta')
  if (key.shift) mods.push('shift')

  return [...mods, base].filter(Boolean).join('+')
}

export function matchesKeyBinding(key: KeyEvent, binding: KeyBinding): boolean {
  const candidates = Array.isArray(binding) ? binding : [binding]
  const keyBinding = normalizeBindingToken(eventToBinding(key))
  return candidates.some((candidate) => normalizeBindingToken(candidate) === keyBinding)
}

export type KeyMatcher<TAction extends string> = {
  match: (action: TAction, key: KeyEvent) => boolean
  bindings: Record<TAction, string[]>
}

export function createKeyMatcher<TAction extends string>(definition: KeymapDefinition<TAction>): KeyMatcher<TAction> {
  const bindings = Object.fromEntries(
    Object.entries(definition).map(([action, binding]) => {
      const values = Array.isArray(binding) ? binding : [binding]
      return [action, values]
    })
  ) as Record<TAction, string[]>

  return {
    bindings,
    match(action: TAction, key: KeyEvent) {
      const actionBindings = bindings[action] ?? []
      return actionBindings.some((binding) => matchesKeyBinding(key, binding))
    }
  }
}
