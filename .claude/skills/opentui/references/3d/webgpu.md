# 3D Rendering (WebGPU)

OpenTUI renders 3D by drawing a standard **three.js** (WebGPU) scene into a terminal framebuffer.
The bridge lives in the separate `@opentui/three` package — it exposes `ThreeCliRenderer` and
re-exports three.js as `THREE`. 3D classes (`Scene`, `Mesh`, geometries, materials, lights, cameras)
come from `three`; node materials come from `three/webgpu`. None of this is exported from
`@opentui/core`.

## Setup

```bash
bun install @opentui/three three
```

## Basic 3D Scene

```typescript
import { createCliRenderer, FrameBufferRenderable, RGBA } from "@opentui/core";
import { ThreeCliRenderer } from "@opentui/three";
import {
  Scene,
  Mesh,
  PerspectiveCamera,
  BoxGeometry,
  MeshStandardMaterial,
  DirectionalLight,
} from "three";

const renderer = await createCliRenderer();
const WIDTH = renderer.terminalWidth;
const HEIGHT = renderer.terminalHeight;

// Framebuffer the 3D scene is drawn into
const framebufferRenderable = new FrameBufferRenderable(renderer, {
  id: "scene-3d",
  width: WIDTH,
  height: HEIGHT,
  zIndex: 10,
});
renderer.root.add(framebufferRenderable);
const framebuffer = framebufferRenderable.frameBuffer;

// three.js -> terminal engine
const engine = new ThreeCliRenderer(renderer, {
  width: WIDTH,
  height: HEIGHT,
  focalLength: 8,
  backgroundColor: RGBA.fromInts(0, 0, 0, 0),
  alpha: true,
});
await engine.init();

// Standard three.js scene
const scene = new Scene();
const cube = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: "#3b82f6" }));
scene.add(cube);

const light = new DirectionalLight(0xffffff, 2.5);
light.position.set(3, 4, 5);
scene.add(light);

const camera = new PerspectiveCamera(45, engine.aspectRatio, 1, 100);
camera.position.set(0, 0, 5);
scene.add(camera);
engine.setActiveCamera(camera);

// Draw each frame
renderer.setFrameCallback(async (deltaMs) => {
  cube.rotation.y += deltaMs * 0.001;
  await engine.drawScene(scene, framebuffer, deltaMs / 1000);
});
```

## Geometries, Materials, Lighting

All standard three.js — import from `three`:

```typescript
import { BoxGeometry, SphereGeometry, PlaneGeometry, CylinderGeometry } from "three";
import { MeshStandardMaterial, MeshBasicMaterial, MeshPhongMaterial } from "three";
import { AmbientLight, DirectionalLight, PointLight } from "three";
```

For the WebGPU node-material pipeline (TSL), import from `three/webgpu`:

```typescript
import { MeshBasicNodeMaterial } from "three/webgpu";
```

## Transforms & Animation

Objects are three.js `Object3D`s, so use `position`/`rotation`/`scale` and drive updates from
`renderer.setFrameCallback`. Keep the camera's aspect in sync on resize:

```typescript
renderer.on("resize", () => {
  camera.aspect = engine.aspectRatio;
  camera.updateProjectionMatrix();
});
```

## Sprites & Particles

`@opentui/three` ships sprite/particle helpers: `SpriteResourceManager`, `SpriteAnimator`,
`TiledSprite`, `SpriteParticleGenerator`, and explosion effects. Import these from `@opentui/three`.

## Physics

See [physics.md](./physics.md) — `RapierPhysicsWorld` and `PlanckPhysicsWorld` are also exported
from `@opentui/three`.
