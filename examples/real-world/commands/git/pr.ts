import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'pr',
  description: 'Create GitHub pull request',
  options: {
    title: option(
      z.string().optional(),
      { short: 't', description: 'PR title' }
    ),
    
    body: option(
      z.string().optional(),
      { short: 'b', description: 'PR description' }
    ),
    
    draft: option(
      z.coerce.boolean().default(false),
      { short: 'd', description: 'Create as draft' }
    ),
    
    base: option(
      z.string().default('main'),
      { description: 'Base branch' }
    ),
    
    assignee: option(
      z.string().optional(),
      { short: 'a', description: 'Assign to user' }
    ),
    
    reviewer: option(
      z.string().optional(),
      { short: 'r', description: 'Request review from user' }
    ),
    
    web: option(
      z.coerce.boolean().default(true),
      { short: 'w', description: 'Open PR in browser' }
    )
  },
  
  handler: async ({ flags, shell, colors, prompt, spinner }) => {
    // Check if in git repo
    try {
      await shell`git rev-parse --git-dir`.quiet()
    } catch {
      console.error(colors.red('Not in a git repository'))
      process.exit(1)
    }
    
    // Check if GitHub CLI is installed
    try {
      await shell`which gh`.quiet()
    } catch {
      console.error(colors.red('GitHub CLI (gh) is not installed'))
      console.log(colors.dim('Install it from: https://cli.github.com'))
      process.exit(1)
    }
    
    // Get current branch
    const currentBranch = (await shell`git branch --show-current`.text()).trim()
    
    if (currentBranch === flags.base) {
      console.error(colors.red(`Cannot create PR from ${flags.base} to ${flags.base}`))
      process.exit(1)
    }
    
    // Check for uncommitted changes
    const status = await shell`git status --porcelain`.text()
    if (status.trim()) {
      console.log(colors.yellow('You have uncommitted changes'))
      const commit = await prompt.confirm('Commit all changes?', { default: true })
      
      if (commit) {
        const message = await prompt.text('Commit message:', {
          placeholder: 'Update changes',
          validate: (value) => value.length > 0 || 'Message is required'
        })
        
        await shell`git add -A`
        await shell`git commit -m ${message}`
        console.log(colors.green('✓ Changes committed'))
      }
    }
    
    // Push branch
    const spin = spinner('Pushing branch...')
    spin.start()
    
    try {
      await shell`git push -u origin ${currentBranch}`
      spin.succeed('Branch pushed')
    } catch {
      spin.fail('Failed to push branch')
      process.exit(1)
    }
    
    // Get PR title and body
    let title = flags.title
    let body = flags.body
    
    if (!title) {
      // Get last commit message as default title
      const lastCommit = (await shell`git log -1 --pretty=%s`.text()).trim()
      title = await prompt.text('PR Title:', {
        placeholder: lastCommit,
        default: lastCommit
      })
    }
    
    if (!body) {
      body = await prompt.text('PR Description:', {
        placeholder: 'Describe your changes...',
        multiline: true
      })
    }
    
    // Build gh command
    let ghCmd = `gh pr create --title ${JSON.stringify(title)} --base ${flags.base}`
    
    if (body) {
      ghCmd += ` --body ${JSON.stringify(body)}`
    }
    
    if (flags.draft) {
      ghCmd += ' --draft'
    }
    
    if (flags.assignee) {
      ghCmd += ` --assignee ${flags.assignee}`
    }
    
    if (flags.reviewer) {
      ghCmd += ` --reviewer ${flags.reviewer}`
    }
    
    if (!flags.web) {
      ghCmd += ' --no-web'
    }
    
    // Create PR
    console.log(colors.dim('\nCreating pull request...'))
    
    try {
      const result = await shell`${ghCmd}`.text()
      console.log(colors.green('\n✓ Pull request created successfully!'))
      
      if (result.includes('https://github.com')) {
        const url = result.match(/(https:\/\/github\.com\/[^\s]+)/)?.[1]
        if (url) {
          console.log(colors.cyan(`\nPR URL: ${url}`))
        }
      }
    } catch (error) {
      console.error(colors.red(`\nFailed to create PR: ${error}`))
      process.exit(1)
    }
  }
})