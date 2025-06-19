# @bunli/ui

React-powered terminal UI framework with differential rendering and comprehensive keyboard navigation.

## Features

- **React-based**: Use familiar React patterns and hooks
- **Differential Rendering**: Only updates changed regions for optimal performance
- **Focus Management**: Built-in focus system with Tab navigation
- **Keyboard Navigation**: Full keyboard support for all interactive components
- **Rich Component Library**: Buttons, inputs, lists, tables, tabs, and more
- **TypeScript**: Full type safety and IntelliSense support
- **Performance Optimized**: ~150x faster than full redraws
- **Bunli Integration**: Plugin support for seamless CLI integration

## Installation

```bash
bun add @bunli/ui
```

## Quick Start

```tsx
#!/usr/bin/env bun
import React from 'react'
import { createApp, Box, Text, Button } from '@bunli/ui'

function App() {
  const [count, setCount] = React.useState(0)
  
  return (
    <Box padding={2}>
      <Text>Count: {count}</Text>
      <Button onClick={() => setCount(count + 1)}>
        Increment
      </Button>
    </Box>
  )
}

const app = createApp(<App />)
app.render()
```

## Components

### Layout Components

- `Box` - Flexible container with styling
- `Text` - Text rendering with ANSI styling
- `Row` - Horizontal layout
- `Column` - Vertical layout

### Interactive Components

- `Button` - Clickable buttons with variants (primary, secondary, danger, success)
- `ButtonGroup` - Group of buttons with consistent styling
- `Input` / `TextInput` - Text input with full keyboard editing
- `List` / `SelectList` - Single-select list with keyboard navigation
- `CheckboxList` - Multi-select list with space toggle
- `Tabs` / `TabPanel` - Tabbed interface with arrow key navigation

### Display Components

- `Spinner` / `LoadingSpinner` - Animated loading indicators
- `ProgressSpinner` - Progress with spinning animation
- `ProgressBar` - Progress indicators with customizable fill/empty chars
- `IndeterminateProgress` - Animated progress for unknown duration
- `Table` - Data tables with customizable borders and columns
- `Alert` - Notification messages with variants (info, success, warning, error)
- `Toast` - Temporary notification messages

### Form Components

- `PromptInput` - Simple text prompt
- `PromptConfirm` - Yes/No confirmation prompt
- `PromptSelect` - Selection from list of options
- `ProgressiveForm` - Multi-step form with validation
- `SimpleForm` - Basic form with multiple fields

## Focus Management

The framework includes a comprehensive focus management system:

```tsx
import { useFocus, Button } from '@bunli/ui'

function MyComponent() {
  const { isFocused, focus, blur } = useFocus({
    autoFocus: true,
    onFocus: () => console.log('Focused!'),
    onBlur: () => console.log('Blurred!')
  })
  
  return (
    <Button focused={isFocused} onClick={() => console.log('Clicked!')}>
      {isFocused ? 'Focused' : 'Not Focused'}
    </Button>
  )
}
```

### Keyboard Navigation

- **Tab / Shift+Tab**: Navigate between focusable elements
- **Arrow Keys**: Navigate within lists and tabs
- **Enter / Space**: Activate buttons and select items
- **Home / End**: Jump to first/last item in lists
- **Escape**: Close modals or cancel operations

### Input Keyboard Shortcuts

- **Left/Right**: Move cursor
- **Home/End**: Jump to start/end
- **Ctrl+A**: Move to start
- **Ctrl+E**: Move to end
- **Ctrl+U**: Clear line
- **Ctrl+K**: Clear from cursor
- **Ctrl+W**: Delete word

## Examples

### Interactive Form

```tsx
import React, { useState } from 'react'
import { createApp, Box, Column, Input, SelectList, Button, Text } from '@bunli/ui'

function Form() {
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  
  const countries = [
    { id: 'us', label: 'United States' },
    { id: 'uk', label: 'United Kingdom' },
    { id: 'ca', label: 'Canada' }
  ]
  
  return (
    <Column gap={2}>
      <Input
        label="Name:"
        value={name}
        onChange={setName}
        autoFocus
      />
      
      <Box>
        <Text>Country:</Text>
        <SelectList
          items={countries}
          selectedId={country}
          onSelect={item => setCountry(item.id)}
        />
      </Box>
      
      <Button onClick={() => console.log({ name, country })}>
        Submit
      </Button>
    </Column>
  )
}
```

### Custom Styling

