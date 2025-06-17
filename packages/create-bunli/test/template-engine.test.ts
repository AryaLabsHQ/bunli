import { test, expect } from 'bun:test'
import { resolveTemplateSource, isLocalTemplate, getBundledTemplatePath } from '../src/template-engine.js'
import { join } from 'node:path'

test('resolveTemplateSource - handles special templates', () => {
  expect(resolveTemplateSource('basic')).toBe('github:bunli/templates/basic')
  expect(resolveTemplateSource('advanced')).toBe('github:bunli/templates/advanced')
  expect(resolveTemplateSource('monorepo')).toBe('github:bunli/templates/monorepo')
})

test('resolveTemplateSource - handles github shortcuts', () => {
  expect(resolveTemplateSource('user/repo')).toBe('github:user/repo')
  expect(resolveTemplateSource('org/repo/subdir')).toBe('github:org/repo/subdir')
})

test('resolveTemplateSource - preserves full URLs', () => {
  expect(resolveTemplateSource('github:user/repo')).toBe('github:user/repo')
  expect(resolveTemplateSource('gitlab:user/repo')).toBe('gitlab:user/repo')
  expect(resolveTemplateSource('npm:package-name')).toBe('npm:/package-name')
})

test('isLocalTemplate - detects local templates', async () => {
  expect(await isLocalTemplate('file:./template')).toBe(true)
  expect(await isLocalTemplate('./my-template')).toBe(true)
  expect(await isLocalTemplate('../templates/basic')).toBe(true)
  expect(await isLocalTemplate('github:user/repo')).toBe(false)
})

test('getBundledTemplatePath - returns correct paths', () => {
  const basicPath = getBundledTemplatePath('basic')
  expect(basicPath).toContain('templates/basic')
  expect(basicPath).toContain('create-bunli')
})