# Buffer

OptimizedBuffer provides direct access to the terminal cell buffer.

## Overview

The buffer stores character data, colors, and attributes per cell:

- **char**: Unicode codepoint (Uint32Array)
- **fg**: Foreground RGBA (Float32Array)
- **bg**: Background RGBA (Float32Array)
- **attributes**: Text attributes (Uint32Array)

## Creating a Buffer

The constructor is internal — use the static `OptimizedBuffer.create` factory. It requires a
`widthMethod` (`"unicode"` or `"wcwidth"`) and accepts optional `respectAlpha`/`id` options.

```typescript
import { OptimizedBuffer } from "@opentui/core";

const buffer = OptimizedBuffer.create(width, height, "unicode", {
  respectAlpha: false,
});
```

## Drawing Methods

### drawText

Positional signature: `drawText(text, x, y, fg, bg?, attributes?, selection?)`. Colors are `RGBA`
values, not strings.

```typescript
import { RGBA, TextAttributes } from "@opentui/core";

buffer.drawText("Hello", 0, 0, RGBA.fromInts(255, 255, 255));

// With background and attributes
buffer.drawText(
  "Bold",
  5,
  2,
  RGBA.fromInts(255, 255, 255),
  RGBA.fromInts(0, 0, 0),
  TextAttributes.BOLD,
);
```

### drawBox

Takes a single options object. `borderColor` and `backgroundColor` are required `RGBA` values;
`border` is `boolean | BorderSides[]`.

```typescript
buffer.drawBox({
  x: 0,
  y: 0,
  width: 10,
  height: 5,
  border: true,
  borderColor: RGBA.fromInts(255, 255, 255),
  backgroundColor: RGBA.fromInts(51, 51, 51),
});
```

### drawFrameBuffer

Positional signature:
`drawFrameBuffer(destX, destY, frameBuffer, sourceX?, sourceY?, sourceWidth?, sourceHeight?)`. The
optional source args crop a region of the source buffer.

```typescript
// Copy the whole source buffer
buffer.drawFrameBuffer(destX, destY, frameBuffer);

// Copy a cropped region (sourceX, sourceY, sourceWidth, sourceHeight)
buffer.drawFrameBuffer(0, 0, frameBuffer, 4, 0, 12, 8);
```

## Buffer Operations

```typescript
// Clear buffer
buffer.clear()

// Get raw output
buffer.getRealCharBytes(addLineBreaks: boolean)

// Set alpha handling
buffer.setRespectAlpha(respectAlpha: boolean)
```

## Double Buffering

The renderer maintains two buffers:

- **currentRenderBuffer**: What's currently displayed
- **nextRenderBuffer**: Next frame being built

After each frame, the renderer computes the minimal ANSI diff between buffers.
