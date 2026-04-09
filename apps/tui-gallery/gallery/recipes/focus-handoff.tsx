import { DataTable, Stack, Tabs, useKeyboard } from "@bunli/tui/interactive";
import { useState } from "react";

import type { GalleryRenderContext } from "../model.js";

export function FocusHandoffRecipe({ active, focusToken, previewWidth }: GalleryRenderContext) {
  const [activeView, setActiveView] = useState<"tabs" | "table">("tabs");
  const [lastRow, setLastRow] = useState("No row selected");

  useKeyboard((key) => {
    if (!active) return;
    if (!key.ctrl && !key.meta && !key.option && key.name === "tab") {
      setActiveView((current) => (current === "tabs" ? "table" : "tabs"));
      key.stopPropagation?.();
    }
  });

  return (
    <Stack gap={1}>
      <text content="Use Tab inside the preview to swap between tabs and table focus." />
      <Tabs
        initialKey="dataset"
        scopeId={`gallery:recipe:focus-tabs:${focusToken}`}
        keyboardEnabled={active && activeView === "tabs"}
        tabs={[
          {
            key: "dataset",
            label: activeView === "tabs" ? "Dataset*" : "Dataset",
            content: (
              <text content="The active preview focus can shift between nested widgets without leaving the shell." />
            ),
          },
          {
            key: "details",
            label: "Details",
            content: (
              <text
                content={`Selected row: ${lastRow}. Pair scoped focus with shell-level pane focus for larger apps.`}
              />
            ),
          },
        ]}
      />
      <DataTable
        columns={[
          { key: "name", label: "Entry" },
          { key: "kind", label: "Kind" },
        ]}
        rows={[
          { name: "Badge", kind: "component" },
          { name: "Dialogs", kind: "recipe" },
          { name: "Route Flow", kind: "recipe" },
        ]}
        scopeId={`gallery:recipe:focus-table:${focusToken}`}
        keyboardEnabled={active && activeView === "table"}
        maxLineWidth={Math.max(34, previewWidth - 6)}
        fillWidth
        onRowSelect={(row) => {
          setLastRow(String(row.name ?? "Unknown"));
        }}
      />
    </Stack>
  );
}
