# Spinner

## spinner

Custom spinner with animated frames.

```typescript
import { spinner } from "@bunli/utils"
```

## API

```typescript
const s = spinner({
  text: "Loading..."
})

s.start()      // Start animation
s.start("New text")  // Start with text
s.stop()      // Stop and clear
s.succeed("Done!")  // Success state
s.fail("Error!")    // Failure state
s.warn("Warning!")  // Warning state
s.info("Info!")     // Info state
s.update("Updated") // Update text while spinning
```

## Frames

Animation frames: `⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏`

Interval: 80ms

## Options

```typescript
interface SpinnerOptions {
  text?: string       // Initial text
  color?: string      // Accepted by API, currently not applied by renderer
}
```

## Basic Usage

```typescript
const s = spinner("Installing...")
s.start()

try {
  await install()
  s.succeed("Installed!")
} catch (err) {
  s.fail("Failed!")
}
```
