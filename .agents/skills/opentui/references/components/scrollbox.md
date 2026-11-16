# ScrollBoxRenderable

Scrollable container with viewport.

## Usage

```typescript
import { ScrollBoxRenderable } from "@opentui/core";

const scrollbox = new ScrollBoxRenderable(renderer, {
  scrollX: true,
  scrollY: true,
  stickyScroll: true,
});

// Add content that overflows
const content = new BoxRenderable(renderer, {
  /* large content */
});
scrollbox.add(content);
```

## Options

| Option            | Type    | Description                      |
| ----------------- | ------- | -------------------------------- |
| `scrollX`         | boolean | Enable horizontal scroll         |
| `scrollY`         | boolean | Enable vertical scroll           |
| `stickyScroll`    | boolean | Keep scroll position             |
| `stickyStart`     | string  | "top", "bottom", "left", "right" |
| `viewportCulling` | boolean | Don't render off-screen          |

## Scroll Position

```typescript
// Get/set scroll position
scrollbox.scrollTop = 10;
const top = scrollbox.scrollTop;

scrollbox.scrollLeft = 5;
const left = scrollbox.scrollLeft;
```

## ScrollBar

```typescript
import { ScrollBarRenderable } from "@opentui/core";

const scrollbar = new ScrollBarRenderable(renderer, {
  orientation: "vertical",
  value: 0,
  max: 100,
});
```
