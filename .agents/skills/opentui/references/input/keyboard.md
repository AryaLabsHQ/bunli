# Keyboard Handling

Input handling for keyboard events.

## KeyHandler

```typescript
import { KeyHandler } from "@opentui/core";

const keyHandler = new KeyHandler(process.stdin);
keyHandler.start();

keyHandler.on("keypress", (key) => {
  console.log("Key:", key.name);
});
```

## KeyEvent Structure

```typescript
interface KeyEvent {
  name: string; // "a", "escape", "return"
  ctrl: boolean; // Ctrl modifier
  meta: boolean; // Alt/Option modifier
  shift: boolean; // Shift modifier
  option: boolean; // Option key
  sequence: string; // Raw escape sequence
  eventType: "press" | "release";
  source: "raw" | "kitty";
  repeated?: boolean;
}
```

## Keyboard Events on Components

```typescript
const input = new InputRenderable(renderer, {
  onKeyDown: (key) => {
    if (key.name === "escape") {
      // Handle escape
    }
    if (key.ctrl && key.name === "c") {
      // Handle Ctrl+C
    }
  },
});
```

## Global Keyboard (React)

```tsx
import { useKeyboard } from "@opentui/react";

function App() {
  useKeyboard((key) => {
    if (key.name === "q" && !key.ctrl) {
      process.exit(0);
    }
  });
}
```

## Global Keyboard (Solid)

```tsx
import { useKeyboard } from "@opentui/solid";

function App() {
  useKeyboard((key) => {
    if (key.name === "q" && !key.ctrl) {
      process.exit(0);
    }
  });
}
```

## Kitty Keyboard Protocol

Enable with:

```typescript
const renderer = await createCliRenderer({
  useKittyKeyboard: true,
});
```

Provides extended key events with:

- Scroll wheel
- Function keys F1-F12
- Modifier states
