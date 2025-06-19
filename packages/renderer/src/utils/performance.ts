/**
 * Performance utilities using Bun's high-precision timer
 */

// Use Bun.nanoseconds() if available, fallback to performance.now()
const hasNanoseconds = typeof Bun !== 'undefined' && typeof Bun.nanoseconds === 'function'

/**
 * Get high-precision timestamp in milliseconds
 */
export function now(): number {
  if (hasNanoseconds) {
    // Convert nanoseconds to milliseconds
    return Bun.nanoseconds() / 1_000_000
  }
  return performance.now()
}

/**
 * Get high-precision timestamp in nanoseconds
 */
export function nanoTime(): bigint {
  if (hasNanoseconds) {
    return BigInt(Bun.nanoseconds())
  }
  // Convert milliseconds to nanoseconds (less precise)
  return BigInt(Math.floor(performance.now() * 1_000_000))
}

/**
 * Measure execution time of a function
 */
export function measureTime<T>(fn: () => T): { result: T; duration: number } {
  const start = now()
  const result = fn()
  const duration = now() - start
  return { result, duration }
}

/**
 * Measure async execution time
 */
export async function measureTimeAsync<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = now()
  const result = await fn()
  const duration = now() - start
  return { result, duration }
}

/**
 * Performance metrics tracker
 */
export class MetricsTracker {
  private samples: number[] = []
  private maxSamples: number
  private total = 0
  private count = 0
  private min = Infinity
  private max = -Infinity
  
  constructor(maxSamples = 1000) {
    this.maxSamples = maxSamples
  }
  
  /**
   * Add a sample
   */
  addSample(value: number): void {
    this.samples.push(value)
    if (this.samples.length > this.maxSamples) {
      const removed = this.samples.shift()!
      this.total -= removed
    } else {
      this.total += value
    }
    
    this.count++
    this.min = Math.min(this.min, value)
    this.max = Math.max(this.max, value)
  }
  
  /**
   * Get metrics
   */
  getMetrics() {
    const sampleCount = this.samples.length
    const average = sampleCount > 0 ? this.total / sampleCount : 0
    
    // Calculate percentiles
    const sorted = [...this.samples].sort((a, b) => a - b)
    const p50 = sorted[Math.floor(sampleCount * 0.5)] || 0
    const p90 = sorted[Math.floor(sampleCount * 0.9)] || 0
    const p99 = sorted[Math.floor(sampleCount * 0.99)] || 0
    
    return {
      count: this.count,
      average,
      min: this.min === Infinity ? 0 : this.min,
      max: this.max === -Infinity ? 0 : this.max,
      p50,
      p90,
      p99,
      samples: sampleCount
    }
  }
  
  /**
   * Reset metrics
   */
  reset(): void {
    this.samples = []
    this.total = 0
    this.count = 0
    this.min = Infinity
    this.max = -Infinity
  }
}

/**
 * Frame time tracker for smooth animations
 */
export class FrameTracker {
  private lastFrameTime = 0
  private frameTimes: number[] = []
  private maxFrames = 60
  
  /**
   * Mark the start of a new frame
   */
  startFrame(): void {
    const currentTime = now()
    
    if (this.lastFrameTime > 0) {
      const frameTime = currentTime - this.lastFrameTime
      this.frameTimes.push(frameTime)
      
      if (this.frameTimes.length > this.maxFrames) {
        this.frameTimes.shift()
      }
    }
    
    this.lastFrameTime = currentTime
  }
  
  /**
   * Get current FPS
   */
  getFPS(): number {
    if (this.frameTimes.length === 0) return 0
    
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
    return avgFrameTime > 0 ? 1000 / avgFrameTime : 0
  }
  
  /**
   * Check if we're dropping frames
   */
  isDroppingFrames(targetFPS = 30): boolean {
    const targetFrameTime = 1000 / targetFPS
    const droppedFrames = this.frameTimes.filter(time => time > targetFrameTime * 1.5).length
    return droppedFrames > this.frameTimes.length * 0.1 // More than 10% dropped
  }
}