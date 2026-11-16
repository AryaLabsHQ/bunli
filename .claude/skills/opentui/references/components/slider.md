# Slider Component

Scroll/range slider control. This is a core renderable (`SliderRenderable`) — it is **not**
registered as a React intrinsic element, so construct it directly.

## Usage

```typescript
import { SliderRenderable } from "@opentui/core";

const slider = new SliderRenderable(renderer, {
  orientation: "horizontal",
  min: 0,
  max: 100,
  value: 50,
  onChange: (value) => console.log(value),
});
```

## Options

| Option            | Type                       | Default         | Description                      |
| ----------------- | -------------------------- | --------------- | -------------------------------- |
| `orientation`     | "horizontal" \| "vertical" | (required)      | Slider direction                 |
| `value`           | number                     | min             | Current value                    |
| `min`             | number                     | 0               | Minimum value                    |
| `max`             | number                     | 100             | Maximum value                    |
| `viewPortSize`    | number                     | (max-min) × 0.1 | Thumb size relative to the track |
| `backgroundColor` | ColorInput                 | #252527         | Track color                      |
| `foregroundColor` | ColorInput                 | #9a9ea3         | Thumb color                      |
| `onChange`        | (value: number) => void    | -               | Change handler                   |

## Mouse Interaction

- Click and drag the thumb to change the value (`onMouseDown` / `onMouseDrag` / `onMouseUp`).
- Commonly paired with `ScrollBoxRenderable` as a scrollbar.
