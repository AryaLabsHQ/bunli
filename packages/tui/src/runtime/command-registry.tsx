import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import type { CommandPaletteItem } from '../components/command-palette.js'

export interface RuntimeCommand {
  id: string
  title: string
  hint?: string
  section?: string
  keybinds?: string[]
  disabled?: boolean
  visible?: boolean
  run: () => void | Promise<void>
}

interface RegisteredCommand extends RuntimeCommand {
  order: number
  registrationId: number
}

export interface CommandRegistry {
  commands: RuntimeCommand[]
  registerCommand: (command: RuntimeCommand) => () => void
  registerCommands: (commands: RuntimeCommand[]) => () => void
  unregisterCommand: (id: string) => void
  clearCommands: () => void
  runCommand: (id: string) => Promise<boolean>
  runKeybinding: (binding: string) => Promise<boolean>
}

interface CommandRegistryContextValue extends CommandRegistry {}

const CommandRegistryContext = createContext<CommandRegistryContextValue | null>(null)

export interface CommandRegistryProviderProps {
  children: ReactNode
  initialCommands?: RuntimeCommand[]
}

function normalizeBinding(binding: string): string {
  return binding.trim().toLowerCase()
}

function isCommandVisible(command: RuntimeCommand): boolean {
  return command.visible !== false
}

function commandToPaletteItem(command: RuntimeCommand): CommandPaletteItem {
  const keybindHint = command.keybinds && command.keybinds.length > 0
    ? command.keybinds.map(normalizeBinding).join(', ')
    : null
  const hint = [command.section, command.hint, keybindHint].filter(Boolean).join(' · ') || undefined

  return {
    key: command.id,
    label: command.title,
    hint
  }
}

function shouldCleanupRegisteredCommand(
  entry: Pick<RegisteredCommand, 'id' | 'registrationId'>,
  commandId: string,
  registrationId: number
): boolean {
  return entry.id === commandId && entry.registrationId === registrationId
}

export function CommandRegistryProvider({
  children,
  initialCommands = []
}: CommandRegistryProviderProps) {
  const orderCounterRef = useRef(0)
  const registrationCounterRef = useRef(0)
  const toRegistered = useCallback(
    (command: RuntimeCommand, registrationId: number): RegisteredCommand => ({
      ...command,
      order: orderCounterRef.current++,
      registrationId
    }),
    []
  )

  const [commands, setCommands] = useState<RegisteredCommand[]>(() =>
    initialCommands.map((command) => toRegistered(command, registrationCounterRef.current++))
  )
  const commandMapRef = useRef<Map<string, RegisteredCommand>>(new Map())
  commandMapRef.current = new Map(commands.map((command) => [command.id, command]))

  const registerCommand = useCallback((command: RuntimeCommand) => {
    const registrationId = registrationCounterRef.current++
    setCommands((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.id === command.id)
      if (existingIndex < 0) {
        return [...prev, toRegistered(command, registrationId)]
      }

      const existing = prev[existingIndex]
      if (!existing) return prev
      const next = [...prev]
      next[existingIndex] = {
        ...existing,
        ...command,
        order: existing.order,
        registrationId
      }
      return next
    })

    return () => {
      setCommands((prev) =>
        prev.filter((entry) => !shouldCleanupRegisteredCommand(entry, command.id, registrationId))
      )
    }
  }, [toRegistered])

  const registerCommands = useCallback((nextCommands: RuntimeCommand[]) => {
    const unregisterHandlers = nextCommands.map((command) => registerCommand(command))
    return () => {
      for (const unregister of unregisterHandlers) unregister()
    }
  }, [registerCommand])

  const unregisterCommand = useCallback((id: string) => {
    setCommands((prev) => prev.filter((entry) => entry.id !== id))
  }, [])

  const clearCommands = useCallback(() => {
    setCommands([])
  }, [])

  const runCommand = useCallback(async (id: string): Promise<boolean> => {
    const command = commandMapRef.current.get(id)
    if (!command || command.disabled || !isCommandVisible(command)) {
      return false
    }

    await command.run()
    return true
  }, [])

  const runKeybinding = useCallback(async (binding: string): Promise<boolean> => {
    const normalized = normalizeBinding(binding)
    if (!normalized) return false

    const ordered = [...commandMapRef.current.values()].sort((left, right) => left.order - right.order)
    for (const command of ordered) {
      if (command.disabled || !isCommandVisible(command)) {
        continue
      }

      const bindings = command.keybinds?.map(normalizeBinding) ?? []
      if (!bindings.includes(normalized)) {
        continue
      }

      await command.run()
      return true
    }

    return false
  }, [])

  const value = useMemo<CommandRegistryContextValue>(() => ({
    commands: [...commands]
      .sort((left, right) => left.order - right.order)
      .map((command) => ({
        id: command.id,
        title: command.title,
        hint: command.hint,
        section: command.section,
        keybinds: command.keybinds,
        disabled: command.disabled,
        visible: command.visible,
        run: command.run
      })),
    registerCommand,
    registerCommands,
    unregisterCommand,
    clearCommands,
    runCommand,
    runKeybinding
  }), [clearCommands, commands, registerCommand, registerCommands, runCommand, runKeybinding, unregisterCommand])

  return (
    <CommandRegistryContext.Provider value={value}>
      {children}
    </CommandRegistryContext.Provider>
  )
}

export function useCommandRegistry(): CommandRegistry {
  const context = useContext(CommandRegistryContext)
  if (!context) {
    throw new Error('Command registry is not available. Wrap your app in <CommandRegistryProvider>.')
  }
  return context
}

export function useCommandRegistryItems(): CommandPaletteItem[] {
  const registry = useCommandRegistry()
  return useMemo(
    () =>
      registry.commands
        .filter((command) => !command.disabled && isCommandVisible(command))
        .map(commandToPaletteItem),
    [registry.commands]
  )
}

export const __commandRegistryInternalsForTests = {
  normalizeBinding,
  commandToPaletteItem,
  shouldCleanupRegisteredCommand
}
