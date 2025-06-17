import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'seed',
  description: 'Seed the database with sample data',
  options: {
    count: option(
      z.coerce.number().int().positive().default(10),
      { short: 'c', description: 'Number of records to create' }
    ),
    
    table: option(
      z.enum(['users', 'posts', 'all']).default('all'),
      { short: 't', description: 'Table to seed' }
    )
  },
  
  handler: async ({ flags, colors, spinner }) => {
    const spin = spinner('Seeding database...')
    spin.start()
    
    if (flags.table === 'all' || flags.table === 'users') {
      spin.update(`Creating ${flags.count} users...`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    if (flags.table === 'all' || flags.table === 'posts') {
      spin.update(`Creating ${flags.count} posts...`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    spin.succeed('Database seeded successfully!')
  }
})