# Markdown Component

Renders Markdown content with syntax highlighting for code blocks.

## Usage

```tsx
import { SyntaxStyle } from "@opentui/core";
import { createRoot } from "@opentui/react";

const md = `# Hello World

This is **bold** and *italic* text.

\`\`\`typescript
const x = 1;
\`\`\`

- List item 1
- List item 2
`;

function App() {
  return <markdown content={md} syntaxStyle={SyntaxStyle.fromTheme([])} />;
}
```

## Options

| Prop           | Type                               | Default | Description                                       |
| -------------- | ---------------------------------- | ------- | ------------------------------------------------- |
| `content`      | string                             | -       | Markdown source                                   |
| `syntaxStyle`  | SyntaxStyle                        | -       | Syntax highlight style for fenced code (required) |
| `fg`           | ColorInput                         | -       | Foreground color                                  |
| `bg`           | ColorInput                         | -       | Background color                                  |
| `conceal`      | boolean                            | -       | Conceal markdown syntax markers                   |
| `concealCode`  | boolean                            | -       | Conceal markers inside fenced code blocks         |
| `streaming`    | boolean                            | -       | Incremental updates; keep `true` while appending  |
| `tableOptions` | MarkdownTableOptions               | -       | Table rendering options                           |
| `renderNode`   | (token, ctx) => Renderable \| null | -       | Custom per-node renderer                          |

## Features

- Headings (h1-h6)
- Bold, italic, strikethrough
- Code blocks with syntax highlighting
- Inline code
- Links
- Lists (ordered/unordered)
- Blockquotes
- Tables
- Horizontal rules
