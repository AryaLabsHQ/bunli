# Colors

## Import

```typescript
import { colors } from "@bunli/utils"
```

## Foreground Colors

```typescript
colors.black("text")
colors.red("text")
colors.green("text")
colors.yellow("text")
colors.blue("text")
colors.magenta("text")
colors.cyan("text")
colors.white("text")
colors.gray("text")
```

## Bright Colors

```typescript
colors.brightRed("text")
colors.brightGreen("text")
colors.brightYellow("text")
colors.brightBlue("text")
colors.brightMagenta("text")
colors.brightCyan("text")
colors.brightWhite("text")
```

## Background Colors

```typescript
colors.bgRed("text")
colors.bgGreen("text")
colors.bgYellow("text")
colors.bgBlue("text")
colors.bgMagenta("text")
colors.bgCyan("text")
colors.bgWhite("text")
```

## Styles

```typescript
colors.bold("text")
colors.dim("text")
colors.italic("text")
colors.underline("text")
colors.strikethrough("text")
colors.reset("text")
```

## Chaining

```typescript
colors.bold(colors.green("Success!"))
colors.red(colors.bold("Error: ")) + "message"
```

## strip

Remove ANSI codes from text.

```typescript
const plain = colors.strip(coloredText)
```

## TTY Detection

Colors automatically disabled when:
- `NO_COLOR` env variable is set
- Not running in a TTY
