import { expect, test } from 'bun:test'
import { defineCommand } from '@bunli/core'
import { generateCommandSkill, generateSkillFile } from '../src/generate.js'

function createCommands() {
  const hello = defineCommand({
    name: 'hello',
    description: 'Say "hello": safely',
    handler: async () => {}
  })

  return new Map([
    ['hello', hello]
  ])
}

test('generateSkillFile emits minimal YAML-safe frontmatter', () => {
  const content = generateSkillFile('demo cli', createCommands(), {
    description: 'Review "quoted": values safely'
  })

  expect(content).toContain('---\nname: demo-cli\ndescription: "Review \\"quoted\\": values safely"\n---')
  expect(content).not.toContain('requires_bin:')
  expect(content).not.toContain('command:')
})

test('generateCommandSkill emits YAML-safe description frontmatter', () => {
  const command = defineCommand({
    name: 'doctor',
    description: 'Check "doctor": output',
    handler: async () => {}
  })

  const content = generateCommandSkill('demo cli', 'doctor', command)

  expect(content).toContain('name: demo-cli-doctor')
  expect(content).toContain('description: "Check \\"doctor\\": output"')
  expect(content).not.toContain('requires_bin:')
  expect(content).not.toContain('command:')
})
