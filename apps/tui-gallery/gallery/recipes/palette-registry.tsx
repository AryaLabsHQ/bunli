import { useCommandRegistry, useCommandRegistryItems, useRuntime } from "@bunli/runtime/app";
import { CommandPalette, KeyValueList, Stack } from "@bunli/tui/interactive";
import { useEffect, useState } from "react";

import type { GalleryRenderContext } from "../model.js";

export function PaletteRegistryRecipe({ active, focusToken, previewWidth }: GalleryRenderContext) {
  const runtime = useRuntime();
  const registry = useCommandRegistry();
  const items = useCommandRegistryItems();
  const [lastAction, setLastAction] = useState("No command selected yet.");

  useEffect(() => {
    const unregister = registry.registerCommands([
      {
        id: "gallery.command.focus-preview",
        title: "Focus preview pane",
        section: "Gallery",
        keybinds: ["f4"],
        run: () => {
          setLastAction("Preview focus shortcut is documented at the shell level.");
        },
      },
      {
        id: "gallery.command.release-note",
        title: "Show release note",
        section: "Runtime",
        keybinds: ["ctrl+l"],
        run: () => {
          setLastAction("Release note command executed.");
        },
      },
      {
        id: "gallery.command.quit",
        title: "Quit gallery",
        section: "Gallery",
        keybinds: ["ctrl+c"],
        run: () => {
          setLastAction("Quit command invoked.");
          runtime.exit();
        },
      },
    ]);

    return () => {
      unregister();
    };
  }, [registry, runtime]);

  return (
    <Stack gap={1}>
      <CommandPalette
        items={items}
        scopeId={`gallery:recipe:commands:${focusToken}`}
        keyboardEnabled={active}
        inputFocused={active}
        maxLineWidth={Math.max(34, previewWidth - 6)}
        onSelect={(key) => {
          void registry.runCommand(key).then((handled) => {
            if (!handled) {
              setLastAction(`Command not handled: ${key}`);
              return;
            }
            setLastAction(`Executed ${key}`);
          });
        }}
      />
      <KeyValueList
        items={[
          { key: "registered", value: items.length },
          { key: "last action", value: lastAction },
        ]}
        maxLineWidth={Math.max(34, previewWidth - 6)}
        fillWidth
      />
    </Stack>
  );
}
