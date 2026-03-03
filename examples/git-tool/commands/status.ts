import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'status' as const,
  description: 'Enhanced git status with detailed information',
  alias: 'st',
  options: {
    // Show detailed information
    detailed: option(
      z.coerce.boolean().default(false),
      { 
        short: 'd', 
        description: 'Show detailed status information' 
      }
    ),
    
    // Show branch information
    branches: option(
      z.coerce.boolean().default(false),
      { 
        short: 'b', 
        description: 'Show branch information' 
      }
    ),
    
    // Show remote information
    remote: option(
      z.coerce.boolean().default(false),
      { 
        short: 'r', 
        description: 'Show remote information' 
      }
    ),
    
    // Show commit history
    history: option(
      z.coerce.number()
        .int('History count must be a whole number')
        .min(1, 'History count must be at least 1')
        .max(50, 'History count cannot exceed 50')
        .optional(),
      { 
        short: 'h', 
        description: 'Show commit history (1-50 commits)' 
      }
    )
  },
  
  handler: async ({ flags, colors, shell }) => {
    try {
      // Basic status
      const { stdout: status } = await shell`git status --porcelain`
      const { stdout: currentBranch } = await shell`git branch --show-current`
      const { stdout: remoteUrl } = await shell`git remote get-url origin 2>/dev/null || echo "No remote"`
      
      console.log(colors.bold('Git status'))
      console.log('='.repeat(50))
      
      // Current branch
      console.log(`\nBranch: ${colors.cyan(currentBranch.toString().trim())}`)
      
      // Remote information
      if (flags.remote || flags.detailed) {
        console.log(`Remote: ${colors.cyan(remoteUrl.toString().trim())}`)
        
        // Check if branch is tracking remote
        const { stdout: tracking } = await shell`git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "No tracking"`
        if (tracking.toString().trim() !== 'No tracking') {
          console.log(`Tracking: ${colors.cyan(tracking.toString().trim())}`)
          
          // Show ahead/behind
          const { stdout: behind } = await shell`git rev-list --count HEAD..@{u} 2>/dev/null || echo "0"`
          const { stdout: ahead } = await shell`git rev-list --count @{u}..HEAD 2>/dev/null || echo "0"`
          
          const behindCount = parseInt(behind.toString().trim())
          const aheadCount = parseInt(ahead.toString().trim())
          
          if (behindCount > 0) {
            console.log(`Behind: ${colors.red(String(behindCount))} commits`)
          }
          if (aheadCount > 0) {
            console.log(`Ahead: ${colors.green(String(aheadCount))} commits`)
          }
          if (behindCount === 0 && aheadCount === 0) {
            console.log(`OK ${colors.green('Up to date')}`)
          }
        }
      }
      
      // Working directory status
      if (status.toString().trim()) {
        console.log(`\nWorking directory:`)
        
        const lines = status.toString().trim().split('\n')
        const staged = lines.filter((line: string) => line.startsWith('A ') || line.startsWith('M ') || line.startsWith('D '))
        const modified = lines.filter((line: string) => line.startsWith(' M') || line.startsWith(' D'))
        const untracked = lines.filter((line: string) => line.startsWith('??'))
        
        if (staged.length > 0) {
          console.log(`  ${colors.green('Staged:')} ${staged.length} files`)
          if (flags.detailed) {
            staged.forEach((line: string) => {
              const file = line.substring(2)
              const status = line[0]
              const icon = status === 'A' ? '+' : status === 'M' ? '~' : '-'
              console.log(`    ${icon} ${colors.green(file)}`)
            })
          }
        }
        
        if (modified.length > 0) {
          console.log(`  ${colors.yellow('Modified:')} ${modified.length} files`)
          if (flags.detailed) {
            modified.forEach((line: string) => {
              const file = line.substring(2)
              const status = line[1]
              const icon = status === 'M' ? '~' : '-'
              console.log(`    ${icon} ${colors.yellow(file)}`)
            })
          }
        }
        
        if (untracked.length > 0) {
          console.log(`  ${colors.red('Untracked:')} ${untracked.length} files`)
          if (flags.detailed) {
            untracked.forEach((line: string) => {
              const file = line.substring(2)
              console.log(`    ? ${colors.red(file)}`)
            })
          }
        }
      } else {
        console.log(`\nOK ${colors.green('Working directory clean')}`)
      }
      
      // Branch information
      if (flags.branches || flags.detailed) {
        console.log(`\nBranches:`)
        
        const { stdout: localBranches } = await shell`git branch --list`
        const { stdout: remoteBranches } = await shell`git branch -r --list 2>/dev/null || echo ""`
        
        const localCount = localBranches.toString().trim().split('\n').length
        const remoteCount = remoteBranches.toString().trim() ? remoteBranches.toString().trim().split('\n').length : 0
        
        console.log(`  Local: ${colors.cyan(String(localCount))} branches`)
        console.log(`  Remote: ${colors.cyan(String(remoteCount))} branches`)
        
        if (flags.detailed) {
          console.log(`\n  Local branches:`)
          localBranches.toString().trim().split('\n').forEach((branch: string) => {
            const isCurrent = branch.startsWith('*')
            const name = branch.replace('* ', '').trim()
            const icon = isCurrent ? '*' : '-'
            const color = isCurrent ? colors.cyan : colors.dim
            console.log(`    ${icon} ${color(name)}`)
          })
        }
      }
      
      // Commit history
      if (flags.history) {
        console.log(`\nRecent commits (${flags.history}):`)
        
        const { stdout: commits } = await shell`git log --oneline -${flags.history} --pretty=format:"%h %s (%an, %ar)"`
        commits.toString().trim().split('\n').forEach((commit: string, index: number) => {
          const [hash, ...rest] = commit.split(' ')
          const message = rest.join(' ')
          console.log(`  ${colors.dim(hash || '')} ${message}`)
        })
      }
      
      // Summary
      if (!flags.detailed && !flags.branches && !flags.remote && !flags.history) {
        console.log(colors.dim('\nHint: use --detailed, --branches, --remote, or --history for more information'))
      }
      
    } catch (error) {
      console.error(colors.red(`Error: ${error instanceof Error ? error.message : String(error)}`))
    }
  }
})
