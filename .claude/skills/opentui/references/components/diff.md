# Diff Component

Renders side-by-side or inline diffs with syntax highlighting.

The component takes a single **unified-diff string** (not separate old/new text) and renders it
inline (`unified`) or side-by-side (`split`).

## Usage

```tsx
import { createRoot } from "@opentui/react";

const patch = `--- a.ts
+++ b.ts
@@ -1,2 +1,3 @@
 const a = 1;
-const b = 2;
+const b = 3;
+const c = 3;`;

function App() {
  return <diff diff={patch} view="split" filetype="typescript" showLineNumbers />;
}
```

## Options

| Prop              | Type                       | Default   | Description                      |
| ----------------- | -------------------------- | --------- | -------------------------------- |
| `diff`            | string                     | -         | Unified-diff string to render    |
| `view`            | "unified" \| "split"       | "unified" | Inline vs. side-by-side layout   |
| `syncScroll`      | boolean                    | false     | Sync scroll between split panes  |
| `showLineNumbers` | boolean                    | -         | Show line numbers                |
| `filetype`        | string                     | -         | Language for syntax highlighting |
| `syntaxStyle`     | SyntaxStyle                | -         | Syntax highlight style           |
| `wrapMode`        | "none" \| "char" \| "word" | -         | Line wrapping strategy           |
| `conceal`         | boolean                    | -         | Conceal markup                   |

## Styling

```tsx
<diff
  diff={patch}
  view="split"
  addedBg="#2d4a2d"
  removedBg="#4a2d2d"
  addedSignColor="#4ade80"
  removedSignColor="#f87171"
/>
```

(Further styling props: `contextBg`, `addedContentBg`, `removedContentBg`, `addedLineNumberBg`,
`removedLineNumberBg`, `lineNumberFg`, `lineNumberBg`.)

## Methods

- `highlightLines(startLine, endLine, color)` — highlight a line range across both sides
- `getHunkRowOffsets(): number[]` — row offsets of each hunk for scroll/navigation
