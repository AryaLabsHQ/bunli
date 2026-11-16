# React Integration

OpenTUI provides React integration via React Reconciler.

## Setup

```bash
npm install @opentui/react @opentui/core
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@opentui/react"
  }
}
```

## Usage

```tsx
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";

function App() {
  return (
    <box border padding={1}>
      <text>Hello React!</text>
      <input placeholder="Type here" />
    </box>
  );
}

const renderer = await createCliRenderer();
createRoot(renderer).render(<App />);
```

## Available Components

```tsx
<box>        // BoxRenderable
<text>       // TextRenderable
<span>       // Text modifier
<b>          // Bold
<i>          // Italic
<u>          // Underline
<input>      // InputRenderable
<select>     // SelectRenderable
<textarea>   // TextareaRenderable
<scrollbox>  // ScrollBoxRenderable>
<code>        // CodeRenderable
<a>          // Link
```

## Hooks

### useRenderer

```tsx
import { useRenderer } from "@opentui/react";

function MyComponent() {
  const renderer = useRenderer();
  // ...
}
```

### useKeyboard

```tsx
import { useKeyboard } from "@opentui/react";

function MyComponent() {
  useKeyboard((key) => {
    console.log("Key:", key.name);
  });
}
```

### useTerminalDimensions

```tsx
import { useTerminalDimensions } from "@opentui/react";

function MyComponent() {
  const { width, height } = useTerminalDimensions();
}
```

### useTimeline

```tsx
import { useTimeline } from "@opentui/react";

function MyComponent() {
  const timeline = useTimeline({ fps: 30 });
  timeline.play();
}
```

### useFocus / useBlur

Run a handler when the terminal gains or loses focus.

```tsx
import { useFocus, useBlur } from "@opentui/react";

function MyComponent() {
  useFocus(() => console.log("terminal focused"));
  useBlur(() => console.log("terminal blurred"));
}
```

### usePaste

```tsx
import { usePaste } from "@opentui/react";
import type { PasteEvent } from "@opentui/core";

function MyComponent() {
  usePaste((event: PasteEvent) => {
    console.log("pasted", event);
  });
}
```

### useSelectionHandler

```tsx
import { useSelectionHandler } from "@opentui/react";
import type { Selection } from "@opentui/core";

function MyComponent() {
  useSelectionHandler((selection: Selection) => {
    console.log("selection changed", selection);
  });
}
```

### useOnResize

```tsx
import { useOnResize } from "@opentui/react";

function MyComponent() {
  useOnResize((width, height) => {
    console.log("resized:", width, height);
  });
}
```

## Events

```tsx
<input onChange={(value) => console.log(value)} onInput={(value) => console.log("input:", value)} />
```

## Context

```tsx
import { AppContext } from "@opentui/react"

function App() {
  return (
    <AppContext.Consumer>
      {({ renderer, keyHandler }) => (
        // ...
      )}
    </AppContext.Consumer>
  )
}
```
