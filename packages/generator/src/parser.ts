import { parse } from '@babel/parser'
const traverse = require('@babel/traverse').default
import path from 'node:path'
import { existsSync } from 'node:fs'
import { Result } from 'better-result'
import type { CommandMetadata, OptionMetadata } from './types.js'
import { createLogger } from '@bunli/core/utils'
import { ParseCommandError } from './errors.js'

const logger = createLogger('generator:parser')
const SUPPORTED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']

interface ParseContext {
  readonly sourceRoot: string
  readonly outputFile: string
  readonly cache: Map<string, Promise<Result<CommandMetadata | null, ParseCommandError>>>
  readonly inProgress: Set<string>
}

function toAbsolute(target: string): string {
  return path.isAbsolute(target) ? target : path.join(process.cwd() || '.', target)
}

function getCommandName(filePath: string, sourceRoot: string): string {
  const sourceRootAbsolute = toAbsolute(sourceRoot)
  const fileAbsolute = toAbsolute(filePath)
  const relativePath = path.relative(sourceRootAbsolute, fileAbsolute).replace(/\\/g, '/')
  const withoutExt = relativePath.replace(/\.[^.]+$/, '')

  if (withoutExt.endsWith('/index')) {
    return withoutExt.slice(0, -6)
  }

  return withoutExt
}

function getImportPath(filePath: string, outputFile: string): string {
  const commandAbsolute = toAbsolute(filePath)
  const outputAbsolute = toAbsolute(outputFile)
  const relativePath = path.relative(path.dirname(outputAbsolute), commandAbsolute).replace(/\\/g, '/')
  const withJsExt = relativePath.replace(/\.(ts|tsx)$/, '.js')

  if (withJsExt.startsWith('../') || withJsExt.startsWith('./')) {
    return withJsExt
  }
  return `./${withJsExt}`
}

function getExportPath(filePath: string): string {
  const fileAbsolute = toAbsolute(filePath)
  const cwdAbsolute = toAbsolute(process.cwd())
  const relativePath = path.relative(cwdAbsolute, fileAbsolute).replace(/\\/g, '/')
  const withoutExt = relativePath.replace(/\.[^.]+$/, '')
  return withoutExt.startsWith('.') ? withoutExt : `./${withoutExt}`
}

export async function parseCommand(
  filePath: string,
  sourceRoot: string,
  outputFile: string
): Promise<Result<CommandMetadata | null, ParseCommandError>> {
  const context: ParseContext = {
    sourceRoot,
    outputFile,
    cache: new Map(),
    inProgress: new Set()
  }

  return parseCommandWithContext(filePath, context)
}

async function parseCommandWithContext(
  filePath: string,
  context: ParseContext
): Promise<Result<CommandMetadata | null, ParseCommandError>> {
  const absoluteFilePath = toAbsolute(filePath)
  const cached = context.cache.get(absoluteFilePath)
  if (cached) return cached

  const work = parseCommandInternal(absoluteFilePath, context)
  context.cache.set(absoluteFilePath, work)
  return work
}

