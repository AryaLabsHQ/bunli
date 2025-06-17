import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'branch',
  description: 'Interactive git branch management',
  options: {
    all: option(
      z.coerce.boolean().default(false),
      { short: 'a', description: 'Show all branches including remotes' }
    ),
    
    delete: option(
      z.coerce.boolean().default(false),
      { short: 'd', description: 'Delete selected branches' }
    ),
    
    create: option(
      z.string().optional(),
      { short: 'c', description: 'Create new branch' }
    ),
    
    prune: option(
      z.coerce.boolean().default(false),
      { short: 'p', description: 'Delete branches that no longer exist on remote' }
    )
  },
  
  handler: async ({ flags, shell, colors, prompt }) => {
    // Check if in git repo
    try {
      await shell`git rev-parse --git-dir`.quiet()
    } catch {
      console.error(colors.red('Not in a git repository'))
      process.exit(1)
    }
    
    if (flags.create) {
      // Create new branch
      try {
        await shell`git checkout -b ${flags.create}`
        console.log(colors.green(`✓ Created and switched to branch: ${flags.create}`))
      } catch (error) {
        console.error(colors.red(`Failed to create branch: ${error}`))
        process.exit(1)
      }
      return
    }
    
    if (flags.prune) {
      console.log(colors.yellow('Pruning remote tracking branches...'))
      await shell`git remote prune origin`
      console.log(colors.green('✓ Pruned stale remote tracking branches'))
      return
    }
    
    // Get current branch
    const currentBranch = (await shell`git branch --show-current`.text()).trim()
    
    // Get branches
    const branchCmd = flags.all 
      ? shell`git branch -a --format='%(refname:short)'`
      : shell`git branch --format='%(refname:short)'`
    
    const output = await branchCmd.text()
    const branches = output.trim().split('\n').filter(Boolean)
    
    if (branches.length === 0) {
      console.log(colors.yellow('No branches found'))
      return
    }
    
    // Interactive selection
    const choices = branches.map(branch => ({
      label: branch === currentBranch ? `${branch} ${colors.green('(current)')}` : branch,
      value: branch
    }))
    
    if (flags.delete) {
      const selected = await prompt.multiselect(
        'Select branches to delete:',
        choices.filter(c => c.value !== currentBranch),
        { hint: 'Space to select, Enter to confirm' }
      )
      
      if (selected.length === 0) {
        console.log(colors.yellow('No branches selected'))
        return
      }
      
      const confirm = await prompt.confirm(
        `Delete ${selected.length} branch${selected.length > 1 ? 'es' : ''}?`,
        { default: false }
      )
      
      if (!confirm) {
        console.log(colors.red('Cancelled'))
        return
      }
      
      for (const branch of selected) {
        try {
          await shell`git branch -D ${branch}`
          console.log(colors.green(`✓ Deleted: ${branch}`))
        } catch {
          console.error(colors.red(`✗ Failed to delete: ${branch}`))
        }
      }
    } else {
      // Switch branch
      const selected = await prompt.select(
        'Select branch to switch to:',
        choices,
        { hint: 'Use arrow keys' }
      )
      
      if (selected === currentBranch) {
        console.log(colors.yellow('Already on this branch'))
        return
      }
      
      try {
        await shell`git checkout ${selected}`
        console.log(colors.green(`✓ Switched to: ${selected}`))
      } catch (error) {
        console.error(colors.red(`Failed to switch branch: ${error}`))
        process.exit(1)
      }
    }
  }
})