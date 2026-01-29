import { describe, expect, test } from 'bun:test'
import {
  toKebabCase,
  toCommandName,
  toFlagName,
  toPascalCase,
  toCamelCase,
  escapeString,
  generateUniqueVarName
} from '../src/utils.js'

describe('toKebabCase', () => {
  test('converts snake_case', () => {
    expect(toKebabCase('create_issue')).toBe('create-issue')
    expect(toKebabCase('list_all_users')).toBe('list-all-users')
  })

  test('converts camelCase', () => {
    expect(toKebabCase('createIssue')).toBe('create-issue')
    expect(toKebabCase('listAllUsers')).toBe('list-all-users')
  })

  test('converts PascalCase', () => {
    expect(toKebabCase('CreateIssue')).toBe('create-issue')
    expect(toKebabCase('ListAllUsers')).toBe('list-all-users')
  })

  test('handles already kebab-case', () => {
    expect(toKebabCase('create-issue')).toBe('create-issue')
    expect(toKebabCase('list-all-users')).toBe('list-all-users')
  })

  test('handles single words', () => {
    expect(toKebabCase('search')).toBe('search')
    expect(toKebabCase('SEARCH')).toBe('search')
  })
})

describe('toCommandName', () => {
  test('converts tool name without namespace', () => {
    expect(toCommandName('create_issue')).toBe('create-issue')
    expect(toCommandName('listUsers')).toBe('list-users')
  })

  test('adds namespace prefix', () => {
    expect(toCommandName('create_issue', 'linear')).toBe('linear:create-issue')
    expect(toCommandName('listUsers', 'github')).toBe('github:list-users')
  })
})

describe('toFlagName', () => {
  test('converts camelCase to kebab-case', () => {
    expect(toFlagName('teamId')).toBe('team-id')
    expect(toFlagName('issueTitle')).toBe('issue-title')
  })

  test('converts snake_case to kebab-case', () => {
    expect(toFlagName('team_id')).toBe('team-id')
    expect(toFlagName('issue_title')).toBe('issue-title')
  })
})

describe('toPascalCase', () => {
  test('converts kebab-case', () => {
    expect(toPascalCase('create-issue')).toBe('CreateIssue')
    expect(toPascalCase('list-all-users')).toBe('ListAllUsers')
  })

  test('handles namespaced commands', () => {
    expect(toPascalCase('linear:create-issue')).toBe('LinearCreateIssue')
    expect(toPascalCase('github:list-repos')).toBe('GithubListRepos')
  })
})

describe('toCamelCase', () => {
  test('converts kebab-case', () => {
    expect(toCamelCase('team-id')).toBe('teamId')
    expect(toCamelCase('issue-title')).toBe('issueTitle')
  })

  test('starts with lowercase', () => {
    expect(toCamelCase('Create-issue')).toBe('createIssue')
  })
})

describe('escapeString', () => {
  test('escapes single quotes', () => {
    expect(escapeString("it's")).toBe("it\\'s")
  })

  test('escapes double quotes', () => {
    expect(escapeString('say "hello"')).toBe('say \\"hello\\"')
  })

  test('escapes backslashes', () => {
    expect(escapeString('path\\to\\file')).toBe('path\\\\to\\\\file')
  })

  test('escapes newlines and tabs', () => {
    expect(escapeString('line1\nline2')).toBe('line1\\nline2')
    expect(escapeString('col1\tcol2')).toBe('col1\\tcol2')
  })
})

describe('generateUniqueVarName', () => {
  test('generates PascalCase name', () => {
    const usedNames = new Set<string>()
    expect(generateUniqueVarName('create-issue', usedNames)).toBe('CreateIssue')
  })

  test('adds suffix for duplicates', () => {
    const usedNames = new Set(['CreateIssue'])
    expect(generateUniqueVarName('create-issue', usedNames)).toBe('CreateIssue1')
  })

  test('increments suffix for multiple duplicates', () => {
    const usedNames = new Set(['CreateIssue', 'CreateIssue1', 'CreateIssue2'])
    expect(generateUniqueVarName('create-issue', usedNames)).toBe('CreateIssue3')
  })

  test('tracks used names', () => {
    const usedNames = new Set<string>()
    generateUniqueVarName('create-issue', usedNames)
    expect(usedNames.has('CreateIssue')).toBe(true)
  })
})
