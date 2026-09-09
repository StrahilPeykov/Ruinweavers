import RAPIER from "@dimforge/rapier3d-compat";
import { TERRAIN } from "../simulation/lab";
import type { Entity, State, Vec, Field } from "../simulation/types";
let ready: Promise<void> | undefined;
export const initPhysics = () => (ready ??= RAPIER.init());
export class Physics {
  world = new RAPIER.World({ x: 0, y: -20, z: 0 });
  bodies = new Map<string, RAPIER.RigidBody>();
  colliders = new Map<string, RAPIER.Collider>();
  actorColliders = new Set<number>();
  slabs = new Map<string, RAPIER.RigidBody>();
  controller = this.world.createCharacterController(0.02);
  verticalSpeed = 0;
  constructor(state: State) {
    this.world.timestep = 1 / 60;
    this.controller.enableAutostep(0.95, 0.2, true);
    this.controller.enableSnapToGround(0.25);
    this.controller.setApplyImpulsesToDynamicBodies(true);
    this.controller.setCharacterMass(2);
    for (const t of TERRAIN) {
      const b = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(t.x, t.y, t.z),
      );
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(t.w / 2, t.h / 2, t.d / 2),
        b,
      );
    }
    for (const e of state.entities) this.add(e);
    // Populate broad-phase queries before the first character-controller move.
    this.world.step();
  }
  add(e: Entity) {
    const kinematic = e.kind === "player" || e.kind === "moving";
    const desc = e.material.anchored
      ? RAPIER.RigidBodyDesc.fixed()
      : kinematic
        ? RAPIER.RigidBodyDesc.kinematicPositionBased()
        : RAPIER.RigidBodyDesc.dynamic();
    desc
      .setTranslation(e.pos.x, e.pos.y, e.pos.z)
      .setLinearDamping(3)
      .setAngularDamping(4);
    if (e.kind === "sentinel") desc.lockRotations();
    const b = this.world.createRigidBody(desc);
    const shape =
      e.kind === "player"
        ? RAPIER.ColliderDesc.capsule(0.32, e.radius)
        : RAPIER.ColliderDesc.cuboid(e.radius, e.height / 2, e.radius);
    const c = this.world.createCollider(
      shape.setMass(e.mass).setFriction(0.6),
      b,
    );
    this.bodies.set(e.id, b);
    this.colliders.set(e.id, c);
    this.actorColliders.add(c.handle);
  }
  terrainHit(a: Vec, b: Vec): Vec | null {
    const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const hit = this.world.castRay(
      new RAPIER.Ray(a, d),
      1,
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      (c) => !this.actorColliders.has(c.handle),
    );
    return hit
      ? {
          x: a.x + d.x * hit.timeOfImpact,
          y: a.y + d.y * hit.timeOfImpact,
          z: a.z + d.z * hit.timeOfImpact,
        }
      : null;
  }
  impulse(id: string, v: Vec) {
    this.bodies.get(id)?.applyImpulse(v, true);
  }
  teleport(e: Entity) {
    const b = this.bodies.get(e.id);
    if (b) {
      b.setTranslation(e.pos, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      if (b.isKinematic()) b.setNextKinematicTranslation(e.pos);
    }
  }
  syncFields(fields: Field[]) {
    const ids = new Set(
      fields.filter((f) => f.principle === "Stone").map((f) => f.id),
    );
    for (const [id, b] of this.slabs)
      if (!ids.has(id)) {
        this.world.removeRigidBody(b);
        this.slabs.delete(id);
      }
    for (const f of fields)
      if (f.principle === "Stone" && !this.slabs.has(f.id)) {
        const b = this.world.createRigidBody(
          RAPIER.RigidBodyDesc.fixed().setTranslation(
            f.pos.x,
            f.pos.y + 0.4,
            f.pos.z,
          ),
        );
        this.world.createCollider(
          RAPIER.ColliderDesc.cuboid(2.2, 0.45, 2.2),
          b,
        );
        this.slabs.set(f.id, b);
      }
  }
  step(state: State, move: Vec) {
    for (const [id, b] of this.bodies) {
      const e = state.entities.find((e) => e.id === id)!;
      if (e.hp <= 0) {
        this.actorColliders.delete(this.colliders.get(id)!.handle);
        this.world.removeRigidBody(b);
        this.bodies.delete(id);
        this.colliders.delete(id);
      }
    }
    const p = state.entities[0],
      b = this.bodies.get(p.id),
      c = this.colliders.get(p.id);
    if (b && c) {
      this.verticalSpeed = Math.max(-20, this.verticalSpeed - 20 / 60);
      this.controller.computeColliderMovement(c, {
        x: move.x,
        y: this.verticalSpeed / 60,
        z: move.z,
      });
      const m = this.controller.computedMovement();
      const pos = b.translation();
      b.setNextKinematicTranslation({
        x: pos.x + m.x,
        y: pos.y + m.y,
        z: pos.z + m.z,
      });
      if (this.controller.computedGrounded()) this.verticalSpeed = 0;
    }
    const moving = state.entities.find((e) => e.kind === "moving");
    if (moving && moving.hp > 0)
      this.bodies
        .get(moving.id)
        ?.setNextKinematicTranslation({
          x: -3 + Math.sin(state.time * 0.65 + state.seed * 0.001) * 2,
          y: 0.55,
          z: -10,
        });
    this.world.step();
    for (const e of state.entities) {
      const body = this.bodies.get(e.id);
      if (body) {
        e.pos = { ...body.translation() };
        e.velocity = { ...body.linvel() };
        e.rotation = { ...body.rotation() };
      }
    }
  }
  dispose() {
    this.world.free();
  }
}
