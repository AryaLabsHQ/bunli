import { ChartPrimitivesExample } from "../examples/chart-primitives.js";
import { ContentBlocksExample } from "../examples/content-blocks.js";
import { CredentialsFormExample } from "../examples/credentials-form.js";
import { FeedbackPrimitivesExample } from "../examples/feedback-primitives.js";
import { FieldSetExample } from "../examples/field-set.js";
import { NavigationPrimitivesExample } from "../examples/navigation-primitives.js";
import { SchemaFormExample } from "../examples/schema-form.js";
import { SurfaceCompositionExample } from "../examples/surface-composition.js";
import type { GallerySection } from "../model.js";

export const componentExamplesSection: GallerySection = {
  id: "components",
  title: "Component Examples",
  categories: [
    {
      id: "forms",
      title: "Forms",
      description: "Validation and field primitives",
      entries: [
        {
          id: "credentials-form",
          kind: "example",
          title: "Credentials Form",
          summary: "Interactive form example for Input + PasswordField + validation.",
          usage: [
            "Use Form when you want built-in submit/reset/error handling.",
            "Pair Input and PasswordField with schema validation for secure credential capture.",
          ],
          keybindings: ["Tab / Shift+Tab", "Enter", "Ctrl+S", "Ctrl+R", "Esc"],
          states: [
            { key: "credentials", label: "Credentials", description: "Normal empty form" },
            { key: "validation", label: "Validation", description: "Starts with invalid values" },
          ],
          sourceRefs: [
            { label: "Form", path: "packages/tui/src/components/form.tsx" },
            { label: "PasswordField", path: "packages/tui/src/components/password-field.tsx" },
            {
              label: "Gallery implementation",
              path: "apps/tui-gallery/gallery/examples/credentials-form.tsx",
            },
          ],
          render: (context) => <CredentialsFormExample {...context} />,
        },
        {
          id: "field-set",
          kind: "example",
          title: "Field Set",
          summary:
            "Select, MultiSelect, NumberField, TextareaField, and CheckboxField in one composed form example.",
          usage: [
            "Use a composed field set when several input primitives contribute to a single workflow.",
            "This is the lower-level authoring path when you want explicit control over each field.",
          ],
          keybindings: ["Tab / Shift+Tab", "Space", "Enter", "Ctrl+S", "Ctrl+R"],
          states: [
            {
              key: "baseline",
              label: "Baseline",
              description: "Balanced default operator profile",
            },
            {
              key: "release",
              label: "Release",
              description: "Production-oriented release profile",
            },
            {
              key: "editorial",
              label: "Editorial",
              description: "Content-focused archive profile",
            },
          ],
          sourceRefs: [
            { label: "Select", path: "packages/tui/src/components/select-field.tsx" },
            { label: "MultiSelect", path: "packages/tui/src/components/multi-select-field.tsx" },
            { label: "NumberField", path: "packages/tui/src/components/number-field.tsx" },
            { label: "TextareaField", path: "packages/tui/src/components/textarea-field.tsx" },
            { label: "CheckboxField", path: "packages/tui/src/components/checkbox-field.tsx" },
          ],
          render: (context) => <FieldSetExample {...context} />,
        },
        {
          id: "schema-form",
          kind: "example",
          title: "Schema Form",
          summary:
            "Higher-level schema-driven form authoring with field metadata, visibility, and derived defaults.",
          usage: [
            "Use SchemaForm when you want to describe form structure declaratively rather than composing every field manually.",
            "It is best for scaffolds, setup screens, and guided configuration workflows.",
          ],
          keybindings: ["Tab / Shift+Tab", "Space", "Enter", "Ctrl+S", "Ctrl+R"],
          states: [
            { key: "starter", label: "Starter", description: "Docs-oriented scaffold defaults" },
            { key: "service", label: "Service", description: "API/service scaffold defaults" },
          ],
          sourceRefs: [
            { label: "SchemaForm", path: "packages/tui/src/components/schema-form.tsx" },
            { label: "Form", path: "packages/tui/src/components/form.tsx" },
            {
              label: "Gallery implementation",
              path: "apps/tui-gallery/gallery/examples/schema-form.tsx",
            },
          ],
          render: (context) => <SchemaFormExample {...context} />,
        },
      ],
    },
    {
      id: "layout",
      title: "Layout / Display",
      description: "Surfaces, grouping, and composition",
      entries: [
        {
          id: "surface-composition",
          kind: "example",
          title: "Surface Composition",
          summary:
            "Container, Panel, Card, Grid, SectionHeader, Divider, and Stat in one layout-focused example.",
          usage: [
            "Use Container as the outer shell and Panels/Cards for grouped content.",
            "Prefer Grid for compact metric clusters and Stack for explicit composition.",
          ],
          states: [
            { key: "surfaces", label: "Surfaces", description: "Panels and cards" },
            { key: "grid", label: "Grid", description: "Metric-heavy layout" },
          ],
          sourceRefs: [
            { label: "Panel", path: "packages/tui/src/components/panel.tsx" },
            { label: "Grid", path: "packages/tui/src/components/grid.tsx" },
            { label: "SectionHeader", path: "packages/tui/src/components/section-header.tsx" },
          ],
          render: (context) => <SurfaceCompositionExample {...context} />,
        },
        {
          id: "content-blocks",
          kind: "example",
          title: "Content Blocks",
          summary:
            "List, Table, Markdown, and Diff grouped into one docs-oriented content example.",
          usage: [
            "Use these primitives for docs-adjacent terminal screens, release notes, and compact reference content.",
            "They are most effective when grouped with stronger layout surfaces rather than shown in isolation.",
          ],
          states: [
            {
              key: "reference",
              label: "Reference",
              description: "Lists and table for compact reference content",
            },
            {
              key: "markdown",
              label: "Markdown",
              description: "Docs prose and release note style content",
            },
            { key: "diff", label: "Diff", description: "Before/after configuration review" },
          ],
          sourceRefs: [
            {
              label: "List / Table / Markdown / Diff",
              path: "packages/tui/src/interactive/index.tsx",
            },
            {
              label: "Gallery implementation",
              path: "apps/tui-gallery/gallery/examples/content-blocks.tsx",
            },
          ],
          render: (context) => <ContentBlocksExample {...context} />,
        },
      ],
    },
    {
      id: "feedback",
      title: "Feedback / Status",
      description: "Tones, states, and lightweight status",
      entries: [
        {
          id: "feedback-primitives",
          kind: "example",
          title: "Feedback Primitives",
          summary: "Alert, Badge, Progress, Toast, EmptyState, and Stat variants.",
          usage: [
            "Use alerts and toasts for event feedback.",
            "Use badges, progress, and stats for lightweight status communication.",
          ],
          states: [
            { key: "alerts", label: "Alerts", description: "Alert + empty state" },
            { key: "badges", label: "Badges", description: "Tone and emphasis sweep" },
            { key: "status", label: "Status", description: "Stats + progress + toast" },
          ],
          sourceRefs: [
            { label: "Alert", path: "packages/tui/src/components/alert.tsx" },
            { label: "Badge", path: "packages/tui/src/components/badge.tsx" },
            { label: "Progress", path: "packages/tui/src/components/progress-bar.tsx" },
          ],
          render: (context) => <FeedbackPrimitivesExample {...context} />,
        },
      ],
    },
    {
      id: "navigation",
      title: "Navigation / Data",
      description: "Keyboard-first menus, tabs, tables, and palette",
      entries: [
        {
          id: "navigation-primitives",
          kind: "example",
          title: "Navigation Primitives",
          summary:
            "Menu, Tabs, DataTable, and CommandPalette as focused states of a single example.",
          usage: [
            "Use Menu and CommandPalette for command-oriented flows.",
            "Use Tabs and DataTable for in-place mode switches and browseable datasets.",
          ],
          keybindings: ["j/k", "h/l", "Enter"],
          states: [
            { key: "menu", label: "Menu", description: "List-style action picker" },
            { key: "tabs", label: "Tabs", description: "Inline view switching" },
            { key: "table", label: "Table", description: "Row selection + sorting" },
            { key: "palette", label: "Palette", description: "Filterable command launcher" },
          ],
          sourceRefs: [
            { label: "Menu", path: "packages/tui/src/components/menu.tsx" },
            { label: "Tabs", path: "packages/tui/src/components/tabs.tsx" },
            { label: "DataTable", path: "packages/tui/src/components/data-table.tsx" },
            { label: "CommandPalette", path: "packages/tui/src/components/command-palette.tsx" },
          ],
          render: (context) => <NavigationPrimitivesExample {...context} />,
        },
      ],
    },
    {
      id: "charts",
      title: "Charts",
      description: "Terminal-native data visualization",
      entries: [
        {
          id: "chart-primitives",
          kind: "example",
          title: "Chart Primitives",
          summary: "BarChart, LineChart, and Sparkline with multiple datasets.",
          usage: [
            "Use charts for compact trend and comparison views inside alternate-buffer screens.",
            "Bar charts work well for categorical comparisons; sparklines are better for compact trends.",
          ],
          states: [
            { key: "release", label: "Release", description: "Weekly release activity" },
            { key: "latency", label: "Latency", description: "Operational performance view" },
          ],
          sourceRefs: [{ label: "Charts", path: "packages/tui/src/charts/index.tsx" }],
          render: (context) => <ChartPrimitivesExample {...context} />,
        },
      ],
    },
  ],
};
