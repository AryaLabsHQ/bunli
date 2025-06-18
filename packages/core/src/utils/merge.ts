/**
 * Deep merge utility for configuration objects
 */

/**
 * Check if a value is a plain object
 */
function isPlainObject(value: any): value is Record<string, any> {
  return value !== null && 
         typeof value === 'object' && 
         value.constructor === Object &&
         Object.prototype.toString.call(value) === '[object Object]'
}

/**
 * Deep merge multiple objects
 * Arrays are concatenated, objects are recursively merged
 */
export function deepMerge<T = any>(...objects: Partial<T>[]): T {
  const result: any = {}
  
  for (const obj of objects) {
    if (!obj) continue
    
    for (const [key, value] of Object.entries(obj)) {
      const existing = result[key]
      
      if (Array.isArray(value)) {
        // Concatenate arrays
        result[key] = Array.isArray(existing) 
          ? [...existing, ...value]
          : [...value]
      } else if (isPlainObject(value)) {
        // Recursively merge objects
        result[key] = isPlainObject(existing)
          ? deepMerge(existing, value)
          : { ...value }
      } else {
        // Primitive values - last one wins
        result[key] = value
      }
    }
  }
  
  return result as T
}

/**
 * Shallow merge multiple objects
 * Last value wins for all properties
 */
export function shallowMerge<T = any>(...objects: Partial<T>[]): T {
  return Object.assign({}, ...objects) as T
}