import { defineCommand } from '@bunli/core'
import { z } from 'zod'

// Survey demonstrating various prompt types
export default defineCommand({
  name: 'survey',
  description: 'Interactive survey example',
  options: {
    // No CLI options - fully interactive
  },
  
  handler: async ({ prompt, colors, spinner }) => {
    console.log(colors.bold('Developer Survey 2024\n'))
    console.log('Please take a moment to answer a few questions.\n')
    
    // Text input with validation
    const name = await prompt('What is your name?', {
      validate: (val) => val.length >= 2 || 'Name must be at least 2 characters'
    })
    
    // Select from list
    const experience = await prompt.select('Years of experience:', {
      options: [
        { value: '0-1', label: 'Less than 1 year' },
        { value: '1-3', label: '1-3 years' },
        { value: '3-5', label: '3-5 years' },
        { value: '5-10', label: '5-10 years' },
        { value: '10+', label: 'More than 10 years' }
      ]
    })
    
    // Multiple selects
    const languages = []
    
    const usesTypeScript = await prompt.confirm('Do you use TypeScript?', { default: true })
    if (usesTypeScript) languages.push('TypeScript')
    
    const usesRust = await prompt.confirm('Do you use Rust?', { default: false })
    if (usesRust) languages.push('Rust')
    
    const usesGo = await prompt.confirm('Do you use Go?', { default: false })
    if (usesGo) languages.push('Go')
    
    // Framework selection
    const framework = await prompt.select('Favorite framework:', {
      options: [
        { value: 'react', label: 'React', hint: 'Meta' },
        { value: 'vue', label: 'Vue', hint: 'Evan You' },
        { value: 'angular', label: 'Angular', hint: 'Google' },
        { value: 'svelte', label: 'Svelte', hint: 'Rich Harris' },
        { value: 'solid', label: 'Solid', hint: 'Ryan Carniato' },
        { value: 'other', label: 'Other' }
      ]
    })
    
    // Password (for demo purposes)
    const secretWord = await prompt.password('Enter a secret word:', {
      validate: (val) => val.length >= 4 || 'Must be at least 4 characters'
    })
    
    // Rating
    const satisfaction = await prompt.select('Overall satisfaction with current tools:', {
      options: [
        { value: 5, label: '⭐⭐⭐⭐⭐', hint: 'Excellent' },
        { value: 4, label: '⭐⭐⭐⭐', hint: 'Good' },
        { value: 3, label: '⭐⭐⭐', hint: 'Average' },
        { value: 2, label: '⭐⭐', hint: 'Poor' },
        { value: 1, label: '⭐', hint: 'Very Poor' }
      ]
    })
    
    // Optional feedback
    const hasFeedback = await prompt.confirm('Would you like to provide additional feedback?', { 
      default: false 
    })
    
    let feedback = ''
    if (hasFeedback) {
      feedback = await prompt('Your feedback:', {
        default: ''
      })
    }
    
    // Process results
    const spin = spinner('Processing survey results...')
    spin.start()
    await new Promise(resolve => setTimeout(resolve, 1500))
    spin.succeed('Survey completed!')
    
    // Display summary
    console.log(colors.bold('\nSurvey Summary:'))
    console.log(colors.dim('━'.repeat(50)))
    console.log(`Name: ${colors.cyan(name)}`)
    console.log(`Experience: ${colors.yellow(experience)}`)
    console.log(`Languages: ${languages.map(l => colors.green(l)).join(', ') || colors.gray('None')}`)
    console.log(`Favorite Framework: ${colors.magenta(framework)}`)
    console.log(`Secret Word: ${colors.gray('***' + secretWord.slice(-1))}`)
    console.log(`Satisfaction: ${colors.yellow('⭐'.repeat(satisfaction))}`)
    if (feedback) {
      console.log(`Feedback: ${colors.italic(feedback)}`)
    }
    console.log(colors.dim('━'.repeat(50)))
    
    console.log(colors.green('\n✓ Thank you for participating!'))
  }
})