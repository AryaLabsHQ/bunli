import { parse } from '@babel/parser'
const traverse = require('@babel/traverse').default
import path from 'node:path'
import type { CommandMetadata, OptionMetadata } from './types.js'

// Utility functions
function getCommandName(filePath: string, commandsDir: string): string {
  const dir = commandsDir.replace(/^\.\/?/, '')
  const relativePath = filePath.replace(dir + '/', '')
  const withoutExt = relativePath.replace(/\.[^.]+$/, '')
  
  if (withoutExt.endsWith('/index')) {
    return withoutExt.slice(0, -6)
  }
  
  return withoutExt
}

function toAbsolute(target: string): string {
  return path.isAbsolute(target) ? target : path.join(process.cwd() || '.', target)
}

function getImportPath(filePath: string, outputFile: string): string {
  const commandAbsolute = toAbsolute(filePath)
  const outputAbsolute = toAbsolute(outputFile)
  const relativePath = path.relative(path.dirname(outputAbsolute), commandAbsolute)
  const normalized = relativePath.replace(/\\/g, '/')
  
  // Convert .ts extension to .js for ESM imports
  const withJsExt = normalized.replace(/\.ts$/, '.js')
  
  if (withJsExt.startsWith('../') || withJsExt.startsWith('./')) {
    return withJsExt
  }
  return `./${withJsExt}`
}

function getExportPath(filePath: string, commandsDir: string, outputFile: string): string {
  const commandsRoot = toAbsolute(commandsDir)
  const commandAbsolute = toAbsolute(filePath)
  const relativePath = path.relative(commandsRoot, commandAbsolute).replace(/\\/g, '/')
  const withoutExt = relativePath.replace(/\.[^.]+$/, '')

  const cleanedCommandsDir = commandsDir.replace(/^\.\/?/, '')
  const base = cleanedCommandsDir ? `../${cleanedCommandsDir}` : '..'
  const result = `${base}/${withoutExt}`
  return result.startsWith('./') ? result.slice(2) : result
}

export async function parseCommand(
  filePath: string,
  commandsDir: string,
  outputFile: string
): Promise<CommandMetadata | null> {
  try {
    // Use Bun's native file reading
    const file = Bun.file(filePath)
    const content = await file.text()
    
    // First, use Bun.Transpiler to quickly scan for defineCommand usage
    const transpiler = new Bun.Transpiler({ loader: 'tsx' })
    const scanResult = transpiler.scan(content)
    
    // Check if this file exports a command (look for Command in exports or defineCommand usage)
    const hasCommandExport = scanResult.exports.some(exp => 
      exp.includes('Command') || exp === 'default'
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
      CallExpression(path: any) {
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
              commandsDir,
              outputFile
            )
          }
        } else if (
          path.node.callee.type === 'MemberExpression' &&
          path.node.callee.property.type === 'Identifier' &&
          path.node.callee.property.name === 'defineCommand'
        ) {
          const args = path.node.arguments
          if (args.length > 0 && args[0]?.type === 'ObjectExpression') {
            commandMetadata = extractCommandMetadata(
              args[0],
              filePath,
              commandsDir,
              outputFile
            )
          }
        }
      }
    })

    return commandMetadata
  } catch (error) {
    console.warn(`Warning: Could not parse command file: ${filePath}`)
    console.warn(`Error:`, error)
    if (error instanceof Error) {
      console.warn(`Stack:`, error.stack)
    }
    return null
  }
}

