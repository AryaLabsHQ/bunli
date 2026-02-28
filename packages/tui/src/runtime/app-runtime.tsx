import type { ReactNode } from 'react'
import { DialogProvider } from '../components/dialog-manager.js'
import { FocusScopeProvider } from '../components/focus-scope.js'
import { OverlayHostProvider } from '../components/overlay-host.js'
import {
  CommandRegistryProvider,
  type RuntimeCommand
} from './command-registry.js'
import { RouteStoreProvider } from './route-store.js'

export interface AppRuntimeProviderProps {
  children: ReactNode
  initialRoute?: string
  initialCommands?: RuntimeCommand[]
}

export function AppRuntimeProvider({
  children,
  initialRoute,
  initialCommands
}: AppRuntimeProviderProps) {
  return (
    <FocusScopeProvider>
      <OverlayHostProvider>
        <DialogProvider>
          <RouteStoreProvider initialRoute={initialRoute}>
            <CommandRegistryProvider initialCommands={initialCommands}>
              {children}
            </CommandRegistryProvider>
          </RouteStoreProvider>
        </DialogProvider>
      </OverlayHostProvider>
    </FocusScopeProvider>
  )
}
