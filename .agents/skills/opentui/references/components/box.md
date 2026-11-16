# BoxRenderable

Container component with Yoga flexbox layout and borders.

## Usage

```typescript
import { BoxRenderable } from "@opentui/core";

const box = new BoxRenderable(renderer, {
  border: true,
  borderStyle: "single",
  borderColor: "#FFFFFF",
  backgroundColor: "#333333",
  padding: 1,
  margin: 2,
});
```

## Options

| Option               | Type                     | Description                                    |
| -------------------- | ------------------------ | ---------------------------------------------- |
| `border`             | boolean \| BorderSides[] | Border visibility                              |
| `borderStyle`        | string                   | "single", "double", "rounded", "bold", "block" |
| `borderColor`        | string                   | Border color                                   |
| `backgroundColor`    | string                   | Background color                               |
| `title`              | string                   | Box title                                      |
| `titleColor`         | string \| RGBA           | Color of the box title                         |
| `titleAlignment`     | string                   | "left", "center", "right"                      |
| `focusedBorderColor` | string                   | Border when focused                            |
| `focusable`          | boolean                  | Enable focus                                   |
| `gap`                | number                   | Child spacing                                  |
| `rowGap`             | number                   | Row spacing                                    |
| `columnGap`          | number                   | Column spacing                                 |

## Border Styles

- `single` - ┌────┐
- `double` - ╔════╗
- `rounded` - ╭────╮
- `bold` - ┏━━━━┓
- `block` - █████

## Composition

```typescript
const parent = new BoxRenderable(renderer, { flexDirection: "column" });
const child1 = new BoxRenderable(renderer, { flexGrow: 1 });
const child2 = new TextRenderable(renderer, { content: "Hello" });

parent.add(child1);
parent.add(child2);
```
