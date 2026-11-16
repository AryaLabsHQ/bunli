# Environment Variables

Configuration via environment variables.

## Rendering

| Variable                       | Description               |
| ------------------------------ | ------------------------- |
| `OPENTUI_GRAPHICS`             | Enable graphics protocol  |
| `OPENTUI_FORCE_NOZWJ`          | Disable ZWJ sequences     |
| `OPENTUI_FORCE_WCWIDTH`        | Force wcwidth calculation |
| `OPENTUI_FORCE_UNICODE`        | Force Unicode mode        |
| `OPENTUI_FORCE_EXPLICIT_WIDTH` | Explicit character widths |

## Tree-sitter

| Variable                       | Description                                                 |
| ------------------------------ | ----------------------------------------------------------- |
| `OTUI_TREE_SITTER_WORKER_PATH` | Path to tree-sitter WASM                                    |
| `OTUI_TS_STYLE_WARN`           | Enable warnings for missing syntax styles (default `false`) |

## Debugging

| Variable                        | Description                                                                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `OTUI_DEBUG_FFI`                | Debug FFI calls                                                                                                                                 |
| `OTUI_TRACE_FFI`                | Trace FFI calls                                                                                                                                 |
| `OTUI_SHOW_STATS`               | Show FPS/stats                                                                                                                                  |
| `OTUI_DEBUG`                    | General debug mode                                                                                                                              |
| `OTUI_NO_NATIVE_RENDER`         | Skip the Zig/native frame renderer; useful for debugging the render loop (split-footer stdout flushing may still write ANSI). Default `false`   |
| `OTUI_DUMP_CAPTURES`            | Dump captured stdout and console caches when the renderer exit handler runs. A direct `renderer.destroy()` does not trigger it. Default `false` |
| `OTUI_KEYPRESS_DEBUG_SHOW_JSON` | Show full JSON for the latest parsed event in the keypress debug tool. Default `false`                                                          |

## Console

| Variable           | Description         |
| ------------------ | ------------------- |
| `OTUI_USE_CONSOLE` | Use console overlay |
| `SHOW_CONSOLE`     | Show console        |

## Terminal

| Variable                    | Description          |
| --------------------------- | -------------------- |
| `OTUI_USE_ALTERNATE_SCREEN` | Use alternate screen |
| `OTUI_OVERRIDE_STDOUT`      | Override stdout      |

## Configuration

| Variable          | Description      |
| ----------------- | ---------------- |
| `XDG_CONFIG_HOME` | Config directory |
| `XDG_DATA_HOME`   | Data directory   |

## Development

```bash
# Enable debug output
OTUI_DEBUG=1 OTUI_SHOW_STATS=1 bun run src/index.ts
```

## OpenCode Integration

OpenTUI powers OpenCode in production with these settings:

- Graphics enabled
- Tree-sitter for syntax highlighting
- Custom keyboard handling
