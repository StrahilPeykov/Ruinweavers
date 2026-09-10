import type { State, Vec, FrameInput } from "../simulation/types";
import type { Config } from "../experiments/config";
import type { Physics } from "../physics/world";
import { record } from "../diagnostics/timing";
/** Local walk preview only. Authority decides dodge, cast cost, HP and every outcome. */
export class LocalPrediction {
  history: { sample: number; at: number; dt: number; input: FrameInput }[] = [];
  pos?: Vec;
  verticalSpeed = 0;
  lastAt = 0;
  lastAuthorityAt = 0;
  corrections: number[] = [];
  dropped = 0;
  reset() {
    this.history = [];
    this.pos = undefined;
    this.lastAt = 0;
    this.lastAuthorityAt = 0;
  }
  advance(
    input: FrameInput,
    dt: number,
    state: State,
    id: string,
    config: Config,
    physics: Physics,
    time = state.time,
  ) {
    const actor = state.actors[id],
      entity = state.entities.find((e) => e.id === id);
    if (!entity || entity.hp <= 0 || state.trial?.status !== "active") {
      this.pos = entity?.pos;
      return;
    }
    this.pos ??= { ...entity.pos };
    // Dodge remains authoritative; don't guess its success or invulnerability.
    if (input.dodge || time < actor.dodgeUntil) return;
    const length = Math.hypot(input.moveX, input.moveZ) || 1;
    const speed =
      config.moveSpeed *
      (time < actor.castUntil ? config.castMoveMultiplier : 1);
    const result = physics.previewMove(
      id,
      this.pos,
      {
        x: (input.moveX / length) * speed * dt,
        y: 0,
        z: (input.moveZ / length) * speed * dt,
      },
      this.verticalSpeed,
      dt,
    );
    this.pos = result.pos;
    this.verticalSpeed = result.verticalSpeed;
  }
  capture(
    sample: number,
    input: FrameInput,
    now: number,
    state: State,
    id: string,
    config: Config,
    physics: Physics,
  ) {
    const dt = this.lastAt
      ? Math.max(0, Math.min(0.05, (now - this.lastAt) / 1000))
      : 1 / 60;
    this.lastAt = now;
    this.lastAuthorityAt ||= now;
    this.history.push({ sample, at: now, dt, input: { ...input } });
    while (
      this.history.length > 32 ||
      (this.history.length && now - this.history[0].at > 350)
    ) {
      this.history.shift();
      this.dropped++;
    }
    if (now - this.lastAuthorityAt <= 350)
      this.advance(input, dt, state, id, config, physics);
  }
  reconcile(
    ack: number,
    state: State,
    id: string,
    config: Config,
    physics: Physics,
    now = performance.now(),
  ) {
    this.lastAuthorityAt = now;
    const entity = state.entities.find((e) => e.id === id);
    if (!entity) return;
    const old = this.pos;
    this.history = this.history.filter((h) => h.sample > ack);
    this.pos = { ...entity.pos };
    this.verticalSpeed = state.actors[id].verticalSpeed;
    let time = state.time;
    for (const h of this.history) {
      time += h.dt;
      this.advance(h.input, h.dt, state, id, config, physics, time);
    }
    if (old && this.pos)
      record(
        this.corrections,
        Math.hypot(old.x - this.pos.x, old.y - this.pos.y, old.z - this.pos.z),
      );
  }
}
