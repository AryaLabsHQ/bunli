import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

export default defineCommand({
  name: 'update',
  description: 'Update dependencies and tools',
  options: {
    check: option(
      z.coerce.boolean().default(false),
      { short: 'c', description: 'Check for updates only' }
    ),
    
    deps: option(
      z.coerce.boolean().default(true),
      { short: 'd', description: 'Update project dependencies' }
    ),
    
    global: option(
      z.coerce.boolean().default(false),
      { short: 'g', description: 'Update global packages' }
    ),
    
    major: option(
      z.coerce.boolean().default(false),
      { short: 'm', description: 'Include major version updates' }
    ),
    
    interactive: option(
      z.coerce.boolean().default(false),
      { short: 'i', description: 'Interactive mode - select updates' }
    ),
    
    self: option(
      z.coerce.boolean().default(false),
      { description: 'Update devtools CLI itself' }
    )
  },
  
  handler: async ({ flags, shell, colors, prompt, spinner }) => {
    // Update self
    if (flags.self) {
      const spin = spinner('Checking for devtools updates...')
      spin.start()
      
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Simulated version check
      const currentVersion: string = '2.1.0'
      const latestVersion: string = '2.2.0'
      
      if (currentVersion !== latestVersion) {
        spin.succeed(`Update available: ${colors.red(currentVersion)} → ${colors.green(latestVersion)}`)
        
        const confirm = await prompt.confirm('Update devtools now?', { default: true })
        if (confirm) {
          const updateSpin = spinner('Updating devtools...')
          updateSpin.start()
          await new Promise(resolve => setTimeout(resolve, 2000))
          updateSpin.succeed('devtools updated successfully! Restart your terminal.')
        }
      } else {
        spin.succeed('devtools is up to date')
      }
      return
    }
    
    // Check for package.json
    const hasPackageJson = await shell`test -f package.json`.quiet().then(() => true).catch(() => false)
    
    if (!hasPackageJson && flags.deps) {
      console.error(colors.red('No package.json found'))
      process.exit(1)
    }
    
    // Detect package manager
    let packageManager = 'npm'
    if (await shell`test -f bun.lockb`.quiet().then(() => true).catch(() => false)) {
      packageManager = 'bun'
    } else if (await shell`test -f pnpm-lock.yaml`.quiet().then(() => true).catch(() => false)) {
      packageManager = 'pnpm'
    } else if (await shell`test -f yarn.lock`.quiet().then(() => true).catch(() => false)) {
      packageManager = 'yarn'
    }
    
    console.log(colors.dim(`Using ${packageManager}...\n`))
    
    // Check for updates
    if (flags.check || flags.interactive) {
      const spin = spinner('Checking for updates...')
      spin.start()
      
      // Simulated outdated packages
      const outdated = [
        { name: '@types/node', current: '20.1.0', wanted: '20.1.7', latest: '21.0.0', type: 'devDependencies' },
        { name: 'eslint', current: '8.45.0', wanted: '8.45.0', latest: '9.0.0', type: 'devDependencies' },
        { name: 'react', current: '18.2.0', wanted: '18.2.0', latest: '18.3.0', type: 'dependencies' },
        { name: 'zod', current: '3.22.0', wanted: '3.22.4', latest: '3.23.0', type: 'dependencies' },
        { name: 'typescript', current: '5.1.6', wanted: '5.1.6', latest: '5.4.0', type: 'devDependencies' }
      ]
      
      await new Promise(resolve => setTimeout(resolve, 2000))
      spin.succeed('Found updates')
      
      console.log(colors.bold('\nAvailable updates:\n'))
      console.log(
        colors.dim('Package'.padEnd(25)),
        colors.dim('Current'.padEnd(12)),
        colors.dim('Wanted'.padEnd(12)),
        colors.dim('Latest'.padEnd(12)),
        colors.dim('Type')
      )
      console.log(colors.dim('─'.repeat(80)))
      
      outdated.forEach(pkg => {
        const hasMinor = pkg.current !== pkg.wanted
        const hasMajor = pkg.wanted !== pkg.latest
        
        console.log(
          pkg.name.padEnd(25),
          colors.gray(pkg.current.padEnd(12)),
          hasMinor ? colors.yellow(pkg.wanted.padEnd(12)) : pkg.wanted.padEnd(12),
          hasMajor ? colors.red(pkg.latest.padEnd(12)) : colors.green(pkg.latest.padEnd(12)),
          colors.dim(pkg.type)
        )
      })
      
      if (flags.check) {
        console.log(colors.dim('\nRun without --check to update'))
        return
      }
      
      if (flags.interactive) {
        console.log()
        const selections = await prompt.multiselect(
          'Select packages to update:',
          { options: outdated.map(pkg => ({
            label: `${pkg.name} (${pkg.current} → ${flags.major ? pkg.latest : pkg.wanted})`,
            value: pkg.name
          })) }
        )
        
        if (selections.length === 0) {
          console.log(colors.yellow('No packages selected'))
          return
        }
        
        // Update selected packages
        for (const pkg of selections) {
          const updateSpin = spinner(`Updating ${pkg}...`)
          updateSpin.start()
          await new Promise(resolve => setTimeout(resolve, 800))
          updateSpin.succeed(`Updated ${pkg}`)
        }
      }
    }
    
    // Update all dependencies
    if (flags.deps && !flags.check && !flags.interactive) {
      const spin = spinner('Updating dependencies...')
      spin.start()
      
      // Simulate update process
      spin.update('Resolving versions...')
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      spin.update('Downloading packages...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      spin.update('Linking dependencies...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      spin.succeed('Dependencies updated')
      
      // Show summary
      console.log(colors.green('\n✓ Updated 5 packages'))
      console.log(colors.dim('  3 minor updates'))
      console.log(colors.dim('  2 patch updates'))
      
      if (!flags.major) {
        console.log(colors.yellow('\n2 major updates available (use --major to include)'))
      }
    }
    
    // Update global packages
    if (flags.global) {
      console.log(colors.bold('\nGlobal packages:\n'))
      
      const globalPackages = [
        { name: 'npm', current: '10.2.0', latest: '10.5.0' },
        { name: 'pnpm', current: '8.10.0', latest: '8.15.0' },
        { name: 'typescript', current: '5.2.0', latest: '5.4.0' }
      ]
      
      for (const pkg of globalPackages) {
        if (pkg.current !== pkg.latest) {
          const spin = spinner(`Updating ${pkg.name} (${pkg.current} → ${pkg.latest})...`)
          spin.start()
          await new Promise(resolve => setTimeout(resolve, 1200))
          spin.succeed(`Updated ${pkg.name}`)
        } else {
          console.log(`${colors.green('✓')} ${pkg.name} is up to date`)
        }
      }
    }
    
    console.log(colors.green('\n✓ All updates completed'))
  }
})