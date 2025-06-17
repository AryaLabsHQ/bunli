export function formatTable(data: Record<string, any>[]): string {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const rows = data.map(item => headers.map(h => String(item[h] ?? '')))
  
  // Calculate column widths
  const widths = headers.map((h, i) => {
    const headerWidth = h.length
    const maxDataWidth = Math.max(...rows.map(r => r[i].length))
    return Math.max(headerWidth, maxDataWidth)
  })
  
  // Build table
  const lines: string[] = []
  
  // Header
  lines.push(headers.map((h, i) => h.padEnd(widths[i])).join('  '))
  lines.push(widths.map(w => '-'.repeat(w)).join('  '))
  
  // Rows
  for (const row of rows) {
    lines.push(row.map((cell, i) => cell.padEnd(widths[i])).join('  '))
  }
  
  return lines.join('\\n')
}