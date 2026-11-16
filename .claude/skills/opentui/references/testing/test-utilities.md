# Testing Utilities

OpenTUI provides testing utilities for headless component testing.

## Setup

```typescript
import { createTestRenderer, mockMouse, mockKeys } from "@opentui/core/testing";
import { test, expect } from "bun:test";
```

## createTestRenderer

Creates a headless renderer for testing.

```typescript
const { renderer, render, cleanup } = await createTestRenderer({
  width: 80,
  height: 24,
})

// Render a component
await render(<MyComponent />)

// Cleanup after test
cleanup()
```

## Mock Mouse

Simulate mouse interactions.

```typescript
const { mockMouse, render } = await createTestRenderer({ width: 80, height: 24 })
await render(<Button label="Click me" onClick={onClick} />)

// Click
await mockMouse.click(x, y)

// Double click
await mockMouse.dblClick(x, y)

// Drag
await mockMouse.drag(startX, startY, endX, endY)

// Scroll
await mockMouse.scroll(x, y, deltaX, deltaY)

// Hover
await mockMouse.move(x, y)
```

## Mock Keys

Simulate keyboard input.

```typescript
const { mockKeys, render } = await createTestRenderer()
await render(<Input value={value} onChange={setValue} />)

// Type text
await mockKeys.type("hello world")

// Press keys
await mockKeys.press("enter")
await mockKeys.press("ctrl+c")
await mockKeys.press("escape")

// Key combinations
await mockKeys.withModifier("c", "ctrl")
```

## Spy

Track function calls.

```typescript
import { createSpy } from "@opentui/core/testing";

const spy = createSpy();

button.onClick = spy;

await mockMouse.click(10, 5);

expect(spy.callCount()).toBe(1);
expect(spy.lastCall()).toEqual({ x: 10, y: 5 });
expect(spy.getCalls()).toHaveLength(1);
```

## Test Recorder

Record rendered frames for snapshot testing.

```typescript
import { createTestRenderer } from "@opentui/core/testing"
import { test, expect } from "bun:test"

test("button renders correctly", async () => {
  const { renderer, render, getFrame } = await createTestRenderer({
    width: 80,
    height: 24,
  })

  await render(<Button text="Hello" />)

  const frame = getFrame()
  expect(frame).toMatchSnapshot()
})
```

## Complete Example

```typescript
import { test, expect, describe } from "bun:test"
import { createTestRenderer, mockMouse, createSpy } from "@opentui/core/testing"
import { Button } from "./Button"

describe("Button", () => {
  test("calls onClick when clicked", async () => {
    const { renderer, render, cleanup, mockMouse } = await createTestRenderer({
      width: 80,
      height: 24,
    })

    const onClick = createSpy()
    await render(<Button text="Click me" onClick={onClick} />)

    // Button is typically at position (0, 0) with some size
    await mockMouse.click(5, 5)

    expect(onClick.callCount()).toBe(1)

    cleanup()
  })

  test("does not call onClick when disabled", async () => {
    const { renderer, render, cleanup, mockMouse } = await createTestRenderer({
      width: 80,
      height: 24,
    })

    const onClick = createSpy()
    await render(<Button text="Click me" onClick={onClick} disabled />)

    await mockMouse.click(5, 5)

    expect(onClick.callCount()).toBe(0)

    cleanup()
  })
})
```
