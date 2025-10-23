# Git Tool - Bunli CLI

A practical Git workflow automation CLI demonstrating nested commands, external tool integration, and shell command execution.

## Quick Start

```bash
# Install dependencies
bun install

# Run commands
bun cli.ts branch --name feature/new-feature --switch
bun cli.ts pr --title "Add new feature" --base main
bun cli.ts sync --rebase
bun cli.ts status --detailed
```

## What This Example Shows

- **Nested command organization** with clear structure
- **External tool integration** (Git commands)
- **Shell command execution** with error handling
- **Command aliases** for common operations
- **Interactive prompts** for user decisions
- **Colored output** for better UX
- **Real-world Git workflows** developers actually use

## Commands

### `branch` - Branch Management
Create, switch, and delete branches with safety checks:

```bash
# Create new branch
bun cli.ts branch --name feature/auth --base main

# Create and switch to branch
bun cli.ts branch -n feature/auth -s

# Delete branch (with safety checks)
bun cli.ts branch -n old-feature --delete

# Force delete branch
bun cli.ts branch -n old-feature -d --force
```

**Features:**
- Branch name validation
- Safety checks (can't delete current branch)
- Automatic branch switching
- Force operations for advanced users
- Branch status display

### `pr` - Pull Request Management
Create pull requests with comprehensive options:

```bash
# Create PR with title
bun cli.ts pr --title "Add user authentication"

# Create draft PR
bun cli.ts pr -t "WIP: New feature" --draft

# Create PR with reviewers and labels
bun cli.ts pr -t "Fix bug" -r "alice,bob" -l "bug,priority"

# Create PR with custom base branch
bun cli.ts pr -t "Feature" --base develop
```

**Features:**
- Automatic commit detection and stashing
- Branch pushing with confirmation
- PR description generation from commits
- Reviewer and label assignment
- Draft PR support
- Browser opening integration

### `sync` - Repository Synchronization
Sync with remote repository with conflict handling:

```bash
# Basic sync
bun cli.ts sync

# Sync with rebase
bun cli.ts sync --rebase

# Force sync (stash changes)
bun cli.ts sync --force

# Sync and prune remote branches
bun cli.ts sync --prune
```

**Features:**
- Automatic change stashing
- Rebase vs merge options
- Conflict detection and reporting
- Remote branch pruning
- Ahead/behind status display
- Stash restoration

### `status` - Enhanced Status
Comprehensive repository status with detailed information:

```bash
# Basic status
bun cli.ts status

# Detailed status
bun cli.ts status --detailed

# Show branch information
bun cli.ts status --branches

# Show remote information
bun cli.ts status --remote

# Show commit history
bun cli.ts status --history 10
```

**Features:**
- Working directory status with icons
- Branch tracking information
- Ahead/behind commit counts
- Detailed file status
- Commit history display
- Remote repository information

## Key Concepts

### External Tool Integration

```typescript
// Execute Git commands safely
const { stdout: currentBranch } = await shell`git branch --show-current`
const { stdout: status } = await shell`git status --porcelain`

// Handle command errors
try {
  await shell`git branch -D ${branchName}`
} catch (error) {
  // Handle Git errors gracefully
}
```

### Command Aliases

```typescript
export default defineCommand({
  name: 'branch' as const,
  alias: 'br',  // Short alias
  // ...
})

export default defineCommand({
  name: 'pr' as const,
  alias: 'pull-request',  // Long alias
  // ...
})
```

### Interactive Decision Making

```typescript
// Ask for user confirmation
const confirmed = await prompt.confirm('Continue with operation?', {
  default: false
})

// Get user input
const commitMessage = await prompt.text('Commit message:', {
  default: 'WIP: prepare for PR'
})
```

### Colored Output

```typescript
// Use colors for better UX
console.log(colors.green('✅ Operation successful'))
console.log(colors.red('❌ Operation failed'))
console.log(colors.yellow('⚠️  Warning message'))
console.log(colors.cyan('📋 Information'))
```

## Development

```bash
# Start development with hot reload
bun run dev branch --name test-branch

# Build for production
bun run build

# Run the built executable
./dist/cli status --detailed
```

## Real-World Usage

This example demonstrates patterns you'd use in actual Git automation tools:

- **Safety first**: Check for uncommitted changes before operations
- **User choice**: Ask for confirmation on destructive operations
- **Error handling**: Graceful handling of Git command failures
- **Status reporting**: Clear feedback on operation results
- **Flexibility**: Multiple options for different use cases

## Next Steps

Ready for advanced patterns? Try the **[dev-server](../dev-server/README.md)** example to learn about:
- Plugin system and lifecycle hooks
- Configuration management
- Long-running processes
- Type-safe plugin context

## Project Structure

```
git-tool/
├── cli.ts              # CLI entry point
├── commands/
│   ├── branch.ts       # Branch management
│   ├── pr.ts          # Pull request creation
│   ├── sync.ts        # Repository synchronization
│   └── status.ts      # Enhanced status display
├── bunli.config.ts     # Configuration
├── package.json        # Dependencies
└── README.md          # This file
```

This example shows how to build production-ready Git automation tools with Bunli's powerful shell integration and user interaction features.