```tsx
import { Box, Text, styles } from '@bunli/ui'

function StyledComponent() {
  return (
    <Box style={{
      border: 'double',
      borderColor: 'blue',
      padding: 2,
      backgroundColor: 'gray'
    }}>
      <Text style={{
        color: 'cyan',
        bold: true,
        underline: true
      }}>
        Styled Text
      </Text>
    </Box>
  )
}
```

## Performance

The framework uses differential rendering to achieve optimal performance:

- Only redraws changed regions
- Intelligent dirty region tracking
- Batched updates
- ~0.06-0.35ms render times vs 50ms+ for full redraws

## API Reference

### createApp(element, stream?)

Creates a terminal UI application.

- `element`: React element to render
- `stream`: Output stream (defaults to process.stdout)

Returns an app instance with:
- `render()`: Render the app
- `unmount()`: Clean up and exit

### Hooks

- `useFocus(options)`: Focus management hook
- `useFocusScope(options)`: Focus containment hook
- `useKeyboardNavigation(options)`: Keyboard event handling

### Focus Manager

Global focus manager for advanced use cases:

```tsx
import { focusManager } from '@bunli/ui'

// Focus an element by ID
focusManager.focus('my-element-id')

// Move focus
focusManager.focusNext()
focusManager.focusPrevious()

// Get current focus
const focusedId = focusManager.getFocusedId()
```

## Styling

### Style Properties

```tsx
<Box style={{
  // Borders
  border: 'single' | 'double' | 'rounded' | 'bold' | 'none',
  borderColor: 'blue' | 'red' | 'green' | ...,
  
  // Spacing
  padding: 2,              // uniform padding
  paddingX: 1,            // horizontal padding
  paddingY: 1,            // vertical padding
  margin: 1,              // uniform margin
  marginTop: 1,           // specific margins
  
  // Layout
  width: 20,              // fixed width
  height: 10,             // fixed height
  flex: 1,                // flex grow
  direction: 'horizontal' | 'vertical',
  gap: 1,                 // gap between children
  
  // Colors
  color: 'cyan',
  backgroundColor: 'gray',
  
  // Text styles
  bold: true,
  italic: true,
  underline: true,
  strikethrough: true,
  dim: true,
}}>
```

### Style Presets

```tsx
import { styles } from '@bunli/ui'

// Use predefined style combinations
<Button style={styles.primary}>Primary</Button>
<Alert style={styles.error}>Error!</Alert>
<Box style={styles.card}>Card content</Box>
```

## Router Integration

```tsx
import { Router, useRouter, NavLink, Breadcrumbs } from '@bunli/ui'

function App() {
  return (
    <Router initialRoute="/home">
      <NavLink to="/home">Home</NavLink>
      <NavLink to="/settings">Settings</NavLink>
      
      <Router.Route path="/home" component={HomePage} />
      <Router.Route path="/settings" component={SettingsPage} />
    </Router>
  )
}
```

## Bunli CLI Integration

```tsx
import { defineUICommand, withUI } from '@bunli/ui'

// Define a UI command for Bunli CLI
export const command = defineUICommand({
  name: 'ui-demo',
  description: 'Interactive UI demo',
  component: App,
})

// Or wrap existing commands with UI
export const wrapped = withUI(existingCommand, {
  component: UIWrapper,
})
```

## Advanced Usage

### Custom Hooks

```tsx
import { useKeyboardNavigation } from '@bunli/ui'

function CustomComponent() {
  useKeyboardNavigation({
    onArrowUp: () => console.log('Up!'),
    onArrowDown: () => console.log('Down!'),
    onEnter: () => console.log('Enter!'),
    onEscape: () => console.log('Escape!'),
  })
}
```

### Performance Monitoring

```tsx
import { getRenderingMetrics } from '@bunli/ui'

// Get rendering performance metrics
const metrics = getRenderingMetrics()
console.log(`Average render time: ${metrics.averageRenderTime}ms`)
console.log(`Dirty region coverage: ${metrics.dirtyRegionStats.coverage * 100}%`)
```

## Examples

Check out the `examples/` directory for:

- `hello-world.tsx` - Basic example with timer
- `component-showcase.tsx` - All components demonstration
- `form-example.tsx` - Interactive forms with validation
- `performance-demo.tsx` - Differential rendering showcase
- `bunli-integration.tsx` - Bunli CLI plugin integration

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit PRs to our GitHub repository.

## License

MIT