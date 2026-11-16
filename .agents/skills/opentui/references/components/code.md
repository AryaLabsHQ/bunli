# Code Component

Renders syntax-highlighted code with tree-sitter integration. React intrinsic element `<code>` (core
class `CodeRenderable`).

## Usage

```tsx
import { SyntaxStyle } from "@opentui/core";
import { createRoot } from "@opentui/react";

const source = `function greet(name: string): string {
  return \`Hello, \${name}!\`;
}`;

function App() {
  return <code content={source} filetype="typescript" syntaxStyle={SyntaxStyle.fromTheme([])} />;
}
```

## Options

| Prop          | Type                       | Default | Description                                      |
| ------------- | -------------------------- | ------- | ------------------------------------------------ |
| `content`     | string                     | -       | Source code to render                            |
| `filetype`    | string                     | -       | Language/filetype for syntax highlighting        |
| `syntaxStyle` | SyntaxStyle                | -       | Syntax highlight style (required)                |
| `wrapMode`    | "none" \| "char" \| "word" | "word"  | Line wrapping strategy                           |
| `conceal`     | boolean                    | -       | Conceal markup                                   |
| `streaming`   | boolean                    | -       | Incremental updates; keep `true` while appending |

## Supported Languages

Built-in support for:

- JavaScript / TypeScript
- Python
- Rust
- Go
- JSON / YAML
- Markdown
- Zig
- And more via tree-sitter

## Custom Language

```tsx
import { addDefaultParsers } from "@opentui/core";

addDefaultParsers([
  {
    filetype: "python",
    queries: { highlights: resolve(__dirname, "python/highlights.scm") },
    wasm: resolve(__dirname, "python/tree-sitter-python.wasm"),
  },
]);
```

## Line Numbers

Line numbers are **not** a `<code>` prop. They are provided by a separate `LineNumberRenderable`
(React intrinsic `<line-number>`), which the `<diff>` component also composes internally. Render a
`<line-number>` element alongside your `<code>` element to display them.
