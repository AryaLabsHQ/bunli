# Animation System

Timeline-based animation system for smooth transitions and effects.

## Basic Usage

```tsx
import { useTimeline } from "@opentui/react";

function AnimatedBox() {
  const timeline = useTimeline({ fps: 30 });

  useEffect(() => {
    timeline.fromTo({ opacity: 0, y: 20 }, { opacity: 1, y: 0 }, 300).play();
  }, []);

  return (
    <box opacity={timeline.get("opacity")} top={timeline.get("y")}>
      <text>Fade in</text>
    </box>
  );
}
```

## Timeline API

### Creating a Timeline

```typescript
import { Timeline } from "@opentui/core";

const timeline = new Timeline({
  fps: 30, // Frames per second
  duration: 1000, // Total duration in ms
  loop: false, // Loop animation
});
```

### Adding Animations

```typescript
// Simple tween
timeline.to({ opacity: 0 }, 300);

// From/To animation
timeline.fromTo({ opacity: 1 }, { opacity: 0 }, 500);

// Keyframes
timeline.keyframes([
  { time: 0, value: { x: 0 } },
  { time: 250, value: { x: 50 } },
  { time: 500, value: { x: 100 } },
]);
```

### Easing Functions

```typescript
import { Easing } from "@opentui/core";

timeline.to({ x: 100 }, 300, Easing.easeInOutQuad);

// Built-in easings:
// - linear
// - easeInQuad, easeOutQuad, easeInOutQuad
// - easeInCubic, easeOutCubic, easeInOutCubic
// - bounceOut, elasticOut
```

### Animation Properties

| Property           | Type   | Description     |
| ------------------ | ------ | --------------- |
| `opacity`          | number | 0-1 opacity     |
| `x`, `y`           | number | Position offset |
| `width`, `height`  | number | Size            |
| `rotation`         | number | Rotation angle  |
| `scaleX`, `scaleY` | number | Scale factor    |

## React Hook

```tsx
const timeline = useTimeline({ fps: 60 });

// Get current animated value
const opacity = timeline.get("opacity");

// Subscribe to updates
timeline.on("update", () => {
  // Re-render triggered
});

// Control playback
timeline.play();
timeline.pause();
timeline.stop();
timeline.seek(500); // Seek to 500ms
```

## Animation Composition

```typescript
// Sequence
timeline.to({ opacity: 0 }, 200).to({ x: 100 }, 300).to({ opacity: 1 }, 200);

// Staggered (for lists)
timeline.stagger(".item", { y: 10 }, 50);

// Parallel
timeline.parallel([timeline.to({ opacity: 1 }, 300), timeline.to({ scale: 1.2 }, 400)]);
```
