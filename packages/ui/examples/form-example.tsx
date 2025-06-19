#!/usr/bin/env bun
/**
 * Form Example
 * 
 * This example demonstrates form handling in Bunli UI:
 * - Input components with controlled state
 * - Select lists for single selection
 * - Checkbox lists for multiple selection
 * - Form validation and error handling
 * - Submit handling
 * - Focus management (Tab/Shift+Tab navigation)
 */

import React, { useState } from 'react'
import { createApp, Box, Text, Column, Row } from '@bunli/renderer'
import {
  Button,
  Input,
  SelectList,
  CheckboxList,
  Alert,
  styles,
} from '@bunli/ui'

interface FormData {
  name: string
  email: string
  role: string
  skills: string[]
}

function FormExample() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    role: '',
    skills: [],
  })
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  
  // Options for select list
  const roles = [
    { id: 'developer', label: 'Developer' },
    { id: 'designer', label: 'Designer' },
    { id: 'manager', label: 'Project Manager' },
    { id: 'analyst', label: 'Business Analyst' },
  ]
  
  // Options for checkbox list
  const skills = [
    { id: 'react', label: 'React' },
    { id: 'typescript', label: 'TypeScript' },
    { id: 'nodejs', label: 'Node.js' },
    { id: 'graphql', label: 'GraphQL' },
    { id: 'docker', label: 'Docker' },
  ]
  
  // Simple email validation
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
  
  // Handle form submission
  const handleSubmit = () => {
    const newErrors: string[] = []
    
    // Validate form
    if (!formData.name.trim()) {
      newErrors.push('Name is required')
    }
    if (!formData.email.trim()) {
      newErrors.push('Email is required')
    } else if (!validateEmail(formData.email)) {
      newErrors.push('Please enter a valid email')
    }
    if (!formData.role) {
      newErrors.push('Please select a role')
    }
    if (formData.skills.length === 0) {
      newErrors.push('Please select at least one skill')
    }
    
    setErrors(newErrors)
    
    if (newErrors.length === 0) {
      setSubmitted(true)
      // In a real app, you would submit the form data here
      setTimeout(() => {
        // Reset form after 3 seconds
        setSubmitted(false)
        setFormData({ name: '', email: '', role: '', skills: [] })
      }, 3000)
    }
  }
  
  if (submitted) {
    return (
      <Box padding={2}>
        <Alert type="success" title="Form Submitted Successfully!">
          <Text>Thank you for your submission.</Text>
          <Box margin={1}>
            <Text style={{ bold: true }}>Submitted Data:</Text>
            <Text>Name: {formData.name}</Text>
            <Text>Email: {formData.email}</Text>
            <Text>Role: {roles.find(r => r.id === formData.role)?.label}</Text>
            <Text>Skills: {formData.skills.join(', ')}</Text>
          </Box>
        </Alert>
      </Box>
    )
  }
  
  return (
    <Box padding={2}>
      <Text style={styles.title}>User Registration Form</Text>
      <Text style={{ color: 'gray', marginBottom: 1 }}>
        Use Tab/Shift+Tab to navigate, Space/Enter to select
      </Text>
      
      {/* Show errors if any */}
      {errors.length > 0 && (
        <Alert type="error" title="Please fix the following errors:">
          {errors.map((error, i) => (
            <Text key={i}>• {error}</Text>
          ))}
        </Alert>
      )}
      
      <Column gap={2}>
        {/* Name input */}
        <Box>
          <Text style={{ marginBottom: 0.5 }}>Name:</Text>
          <Input
            value={formData.name}
            onChange={(value) => setFormData({ ...formData, name: value })}
            placeholder="Enter your full name"
          />
        </Box>
        
        {/* Email input */}
        <Box>
          <Text style={{ marginBottom: 0.5 }}>Email:</Text>
          <Input
            value={formData.email}
            onChange={(value) => setFormData({ ...formData, email: value })}
            placeholder="your.email@example.com"
          />
        </Box>
        
        {/* Role selection */}
        <Box>
          <Text style={{ marginBottom: 0.5 }}>Select your role:</Text>
          <SelectList
            items={roles}
            selectedId={formData.role}
            onSelect={(item) => setFormData({ ...formData, role: item.id })}
            maxHeight={5}
          />
        </Box>
        
        {/* Skills selection */}
        <Box>
          <Text style={{ marginBottom: 0.5 }}>Select your skills:</Text>
          <CheckboxList
            items={skills}
            selectedIds={formData.skills}
            onToggle={(id, checked) => {
              if (checked) {
                setFormData({ ...formData, skills: [...formData.skills, id] })
              } else {
                setFormData({ ...formData, skills: formData.skills.filter(i => i !== id) })
              }
            }}
            maxHeight={6}
          />
        </Box>
        
        {/* Submit button */}
        <Row gap={2}>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
          >
            Submit Form
          </Button>
          <Button 
            variant="secondary"
            onClick={() => {
              setFormData({ name: '', email: '', role: '', skills: [] })
              setErrors([])
            }}
          >
            Reset
          </Button>
        </Row>
      </Column>
    </Box>
  )
}

// Create and render the app
const app = createApp(<FormExample />)
app.render()