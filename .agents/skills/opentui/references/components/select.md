# SelectRenderable

Dropdown selection list.

## Usage

```typescript
import { SelectRenderable, SelectRenderableEvents } from "@opentui/core";

const select = new SelectRenderable(renderer, {
  options: [
    { name: "Option 1", description: "First choice", value: "1" },
    { name: "Option 2", description: "Second choice", value: "2" },
    { name: "Option 3", description: "Third choice", value: "3" },
  ],
  selectedIndex: 0,
});

// Fires while moving the highlight; ITEM_SELECTED fires on confirm (Enter).
select.on(SelectRenderableEvents.SELECTION_CHANGED, (index, option) => {
  console.log("Highlighted:", option?.value);
});
select.on(SelectRenderableEvents.ITEM_SELECTED, (index, option) => {
  console.log("Selected:", option?.value);
});
```

## Options

| Option                    | Type           | Description                      |
| ------------------------- | -------------- | -------------------------------- |
| `options`                 | SelectOption[] | Available options                |
| `selectedIndex`           | number         | Currently selected               |
| `backgroundColor`         | string         | Background color                 |
| `textColor`               | string         | Text color                       |
| `focusedBackgroundColor`  | string         | Focused bg                       |
| `selectedBackgroundColor` | string         | Selected bg                      |
| `selectedTextColor`       | string         | Selected text                    |
| `showDescription`         | boolean        | Render each option's description |
| `descriptionColor`        | string         | Description text color           |

## SelectOption Structure

```typescript
interface SelectOption {
  name: string; // Display text
  description: string; // Secondary line (shown when showDescription)
  value?: any; // Associated value (optional)
}
```

## TabSelectRenderable

Tab-based selection:

```typescript
import { TabSelectRenderable } from "@opentui/core";

const tabs = new TabSelectRenderable(renderer, {
  tabs: ["Tab 1", "Tab 2", "Tab 3"],
  selectedIndex: 0,
});
```
