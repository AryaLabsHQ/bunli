import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'branch' as const,
  description: 'Create, switch, or manage branches',
  alias: 'br',
  options: {
    // Branch name
    name: option(
      z.string()
        .min(1, 'Branch name cannot be empty')
        .regex(/^[a-zA-Z0-9._-]+$/, 'Branch name can only contain letters, numbers, dots, underscores, and hyphens'),
      { 
        short: 'n', 
        description: 'Branch name' 
      }
    ),
    
    // Base branch
    base: option(
      z.string().default('main'),
      { 
        short: 'b', 
        description: 'Base branch to create from' 
      }
    ),
    
    // Switch to branch
    switch: option(
      z.coerce.boolean().default(false),
      { 
        short: 's', 
        description: 'Switch to the branch after creating' 
      }
    ),
    
    // Delete branch
    delete: option(
      z.coerce.boolean().default(false),
      { 
        short: 'd', 
        description: 'Delete the branch' 
      }
    ),
    
    // Force operations
    force: option(
      z.coerce.boolean().default(false),
      { 
        short: 'f', 
        description: 'Force the operation' 
      }
    )
  },
  
  handler: async ({ flags, colors, spinner, shell }) => {
    const spin = spinner('Working with branches...')
    
    try {
      if (flags.delete) {
        // Delete branch
        spin.update(`Deleting branch '${flags.name}'...`)
        
        if (!flags.force) {
          // Check if branch exists
          const { stdout: branches } = await shell`git branch --list ${flags.name}`
          if (!branches.toString().trim()) {
            throw new Error(`Branch '${flags.name}' does not exist`)
          }
          
          // Check if it's the current branch
          const { stdout: currentBranch } = await shell`git branch --show-current`
          if (currentBranch.toString().trim() === flags.name) {
            throw new Error(`Cannot delete current branch '${flags.name}'. Switch to another branch first.`)
          }
        }
        
        await shell`git branch ${flags.force ? '-D' : '-d'} ${flags.name}`
        spin.succeed(`✅ Deleted branch '${flags.name}'`)
        
      } else {
        // Create or switch branch
        spin.update(`Creating branch '${flags.name}' from '${flags.base}'...`)
        
        // Check if branch already exists
        const { stdout: existingBranches } = await shell`git branch --list ${flags.name}`
        if (existingBranches.toString().trim() && !flags.force) {
          throw new Error(`Branch '${flags.name}' already exists. Use --force to overwrite.`)
        }
        
        // Create branch
        if (flags.force && existingBranches.toString().trim()) {
          await shell`git branch -D ${flags.name}`
        }
        
        await shell`git checkout -b ${flags.name} ${flags.base}`
        
        if (!flags.switch) {
          // Switch back to original branch
          await shell`git checkout ${flags.base}`
        }
        
        spin.succeed(`✅ Created branch '${flags.name}' from '${flags.base}'`)
        
        if (flags.switch) {
          console.log(colors.cyan(`Switched to branch '${flags.name}'`))
        }
      }
      
      // Show branch status
      const { stdout: currentBranch } = await shell`git branch --show-current`
      const { stdout: allBranches } = await shell`git branch --list`
      
      console.log(colors.bold('\n📋 Branch Status:'))
      console.log(`  Current: ${colors.cyan(currentBranch.toString().trim())}`)
      console.log(`  Branches: ${colors.dim(String(allBranches.toString().trim().split('\n').length))} total`)
      
    } catch (error) {
      spin.fail('Branch operation failed')
      console.error(colors.red(`Error: ${error instanceof Error ? error.message : String(error)}`))
    }
  }
})
