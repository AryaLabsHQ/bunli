# Zig Core

Native implementation in Zig for performance-critical operations.

## Architecture

```
TypeScript Components (packages/core/src/renderables/)
        │
        ▼ FFI (platform/ffi: Bun or Node)
Zig Core (packages/core/src/zig/)
        │
        ▼
    Terminal
```

## Design Principles

- **Hybrid Architecture**: Zig core for performance, TypeScript for DX
- **Double Buffering**: Flicker-free rendering via current/next buffer swap
- **Hit Grid**: Spatial lookup for mouse event dispatching
- **Yoga Layout**: Flexbox-based component layout
- **Component Catalogue**: Registry pattern for framework integrations
- **Dual Programming Model**: Imperative (class-based) and Declarative (VNode)

## Zig Modules

| Module            | Purpose                     |
| ----------------- | --------------------------- |
| `buffer.zig`      | Cell buffer management      |
| `renderer.zig`    | Rendering pipeline          |
| `terminal.zig`    | Terminal capabilities       |
| `text-buffer.zig` | Text storage/editing        |
| `grapheme.zig`    | Unicode grapheme clustering |
| `ansi.zig`        | ANSI escape codes           |

## Cell Structure

```zig
pub const Cell = struct {
    char: u32,        // Unicode codepoint
    fg: RGBA,        // Foreground color
    bg: RGBA,        // Background color
    attributes: u32,  // Bold, italic, etc.
};
```

## Building Native Module

```bash
cd packages/core
bun run build
```

Requires: Bun, Zig

## C ABI

Zig exposes a pure C ABI for language-agnostic core usage.
