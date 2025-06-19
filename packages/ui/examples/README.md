# Bunli UI Examples

This directory contains examples demonstrating the features and usage of Bunli UI.

## Running Examples

All examples are executable with Bun:

```bash
bun run [example-name].tsx
```

## Available Examples

### 1. **hello-world.tsx** - Basic Usage
The simplest example showing:
- Creating a React component with Bunli UI
- Using basic components (Box, Text)
- State management with hooks
- Auto-updating content

```bash
bun run hello-world.tsx
```

### 2. **component-showcase.tsx** - All Components
Comprehensive demonstration of every UI component:
- Layout components (Box, Row, Column)
- Interactive components (Button, Input, Lists)
- Progress indicators (Spinners, Progress bars)
- Data display (Table, Tabs)
- Feedback components (Alert)

```bash
bun run component-showcase.tsx
```

### 3. **form-example.tsx** - Forms and User Input
Interactive form handling example:
- Controlled inputs
- Select and checkbox lists
- Form validation
- Error handling
- Focus management (Tab navigation)

```bash
bun run form-example.tsx
```

### 4. **performance-demo.tsx** - Performance Features
Demonstrates rendering performance:
- Differential rendering
- Handling rapid updates
- Multiple animated components
- Real-time performance metrics

```bash
bun run performance-demo.tsx
```

### 5. **bunli-integration.tsx** - Bunli Command Integration
Shows how to use Bunli UI in CLI commands:
- Stateful UI components
- Progress indicators
- Async operation handling
- Command-specific UI patterns

```bash
bun run bunli-integration.tsx
```

## Key Concepts

- **Focus Management**: Use Tab/Shift+Tab to navigate between focusable components
- **Keyboard Shortcuts**: Ctrl+C to exit any example
- **State Management**: All examples use React hooks for state
- **Performance**: The reconciler only updates changed parts of the UI

## Creating Your Own Examples

To create a new example:

1. Import the necessary components from `../src/index.js`
2. Create your React component
3. Use `createApp()` to initialize the app
4. Call `app.render()` to display the UI

```typescript
#!/usr/bin/env bun

import React from 'react'
import { createApp, Box, Text } from '../src/index.js'

function MyExample() {
  return (
    <Box padding={2}>
      <Text>My Example</Text>
    </Box>
  )
}

const app = createApp(<MyExample />)
app.render()
```