import { createContext, useContext, useMemo, type ReactNode } from "react";

import { DialogProvider } from "../components/dialog-manager.js";
import { FocusScopeProvider } from "../components/focus-scope.js";
import { OverlayHostProvider } from "../components/overlay-host.js";
import { CommandRegistryProvider, type RuntimeCommand } from "./command-registry.js";
import { RouteStoreProvider } from "./route-store.js";

const noopExit = () => {};

export interface RuntimeContextValue {
  exit: () => void;
}

const RuntimeContext = createContext<RuntimeContextValue | undefined>(undefined);

export interface RuntimeProviderProps {
  children: ReactNode;
  initialRoute?: string;
  initialCommands?: RuntimeCommand[];
  onExit?: () => void;
}

export function RuntimeProvider({
  children,
  initialRoute,
  initialCommands,
  onExit,
}: RuntimeProviderProps) {
  const value = useMemo<RuntimeContextValue>(
    () => ({
      exit: onExit ?? noopExit,
    }),
    [onExit],
  );

  return (
    <RuntimeContext.Provider value={value}>
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
    </RuntimeContext.Provider>
  );
}

export function useRuntime(): RuntimeContextValue {
  const value = useContext(RuntimeContext);
  if (!value) {
    throw new Error("Runtime is not available. Wrap your app in <RuntimeProvider>.");
  }
  return value;
}
