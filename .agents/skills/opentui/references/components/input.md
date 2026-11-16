# InputRenderable

Single-line text input component.

## Usage

```typescript
import { InputRenderable, InputRenderableEvents } from "@opentui/core";

const input = new InputRenderable(renderer, {
  value: "initial",
  placeholder: "Enter text...",
  maxLength: 100,
});

input.on(InputRenderableEvents.INPUT, (value) => {
  console.log("Input:", value);
});

input.on(InputRenderableEvents.ENTER, () => {
  console.log("Submitted!");
});
```

## Options

| Option        | Type    | Description                                                                                 |
| ------------- | ------- | ------------------------------------------------------------------------------------------- |
| `value`       | string  | Current value                                                                               |
| `placeholder` | string  | Placeholder text                                                                            |
| `maxLength`   | number  | Maximum length                                                                              |
| `minLength`   | number  | Minimum length (default 0); ENTER is suppressed below it. Throws if `minLength > maxLength` |
| `focused`     | boolean | Focus state                                                                                 |

## Events

- `INPUT` - Emitted on each input change
- `CHANGE` - Emitted on blur with changed value
- `ENTER` - Emitted on Enter key

## TextareaRenderable

Multi-line editor (extends InputRenderable):

```typescript
import { TextareaRenderable } from "@opentui/core";

const textarea = new TextareaRenderable(renderer, {
  height: 10,
  wordWrap: "word",
});
```

### Textarea Options

| Option        | Type   | Description            |
| ------------- | ------ | ---------------------- |
| `height`      | number | Fixed height           |
| `wordWrap`    | string | "none", "char", "word" |
| `keyBindings` | object | Vim-like keybindings   |
