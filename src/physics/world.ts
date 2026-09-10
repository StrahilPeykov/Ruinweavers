import RAPIER from "@dimforge/rapier3d-compat";
import { TERRAIN } from "../simulation/lab";
import { bridgeAt } from "../simulation/rooms";
import type { Entity, State, Vec, Field, AimPoint } from "../simulation/types";
let ready: Promise<void> | undefined;
export const initPhysics = () => (ready ??= RAPIER.init());
export class Physics {
  world = new RAPIER.World({ x: 0, y: -20, z: 0 });
  bodies = new Map<string, RAPIER.RigidBody>();
  colliders = new Map<string, RAPIER.Collider>();
  actorColliders = new Set<number>();
  slabs = new Map<string, RAPIER.RigidBody>();
  wardenJoints = new Map<string, RAPIER.ImpulseJoint>();
  controllers = new Map<string, RAPIER.KinematicCharacterController>();
  get verticalSpeed() {
    return this.state.actors["mage-1"].verticalSpeed;
  }
  set verticalSpeed(v: number) {
    this.state.actors["mage-1"].verticalSpeed = v;
  }
  constructor(
    public state: State,
    public queryOnly = false,
  ) {
    this.world.timestep = 1 / 60;
    for (const t of state.terrain ?? TERRAIN) {
      const b = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed()
          .setTranslation(t.x, t.y, t.z)
          .setRotation({
            x: Math.sin((t.pitch ?? 0) / 2),
            y: 0,
            z: 0,
            w: Math.cos((t.pitch ?? 0) / 2),
          }),
      );
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(t.w / 2, t.h / 2, t.d / 2),
        b,
      );
    }
    for (const e of state.entities) this.add(e);
    this.syncGuardian(state);
    // Populate broad-phase queries before the first character-controller move.
    this.world.step();
  }
  add(e: Entity) {
    const kinematic = e.kind === "player" || e.kind === "moving";
    const desc =
      this.queryOnly || e.material.anchored
        ? RAPIER.RigidBodyDesc.fixed()
        : kinematic
          ? RAPIER.RigidBodyDesc.kinematicPositionBased()
          : RAPIER.RigidBodyDesc.dynamic();
    desc
      .setTranslation(e.pos.x, e.pos.y, e.pos.z)
      .setLinearDamping(3)
      .setAngularDamping(4);
    if (["sentinel", "pursuer", "warden"].includes(e.kind))
      desc.lockRotations();
    const b = this.world.createRigidBody(desc);
    const shape =
      e.kind === "player"
        ? RAPIER.ColliderDesc.capsule(0.32, e.radius)
        : RAPIER.ColliderDesc.cuboid(e.radius, e.height / 2, e.radius);
    const c = this.world.createCollider(
      // Fitted bronze feet slide on the court; mass and cohesion still resist force.
      shape
        .setMass(e.mass)
        .setFriction(
          e.kind === "warden" || e.kind === "wardplate" ? 0.08 : 0.6,
        ),
      b,
    );
    if (e.kind === "warden" || e.kind === "wardplate")
      c.setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min);
    if (e.kind === "player" && !this.controllers.has(e.id) && !this.queryOnly) {
      const controller = this.world.createCharacterController(0.02);
      controller.enableAutostep(0.95, 0.2, true);
      controller.enableSnapToGround(0.25);
      controller.setApplyImpulsesToDynamicBodies(true);
      controller.setCharacterMass(2);
      this.controllers.set(e.id, controller);
    }
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
  // Only authoritative colliders participate: never VFX, labels or state rings.
  pick(
    origin: Vec,
    direction: Vec,
    playerId: string,
    presentation?: Entity[],
  ): AimPoint {
    const ray = new RAPIER.Ray(origin, direction);
    const hit = this.world.castRayAndGetNormal(
      ray,
      150,
      true,
      undefined,
      undefined,
      this.colliders.get(playerId),
      undefined,
      presentation ? (c) => !this.actorColliders.has(c.handle) : undefined,
    );
    if (presentation) {
      let nearest = hit?.timeOfImpact ?? 150;
      let bodyPoint: Vec | undefined;
      for (const e of presentation) {
        if (e.id === playerId || e.hp <= 0) continue;
        const shape =
          e.kind === "player"
            ? new RAPIER.Capsule(0.32, e.radius)
            : new RAPIER.Cuboid(e.radius, e.height / 2, e.radius);
        const toi = shape.castRay(ray, e.pos, e.rotation, nearest, true);
        if (toi >= 0 && toi < nearest) {
          nearest = toi;
          bodyPoint = ray.pointAt(toi);
        }
      }
      if (bodyPoint) return { ...bodyPoint, body: true, invalid: false };
    }
    if (hit) {
      const point = ray.pointAt(hit.timeOfImpact);
      const body = this.actorColliders.has(hit.collider.handle);
      return { ...point, body, invalid: !body && hit.normal.y < 0.7 };
    }
    // The existing traversal gap is a deliberate Stone construction plane.
    const point = ray.pointAt(-origin.y / direction.y);
    return {
      ...point,
      invalid: !bridgeAt(this.state.roomId, point, !this.state.trial),
    };
  }
  surfaceAt(point: Vec, excludedFields: string[] = []): Vec | null {
    const ray = new RAPIER.Ray(
      { x: point.x, y: point.y + 0.1, z: point.z },
      { x: 0, y: -1, z: 0 },
    );
    const excluded = new Set(
      excludedFields.map((id) => this.slabs.get(id)?.handle),
    );
    const hit = this.world.castRayAndGetNormal(
      ray,
      30,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      (c) =>
        !this.actorColliders.has(c.handle) && !excluded.has(c.parent()?.handle),
    );
    return hit && hit.normal.y > 0.7 ? ray.pointAt(hit.timeOfImpact) : null;
  }
  impulse(id: string, v: Vec) {
    this.bodies.get(id)?.applyImpulse(v, true);
  }
  teleport(e: Entity) {
    const b = this.bodies.get(e.id);
    if (b) {
      b.setTranslation(e.pos, true);
      if (this.queryOnly) b.setRotation(e.rotation, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      if (b.isKinematic()) b.setNextKinematicTranslation(e.pos);
    }
  }
  syncGuardian(state: State) {
    if (this.queryOnly) return;
    const g = state.guardian;
    for (const [id, joint] of this.wardenJoints) {
      if (!g?.plates.some((p) => p.id === id && p.attached)) {
        if (joint.isValid()) this.world.removeImpulseJoint(joint, true);
        this.wardenJoints.delete(id);
      }
    }
    if (!g) return;
    const core = this.bodies.get(g.core);
    const entity = state.entities.find((e) => e.id === g.core);
    if (!core || !entity || entity.hp <= 0) return;
    for (const plate of g.plates) {
      const body = this.bodies.get(plate.id),
        e = state.entities.find((e) => e.id === plate.id);
      if (!plate.attached || !body || !e || this.wardenJoints.has(plate.id))
        continue;
      const identity = { x: 0, y: 0, z: 0, w: 1 };
      const joint = this.world.createImpulseJoint(
        RAPIER.JointData.fixed(
          { x: plate.side * 1.65, y: (e.height - entity.height) / 2, z: 0.2 },
          identity,
          { x: 0, y: 0, z: 0 },
          identity,
        ),
        core,
        body,
        true,
      );
      joint.setContactsEnabled(false);
      this.wardenJoints.set(plate.id, joint);
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
        this.world.createCollider(
          RAPIER.ColliderDesc.cuboid(3, 0.2, 3).setTranslation(0, -0.2, 0),
          b,
        );
        this.slabs.set(f.id, b);
      }
  }
  step(state: State, moves: Record<string, Vec> | Vec) {
    for (const [id, b] of this.bodies) {
      const e = state.entities.find((e) => e.id === id)!;
      if (e.hp <= 0) {
        this.actorColliders.delete(this.colliders.get(id)!.handle);
        this.world.removeRigidBody(b);
        this.bodies.delete(id);
        this.colliders.delete(id);
      }
    }
    for (const p of state.entities.filter((e) => !!state.actors[e.id])) {
      const b = this.bodies.get(p.id),
        c = this.colliders.get(p.id),
        controller = this.controllers.get(p.id),
        a = state.actors[p.id];
      const move =
        typeof moves.x === "number"
          ? p.id === "mage-1"
            ? (moves as Vec)
            : { x: 0, y: 0, z: 0 }
          : ((moves as Record<string, Vec>)[p.id] ?? { x: 0, y: 0, z: 0 });
      if (b && c && controller) {
        a.verticalSpeed = Math.max(-20, a.verticalSpeed - 20 / 60);
        controller.computeColliderMovement(c, {
          x: move.x,
          y: a.verticalSpeed / 60,
          z: move.z,
        });
        const m = controller.computedMovement(),
          pos = b.translation();
        b.setNextKinematicTranslation({
          x: pos.x + m.x,
          y: pos.y + m.y,
          z: pos.z + m.z,
        });
        if (controller.computedGrounded()) a.verticalSpeed = 0;
      }
    }
    const moving = state.entities.find((e) => e.kind === "moving");
    if (moving && moving.hp > 0)
      this.bodies.get(moving.id)?.setNextKinematicTranslation({
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
  updateSnapshot(s: State) {
    if (!this.queryOnly) throw Error("Snapshot queries only");
    this.state = s;
    for (const [id, b] of this.bodies)
      if (!s.entities.some((e) => e.id === id && e.hp > 0)) {
        this.actorColliders.delete(this.colliders.get(id)!.handle);
        this.world.removeRigidBody(b);
        this.bodies.delete(id);
        this.colliders.delete(id);
      }
    for (const e of s.entities.filter((e) => e.hp > 0)) {
      if (!this.bodies.has(e.id)) this.add(e);
      this.teleport(e);
    }
    this.syncFields(s.fields);
    this.world.step();
  }
  /** Query-only local movement preview. No world step, impulse or state mutation. */
  previewMove(
    id: string,
    pos: Vec,
    move: Vec,
    verticalSpeed: number,
    dt: number,
  ) {
    if (!this.queryOnly) throw Error("Prediction requires query-only physics");
    const collider = this.colliders.get(id);
    if (!collider) return { pos, verticalSpeed: 0 };
    let controller = this.controllers.get(id);
    if (!controller) {
      controller = this.world.createCharacterController(0.02);
      controller.enableAutostep(0.95, 0.2, true);
      controller.enableSnapToGround(0.25);
      controller.setApplyImpulsesToDynamicBodies(false);
      this.controllers.set(id, controller);
    }
    const original = { ...collider.translation() };
    try {
      collider.setTranslation(pos);
      verticalSpeed = Math.max(-20, verticalSpeed - 20 * dt);
      controller.computeColliderMovement(collider, {
        x: move.x,
        y: verticalSpeed * dt,
        z: move.z,
      });
      const m = controller.computedMovement();
      return {
        pos: { x: pos.x + m.x, y: pos.y + m.y, z: pos.z + m.z },
        verticalSpeed: controller.computedGrounded() ? 0 : verticalSpeed,
      };
    } finally {
      collider.setTranslation(original);
    }
  }
  dispose() {
    this.world.free();
  }
}
