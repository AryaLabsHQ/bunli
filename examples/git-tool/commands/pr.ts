import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'pr' as const,
  description: 'Create and manage pull requests',
  alias: 'pull-request',
  options: {
    // PR title
    title: option(
      z.string()
        .min(1, 'Title cannot be empty')
        .max(100, 'Title must be 100 characters or less'),
      { 
        short: 't', 
        description: 'Pull request title' 
      }
    ),
    
    // PR description
    description: option(
      z.string().optional(),
      { 
        short: 'd', 
        description: 'Pull request description' 
      }
    ),
    
    // Base branch
    base: option(
      z.string().default('main'),
      { 
        short: 'b', 
        description: 'Base branch to merge into' 
      }
    ),
    
    // Head branch
    head: option(
      z.string().optional(),
      { 
        short: 'h', 
        description: 'Head branch (defaults to current branch)' 
      }
    ),
    
    // Draft PR
    draft: option(
      z.coerce.boolean().default(false),
      { 
        description: 'Create as draft pull request' 
      }
    ),
    
    // Assign reviewers
    reviewers: option(
      z.string()
        .transform((val) => val.split(',').map(s => s.trim()))
        .optional(),
      { 
        short: 'r', 
        description: 'Comma-separated list of reviewers' 
      }
    ),
    
    // Labels
    labels: option(
      z.string()
        .transform((val) => val.split(',').map(s => s.trim()))
        .optional(),
      { 
        short: 'l', 
        description: 'Comma-separated list of labels' 
      }
    )
  },
  
  handler: async ({ flags, colors, spinner, shell, prompt }) => {
    const spin = spinner('Creating pull request...')
    
    try {
      // Get current branch if head not specified
      const headBranch = flags.head || (await shell`git branch --show-current`).toString().trim()
      
      // Check if we have uncommitted changes
      const { stdout: status } = await shell`git status --porcelain`
      if (status.toString().trim()) {
        const commitChanges = await prompt.confirm(
          'You have uncommitted changes. Commit them before creating PR?',
          { default: true }
        )
        
        if (commitChanges) {
          const commitMessage = await prompt.text('Commit message:', {
            default: 'WIP: prepare for PR'
          })
          
          await shell`git add .`
          await shell`git commit -m ${commitMessage}`
          console.log(colors.green('✅ Changes committed'))
        }
      }
      
      // Check if branch is pushed
      const { stdout: remoteStatus } = await shell`git status -sb`
      if (!remoteStatus.toString().includes('ahead')) {
        const pushBranch = await prompt.confirm(
          `Push branch '${headBranch}' to remote?`,
          { default: true }
        )
        
        if (pushBranch) {
          spin.update('Pushing branch to remote...')
          await shell`git push -u origin ${headBranch}`
          console.log(colors.green('✅ Branch pushed to remote'))
        }
      }
      
      // Generate PR description if not provided
      let description = flags.description
      if (!description) {
        // Get recent commits for description
        const { stdout: commits } = await shell`git log --oneline ${flags.base}..${headBranch}`
        const commitList = commits.toString().trim().split('\n').slice(0, 5)
        
        description = `## Changes\n\n${commitList.map((commit: string) => `- ${commit}`).join('\n')}`
        
        if (commits.toString().trim().split('\n').length > 5) {
          description += `\n\n... and ${commits.toString().trim().split('\n').length - 5} more commits`
        }
      }
      
      // Simulate PR creation (in real implementation, would use GitHub CLI or API)
      spin.update('Creating pull request...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const prNumber = Math.floor(Math.random() * 1000) + 1
      const prUrl = `https://github.com/example/repo/pull/${prNumber}`
      
      spin.succeed(`✅ Pull request created!`)
      
      console.log(colors.bold('\n📋 Pull Request Details:'))
      console.log(`  Title: ${colors.cyan(flags.title)}`)
      console.log(`  Base: ${colors.cyan(flags.base)} ← ${colors.cyan(headBranch)}`)
      console.log(`  Draft: ${colors.cyan(flags.draft ? 'Yes' : 'No')}`)
      console.log(`  URL: ${colors.blue(prUrl)}`)
      
      if (flags.reviewers) {
        console.log(`  Reviewers: ${colors.cyan(flags.reviewers.join(', '))}`)
      }
      
      if (flags.labels) {
        console.log(`  Labels: ${colors.cyan(flags.labels.join(', '))}`)
      }
      
      console.log(colors.dim('\nDescription:'))
      console.log(colors.dim(description))
      
      // Ask if user wants to open PR
      const openPR = await prompt.confirm('Open pull request in browser?', {
        default: false
      })
      
      if (openPR) {
        console.log(colors.blue(`Opening ${prUrl}...`))
        // In real implementation: await shell`open ${prUrl}`
      }
      
    } catch (error) {
      spin.fail('Pull request creation failed')
      console.error(colors.red(`Error: ${error instanceof Error ? error.message : String(error)}`))
    }
  }
})
