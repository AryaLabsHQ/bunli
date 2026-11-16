---
name: opentui
description:
  "Build terminal UIs with OpenTUI: component-based TUIs, React or SolidJS integration, and rich
  text or graphics in the terminal. For CLI commands, options, and plugins use bunli."
references:
  - core/renderer
  - core/buffer
  - core/zig-core
  - components/box
  - components/text
  - components/input
  - components/select
  - components/scrollbox
  - integration/react
  - integration/solid
  - input/keyboard
  - input/mouse
  - layout/yoga
  - patterns/imperative
  - patterns/declarative
  - production/environment
argument-hint: "[core | react | solid | keymap]"
---

# OpenTUI Skill

Version: 0.4.1

Terminal UI framework written in Zig with TypeScript bindings. Powers OpenCode in production.

## Published Packages

- **@opentui/core** — Zig core + TypeScript bindings, renderer, renderables, buffers.
- **@opentui/react** — React reconciler integration.
- **@opentui/solid** — SolidJS custom renderer integration.
- **@opentui/keymap** — Standalone keymap package: shared keymap core with adapters for HTML and
  OpenTUI, plus React/Solid providers and hooks. Entry points include `@opentui/keymap`, `/addons`,
  `/html`, `/opentui`, `/react`, `/solid`.

## Choosing a package

For a CLI with commands, options, plugins, or prompts, use the `bunli` skill. Read
`references/integration/bunli.md` when a Bunli CLI needs OpenTUI directly.

### "I need to create a TUI app"

```
Create TUI App?
├─ Building a CLI with commands/options → Use 'bunli' skill instead
├─ Using React → @opentui/react
├─ Using SolidJS → @opentui/solid
├─ Using TypeScript (imperative) → @opentui/core
└─ Vanilla JS → @opentui/core
```

### "I need configurable keybindings"

```
Keymap?
├─ Shared keymap core → @opentui/keymap
├─ Terminal (OpenTUI) host → @opentui/keymap/opentui
├─ DOM/browser host → @opentui/keymap/html
└─ React / Solid bindings → @opentui/keymap/react · @opentui/keymap/solid
```

## Routing

| Task or symbol                                                                                                                              | Read                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Renderer: `createCliRenderer`, options, lifecycle, root, exit handling                                                                      | `references/core/renderer.md`                |
| Minimal imperative app, `Renderable` classes, children, events, focus (`focus()`, `blur()`, `focused`)                                      | `references/patterns/imperative.md`          |
| Declarative VNodes: `h`, `instantiate`, delegation, `vstyles`; functional component via `VRenderable` with a render prop                    | `references/patterns/declarative.md`         |
| React: `createRoot`, components, hooks                                                                                                      | `references/integration/react.md`            |
| SolidJS: `render`, components, hooks, differences from React                                                                                | `references/integration/solid.md`            |
| Container or layout: `BoxRenderable`, borders, padding                                                                                      | `references/components/box.md`               |
| Text display: `TextRenderable`, `StyledText`, `TextNode`                                                                                    | `references/components/text.md`              |
| Single-line `InputRenderable`; multi-line `TextareaRenderable`; vim-like editing with `keyBindings`                                         | `references/components/input.md`             |
| Dropdown selection: `SelectRenderable`                                                                                                      | `references/components/select.md`            |
| Scrollable container: `ScrollBoxRenderable`                                                                                                 | `references/components/scrollbox.md`         |
| Tabs: `TabSelectRenderable`                                                                                                                 | `references/components/tabs.md`              |
| Code with highlighting: `CodeRenderable`                                                                                                    | `references/components/code.md`              |
| Markdown: `MarkdownRenderable`                                                                                                              | `references/components/markdown.md`          |
| Diff viewer: `DiffRenderable`                                                                                                               | `references/components/diff.md`              |
| Numeric slider: `SliderRenderable`                                                                                                          | `references/components/slider.md`            |
| Yoga or Flexbox layout, sizing, positioning                                                                                                 | `references/layout/yoga.md`                  |
| Keyboard events: `KeyHandler`, `useKeyboard`, `onKeyDown`, Kitty protocol; text paste via the `onPaste` prop                                | `references/input/keyboard.md`               |
| Mouse events: `onMouseDown`/`Up`/`Move`, `onMouseScroll`, mouse modes                                                                       | `references/input/mouse.md`                  |
| Custom component: extend `Renderable`, override `renderSelf()`, register with `extend()`, lifecycle hooks, `FrameBufferRenderable` graphics | `references/extensions/custom-renderable.md` |
| Direct buffer access: `OptimizedBuffer.drawText`/`drawBox`, double buffering                                                                | `references/core/buffer.md`                  |
| Zig core, FFI, C ABI, design principles                                                                                                     | `references/core/zig-core.md`                |
| Animation: timelines, easing, `useTimeline`                                                                                                 | `references/animation/timeline.md`           |
| WebGPU 3D rendering                                                                                                                         | `references/3d/webgpu.md`                    |
| Physics adapters (Rapier, Planck)                                                                                                           | `references/3d/physics.md`                   |
| Testing: `createTestRenderer`, mock keys and mouse, recorder                                                                                | `references/testing/test-utilities.md`       |
| Environment variables, OpenCode integration                                                                                                 | `references/production/environment.md`       |
| OpenTUI inside a Bunli CLI, or choosing between `bunli` and `opentui`                                                                       | `references/integration/bunli.md`            |
