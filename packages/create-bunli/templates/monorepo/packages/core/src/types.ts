export interface ProcessOptions {
  input: string
  output?: string
  format?: 'json' | 'yaml' | 'text'
  verbose?: boolean
}

export interface AnalyzeResult {
  file: string
  metrics: {
    lines: number
    characters: number
    words: number
  }
  issues: Array<{
    type: 'error' | 'warning' | 'info'
    line: number
    column: number
    message: string
  }>
}