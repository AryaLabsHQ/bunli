# TextRenderable

Displays styled text content.

## Usage

```typescript
import { TextRenderable } from "@opentui/core";

const text = new TextRenderable(renderer, {
  content: "Hello World",
  fg: "#FF0000",
  bg: "#000000",
});
```

## Options

| Option      | Type                 | Description      |
| ----------- | -------------------- | ---------------- |
| `content`   | string \| StyledText | Text content     |
| `fg`        | string               | Foreground color |
| `bg`        | string               | Background color |
| `bold`      | boolean              | Bold text        |
| `italic`    | boolean              | Italic text      |
| `underline` | boolean              | Underlined text  |

## StyledText

Use the `t` tagged template literal to compose styled text. Interpolated values are styled with
modifier functions (`bold`, `italic`, `underline`, `dim`, `strikethrough`, `reverse`, `blink`) and
color functions (`red`, `green`, `blue`, `bgRed`, `fg(color)`, `bg(color)`, `link(url)`, …). The
result is a `StyledText` object you pass as `content`.

```typescript
import { t, bold, italic, underline, red, fg } from "@opentui/core";

const styled = t`${bold("Hello")} ${red("World")} ${underline(italic("!"))}`;

const text = new TextRenderable(renderer, {
  content: styled,
});
```

Modifier and color functions can be nested since they accept and return chunks, and `fg`/`bg` accept
any `ColorInput` (hex, named, RGBA):

```typescript
import { t, bold, fg } from "@opentui/core";

const label = t`${bold(fg("#FF0000")("Error"))}: something went wrong`;
```

## Text Modifiers

Modifier functions (`bold`, `italic`, `underline`, etc.) produce text chunks for use inside the `t`
template. There are no `BoldSpan`/`ItalicSpan` renderable classes — styling is applied via these
functions on the `StyledText` content.

```typescript
import { t, bold, italic } from "@opentui/core";

text.content = t`${bold("important")} and ${italic("emphasized")}`;
```

## TextNode Tree

Complex text uses a tree of TextNodes for nested styling:

- Parent TextNode contains children
- Each child can have its own styling
