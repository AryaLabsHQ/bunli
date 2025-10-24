import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'sync' as const,
  description: 'Sync with upstream repository',
  alias: 'pull',
  options: {
    // Remote name
    remote: option(
      z.string().default('origin'),
      { 
        short: 'r', 
        description: 'Remote name to sync with' 
      }
    ),
    
    // Branch to sync
    branch: option(
      z.string().optional(),
      { 
        short: 'b', 
        description: 'Branch to sync (defaults to current branch)' 
      }
    ),
    
    // Force sync
    force: option(
      z.coerce.boolean().default(false),
      { 
        short: 'f', 
        description: 'Force sync even if there are conflicts' 
      }
    ),
    
    // Rebase instead of merge
    rebase: option(
      z.coerce.boolean().default(false),
      { 
        description: 'Use rebase instead of merge' 
      }
    ),
    
    // Prune remote branches
    prune: option(
      z.coerce.boolean().default(false),
      { 
        short: 'p', 
        description: 'Remove remote-tracking branches that no longer exist' 
      }
    )
  },
  
  handler: async ({ flags, colors, spinner, shell, prompt }) => {
    const spin = spinner('Syncing with remote...')
    
    try {
      // Get current branch if not specified
      const currentBranch = flags.branch || (await shell`git branch --show-current`).stdout.toString().trim()
      
      // Check if we have uncommitted changes
      const { stdout: status } = await shell`git status --porcelain`
      if (status.toString().trim() && !flags.force) {
        const stashChanges = await prompt.confirm(
          'You have uncommitted changes. Stash them before syncing?',
          { default: true }
        )
        
        if (stashChanges) {
          spin.update('Stashing changes...')
          await shell`git stash push -m "Auto-stash before sync"`
          console.log(colors.yellow('📦 Changes stashed'))
        }
      }
      
      // Fetch latest changes
      spin.update('Fetching latest changes...')
      await shell`git fetch ${flags.remote}`
      
      if (flags.prune) {
        spin.update('Pruning remote branches...')
        await shell`git remote prune ${flags.remote}`
        console.log(colors.green('🧹 Pruned remote branches'))
      }
      
      // Check if there are incoming changes
      const { stdout: behind } = await shell`git rev-list --count HEAD..${flags.remote}/${currentBranch}`
      const { stdout: ahead } = await shell`git rev-list --count ${flags.remote}/${currentBranch}..HEAD`
      
      const behindCount = parseInt(behind.toString().trim())
      const aheadCount = parseInt(ahead.toString().trim())
      
      if (behindCount === 0 && aheadCount === 0) {
        spin.succeed('✅ Already up to date')
        console.log(colors.green('No changes to sync'))
        return
      }
      
      console.log(colors.bold('\n📊 Sync Status:'))
      console.log(`  Behind: ${colors.red(String(behindCount))} commits`)
      console.log(`  Ahead: ${colors.green(String(aheadCount))} commits`)
      
      if (behindCount > 0) {
        // Pull changes
        spin.update('Pulling changes...')
        
        if (flags.rebase) {
          await shell`git pull --rebase ${flags.remote} ${currentBranch}`
          console.log(colors.green('✅ Rebased successfully'))
        } else {
          await shell`git pull ${flags.remote} ${currentBranch}`
          console.log(colors.green('✅ Merged successfully'))
        }
      }
      
      if (aheadCount > 0) {
        // Push local changes
        const pushChanges = await prompt.confirm(
          `Push ${aheadCount} local commits to ${flags.remote}?`,
          { default: true }
        )
        
        if (pushChanges) {
          spin.update('Pushing changes...')
          await shell`git push ${flags.remote} ${currentBranch}`
          console.log(colors.green('✅ Pushed successfully'))
        }
      }
      
      // Restore stashed changes if any
      const { stdout: stashList } = await shell`git stash list`
      if (stashList.includes('Auto-stash before sync')) {
        const restoreStash = await prompt.confirm(
          'Restore stashed changes?',
          { default: true }
        )
        
        if (restoreStash) {
          spin.update('Restoring stashed changes...')
          await shell`git stash pop`
          console.log(colors.green('✅ Stashed changes restored'))
        }
      }
      
      spin.succeed('✅ Sync completed successfully!')
      
      // Show final status
      const { stdout: finalStatus } = await shell`git status -sb`
      console.log(colors.bold('\n📋 Final Status:'))
      console.log(colors.dim(finalStatus.toString()))
      
    } catch (error) {
      spin.fail('Sync failed')
      console.error(colors.red(`Error: ${error instanceof Error ? error.message : String(error)}`))
      
      // Check if there are conflicts
      const { stdout: conflictStatus } = await shell`git status --porcelain`
      if (conflictStatus.includes('UU') || conflictStatus.includes('AA')) {
        console.log(colors.yellow('\n⚠️  Merge conflicts detected. Resolve them and try again.'))
        console.log(colors.dim('Use "git status" to see conflicted files'))
      }
    }
  }
})
