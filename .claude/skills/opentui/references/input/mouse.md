# Mouse Handling

Input handling for mouse events.

## Enabling Mouse

```typescript
const renderer = await createCliRenderer({
  useMouse: true,
});
```

## Mouse Events on Components

```typescript
const box = new BoxRenderable(renderer, {
  onMouseDown: (event) => {
    console.log("Mouse down at:", event.x, event.y);
  },
  onMouseUp: (event) => {
    console.log("Mouse up at:", event.x, event.y);
  },
  onMouseMove: (event) => {
    console.log("Mouse move at:", event.x, event.y);
  },
  onMouseScroll: (event) => {
    console.log("Scroll:", event.scrollX, event.scrollY);
  },
});
```

## MouseEvent Structure

```typescript
interface MouseEvent {
  x: number;
  y: number;
  button: number; // 0: left, 1: middle, 2: right
  buttons: number; // Bitmask of pressed buttons
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  scrollX?: number; // Horizontal scroll
  scrollY?: number; // Vertical scroll
}
```

## Mouse Modes

| Mode   | Description         |
| ------ | ------------------- |
| Basic  | Click events only   |
| Drag   | Click + drag        |
| Motion | All mouse movements |

Set via terminal capability detection in Zig core.

## Focus

Components must be focusable for mouse events:

```typescript
box.focusable = true;
box.focus();
```

## React

```tsx
<box onMouseDown={(e) => console.log(e)} onMouseMove={(e) => console.log(e)} />
```

## Solid

```tsx
<box on:mousedown={(e) => console.log(e)} on:mousemove={(e) => console.log(e)} />
```