async function parseCommandInternal(
  filePath: string,
  context: ParseContext
): Promise<Result<CommandMetadata | null, ParseCommandError>> {
  if (context.inProgress.has(filePath)) {
    return Result.err(new ParseCommandError({
      filePath,
      message: `Circular command reference detected while parsing ${filePath}`,
      cause: new Error('Circular command reference')
    }))
  }
  context.inProgress.add(filePath)

  const parseResult = await Result.tryPromise({
    try: async () => {
      const content = await Bun.file(filePath).text()
      const transpiler = new Bun.Transpiler({ loader: 'tsx' })
      const scanResult = transpiler.scan(content)

      const hasCommandCall = content.includes('defineCommand(') || content.includes('defineGroup(')
      if (!hasCommandCall) {
        return null
      }

      const hasDefaultExport = scanResult.exports.includes('default')
      if (!hasDefaultExport) {
        throw new Error(
          `Command module must default-export a defineCommand(...) or defineGroup(...): ${filePath}`
        )
      }

      const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy']
      })

      const importMap = collectImportMap(ast, filePath)
      const variableInitializers = collectVariableInitializers(ast)
      const defaultExpr = findDefaultExportExpression(ast, variableInitializers)
      if (!defaultExpr) {
        throw new Error(
          `Default export in ${filePath} is not a command/group definition. Expected defineCommand(...) or defineGroup(...).`
        )
      }

      const commandObject = extractCommandObjectExpression(defaultExpr)
      if (!commandObject) {
        throw new Error(
          `Could not extract command metadata from default export in ${filePath}. Expected object literal in defineCommand(...) or defineGroup(...).`
        )
      }

      const metadata = await extractCommandMetadata(
        commandObject,
        filePath,
        context,
        importMap
      )

      if (!metadata.name) {
        metadata.name = getCommandName(filePath, context.sourceRoot)
      }

      return metadata
    },
    catch: (cause) =>
      new ParseCommandError({
        filePath,
        message: `Could not parse command file ${filePath}`,
        cause
      })
  })

  context.inProgress.delete(filePath)
  if (Result.isError(parseResult)) {
    logger.debug('Could not parse command file %s: %O', filePath, parseResult.error)
  }
  return parseResult
}

function collectVariableInitializers(ast: any): Map<string, any> {
  const bindings = new Map<string, any>()
  traverse(ast, {
    VariableDeclarator(path: any) {
      const id = path.node.id
      const init = path.node.init
      if (id?.type === 'Identifier' && init) {
        bindings.set(id.name, init)
      }
    }
  })
  return bindings
}

function findDefaultExportExpression(ast: any, variableInitializers: Map<string, any>): any | null {
  let result: any | null = null
  traverse(ast, {
    ExportDefaultDeclaration(path: any) {
      const declaration = path.node.declaration
      if (declaration?.type === 'Identifier') {
        result = variableInitializers.get(declaration.name) ?? null
        return
      }
      result = declaration
    }
  })
  return result
}

function extractCommandObjectExpression(node: any): any | null {
  if (!node) return null

  if (
    node.type === 'CallExpression' &&
    (
      (node.callee?.type === 'Identifier' &&
        (node.callee.name === 'defineCommand' || node.callee.name === 'defineGroup')) ||
      (node.callee?.type === 'MemberExpression' &&
        node.callee.property?.type === 'Identifier' &&
        (node.callee.property.name === 'defineCommand' || node.callee.property.name === 'defineGroup'))
    )
  ) {
    const arg0 = node.arguments?.[0]
    if (arg0?.type === 'ObjectExpression') return arg0
  }

  return null
}

function collectImportMap(ast: any, filePath: string): Map<string, string> {
  const importMap = new Map<string, string>()

  traverse(ast, {
    ImportDeclaration(path: any) {
      const source = path.node.source?.value
      if (typeof source !== 'string' || !source.startsWith('.')) return

      const resolved = resolveImportPath(filePath, source)
      if (!resolved) return

      for (const specifier of path.node.specifiers) {
        if (specifier?.local?.name) {
          importMap.set(specifier.local.name, resolved)
        }
      }
    }
  })

  return importMap
}

