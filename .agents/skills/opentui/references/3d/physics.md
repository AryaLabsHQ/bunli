# Physics Adapters

`@opentui/three` ships thin physics adapters — `RapierPhysicsWorld` and `PlanckPhysicsWorld` — that
implement a small `PhysicsWorld` interface over the Rapier (`@dimforge/rapier2d-simd-compat`) and
Planck (`planck`) 2D engines. They are the OpenTUI-facing seam consumed by sprite/particle helpers
(e.g. `PhysicsExplosionManager`). For full physics features, drive the underlying engine directly.

> These classes are exported from `@opentui/three`, **not** `@opentui/core`.

## Setup

```bash
bun install @opentui/three
# plus one engine:
bun install @dimforge/rapier2d-simd-compat   # Rapier (SIMD-accelerated)
bun install planck                            # or Planck (lighter weight)
```

## Adapter Interface

The OpenTUI adapter surface is intentionally small (from `@opentui/three`):

```typescript
interface PhysicsVector2 {
  x: number;
  y: number;
}

interface PhysicsRigidBodyDesc {
  translation: PhysicsVector2;
  linearDamping: number;
  angularDamping: number;
}

interface PhysicsColliderDesc {
  width: number;
  height: number;
  restitution: number;
  friction: number;
  density: number;
}

interface PhysicsRigidBody {
  applyImpulse(force: PhysicsVector2): void;
  applyTorqueImpulse(torque: number): void;
  getTranslation(): PhysicsVector2;
  getRotation(): number;
}

interface PhysicsWorld {
  createRigidBody(desc: PhysicsRigidBodyDesc): PhysicsRigidBody;
  createCollider(colliderDesc: PhysicsColliderDesc, rigidBody: PhysicsRigidBody): void;
  removeRigidBody(rigidBody: PhysicsRigidBody): void;
}
```

## Rapier

Create the underlying Rapier world, then wrap it with the adapter:

```typescript
import { RapierPhysicsWorld } from "@opentui/three";
import * as RAPIER from "@dimforge/rapier2d-simd-compat/rapier.es.js";

const gravity = { x: 0.0, y: -9.81 };
const rapierWorld = new RAPIER.World(gravity);
const physicsWorld = RapierPhysicsWorld.createFromRapierWorld(rapierWorld);

// Simplified bodies via the adapter
const body = physicsWorld.createRigidBody({
  translation: { x: 0, y: 5 },
  linearDamping: 0,
  angularDamping: 0,
});
physicsWorld.createCollider(
  { width: 1, height: 1, restitution: 0.5, friction: 0.5, density: 1 },
  body,
);

// Step the underlying world each frame
rapierWorld.step();
```

For colliders, joints, raycasting, and sensors beyond the adapter surface, create them on the
underlying `RAPIER.World` directly (`world.createRigidBody(RAPIER.RigidBodyDesc…)`,
`world.createCollider(RAPIER.ColliderDesc…)`).

## Planck

```typescript
import { PlanckPhysicsWorld } from "@opentui/three";
import * as planck from "planck";

const planckWorld = new planck.World({ x: 0, y: -10 });
const physicsWorld = PlanckPhysicsWorld.createFromPlanckWorld(planckWorld);
```

## Integration with 3D

Link a three.js `Mesh` to a physics body inside the frame callback (see [webgpu.md](./webgpu.md) for
engine/framebuffer setup):

```typescript
import { Mesh, BoxGeometry, MeshStandardMaterial } from "three";

const cube = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: "#3b82f6" }));
scene.add(cube);

renderer.setFrameCallback(async (deltaMs) => {
  rapierWorld.step();
  const pos = body.getTranslation();
  cube.position.set(pos.x, pos.y, 0);
  cube.rotation.z = body.getRotation();
  await engine.drawScene(scene, framebuffer, deltaMs / 1000);
});
```
