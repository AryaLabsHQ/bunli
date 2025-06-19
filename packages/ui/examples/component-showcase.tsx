#!/usr/bin/env bun
/**
 * Component Showcase
 * 
 * This example demonstrates all available UI components in Bunli UI:
 * - Layout components (Box, Row, Column)
 * - Text and typography
 * - Interactive components (Button, Input, Lists)
 * - Progress indicators (Spinners, Progress bars)
 * - Data display (Table, Tabs)
 * - Feedback components (Alert)
 * 
 * Use Tab/Shift+Tab to navigate between components
 */

import React, { useState } from 'react'
import { createApp, Box, Text, Row, Column } from '@bunli/renderer'
import {
  Button,
  ButtonGroup,
  Input,
  List,
  SelectList,
  CheckboxList,
  Spinner,
  LoadingSpinner,
  ProgressSpinner,
  ProgressBar,
  IndeterminateProgress,
  Table,
  Tabs,
  Alert,
  styles,
} from '@bunli/ui'

function ComponentShowcase() {
  // State for interactive components
  const [activeTab, setActiveTab] = useState('buttons')
  const [inputValue, setInputValue] = useState('')
  const [selectedItem, setSelectedItem] = useState<string>()
  const [checkedItems, setCheckedItems] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  
  // Animate progress for demonstration
  React.useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => (p + 0.1) % 1.1)
    }, 500)
    return () => clearInterval(timer)
  }, [])
  
  const listItems = [
    { id: '1', label: 'First Item' },
    { id: '2', label: 'Second Item' },
    { id: '3', label: 'Third Item' },
    { id: '4', label: 'Disabled Item', disabled: true },
    { id: '5', label: 'Fifth Item' },
  ]
  
  const tableData = [
    { id: 1, name: 'Alice', age: 28, city: 'New York' },
    { id: 2, name: 'Bob', age: 32, city: 'San Francisco' },
    { id: 3, name: 'Charlie', age: 25, city: 'Los Angeles' },
    { id: 4, name: 'Diana', age: 29, city: 'Chicago' },
  ]
  
  const tabs = [
    {
      id: 'buttons',
      label: 'Buttons',
      content: (
        <Column gap={2}>
          <Text style={styles.subtitle}>Button Variants:</Text>
          <Row gap={2}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="success">Success</Button>
            <Button variant="danger">Danger</Button>
          </Row>
          
          <Text style={styles.subtitle}>Button Sizes:</Text>
          <Row gap={2}>
            <Button size="small">Small</Button>
            <Button size="medium">Medium</Button>
            <Button size="large">Large</Button>
          </Row>
          
          <Text style={styles.subtitle}>Button States:</Text>
          <Row gap={2}>
            <Button focused>Focused</Button>
            <Button disabled>Disabled</Button>
          </Row>
          
          <Text style={styles.subtitle}>Button Group:</Text>
          <ButtonGroup>
            <Button variant="secondary">Left</Button>
            <Button variant="secondary">Center</Button>
            <Button variant="secondary">Right</Button>
          </ButtonGroup>
        </Column>
      ),
    },
    {
      id: 'inputs',
      label: 'Inputs',
      content: (
        <Column gap={2}>
          <Text style={styles.subtitle}>Text Input:</Text>
          <Input
            value={inputValue}
            onChange={setInputValue}
            placeholder="Enter text..."
            width={30}
          />
          
          <Text style={styles.subtitle}>With Label:</Text>
          <Input
            label="Name:"
            value={inputValue}
            onChange={setInputValue}
            width={25}
          />
          
          <Text style={styles.subtitle}>Password Input:</Text>
          <Input
            label="Password:"
            password
            value="secret123"
            width={20}
          />
          
          <Text style={styles.subtitle}>Focused Input:</Text>
          <Input
            focused
            value="Focused state"
            width={25}
          />
        </Column>
      ),
    },
    {
      id: 'lists',
      label: 'Lists',
      content: (
        <Column gap={2}>
          <Text style={styles.subtitle}>Select List:</Text>
          <List
            items={listItems}
            selectedId={selectedItem}
            onSelect={item => setSelectedItem(item.id)}
            maxHeight={4}
          />
          
          <Text style={styles.subtitle}>Checkbox List:</Text>
          <CheckboxList
            items={listItems}
            selectedIds={checkedItems}
            onToggle={(id, checked) => {
              if (checked) {
                setCheckedItems([...checkedItems, id])
              } else {
                setCheckedItems(checkedItems.filter(i => i !== id))
              }
            }}
          />
          
          <Text style={styles.subtitle}>Custom Renderer:</Text>
          <List
            items={listItems}
            renderItem={(item, isSelected) => (
              <Row gap={1}>
                <Text style={{ color: isSelected ? 'green' : 'gray' }}>→</Text>
                <Text style={{ bold: isSelected }}>{item.label}</Text>
                {item.disabled && <Text style={{ color: 'red' }}>(disabled)</Text>}
              </Row>
            )}
          />
        </Column>
      ),
    },
    {
      id: 'progress',
      label: 'Progress',
      content: (
        <Column gap={2}>
          <Text style={styles.subtitle}>Spinners:</Text>
          <Row gap={3}>
            <Spinner type="dots" label="Loading..." />
            <Spinner type="line" label="Processing" />
            <Spinner type="circle" style={{ color: 'cyan' }} />
            <Spinner type="bouncingBar" />
          </Row>
          
          <Text style={styles.subtitle}>Progress Bars:</Text>
          <ProgressBar value={progress} width={30} label="Download:" />
          <ProgressBar 
            value={0.75} 
            width={30} 
            fillColor="cyan" 
            showPercent 
          />
          <ProgressBar 
            value={0.33} 
            width={20} 
            fillChar="■" 
            emptyChar="□" 
          />
          
          <Text style={styles.subtitle}>Indeterminate Progress:</Text>
          <IndeterminateProgress width={30} />
        </Column>
      ),
    },
    {
      id: 'tables',
      label: 'Tables',
      content: (
        <Column gap={2}>
          <Text style={styles.subtitle}>Basic Table:</Text>
          <Table
            columns={[
              { key: 'id', header: 'ID', width: 5 },
              { key: 'name', header: 'Name', width: 15 },
              { key: 'age', header: 'Age', width: 5, align: 'right' },
              { key: 'city', header: 'City', width: 15 },
            ]}
            data={tableData}
          />
          
          <Text style={styles.subtitle}>Table with Custom Border:</Text>
          <Table
            columns={[
              { key: 'name', header: 'Name' },
              { 
                key: 'age', 
                header: 'Age',
                render: (value) => (
                  <Text style={{ color: value > 30 ? 'red' : 'green' }}>
                    {value} years
                  </Text>
                ),
              },
            ]}
            data={tableData}
            borderStyle="double"
            compact
          />
        </Column>
      ),
    },
    {
      id: 'alerts',
      label: 'Alerts',
      content: (
        <Column gap={2}>
          <Text style={styles.subtitle}>Alert Types:</Text>
          <Alert type="info" title="Information">
            This is an informational message.
          </Alert>
          <Alert type="success" title="Success!">
            Operation completed successfully.
          </Alert>
          <Alert type="warning" title="Warning">
            Please review before proceeding.
          </Alert>
          <Alert type="error" title="Error">
            Something went wrong!
          </Alert>
          
          <Text style={styles.subtitle}>Dismissible Alert:</Text>
          <Alert 
            type="info" 
            dismissible 
            onDismiss={() => console.log('Dismissed!')}
          >
            Click the × to dismiss this alert.
          </Alert>
          
          <Text style={styles.subtitle}>Custom Icon:</Text>
          <Alert type="info" icon="🚀">
            Custom icon alert!
          </Alert>
        </Column>
      ),
    },
  ]
  
  return (
    <Box padding={2}>
      <Column gap={2}>
        <Text style={styles.title}>🎨 Bunli UI Component Showcase</Text>
        <Text style={{ dim: true }}>
          React-powered terminal UI components with differential rendering
        </Text>
        
        <Tabs
          tabs={tabs}
          activeId={activeTab}
          onChange={setActiveTab}
          style={{ marginTop: 1 }}
        />
        
        <Box style={{ border: 'round', padding: 1, marginTop: 2 }}>
          <Row gap={2}>
            <Text style={{ dim: true }}>Selected: {selectedItem || 'none'}</Text>
            <Text style={{ dim: true }}>Checked: {checkedItems.join(', ') || 'none'}</Text>
            <Text style={{ dim: true }}>Input: {inputValue || '(empty)'}</Text>
          </Row>
        </Box>
      </Column>
    </Box>
  )
}

console.log('Starting component showcase...')
console.log('Navigate through tabs to see different components.\n')

const app = createApp(<ComponentShowcase />)
app.render()

// Run for 30 seconds
setTimeout(() => {
  app.unmount()
  console.log('\nShowcase complete!')
  process.exit(0)
}, 30000)

// Exit handling is now built into the framework