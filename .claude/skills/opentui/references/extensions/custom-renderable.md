# Custom Renderables

Create custom UI components by extending the base Renderable class.

## Core: Extend Renderable

```typescript
import {
  Renderable,
  type RenderContext,
  type RenderableOptions,
  OptimizedBuffer,
  RGBA,
} from "@opentui/core";

class ButtonRenderable extends Renderable {
  constructor(ctx: RenderContext, options: RenderableOptions & { label?: string }) {
    super(ctx, {
      minWidth: 8,
      minHeight: 3,
      ...options,
    });
    this.label = options.label ?? "Button";
  }

  private label: string;

  protected renderSelf(buffer: OptimizedBuffer): void {
    const { width, height } = this.getLayout();

    // Draw border
    buffer.drawBox(0, 0, width, height, {
      border: true,
      borderStyle: "single",
      borderColor: this.isFocused ? RGBA("#3b82f6") : RGBA("#6b7280"),
    });

    // Draw label centered
    const textX = Math.floor((width - this.label.length) / 2);
    const textY = Math.floor(height / 2);
    buffer.drawText(textX, textY, this.label);
  }
}
```

## React: Register with extend()

```tsx
import { extend } from "@opentui/react";
import { ButtonRenderable } from "./ButtonRenderable";

extend({ button: ButtonRenderable });

// Now use in JSX
function App() {
  return (
    <box>
      <button label="Submit" />
    </box>
  );
}
```

## TypeScript Augmentation

Add type safety for custom components:

```typescript
// In a.d.ts or somewhere in your types
import "@opentui/react";

declare module "@opentui/react" {
  interface OpenTUIComponents {
    button: typeof ButtonRenderable;
    myCard: typeof CardRenderable;
  }
}
```

## SolidJS: Register Custom Elements

```typescript
import { extend } from "@opentui/solid"
import { MyCustomRenderable } from "./MyCustomRenderable"

extend({ myCustom: MyCustomRenderable })

// Use in Solid JSX
render(() => (
  <myCustom prop="value" />
))
```

## Lifecycle Hooks

### renderBefore

Run before rendering children.

```typescript
class MyComponent extends Renderable {
  renderBefore(buffer: OptimizedBuffer, deltaTime: number): void {
    // Custom pre-render logic
    // E.g., clear region, apply effects
  }
}
```

### renderAfter

Run after rendering children.

```typescript
class MyComponent extends Renderable {
  renderAfter(buffer: OptimizedBuffer, deltaTime: number): void {
    // Custom post-render logic
    // E.g., apply overlay, blur effect
  }
}
```

## Event Handling

```typescript
class InteractiveComponent extends Renderable {
  constructor(ctx: RenderContext, options: RenderableOptions) {
    super(ctx, options);

    // Mouse events
    this.onMouseDown = (event) => {
      console.log("Mouse down at", event.x, event.y);
    };

    this.onMouseUp = (event) => {
      console.log("Mouse up at", event.x, event.y);
    };

    this.onMouseMove = (event) => {
      // Track hover state
    };

    // Keyboard events
    this.onKeyDown = (key) => {
      if (key.name === "enter") {
        this.handleEnter();
      }
    };
  }
}
```

## Custom Layout

Override layout calculation:

```typescript
class CustomLayoutComponent extends Renderable {
  protected calculateLayout(): void {
    // Custom layout logic
    const childWidth = this.children[0]?.getLayout().width ?? 0;
    const childHeight = this.children[0]?.getLayout().height ?? 0;

    this.setLayout({
      width: childWidth + 20,
      height: childHeight + 10,
    });
  }
}
```

## FrameBuffer for Custom Graphics

For pixel-level control:

```typescript
import { FrameBufferRenderable } from "@opentui/core";

class CanvasComponent extends FrameBufferRenderable {
  constructor(ctx: RenderContext, options: RenderableOptions) {
    super(ctx, { width: 100, height: 50, ...options });
  }

  protected renderFrame(pixels: Uint8Array): void {
    // Direct pixel manipulation
    // pixels is RGBA buffer
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const i = (y * this.width + x) * 4;
        pixels[i] = Math.random() * 255; // R
        pixels[i + 1] = Math.random() * 255; // G
        pixels[i + 2] = Math.random() * 255; // B
        pixels[i + 3] = 255; // A
      }
    }
  }
}
```
