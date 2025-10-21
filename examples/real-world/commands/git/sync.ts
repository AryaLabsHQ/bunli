import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'sync' as const,
  description: 'Sync local branch with remote',
  options: {
    branch: option(
      z.string().default('main'),
      { short: 'b', description: 'Branch to sync from' }
    ),
    
    stash: option(
      z.coerce.boolean().default(true),
      { short: 's', description: 'Stash local changes' }
    ),
    
    prune: option(
      z.coerce.boolean().default(true),
      { short: 'p', description: 'Prune deleted remote branches' }
    ),
    
    rebase: option(
      z.coerce.boolean().default(false),
      { short: 'r', description: 'Use rebase instead of merge' }
    )
  },
  
  handler: async ({ flags, shell, colors, spinner }) => {
    // Check if in git repo
    try {
      await shell`git rev-parse --git-dir`.quiet()
    } catch {
      console.error(colors.red('Not in a git repository'))
      process.exit(1)
    }
    
    // Get current branch
    const currentBranch = (await shell`git branch --show-current`.text()).trim()
    console.log(colors.dim(`Current branch: ${currentBranch}`))
    
    // Check for uncommitted changes
    const status = await shell`git status --porcelain`.text()
    const hasChanges = status.trim() !== ''
    
    if (hasChanges && flags.stash) {
      const spin = spinner('Stashing local changes...')
      spin.start()
      await shell`git stash push -m "sync-stash-${Date.now()}"`
      spin.succeed('Changes stashed')
    }
    
    // Fetch latest changes
    const fetchSpin = spinner('Fetching latest changes...')
    fetchSpin.start()
    
    try {
      if (flags.prune) {
        await shell`git fetch --all --prune`
      } else {
        await shell`git fetch --all`
      }
      fetchSpin.succeed('Fetched latest changes')
    } catch (error) {
      fetchSpin.fail('Failed to fetch changes')
      console.error(colors.red(String(error)))
      process.exit(1)
    }
    
    // Check if target branch exists
    try {
      await shell`git rev-parse --verify origin/${flags.branch}`.quiet()
    } catch {
      console.error(colors.red(`Remote branch 'origin/${flags.branch}' not found`))
      process.exit(1)
    }
    
    // Sync with remote branch
    const syncSpin = spinner(`Syncing with origin/${flags.branch}...`)
    syncSpin.start()
    
    try {
      if (currentBranch === flags.branch) {
        // On target branch, just pull
        if (flags.rebase) {
          await shell`git pull --rebase origin ${flags.branch}`
        } else {
          await shell`git pull origin ${flags.branch}`
        }
      } else {
        // On different branch, merge or rebase from target
        if (flags.rebase) {
          await shell`git rebase origin/${flags.branch}`
        } else {
          await shell`git merge origin/${flags.branch}`
        }
      }
      syncSpin.succeed(`Synced with origin/${flags.branch}`)
    } catch (error) {
      syncSpin.fail('Sync failed')
      console.error(colors.red('\nConflicts detected! Please resolve them manually.'))
      
      if (hasChanges && flags.stash) {
        console.log(colors.yellow('\nYour changes are stashed. Run "git stash pop" after resolving conflicts.'))
      }
      process.exit(1)
    }
    
    // Restore stashed changes
    if (hasChanges && flags.stash) {
      const popSpin = spinner('Restoring stashed changes...')
      popSpin.start()
      
      try {
        await shell`git stash pop`
        popSpin.succeed('Changes restored')
      } catch {
        popSpin.fail('Failed to restore changes (conflicts?)')
        console.log(colors.yellow('Run "git stash pop" manually to restore your changes'))
      }
    }
    
    // Show summary
    console.log(colors.green('\n✓ Sync completed successfully!'))
    
    // Show recent commits
    console.log(colors.dim('\nRecent commits:'))
    const log = await shell`git log --oneline -5`.text()
    console.log(colors.gray(log))
  }
})