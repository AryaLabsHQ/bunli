/**
 * Style utilities and presets for Bunli UI
 */

import type { Style } from '../types.js'

/**
 * Preset styles for common use cases
 */
export const styles = {
  // Text styles
  title: {
    color: '#7D56F4',
    bold: true
  } satisfies Style,
  
  error: {
    color: 'red',
    bold: true
  } satisfies Style,
  
  success: {
    color: 'green'
  } satisfies Style,
  
  warning: {
    color: 'yellow'
  } satisfies Style,
  
  dim: {
    dim: true
  } satisfies Style,
  
  muted: {
    color: 'gray',
    dim: true
  } satisfies Style,
  
  // Code/mono styles
  code: {
    backgroundColor: '#1e1e1e',
    color: '#d4d4d4',
    padding: [0, 1]
  } satisfies Style,
  
  // Box styles
  bordered: {
    border: 'single',
    padding: 1
  } satisfies Style,
  
  rounded: {
    border: 'round',
    padding: 1
  } satisfies Style,
  
  panel: {
    border: 'double',
    padding: 2
  } satisfies Style
}

/**
 * Merge multiple styles together
 */
export function mergeStyles(...styles: (Style | undefined)[]): Style {
  return Object.assign({}, ...styles.filter(Boolean))
}