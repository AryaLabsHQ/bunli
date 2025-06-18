import { downloadTemplate } from 'giget'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { TemplateManifest } from './types.js'

export interface TemplateOptions {
  source: string
  type?: 'github' | 'npm' | 'local' | 'bundled'
  dir: string
  offline?: boolean
  variables?: Record<string, string>
}

/**
 * Download and process a template
 */
export async function processTemplate(options: TemplateOptions) {
  const { source, dir, offline, variables = {} } = options
  
  let templateDir: string
  
  // Check if source is a local directory
  if (source.startsWith('/') || source.startsWith('./') || source.startsWith('../')) {
    // For local directories, copy directly
    const sourceDir = source.startsWith('/') ? source : join(process.cwd(), source)
    
    // Copy template files to destination
    await Bun.spawn(['cp', '-r', sourceDir + '/.', dir], {
      stdout: 'inherit',
      stderr: 'inherit'
    }).exited
    
    templateDir = dir
  } else {
    // Download template using giget for remote sources
    const result = await downloadTemplate(source, {
      dir,
      offline,
      preferOffline: true,
      force: true
    })
    templateDir = result.dir
  }
  
  // Load template manifest if exists
  const manifest = await loadTemplateManifest(templateDir)
  
  // Process template files with variables
  if (manifest?.files || Object.keys(variables).length > 0) {
    await processTemplateFiles(templateDir, variables, manifest)
  }
  
  // Run post-install hooks if defined
  if (manifest?.hooks?.postInstall) {
    await runPostInstallHooks(templateDir, manifest.hooks.postInstall)
  }
  
  return { dir: templateDir, manifest }
}

/**
 * Load template manifest (template.json or .template.json)
 */
async function loadTemplateManifest(dir: string): Promise<TemplateManifest | null> {
  const possiblePaths = [
    join(dir, 'template.json'),
    join(dir, '.template.json'),
    join(dir, 'template.yaml'),
    join(dir, '.template.yaml')
  ]
  
  for (const path of possiblePaths) {
    const file = Bun.file(path)
    if (await file.exists()) {
      const content = await file.text()
      
      // Parse based on extension
      if (path.endsWith('.json')) {
        const manifest = JSON.parse(content)
        // Remove the manifest file after reading
        try {
          await Bun.spawn(['rm', '-f', path], {
            stdout: 'ignore',
            stderr: 'ignore'
          }).exited
        } catch {
          // Ignore removal errors
        }
        return manifest
      }
      // TODO: Add YAML support if needed
    }
  }
  
  return null
}

/**
 * Process template files with variable substitution
 */
async function processTemplateFiles(
  dir: string,
  variables: Record<string, string>,
  manifest?: TemplateManifest | null
) {
  const files = await getFilesToProcess(dir, manifest)
  
  for (const file of files) {
    const filePath = join(dir, file)
    const content = await Bun.file(filePath).text()
    
    // Replace variables in content
    let processedContent = content
    for (const [key, value] of Object.entries(variables)) {
      // Support multiple variable formats
      processedContent = processedContent
        .replaceAll(`{{${key}}}`, value)          // Handlebars style
        .replaceAll(`<%= ${key} %>`, value)       // EJS style
        .replaceAll(`$${key}`, value)             // Shell style
        .replaceAll(`__${key}__`, value)          // Python style
    }
    
    // Handle file renaming (e.g., __projectName__.json -> actual-name.json)
    let newFilePath = filePath
    for (const [key, value] of Object.entries(variables)) {
      newFilePath = newFilePath.replaceAll(`__${key}__`, value)
    }
    
    // Write processed content
    await Bun.write(newFilePath, processedContent)
    
    // Remove original if renamed
    if (newFilePath !== filePath) {
      await Bun.spawn(['rm', filePath]).exited
    }
  }
}

/**
 * Get list of files to process based on manifest or all files
 */
async function getFilesToProcess(dir: string, manifest?: TemplateManifest | null): Promise<string[]> {
  if (manifest?.files?.include) {
    return manifest.files.include
  }
  
  // Get all files recursively
  const files: string[] = []
  
  async function walk(currentDir: string, prefix = '') {
    const entries = await readdir(currentDir, { withFileTypes: true })
    
    for (const entry of entries) {
      const path = join(prefix, entry.name)
      
      if (entry.isDirectory()) {
        // Skip node_modules and .git
        if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) {
          await walk(join(currentDir, entry.name), path)
        }
      } else {
        // Skip manifest files and common ignore patterns
        if (!path.match(/^(template\.json|\.template\.json|\.DS_Store|Thumbs\.db)$/)) {
          files.push(path)
        }
      }
    }
  }
  
  await walk(dir)
  return files
}

/**
 * Run post-install hooks
 */
async function runPostInstallHooks(dir: string, hooks: string[]) {
  for (const hook of hooks) {
    // Safe command execution in the template directory
    const proc = Bun.spawn(hook.split(' '), {
      cwd: dir,
      stdout: 'inherit',
      stderr: 'inherit'
    })
    await proc.exited
  }
}

/**
 * Resolve template source to giget-compatible format
 */
export function resolveTemplateSource(template: string): string {
  // Handle special cases
  const specialTemplates: Record<string, string> = {
    'basic': 'github:bunli/templates/basic',
    'advanced': 'github:bunli/templates/advanced',
    'monorepo': 'github:bunli/templates/monorepo'
  }
  
  if (specialTemplates[template]) {
    return specialTemplates[template]
  }
  
  // Handle different formats
  if (template.startsWith('npm:')) {
    return template.replace('npm:', 'npm:/')
  }
  
  if (template.includes('/') && !template.includes(':')) {
    // Assume GitHub
    return `github:${template}`
  }
  
  // Return as-is for other formats
  return template
}

/**
 * Get bundled template path
 */
export function getBundledTemplatePath(name: string): string {
  return join(import.meta.dir, '..', 'templates', name)
}

/**
 * Check if template exists locally (for development)
 */
export async function isLocalTemplate(template: string): Promise<boolean> {
  if (template.startsWith('file:') || template.startsWith('./') || template.startsWith('../')) {
    return true
  }
  
  // Check if it's a bundled template
  const bundledPath = getBundledTemplatePath(template)
  return await Bun.file(join(bundledPath, 'package.json')).exists()
}