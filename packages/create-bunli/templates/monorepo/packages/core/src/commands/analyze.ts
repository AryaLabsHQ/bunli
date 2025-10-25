import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { logger, formatTable } from '@{{name}}/utils'
import type { AnalyzeResult } from '../types.js'

const analyzeCommand = defineCommand({
  name: 'analyze',
  description: 'Analyze files and generate reports',
  args: z.array(z.string()).min(1).describe('Files to analyze'),
  options: {
    detailed: option(
      z.boolean().default(false),
      {
        short: 'd',
        description: 'Show detailed analysis'
      }
    )
  },
  handler: async ({ args, flags, colors }) => {
    logger.info('Starting analysis...')
    
    const results: AnalyzeResult[] = []
    
    for (const file of args) {
      try {
        const result = await analyzeFile(file)
        results.push(result)
      } catch (error) {
        logger.error(`Failed to analyze ${file}:`, error)
      }
    }
    
    // Display results
    console.log()
    console.log(colors.bold('Analysis Results:'))
    console.log()
    
    const tableData = results.map(r => ({
      File: r.file,
      Lines: r.metrics.lines,
      Words: r.metrics.words,
      Issues: r.issues.length
    }))
    
    console.log(formatTable(tableData))
    
    if (flags.detailed) {
      console.log()
      console.log(colors.bold('Detailed Issues:'))
      
      for (const result of results) {
        if (result.issues.length > 0) {
          console.log()
          console.log(colors.underline(result.file))
          
          for (const issue of result.issues) {
            const icon = issue.type === 'error' ? '✗' :
                        issue.type === 'warning' ? '⚠' : 'ℹ'
            const color = issue.type === 'error' ? colors.red :
                         issue.type === 'warning' ? colors.yellow : colors.blue
            
            console.log(color(`  ${icon} ${issue.line}:${issue.column} ${issue.message}`))
          }
        }
      }
    }
  }
})

async function analyzeFile(file: string): Promise<AnalyzeResult> {
  const content = await Bun.file(file).text()
  const lines = content.split('\n')
  const words = content.split(/\\s+/).filter(w => w.length > 0)
  
  return {
    file,
    metrics: {
      lines: lines.length,
      characters: content.length,
      words: words.length
    },
    issues: []
  }
}

export default analyzeCommand