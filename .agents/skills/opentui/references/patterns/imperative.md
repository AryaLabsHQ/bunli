# Imperative Model

Direct instantiation of Renderable classes.

## Minimal App

```typescript
import { createCliRenderer, BoxRenderable, TextRenderable } from "@opentui/core";

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
  useMouse: true,
});

const box = new BoxRenderable(renderer, {
  border: true,
  borderStyle: "single",
  padding: 1,
});

const text = new TextRenderable(renderer, {
  content: "Hello World",
});

box.add(text);
renderer.root.add(box);
```

## Creating Components

```typescript
import { BoxRenderable, TextRenderable, InputRenderable } from "@opentui/core";

// Create components
const box = new BoxRenderable(renderer, {
  border: true,
  borderStyle: "single",
  padding: 1,
});

const text = new TextRenderable(renderer, {
  content: "Hello World",
  fg: "#FFFFFF",
});

const input = new InputRenderable(renderer, {
  placeholder: "Enter text...",
});
```

## Adding Children

```typescript
// Add children to parent
box.add(text);
box.add(input);

// Remove children
box.remove(text);

// Clear all children
box.clear();
```

## Managing State

```typescript
class MyComponent extends Renderable {
  private _value = "";

  set value(v: string) {
    this._value = v;
    this.requestRender();
  }

  get value() {
    return this._value;
  }
}
```

## Listening to Events

```typescript
import { InputRenderableEvents } from "@opentui/core";

input.on(InputRenderableEvents.INPUT, (value) => {
  console.log("Input changed:", value);
});

input.on(InputRenderableEvents.ENTER, () => {
  console.log("Submitted!");
});
```

Mouse and key handlers can also be assigned as properties:

```typescript
box.onMouseDown = (event) => {
  /* ... */
};
input.onKeyDown = (key) => {
  console.log(key.name);
};
input.focusable = true;
input.focus();
```

## Focus Management

```typescript
// Enable focus
input.focusable = true;

// Focus/unfocus
input.focus();
input.blur();

// Check focus state
if (input.focused) {
  // ...
}
```

## Custom Rendering

```typescript
import { Renderable, type OptimizedBuffer } from "@opentui/core";

class CustomComponent extends Renderable {
  protected renderSelf(buffer: OptimizedBuffer, deltaTime: number): void {
    // Custom rendering logic
    buffer.drawBox({
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      border: true,
    });
  }
}
```
