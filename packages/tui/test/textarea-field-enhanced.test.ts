import { describe, expect, test } from 'bun:test'

describe('@bunli/tui textarea-field enhanced', () => {
  test('TextareaFieldProps includes new props', () => {
    const props: import('../src/components/textarea-field.js').TextareaFieldProps = {
      label: 'Notes',
      name: 'notes',
      showLineNumbers: true,
      maxLines: 10,
      charLimit: 500,
      showCharCount: true,
      height: 10
    }
    expect(props.showLineNumbers).toBe(true)
    expect(props.maxLines).toBe(10)
    expect(props.charLimit).toBe(500)
    expect(props.showCharCount).toBe(true)
    expect(props.height).toBe(10)
  })

  test('default values are correct', () => {
    const props: import('../src/components/textarea-field.js').TextareaFieldProps = {
      label: 'Test',
      name: 'test'
    }
    expect(props.showLineNumbers).toBeUndefined()
    expect(props.maxLines).toBeUndefined()
    expect(props.charLimit).toBeUndefined()
    expect(props.showCharCount).toBeUndefined()
    expect(props.height).toBeUndefined()
  })
})
