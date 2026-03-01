# Spinner

## Import

```typescript
import { spinner } from "@bunli/tui/prompt"
```

In command handlers, prefer injected spinner utilities:

```typescript
handler: async ({ spinner }) => {
  const s = spinner("Building...")
  // ...
}
```

## API

```typescript
const s = spinner({ text: "Loading..." })

s.start()               // Start animation
s.start("New text")     // Start with text
s.stop()                // Stop and clear
s.succeed("Done!")      // Success line
s.fail("Error!")        // Failure line
s.warn("Warning!")      // Warning line
s.info("Info!")         // Info line
s.update("Updated")     // Update text while spinning
```

Passing a string to `spinner("Loading...")` is shorthand for `{ text: "Loading..." }`.
If `text` is provided, the spinner auto-starts.

## Options

```typescript
interface SpinnerOptions {
  text?: string
  animation?: SpinnerAnimation
  showTimer?: boolean
  intervalMs?: number
}
```

`SpinnerAnimation` is exported from `@bunli/tui/prompt`.

## Basic usage

```typescript
const s = spinner({ text: "Installing...", showTimer: true })

try {
  await install()
  s.succeed("Installed!")
} catch {
  s.fail("Failed!")
}
```
