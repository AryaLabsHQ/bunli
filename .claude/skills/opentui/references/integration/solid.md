# SolidJS Integration

OpenTUI provides SolidJS integration via custom renderer.

## Setup

```bash
npm install @opentui/solid @opentui/core
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@opentui/solid"
  }
}
```

## Usage

`render` takes the root node first, with an optional renderer or `CliRendererConfig` as the second
argument:

```tsx
import { render } from "@opentui/solid";

// node first; renderer is created internally from optional config
render(() => (
  <box border padding={1}>
    <text>Hello Solid!</text>
  </box>
));
```

Pass an existing renderer or a config object as the second argument:

```tsx
import { createCliRenderer } from "@opentui/core";
import { render } from "@opentui/solid";

const renderer = await createCliRenderer();

render(
  () => (
    <box border padding={1}>
      <text>Hello Solid!</text>
    </box>
  ),
  renderer,
);
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
<scrollbox>  // ScrollBoxRenderable
<code>       // CodeRenderable
```

## Hooks

### useRenderer

```tsx
import { useRenderer } from "@opentui/solid";

function MyComponent() {
  const renderer = useRenderer();
  // ...
}
```

### useKeyboard

```tsx
import { useKeyboard } from "@opentui/solid";

function MyComponent() {
  useKeyboard((key) => {
    console.log("Key:", key.name);
  });
}
```

### useTerminalDimensions

```tsx
import { useTerminalDimensions } from "@opentui/solid";

function MyComponent() {
  const [dimensions] = useTerminalDimensions();
  // dimensions() returns { width, height }
}
```

### useTimeline

```tsx
import { useTimeline } from "@opentui/solid";

function MyComponent() {
  const timeline = useTimeline({ fps: 30 });
}
```

## Events

SolidJS uses `on:` prefix for events:

```tsx
<input onChange={(value) => console.log(value)} on:keypress={(key) => console.log(key)} />
```

## Differences from React

| Feature      | React            | Solid         |
| ------------ | ---------------- | ------------- |
| Event prefix | onChange         | on:           |
| Reconciler   | React Reconciler | Custom        |
| Updates      | Re-render        | Fine-grained  |
| Context      | React Context    | Solid Context |
