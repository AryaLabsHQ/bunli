import type { GallerySection } from "../model.js";
import { DeployWorkflowRecipe } from "../recipes/deploy-workflow.js";
import { DialogFlowRecipe } from "../recipes/dialog-flow.js";
import { FocusHandoffRecipe } from "../recipes/focus-handoff.js";
import { PaletteRegistryRecipe } from "../recipes/palette-registry.js";
import { RouteStoreRecipe } from "../recipes/route-store.js";

export const runtimeRecipesSection: GallerySection = {
  id: "recipes",
  title: "Runtime Recipes",
  categories: [
    {
      id: "dialogs",
      title: "Dialogs",
      description: "Confirm and choose flows",
      entries: [
        {
          id: "dialog-flow",
          kind: "recipe",
          title: "Dialog Flow",
          summary: "Open confirm and choose dialogs from a keyboard-driven recipe surface.",
          usage: [
            "Use the dialog manager for interruptive choices that should sit above the active screen.",
            "Treat confirm and choose as runtime-level patterns, not one-off ad hoc overlays.",
          ],
          keybindings: ["j/k", "Enter", "Esc"],
          states: [
            { key: "confirm", label: "Confirm-first", description: "Protected confirmation flow" },
            {
              key: "choose",
              label: "Choose-enabled",
              description: "Choose flow with more options",
            },
          ],
          sourceRefs: [
            { label: "Dialog manager", path: "packages/runtime/src/components/dialog-manager.tsx" },
            { label: "Modal", path: "packages/runtime/src/components/modal.tsx" },
          ],
          render: (context) => <DialogFlowRecipe {...context} />,
        },
      ],
    },
    {
      id: "forms",
      title: "Form Workflow",
      description: "Longer-running configuration flow",
      entries: [
        {
          id: "deploy-workflow",
          kind: "recipe",
          title: "Deploy Workflow",
          summary:
            "A focused recipe showing how form primitives become a workflow rather than a standalone component demo.",
          usage: [
            "Use recipes to show how component primitives fit a real task flow.",
            "Keep workflow recipes purposeful and short rather than dashboard-like.",
          ],
          keybindings: ["Tab", "Enter", "Ctrl+S", "Ctrl+R"],
          states: [
            { key: "preview", label: "Preview", description: "Lower-risk deployment profile" },
            {
              key: "production",
              label: "Production",
              description: "Guardrailed production profile",
            },
          ],
          sourceRefs: [
            { label: "Form", path: "packages/tui/src/components/form.tsx" },
            { label: "Form engine", path: "packages/tui/src/components/form-engine.ts" },
          ],
          render: (context) => <DeployWorkflowRecipe {...context} />,
        },
      ],
    },
    {
      id: "commands",
      title: "Commands",
      description: "Command registry + palette flows",
      entries: [
        {
          id: "palette-registry",
          kind: "recipe",
          title: "Palette + Registry",
          summary:
            "CommandPalette driven by runtime-registered commands rather than a hard-coded item list.",
          usage: [
            "Register commands where the behavior lives and derive palette items from the runtime registry.",
            "Keep shell-level commands and recipe-level commands in the same conceptual system.",
          ],
          keybindings: ["type to filter", "j/k", "Enter"],
          states: [{ key: "default", label: "Default", description: "Registry-backed palette" }],
          sourceRefs: [
            {
              label: "Command registry",
              path: "packages/runtime/src/runtime/command-registry.tsx",
            },
            { label: "CommandPalette", path: "packages/tui/src/components/command-palette.tsx" },
          ],
          render: (context) => <PaletteRegistryRecipe {...context} />,
        },
      ],
    },
    {
      id: "focus",
      title: "Focus / Nested Widgets",
      description: "Managing multiple interactive surfaces",
      entries: [
        {
          id: "focus-handoff",
          kind: "recipe",
          title: "Focus Handoff",
          summary: "Nested focus example with tabs and data table sharing the preview region.",
          usage: [
            "Use scoped focus to keep nested widgets predictable.",
            "Document nested focus rules whenever a recipe contains more than one interactive widget.",
          ],
          keybindings: ["Tab inside preview", "h/l", "j/k", "Enter"],
          states: [{ key: "default", label: "Default", description: "Tabs and table split" }],
          sourceRefs: [
            { label: "Focus scope", path: "packages/runtime/src/components/focus-scope.tsx" },
            { label: "Tabs", path: "packages/tui/src/components/tabs.tsx" },
            { label: "DataTable", path: "packages/tui/src/components/data-table.tsx" },
          ],
          render: (context) => <FocusHandoffRecipe {...context} />,
        },
      ],
    },
    {
      id: "routing",
      title: "Routing",
      description: "Route store and history behavior",
      entries: [
        {
          id: "route-store",
          kind: "recipe",
          title: "Route Store",
          summary: "Navigate, replace, and reset routes from an app-level runtime store.",
          usage: [
            "Use route store for app-like flows that still fit inside a single terminal session.",
            "Prefer replace/reset when the user should not revisit prior views.",
          ],
          keybindings: ["j/k", "Enter"],
          states: [
            { key: "navigate", label: "Navigate", description: "Push and back through history" },
            { key: "replace", label: "Replace", description: "Replace and reset route stack" },
          ],
          sourceRefs: [
            { label: "Route store", path: "packages/runtime/src/runtime/route-store.tsx" },
          ],
          render: (context) => <RouteStoreRecipe {...context} />,
        },
      ],
    },
  ],
};
