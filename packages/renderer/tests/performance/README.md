# Performance Tests

This directory contains performance benchmarks for the @bunli/renderer package.

## Running Performance Tests

```bash
# Run all performance tests
bun test tests/performance/

# Run with detailed output
bun test tests/performance/benchmarks.test.tsx

# Run stress tests (disabled by default)
bun test tests/performance/benchmarks.test.tsx --only="Stress Tests"
```

## Test Categories

### 1. Render Performance
- Tests scaling with different element counts (100-2000 elements)
- Verifies performance scales sub-linearly

### 2. Style Comparison
- Compares JSON.stringify vs shallow equals optimization
- Expects ~10x speedup with shallow comparison

### 3. Differential Updates
- Tests React's reconciliation efficiency
- Updates single item among 500 elements
- Should complete in <30ms

### 4. Memory Usage
- Renders 30 times with 100 elements each
- Verifies memory growth stays under 5MB
- Uses Bun.gc() for accurate measurements

### 5. Layout Performance
- Complex flexbox layout with 20+ elements
- Tests gap, flex-grow, borders, padding
- Should complete in <50ms

## Expected Results

On modern hardware (M1/M2 Mac, recent Intel/AMD):

- 100 elements: ~12-20ms
- 1000 elements: ~15-25ms 
- 2000 elements: ~20-35ms
- Style comparison: 10x+ faster
- Differential update: <30ms
- Memory growth: <5MB
- Complex layout: <50ms

## Performance Optimizations

The renderer includes several optimizations:

1. **Shallow style comparison** - 13x faster than JSON.stringify
2. **Dirty region tracking** - Only re-renders changed areas
3. **Differential rendering** - Minimal DOM updates
4. **Zero-copy buffers** (optional) - Available via `renderWithBuffer()`
5. **High-precision timing** - Uses Bun.nanoseconds() when available

## Notes

- Performance varies based on terminal size and complexity
- React reconciliation dominates render time
- Buffer renderer may be slower for small renders due to overhead
- Real terminal I/O costs are not reflected in mock terminal tests