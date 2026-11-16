# Declarative Model

VNode-based composition using functions that return nodes.

## Creating VNodes

```typescript
import { h, Box, Text, Input, instantiate } from "@opentui/core";

// Using h function
const vnode = h(Box, { border: true }, [h(Text, { content: "Hello" })]);

// Using component constructors
const vnode2 = Box({ border: true }, [Text({ content: "Hello" })]);
```

## Mounting

```typescript
import { instantiate } from "@opentui/core";

const mounted = instantiate(renderer, vnode);
renderer.root.add(mounted);
```

## Functional Components

```typescript
function MyButton(props: { title: string; onClick: () => void }, children = []) {
  return Box({ border: true, onMouseDown: props.onClick }, Text({ content: props.title }));
}

// Usage
const button = MyButton({ title: "Click Me", onClick: () => console.log("clicked") });
renderer.root.add(instantiate(renderer, button));
```

## Update

```typescript
// VNodes are updated by re-rendering
const vnode = Box({ border: true }, [Text({ content: count.toString() })]);

// Re-instantiate to update
const updated = instantiate(renderer, vnode);
renderer.root.add(updated);
```

## Delegation Pattern

```typescript
import { delegate } from "@opentui/core";

// Delegate routing for component type
function route(props: any) {
  if (props.type === "button") {
    return Box({ border: true }, props.children);
  }
  return Box(props);
}
```

## vstyles Helpers

```typescript
import { vstyles } from "@opentui/core";

const { bold, italic, underline, dim, color, bgColor } = vstyles;

const styled = Box(
  {},
  bold("Bold text"),
  color("#FF0000", "Red text"),
  bgColor("#000000", "With background"),
);
```

## Comparison

| Aspect      | Imperative       | Declarative     |
| ----------- | ---------------- | --------------- |
| Syntax      | Direct classes   | VNode functions |
| Updates     | Manual re-render | Re-instantiate  |
| Composition | add() method     | Tree of VNodes  |
| Familiarity | React pre-hooks  | React JSX       |