function resolveImportPath(fromFile: string, specifier: string): string | null {
  const base = path.resolve(path.dirname(fromFile), specifier)
  const ext = path.extname(base)
  const candidates: string[] = []

  if (ext) {
    candidates.push(base)
    if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
      const stem = base.slice(0, -ext.length)
      for (const supported of SUPPORTED_EXTENSIONS) {
        candidates.push(`${stem}${supported}`)
      }
    }
  } else {
    for (const supported of SUPPORTED_EXTENSIONS) {
      candidates.push(`${base}${supported}`)
    }
    for (const supported of SUPPORTED_EXTENSIONS) {
      candidates.push(path.join(base, `index${supported}`))
    }
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

async function extractCommandMetadata(
  objectExpression: any,
  filePath: string,
  context: ParseContext,
  importMap: Map<string, string>
): Promise<CommandMetadata> {
  const metadata: CommandMetadata = {
    name: '',
    description: '',
    filePath,
    importPath: getImportPath(filePath, context.outputFile),
    exportPath: getExportPath(filePath)
  }

  for (const prop of objectExpression.properties) {
    if (prop.type !== 'ObjectProperty' || prop.key.type !== 'Identifier') continue

    const key = prop.key.name
    const value = prop.value

    switch (key) {
      case 'name':
        metadata.name = extractNameValue(value) ?? ''
        break
      case 'description':
        if (value.type === 'StringLiteral') metadata.description = value.value
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
        metadata.commands = await extractNestedCommands(value, filePath, context, importMap)
        break
    }
  }

  return metadata
}

async function extractNestedCommands(
  value: any,
  parentFile: string,
  context: ParseContext,
  importMap: Map<string, string>
): Promise<CommandMetadata[] | undefined> {
  if (value.type !== 'ArrayExpression') return undefined

  const nested: CommandMetadata[] = []

  for (const element of value.elements) {
    if (!element) continue

    if (element.type === 'ObjectExpression') {
      const nestedMetadata = await extractCommandMetadata(
        element,
        parentFile,
        context,
        importMap
      )
      if (!nestedMetadata.name) {
        nestedMetadata.name = getCommandName(parentFile, context.sourceRoot)
      }
      nested.push(nestedMetadata)
      continue
    }

    if (element.type === 'Identifier') {
      const importedPath = importMap.get(element.name)
      if (!importedPath) continue
      const nestedResult = await parseCommandWithContext(importedPath, context)
      if (Result.isError(nestedResult)) {
        throw nestedResult.error
      }
      if (nestedResult.value) {
        nested.push(nestedResult.value)
      }
      continue
    }

    if (element.type === 'CallExpression') {
      const nestedObject = extractCommandObjectExpression(element)
      if (nestedObject) {
        const nestedMetadata = await extractCommandMetadata(
          nestedObject,
          parentFile,
          context,
          importMap
        )
        if (nestedMetadata.name) nested.push(nestedMetadata)
      }
    }
  }

  return nested.length > 0 ? nested : undefined
}

function extractOptions(objectExpression: any): Record<string, OptionMetadata> {
  const options: Record<string, OptionMetadata> = {}

  for (const prop of objectExpression.properties) {
    if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
      const optionName = prop.key.name
      const optionValue = prop.value

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
          const enumValues = extractEnumValues(schema)
          const constraints = extractConstraints(schema)
          const description = extractDescription(metadata)
          const fileType = detectFileType(metadata, description)

          options[optionName] = {
            type,
            required: inferRequired(schema),
            hasDefault: defaultInfo.hasDefault,
            default: defaultInfo.value,
            description,
            short: extractShort(metadata),
            enumValues,
            ...constraints,
            fileType,
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
  if (schema.type === 'CallExpression') {
    const callee = schema.callee
    if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
      if (callee.property.name === 'default' || callee.property.name === 'catch') {
        const args = schema.arguments
        if (args.length > 0) {
          return { hasDefault: true, value: extractLiteralValue(args[0]) }
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
      if (object && property) return { type: `${object}.${property}` }
      return { type: object || 'unknown' }
    }
    default:
      return { type: 'unknown' }
  }
}

function inferRequired(schema: any): boolean {
  if (schema.type === 'CallExpression') {
    const callee = schema.callee
    if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
      return callee.property.name !== 'optional'
    }
  }
  return true
}

function extractSchemaDefinition(schema: any): any {
  if (!schema) return null

  switch (schema.type) {
    case 'CallExpression': {
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

function generateValidator(schema: any): string {
  if (!schema) return '() => true'
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

function extractEnumValues(schema: any): (string | number)[] | undefined {
  if (!schema) return undefined

  if (schema.type === 'CallExpression') {
    const callee = schema.callee

    if (
      callee.type === 'MemberExpression' &&
      callee.property?.type === 'Identifier' &&
      callee.property.name === 'enum'
    ) {
      const args = schema.arguments
      if (args[0]?.type === 'ArrayExpression') {
        const values = args[0].elements
          .filter((el: any) => el?.type === 'StringLiteral' || el?.type === 'NumericLiteral')
          .map((el: any) => el.value)
        return values.length > 0 ? values : undefined
      }
    }

    if (
      callee.type === 'MemberExpression' &&
      callee.property?.type === 'Identifier' &&
      callee.property.name === 'literal'
    ) {
      const args = schema.arguments
      if (args[0]) {
        const value = extractLiteralValue(args[0])
        return value !== undefined ? [value] : undefined
      }
    }

    if (callee.type === 'MemberExpression') {
      const fromObject = extractEnumValues(callee.object)
      if (fromObject) return fromObject
    }

    if (callee.type === 'CallExpression') {
      const fromCallee = extractEnumValues(callee)
      if (fromCallee) return fromCallee
    }
  }

  return undefined
}

function extractConstraints(schema: any): Partial<OptionMetadata> {
  const constraints: Partial<OptionMetadata> = {}
  if (!schema) return constraints

  if (schema.type === 'CallExpression') {
    const callee = schema.callee

    if (callee.type === 'MemberExpression' && callee.property?.type === 'Identifier') {
      const methodName = callee.property.name
      const args = schema.arguments

      switch (methodName) {
        case 'min': {
          const value = args[0] ? extractLiteralValue(args[0]) : undefined
          if (typeof value === 'number') {
            constraints.min = value
            constraints.minLength = value
          }
          break
        }
        case 'max': {
          const value = args[0] ? extractLiteralValue(args[0]) : undefined
          if (typeof value === 'number') {
            constraints.max = value
            constraints.maxLength = value
          }
          break
        }
        case 'regex':
          if (args[0]?.type === 'RegExpLiteral') {
            constraints.pattern = args[0].pattern
          } else if (
            args[0]?.type === 'NewExpression' &&
            args[0].callee?.type === 'Identifier' &&
            args[0].callee.name === 'RegExp' &&
            args[0].arguments[0]?.type === 'StringLiteral'
          ) {
            constraints.pattern = args[0].arguments[0].value
          }
          break
        case 'transform':
          constraints.isTransform = true
          break
        case 'refine':
          constraints.isRefine = true
          break
        case 'array':
          constraints.isArray = true
          break
        case 'literal':
          if (args[0]) constraints.literalValue = extractLiteralValue(args[0])
          break
      }

      if (callee.object) {
        const parentConstraints = extractConstraints(callee.object)
        for (const key of Object.keys(parentConstraints) as Array<keyof OptionMetadata>) {
          if (!(key in constraints)) {
            const value = parentConstraints[key]
            if (value !== undefined) constraints[key] = value
          }
        }
      }
    }
  }

  return constraints
}

function detectFileType(optionConfig: any, description?: string): 'file' | 'directory' | 'path' | undefined {
  if (optionConfig?.type === 'ObjectExpression') {
    for (const prop of optionConfig.properties) {
      if (prop.key?.name === 'fileType' && prop.value?.type === 'StringLiteral') {
        const value = prop.value.value
        if (value === 'file' || value === 'directory' || value === 'path') {
          return value
        }
      }
    }
  }

  if (description) {
    const lowerDesc = description.toLowerCase()
    if (lowerDesc.includes('directory') || lowerDesc.includes('folder') || lowerDesc.includes('dir')) {
      return 'directory'
    }
    if (
      lowerDesc.includes('file path') ||
      lowerDesc.includes('file name') ||
      lowerDesc.includes('config file') ||
      lowerDesc.includes('output file') ||
      lowerDesc.includes('input file')
    ) {
      return 'file'
    }
    if (lowerDesc.includes(' path') || lowerDesc.includes('filepath')) {
      return 'path'
    }
  }

  return undefined
}
