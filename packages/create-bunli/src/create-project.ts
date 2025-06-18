import type { BunliUtils } from '@bunli/utils'
import { processTemplate, resolveTemplateSource, isLocalTemplate, getBundledTemplatePath } from './template-engine.js'
import type { CreateOptions } from './types.js'

interface CreateProjectOptions extends CreateOptions {
  name: string
  dir: string
  template: string
  prompt: BunliUtils['prompt']
  spinner: BunliUtils['spinner']
  colors: BunliUtils['colors']
  shell: typeof Bun.$
}

export async function createProject(options: CreateProjectOptions) {
  const { name, dir, template, git, install, prompt, spinner, colors, shell, offline } = options
  
  // Check if directory exists
  try {
    await shell`test -d ${dir}`.quiet()
    const overwrite = await prompt.confirm(`Directory ${dir} already exists. Overwrite?`, { default: false })
    if (!overwrite) {
      console.log(colors.red('Cancelled'))
      process.exit(1)
    }
    await shell`rm -rf ${dir}`
  } catch {
    // Directory doesn't exist, which is good
  }
  
  // Create project directory
  const spin = spinner('Creating project structure...')
  spin.start()
  
  await shell`mkdir -p ${dir}`
  
  try {
    // Resolve template source
    let templateSource = template
    
    // Check if it's a local/bundled template first
    if (await isLocalTemplate(template)) {
      templateSource = getBundledTemplatePath(template)
    } else {
      templateSource = resolveTemplateSource(template)
    }
    
    // Process template with giget
    const { manifest } = await processTemplate({
      source: templateSource,
      dir,
      offline,
      variables: {
        projectName: name,
        description: `A CLI built with Bunli`,
        author: '',
        year: new Date().getFullYear().toString()
      }
    })
    
    spin.succeed('Project structure created')
    
    // Initialize git
    if (git) {
      const gitSpin = spinner('Initializing git repository...')
      gitSpin.start()
      
      try {
        await shell`cd ${dir} && git init`.quiet()
        await shell`cd ${dir} && git add .`.quiet()
        await shell`cd ${dir} && git commit -m "Initial commit"`.quiet()
        
        gitSpin.succeed('Git repository initialized')
      } catch (error) {
        gitSpin.fail('Failed to initialize git repository')
        console.error(colors.dim(`  ${error}`))
      }
    }
    
    // Install dependencies
    if (install) {
      const installSpin = spinner(`Installing dependencies...`)
      installSpin.start()
      
      try {
        await shell`cd ${dir} && bun install`
        
        installSpin.succeed('Dependencies installed')
      } catch (error) {
        installSpin.fail('Failed to install dependencies')
        console.error(colors.dim(`  You can install them manually by running: bun install`))
      }
    }
  } catch (error) {
    spin.fail('Failed to create project')
    console.error(colors.red(`Error: ${error}`))
    
    // Cleanup on failure
    try {
      await shell`rm -rf ${dir}`.quiet()
    } catch {}
    
    process.exit(1)
  }
}