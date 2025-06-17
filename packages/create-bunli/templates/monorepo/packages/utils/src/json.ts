export function parseJSON<T = any>(text: string): T {
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`Invalid JSON: ${error}`)
  }
}

export function stringifyJSON(data: any, pretty = false): string {
  return JSON.stringify(data, null, pretty ? 2 : 0)
}