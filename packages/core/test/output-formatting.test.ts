import { expect, test } from 'bun:test'
import { format } from '../src/output/index.js'

test('yaml formatting does not keep the serializer trailing newline', () => {
  const output = format({ ok: true }, 'yaml')

  expect(output).toBe('ok: true')
  expect(output.endsWith('\n')).toBe(false)
})
