import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import { join, relative, extname } from 'node:path'
import type { CommandMetadata, OptionMetadata } from './types.js'

// Utility functions
function getCommandName(filePath: string, commandsDir: string): string {
  const relativePath = filePath.replace(commandsDir + '/', '')
  const withoutExt = relativePath.replace(/\.[^.]+$/, '')
  
  // Handle index files as parent commands
  if (withoutExt.endsWith('/index')) {
    return withoutExt.slice(0, -6) // Remove '/index'
  }
  
  return withoutExt
}

function getExportPath(filePath: string, commandsDir: string): string {
  const relativePath = filePath.replace(commandsDir + '/', '')
  const withoutExt = relativePath.replace(/\.[^.]+$/, '')
  return `./commands/${withoutExt}`
}

export async function parseCommand(
  filePath: string,
  commandsDir: string
): Promise<CommandMetadata | null> {
  try {
    // Use Bun's native file reading
    const file = Bun.file(filePath)
    const content = await file.text()
    
    // First, use Bun.Transpiler to quickly scan for defineCommand usage
    const transpiler = new Bun.Transpiler({ loader: 'tsx' })
    const scanResult = transpiler.scan(content)
    
    // Check if this file exports a command (look for defineCommand in exports)
    const hasCommandExport = scanResult.exports.some(exp => 
      exp.includes('defineCommand') || exp === 'default'
    )
    
    if (!hasCommandExport) {
      return null
    }
    
    // Use Babel for detailed parsing only if we found a command
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'decorators-legacy']
    })

    let commandMetadata: CommandMetadata | null = null

    traverse(ast, {
      CallExpression(path) {
        // Look for defineCommand calls
        if (
          path.node.callee.type === 'Identifier' &&
          path.node.callee.name === 'defineCommand'
        ) {
          const args = path.node.arguments
          if (args.length > 0 && args[0]?.type === 'ObjectExpression') {
            commandMetadata = extractCommandMetadata(
              args[0],
              filePath,
              commandsDir
            )
          }
        }
      }
    })

    return commandMetadata
  } catch (error) {
    console.warn(`Warning: Could not parse command file: ${filePath}`)
    return null
  }
}

function extractCommandMetadata(
  objectExpression: any,
  filePath: string,
  commandsDir: string
): CommandMetadata {
  const metadata: CommandMetadata = {
    name: '',
    description: '',
    filePath,
    exportPath: getExportPath(filePath, commandsDir)
  }

  // Extract properties from the object expression
  for (const prop of objectExpression.properties) {
    if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
      const key = prop.key.name
      const value = prop.value

      switch (key) {
        case 'name':
          if (value.type === 'StringLiteral') {
            metadata.name = value.value
          }
          break

        case 'description':
          if (value.type === 'StringLiteral') {
            metadata.description = value.value
          }
          break

        case 'alias':
          if (value.type === 'StringLiteral') {
            metadata.alias = value.value
          } else if (value.type === 'ArrayExpression') {
            metadata.alias = value.elements
              .filter((el: any) => el?.type === 'StringLiteral')
              .map((el: any) => el.value)
          }
          break

        case 'options':
          if (value.type === 'ObjectExpression') {
            metadata.options = extractOptions(value)
          }
          break

        case 'commands':
          if (value.type === 'ArrayExpression') {
            // Handle nested commands (for now, just store the structure)
            // This would need more complex parsing for full support
            metadata.commands = []
          }
          break
      }
    }
  }

  // If no name was found, derive it from the file path
  if (!metadata.name) {
    metadata.name = getCommandName(filePath, commandsDir)
  }

  return metadata
}

function extractOptions(objectExpression: any): Record<string, OptionMetadata> {
  const options: Record<string, OptionMetadata> = {}

  for (const prop of objectExpression.properties) {
    if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
      const optionName = prop.key.name
      const optionValue = prop.value

      // Look for option() calls
      if (
        optionValue.type === 'CallExpression' &&
        optionValue.callee.type === 'Identifier' &&
        optionValue.callee.name === 'option'
      ) {
        const args = optionValue.arguments
        if (args.length >= 1) {
          const schema = args[0]
          const metadata = args[1]?.type === 'ObjectExpression' ? args[1] : null

          options[optionName] = {
            type: inferSchemaType(schema),
            required: inferRequired(schema),
            default: inferDefault(schema),
            description: extractDescription(metadata),
            short: extractShort(metadata)
          }
        }
      }
    }
  }

  return options
}

function inferSchemaType(schema: any): string {
  // Try to infer the type from the schema
  if (schema.type === 'CallExpression') {
    const callee = schema.callee
    if (callee.type === 'MemberExpression') {
      // Handle cases like z.string(), z.number(), etc.
      if (callee.object.type === 'Identifier' && callee.object.name === 'z') {
        if (callee.property.type === 'Identifier') {
          return callee.property.name
        }
      }
    } else if (callee.type === 'Identifier') {
      // Handle cases like string(), number(), etc. (Valibot style)
      return callee.name
    }
  }

  return 'unknown'
}

function inferRequired(schema: any): boolean {
  // Check if the schema has .optional() or similar
  if (schema.type === 'CallExpression') {
    const callee = schema.callee
    if (callee.type === 'MemberExpression') {
      if (callee.property.type === 'Identifier') {
        return callee.property.name !== 'optional'
      }
    }
  }

  return true
}

function inferDefault(schema: any): any {
  // Try to extract default value from schema
  if (schema.type === 'CallExpression') {
    const callee = schema.callee
    if (callee.type === 'MemberExpression') {
      if (callee.property.type === 'Identifier') {
        if (callee.property.name === 'default') {
          const args = schema.arguments
          if (args.length > 0) {
            return extractLiteralValue(args[0])
          }
        }
      }
    }
  }

  return undefined
}

function extractDescription(metadata: any): string | undefined {
  if (!metadata) return undefined

  for (const prop of metadata.properties) {
    if (
      prop.type === 'ObjectProperty' &&
      prop.key.type === 'Identifier' &&
      prop.key.name === 'description' &&
      prop.value.type === 'StringLiteral'
    ) {
      return prop.value.value
    }
  }

  return undefined
}

function extractShort(metadata: any): string | undefined {
  if (!metadata) return undefined

  for (const prop of metadata.properties) {
    if (
      prop.type === 'ObjectProperty' &&
      prop.key.type === 'Identifier' &&
      prop.key.name === 'short' &&
      prop.value.type === 'StringLiteral'
    ) {
      return prop.value.value
    }
  }

  return undefined
}

function extractLiteralValue(node: any): any {
  switch (node.type) {
    case 'StringLiteral':
      return node.value
    case 'NumericLiteral':
      return node.value
    case 'BooleanLiteral':
      return node.value
    case 'NullLiteral':
      return null
    default:
      return undefined
  }
}
