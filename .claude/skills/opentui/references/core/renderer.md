# CliRenderer

The main renderer class for OpenTUI applications.

## Creating a Renderer

```typescript
import { createCliRenderer } from "@opentui/core";

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
  useMouse: true,
  targetFps: 30,
  backgroundColor: "#1e1e1e",
});
```

## Configuration Options

| Option             | Type                         | Default        | Description                                            |
| ------------------ | ---------------------------- | -------------- | ------------------------------------------------------ |
| `stdin`            | ReadableStream               | process.stdin  | Input stream                                           |
| `stdout`           | WritableStream               | process.stdout | Output stream                                          |
| `exitOnCtrlC`      | boolean                      | true           | Exit on Ctrl+C                                         |
| `exitSignals`      | Signal[]                     | ['SIGINT']     | Signals to handle                                      |
| `targetFps`        | number                       | 30             | Target frames per second                               |
| `maxFps`           | number                       | 60             | Maximum FPS cap                                        |
| `useMouse`         | boolean                      | false          | Enable mouse support                                   |
| `useKittyKeyboard` | KittyKeyboardOptions \| null | undefined      | Kitty keyboard protocol flags; `null`/omitted disables |
| `backgroundColor`  | string                       | undefined      | Terminal background                                    |

## Renderer Methods

### Lifecycle

- `renderer.start()` - Start the render loop
- `renderer.destroy()` - Destroy renderer and cleanup

### Root Access

- `renderer.root` - Get RootRenderable (top-level container)

### Background

- `renderer.setBackgroundColor(color)` - Set background color

## Render Loop

The renderer uses a requestAnimationFrame-style loop:

1. TypeScript builds component tree
2. Each Renderable draws to its OptimizedBuffer
3. Zig renderer diffs buffers
4. Minimal ANSI output to terminal

## Exit Handling

```typescript
// Custom exit handling
const renderer = await createCliRenderer({
  exitOnCtrlC: false,
});

renderer.on("destroy", () => {
  // Cleanup before teardown (CliRenderEvents.DESTROY)
});
```
