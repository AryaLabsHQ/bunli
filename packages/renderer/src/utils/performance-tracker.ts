/**
 * Performance tracking and regression detection
 */

import { now, nanoTime } from './performance.js'

export interface PerformanceMetrics {
  renderTime: number
  layoutTime: number
  commitTime: number
  dirtyRegionCount: number
  dirtyRegionCoverage: number
  frameTime: number
  fps: number
}

export interface PerformanceBenchmark {
  name: string
  metrics: PerformanceMetrics
  elementCount: number
  timestamp: number
}

export class PerformanceTracker {
  private benchmarks: PerformanceBenchmark[] = []
  private frameStartTime = 0
  private lastFrameTime = 0
  private frameCount = 0
  private fpsWindow: number[] = []
  private readonly FPS_WINDOW_SIZE = 60 // Track last 60 frames
  
  // Thresholds for regression detection
  private readonly REGRESSION_THRESHOLDS = {
    renderTime: 1.5,      // 50% slower
    layoutTime: 1.5,      // 50% slower
    frameTime: 1.2,       // 20% slower
    fps: 0.8,            // 20% lower FPS
  }
  
  startFrame(): void {
    this.frameStartTime = now()
  }
  
  endFrame(metrics: Partial<PerformanceMetrics>): void {
    const frameTime = now() - this.frameStartTime
    this.lastFrameTime = frameTime
    this.frameCount++
    
    // Update FPS tracking
    this.fpsWindow.push(frameTime)
    if (this.fpsWindow.length > this.FPS_WINDOW_SIZE) {
      this.fpsWindow.shift()
    }
    
    // Calculate current FPS
    const avgFrameTime = this.fpsWindow.reduce((a, b) => a + b, 0) / this.fpsWindow.length
    const fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0
    
    // Store complete metrics
    const fullMetrics: PerformanceMetrics = {
      renderTime: metrics.renderTime || 0,
      layoutTime: metrics.layoutTime || 0,
      commitTime: metrics.commitTime || 0,
      dirtyRegionCount: metrics.dirtyRegionCount || 0,
      dirtyRegionCoverage: metrics.dirtyRegionCoverage || 0,
      frameTime,
      fps,
    }
  }
  
  /**
   * Record a benchmark for regression testing
   */
  recordBenchmark(name: string, elementCount: number, metrics: PerformanceMetrics): void {
    this.benchmarks.push({
      name,
      metrics,
      elementCount,
      timestamp: Date.now(),
    })
  }
  
  /**
   * Check for performance regressions
   */
  checkRegressions(baseline: PerformanceBenchmark, current: PerformanceMetrics): string[] {
    const regressions: string[] = []
    
    if (current.renderTime > baseline.metrics.renderTime * this.REGRESSION_THRESHOLDS.renderTime) {
      regressions.push(
        `Render time regression: ${current.renderTime.toFixed(2)}ms vs baseline ${baseline.metrics.renderTime.toFixed(2)}ms`
      )
    }
    
    if (current.layoutTime > baseline.metrics.layoutTime * this.REGRESSION_THRESHOLDS.layoutTime) {
      regressions.push(
        `Layout time regression: ${current.layoutTime.toFixed(2)}ms vs baseline ${baseline.metrics.layoutTime.toFixed(2)}ms`
      )
    }
    
    if (current.frameTime > baseline.metrics.frameTime * this.REGRESSION_THRESHOLDS.frameTime) {
      regressions.push(
        `Frame time regression: ${current.frameTime.toFixed(2)}ms vs baseline ${baseline.metrics.frameTime.toFixed(2)}ms`
      )
    }
    
    if (current.fps < baseline.metrics.fps * this.REGRESSION_THRESHOLDS.fps) {
      regressions.push(
        `FPS regression: ${current.fps.toFixed(1)} vs baseline ${baseline.metrics.fps.toFixed(1)}`
      )
    }
    
    return regressions
  }
  
  /**
   * Get current performance summary
   */
  getSummary(): {
    avgRenderTime: number
    avgLayoutTime: number
    avgFrameTime: number
    currentFPS: number
    frameCount: number
  } {
    const avgFrameTime = this.fpsWindow.length > 0
      ? this.fpsWindow.reduce((a, b) => a + b, 0) / this.fpsWindow.length
      : 0
    
    return {
      avgRenderTime: 0, // TODO: Track these separately
      avgLayoutTime: 0,
      avgFrameTime,
      currentFPS: avgFrameTime > 0 ? 1000 / avgFrameTime : 0,
      frameCount: this.frameCount,
    }
  }
  
  /**
   * Export benchmarks for analysis
   */
  exportBenchmarks(): PerformanceBenchmark[] {
    return [...this.benchmarks]
  }
  
  /**
   * Clear all data
   */
  reset(): void {
    this.benchmarks = []
    this.frameCount = 0
    this.fpsWindow = []
    this.frameStartTime = 0
    this.lastFrameTime = 0
  }
}

// Global performance tracker instance
export const performanceTracker = new PerformanceTracker()