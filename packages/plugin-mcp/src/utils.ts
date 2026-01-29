/**
 * Naming utilities for converting MCP tool names to CLI command names
 */

/**
 * Convert a string to kebab-case
 * Handles snake_case, camelCase, and PascalCase
 *
 * @example
 * toKebabCase('create_issue') // 'create-issue'
 * toKebabCase('createIssue') // 'create-issue'
 * toKebabCase('CreateIssue') // 'create-issue'
 */
export function toKebabCase(str: string): string {
  return str
    // Handle snake_case
    .replace(/_/g, '-')
    // Handle camelCase and PascalCase
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
}

/**
 * Convert MCP tool name to CLI command name
 * Applies toKebabCase and optionally adds namespace prefix
 *
 * @example
 * toCommandName('create_issue', 'linear') // 'linear:create-issue'
 * toCommandName('list-users') // 'list-users'
 */
export function toCommandName(toolName: string, namespace?: string): string {
  const kebabName = toKebabCase(toolName)
  return namespace ? `${namespace}:${kebabName}` : kebabName
}

/**
 * Convert MCP property name to CLI flag name
 * Uses kebab-case for consistency with CLI conventions
 *
 * @example
 * toFlagName('teamId') // 'team-id'
 * toFlagName('issue_priority') // 'issue-priority'
 */
export function toFlagName(propName: string): string {
  return toKebabCase(propName)
}

/**
 * Convert string to PascalCase
 * Handles kebab-case, snake_case, and namespaced names
 * Used for generating TypeScript variable names
 *
 * @example
 * toPascalCase('create-issue') // 'CreateIssue'
 * toPascalCase('create_issue') // 'CreateIssue'
 * toPascalCase('linear:list-users') // 'LinearListUsers'
 * toPascalCase('company_research_exa') // 'CompanyResearchExa'
 */
export function toPascalCase(str: string): string {
  return str
    .split(/[-:_]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')
}

/**
 * Convert kebab-case to camelCase
 * Used for generating TypeScript property names
 *
 * @example
 * toCamelCase('team-id') // 'teamId'
 * toCamelCase('issue-priority') // 'issuePriority'
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

/**
 * Escape string for use in TypeScript string literals
 */
export function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

/**
 * Generate a unique variable name from a command name
 * Ensures uniqueness by tracking used names
 */
export function generateUniqueVarName(
  commandName: string,
  usedNames: Set<string>
): string {
  let baseName = toPascalCase(commandName)
  let uniqueName = baseName
  let counter = 1

  while (usedNames.has(uniqueName)) {
    uniqueName = `${baseName}${counter}`
    counter++
  }

  usedNames.add(uniqueName)
  return uniqueName
}
