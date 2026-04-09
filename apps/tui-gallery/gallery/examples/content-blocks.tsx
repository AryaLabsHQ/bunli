import { Badge, Card, Diff, Divider, List, Markdown, Stack, Table } from "@bunli/tui/interactive";

import type { GalleryRenderContext } from "../model.js";

export function ContentBlocksExample({ stateKey }: GalleryRenderContext) {
  if (stateKey === "markdown") {
    return (
      <Stack gap={1}>
        <text content="Content Blocks" />
        <text content="Markdown and list-style content for docs-adjacent terminal surfaces." />
        <Card
          title="Release Note Draft"
          description="Markdown rendered as plain terminal content"
          tone="accent"
          emphasis="outline"
        >
          <Markdown
            content={`# Bunli 0.8\n\n- Added TUI Gallery coverage for forms and content blocks.\n- Improved focus cues and gallery shell layout.\n- Removed the old Hello World showcase command.`}
          />
        </Card>
        <List
          items={[
            "Use Markdown for lightweight prose blocks inside terminal docs surfaces.",
            "Pair Markdown with lists and cards for quick explanatory content.",
          ]}
        />
      </Stack>
    );
  }

  if (stateKey === "diff") {
    return (
      <Stack gap={1}>
        <text content="Content Blocks" />
        <text content="Diff surfaces help explain config changes and generated output." />
        <Card
          title="Config Diff"
          description="Before/after summary for a generated file"
          tone="warning"
          emphasis="outline"
        >
          <Diff
            before={`PORT=3000\nENABLE_ANALYTICS=false\nAUTH_MODE=none`}
            after={`PORT=4100\nENABLE_ANALYTICS=true\nAUTH_MODE=session`}
          />
        </Card>
        <Divider />
        <List
          items={[
            "Use Diff for generated file previews or config review.",
            "Keep the diff small and purpose-driven inside a larger recipe or docs flow.",
          ]}
        />
      </Stack>
    );
  }

  return (
    <Stack gap={1}>
      <text content="Content Blocks" />
      <text content="List, Table, Markdown, and Diff for documentation-style terminal screens." />
      <Stack direction="row" gap={1}>
        <Badge label="docs" tone="accent" />
        <Badge label="content" tone="success" emphasis="outline" />
      </Stack>
      <Card
        title="Helper Primitives"
        description="Static content blocks with intentional formatting"
        tone="accent"
        emphasis="outline"
      >
        <List
          items={[
            "Lists are good for short instruction sets and grouped notes.",
            "Tables work for compact reference data with fixed columns.",
            "Markdown and Diff help present docs-like content inside terminal apps.",
          ]}
        />
        <Divider />
        <Table
          columns={[
            { key: "primitive", label: "Primitive" },
            { key: "use", label: "Good for" },
          ]}
          rows={[
            { primitive: "List", use: "short sequences and bullets" },
            { primitive: "Table", use: "compact reference data" },
            { primitive: "Markdown", use: "docs prose and release notes" },
            { primitive: "Diff", use: "before/after review" },
          ]}
        />
      </Card>
    </Stack>
  );
}