function extractCommandMetadata(
  objectExpression: any,
  filePath: string,
  commandsDir: string,
  outputFile: string
): CommandMetadata {
  const metadata: CommandMetadata = {
    name: '',
    description: '',
    filePath,
    importPath: getImportPath(filePath, outputFile),
    exportPath: getExportPath(filePath, commandsDir, outputFile)
  }

  // Extract properties from the object expression
  for (const prop of objectExpression.properties) {
    if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
      const key = prop.key.name
      const value = prop.value

      switch (key) {
        case 'name':
          metadata.name = extractNameValue(value) ?? ''
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

        case 'handler':
          metadata.hasHandler = true
          break

        case 'render':
          metadata.hasRender = true
          break

        case 'commands':
          metadata.commands = extractNestedCommands(value, filePath, commandsDir, outputFile)
          break
      }
    }
  }

  // Always use the file path as the source of truth for command names
  // This ensures nested commands like 'docker/clean' are properly named
  metadata.name = getCommandName(filePath, commandsDir)

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

          const { type } = inferSchemaType(schema)
          const defaultInfo = inferDefault(schema)

          options[optionName] = {
            type,
            required: inferRequired(schema),
            hasDefault: defaultInfo.hasDefault,
            default: defaultInfo.value,
            description: extractDescription(metadata),
            short: extractShort(metadata),
            // NEW: Enhanced schema information
            schema: extractSchemaDefinition(schema),
            validator: generateValidator(schema)
          }
        }
      }
    }
  }

  return options
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
            return { hasDefault: true, value: extractLiteralValue(args[0]) }
          }
        }
        if (callee.property.name === 'catch') {
          const args = schema.arguments
          if (args.length > 0) {
            return { hasDefault: true, value: extractLiteralValue(args[0]) }
          }
        }
      }
    }
  }

  return { hasDefault: false, value: undefined }
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

function extractNameValue(node: any): string | undefined {
  if (!node) return undefined
  if (node.type === 'StringLiteral') return node.value
  if (node.type === 'TemplateLiteral' && node.quasis.length === 1) {
    return node.quasis[0]?.value?.cooked
  }
  if (node.type === 'Identifier' && typeof node.name === 'string') {
    return node.name
  }
  return undefined
}

function inferSchemaType(schema: any): { type: string } {
  if (!schema) return { type: 'unknown' }

  switch (schema.type) {
    case 'Identifier':
      return { type: schema.name }
    case 'StringLiteral':
      return { type: schema.value }
    case 'CallExpression':
      return inferSchemaType(schema.callee)
    case 'MemberExpression': {
      const object = inferSchemaType(schema.object).type
      const property = schema.property?.name
      if (object && property) {
        return { type: `${object}.${property}` }
      }
      return { type: object || 'unknown' }
    }
    default:
      return { type: 'unknown' }
  }
}

function extractNestedCommands(value: any, parentFile: string, commandsDir: string, outputFile: string): CommandMetadata[] | undefined {
  if (value.type !== 'ArrayExpression') return undefined
  const nested: CommandMetadata[] = []
  for (const element of value.elements) {
    if (element?.type === 'ObjectExpression') {
      const nestedMetadata = extractCommandMetadata(element, parentFile, commandsDir, outputFile)
      if (nestedMetadata.name) nested.push(nestedMetadata)
    }
  }
  return nested.length ? nested : undefined
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

/**
 * Extract detailed schema definition for runtime introspection
 */
function extractSchemaDefinition(schema: any): any {
  if (!schema) return null

  switch (schema.type) {
    case 'CallExpression':
      const callee = schema.callee
      if (callee.type === 'MemberExpression') {
        return {
          type: 'zod',
          method: callee.property?.name || 'unknown',
          args: schema.arguments?.map((arg: any) => extractSchemaDefinition(arg)) || []
        }
      }
      return {
        type: 'zod',
        method: callee.name || 'unknown',
        args: schema.arguments?.map((arg: any) => extractSchemaDefinition(arg)) || []
      }
    
    case 'MemberExpression':
      return {
        type: 'zod',
        object: extractSchemaDefinition(schema.object),
        property: schema.property?.name || 'unknown'
      }
    
    case 'Identifier':
      return {
        type: 'zod',
        name: schema.name
      }
    
    case 'StringLiteral':
      return {
        type: 'literal',
        value: schema.value
      }
    
    default:
      return {
        type: 'unknown',
        raw: schema
      }
  }
}

/**
 * Generate a runtime validator function for the schema
 */
function generateValidator(schema: any): string {
  if (!schema) return '() => true'
  
  // Generate a simple validator based on the schema type
  const { type } = inferSchemaType(schema)
  
  switch (type) {
    case 'string':
      return '(val) => typeof val === "string"'
    case 'number':
      return '(val) => typeof val === "number"'
    case 'boolean':
      return '(val) => typeof val === "boolean"'
    case 'array':
      return '(val) => Array.isArray(val)'
    case 'object':
      return '(val) => typeof val === "object" && val !== null'
    default:
      return '(val) => true'
  }
}

