import { Glob } from 'bun'
import path from 'node:path'

export interface GlobOptions {
  include?: string[]
  exclude?: string[]
}

export async function glob(patterns: string[], options: GlobOptions = {}): Promise<string[]> {
  const { include = [], exclude = [] } = options
  
  // Combine user patterns with include patterns
  const allPatterns = [...patterns, ...include]
  
  // Convert exclude patterns to absolute paths
  const excludePatterns = exclude.map(pattern => {
    if (pattern.startsWith('/')) {
      return pattern
    }
    return path.join(process.cwd(), pattern)
  })
  
  const results = new Set<string>()
  
  for (const pattern of allPatterns) {
    const glob = new Glob(pattern)
    
    for await (const file of glob.scan({
      cwd: process.cwd(),
      absolute: true
    })) {
      // Check if file should be excluded
      let shouldExclude = false
      
      for (const excludePattern of excludePatterns) {
        if (file.includes(excludePattern)) {
          shouldExclude = true
          break
        }
      }
      
      if (!shouldExclude) {
        results.add(file)
      }
    }
  }
  
  return Array.from(results).sort()
}