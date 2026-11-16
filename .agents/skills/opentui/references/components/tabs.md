# TabSelect Component

Horizontal tab/bar selection component for navigation. React intrinsic element `<tab-select>` (core
class `TabSelectRenderable`).

## Usage

```tsx
import { createRoot } from "@opentui/react";

function App() {
  return (
    <tab-select
      options={[
        { name: "Home", description: "Dashboard", value: "home" },
        { name: "Settings", description: "Preferences", value: "settings" },
        { name: "Profile", description: "Your account", value: "profile" },
      ]}
      showUnderline
      showDescription
      onChange={(index, option) => console.log(index, option?.value)}
    />
  );
}
```

## Options

| Prop                       | Type              | Default | Description                         |
| -------------------------- | ----------------- | ------- | ----------------------------------- |
| `options`                  | TabSelectOption[] | []      | Array of tab options                |
| `tabWidth`                 | number            | -       | Fixed width per tab                 |
| `showUnderline`            | boolean           | -       | Underline the selected tab          |
| `showDescription`          | boolean           | -       | Render each tab's description line  |
| `showScrollArrows`         | boolean           | -       | Show scroll arrows when overflowing |
| `wrapSelection`            | boolean           | -       | Wrap around at the ends             |
| `backgroundColor`          | ColorInput        | -       | Background color                    |
| `textColor`                | ColorInput        | -       | Text color                          |
| `focusedBackgroundColor`   | ColorInput        | -       | Focused background                  |
| `focusedTextColor`         | ColorInput        | -       | Focused text                        |
| `selectedBackgroundColor`  | ColorInput        | -       | Selected tab background             |
| `selectedTextColor`        | ColorInput        | -       | Selected tab text                   |
| `selectedDescriptionColor` | ColorInput        | -       | Selected description color          |

The React `<tab-select>` element also accepts `onChange` / `onSelect`, both
`(index: number, option: TabSelectOption | null) => void`.

## TabSelectOption

```typescript
interface TabSelectOption {
  name: string; // Display label
  description: string; // Secondary line (shown when showDescription)
  value?: any; // Associated value (optional)
}
```

## Events (core)

- `TabSelectRenderableEvents.SELECTION_CHANGED` (`"selectionChanged"`) — emitted while moving the
  highlight, `(index, option)`
- `TabSelectRenderableEvents.ITEM_SELECTED` (`"itemSelected"`) — emitted on confirm,
  `(index, option)`

## Keyboard Navigation

- Left / Right arrows (or `[` / `]`) to move between tabs
- Enter to select
