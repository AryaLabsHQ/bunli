import { defineCommand, option } from '@bunli/core'
import { ProgressBar, useKeyboard, useRenderer } from '@bunli/tui'
import { useEffect, useState } from 'react'
import { z } from 'zod'

function GreetProgress({
  name,
  loud,
  times
}: {
  name: string
  loud: boolean
  times: number
}) {
  const [progress, setProgress] = useState(0)
  const renderer = useRenderer()

  const closeTui = () => {
    if (!renderer.isDestroyed) {
      renderer.destroy()
    }
  }

  useKeyboard((key) => {
    if (key.name === 'q' || key.name === 'escape') {
      closeTui()
    }
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((current) => {
        if (current >= 100) return 100
        return current + 5
      })
    }, 80)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (progress < 100) return
    const timeout = setTimeout(() => closeTui(), 400)
    return () => clearTimeout(timeout)
  }, [progress, renderer])

  const greeting = `Hello, ${name}!`
  const message = loud ? greeting.toUpperCase() : greeting

  return (
    <ProgressBar
      value={progress}
      label={`${message} x${times}  (press q to quit, auto-exits at 100%)`}
      color={loud ? '#f97316' : '#22c55e'}
    />
  )
}

const greetCommand = defineCommand({
  name: 'greet' as const,
  description: 'A minimal greeting CLI',
  options: {
    // Simple string with default
    name: option(
      z.string().default('world'),
      { short: 'n', description: 'Who to greet' }
    ),
    
    // Boolean with short flag
    loud: option(
      z.coerce.boolean().default(false),
      { short: 'l', description: 'Shout the greeting' }
    ),
    
    // Number with validation
    times: option(
      z.coerce.number().int().positive().default(1),
      { short: 't', description: 'Number of times to greet' }
    )
  },
  render: ({ flags }) => (
    <GreetProgress
      name={String(flags.name)}
      loud={Boolean(flags.loud)}
      times={Number(flags.times)}
    />
  ),
  handler: async ({ flags, colors }) => {
    const greeting = `Hello, ${flags.name}!`
    const message = flags.loud ? greeting.toUpperCase() : greeting
    
    for (let i = 0; i < flags.times; i++) {
      console.log(colors.cyan(message))
    }
  }
})

export default greetCommand
