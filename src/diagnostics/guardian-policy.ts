import { BuildPolicy } from "./build-policies";
import { ScriptedPolicy, type ObservationMode } from "./policies";
import type { Simulation } from "../simulation/simulation";
import { vec, type FrameInput } from "../simulation/types";
export const GUARDIAN_POLICY_VERSION = "guardian-policy-1";
export const GUARDIAN_BUILDS: Record<string, string[]> = {
  base: [],
  reaction: ["forked-tide", "undertow", "shared-vapour"],
  "reaction-without-vapour": ["forked-tide", "undertow"],
  field: ["double-inscription", "cross-seam", "migrating-inscriptions"],
  structure: ["stone-echo", "fault-line", "break-seal"],
  basin: ["travelling-basin", "piercing-ember", "shared-vapour"],
};
/** Same motor and 200ms observations for every build. Reads only visible danger geometry. */
export class GuardianPolicy {
  base: ScriptedPolicy;
  history: {
    time: number;
    stage: string;
    maneuver: string;
    direction: { x: number; z: number };
    pos: { x: number; z: number };
  }[] = [];
  constructor(
    public build = "base",
    public mode: ObservationMode = "delayed-aim",
    seed = 123,
  ) {
    this.base = [
      "reaction",
      "reaction-without-vapour",
      "field",
      "structure",
    ].includes(build)
      ? new BuildPolicy(
          build === "reaction-without-vapour"
            ? "reaction"
            : (build as "reaction" | "field" | "structure"),
          mode,
          seed,
        )
      : new ScriptedPolicy(
          build === "basin" ? "basin-ember" : "attack-move",
          mode,
          seed,
          undefined,
          "keyboard",
        );
  }
  input(sim: Simulation): FrameInput {
    const f = { ...this.base.input(sim) },
      g = sim.state.guardian,
      core = sim.state.entities.find((e) => e.id === g?.core);
    if (!g || !core) return f;
    this.history.push({
      time: sim.state.time,
      stage: g.stage,
      maneuver: g.maneuver,
      direction: { ...g.direction },
      pos: { ...core.pos },
    });
    if (this.history.length > 30) this.history.shift();
    const delay = this.mode === "delayed-aim" ? 0.2 : 0;
    const o =
      [...this.history]
        .reverse()
        .find((o) => o.time <= sim.state.time - delay) ?? this.history[0];
    const p = sim.player,
      dx = p.pos.x - o.pos.x,
      dz = p.pos.z - o.pos.z,
      d = Math.hypot(dx, dz);
    let escape: { x: number; z: number } | undefined;
    if (["telegraph", "commit", "attack"].includes(o.stage)) {
      if (o.maneuver === "furnace" && d < 5.6) escape = { x: dx, z: dz };
      if (o.maneuver === "march") {
        const forward = dx * o.direction.x + dz * o.direction.z,
          side = dx * o.direction.z - dz * o.direction.x;
        if (forward > -1.5 && forward < 10 && Math.abs(side) < 2.4)
          escape = {
            x: o.direction.z * (side >= 0 ? 1 : -1),
            z: -o.direction.x * (side >= 0 ? 1 : -1),
          };
      }
    }
    if (escape) {
      const angle = Math.atan2(escape.x, escape.z),
        x = Math.round(Math.sin(angle)),
        z = Math.round(Math.cos(angle));
      if (
        !sim.physics.terrainHit(
          vec(p.pos.x, 0.3, p.pos.z),
          vec(p.pos.x + x * 1.2, 0.3, p.pos.z + z * 1.2),
        )
      ) {
        f.moveX = x;
        f.moveZ = z;
      }
      if (o.stage === "commit" || o.stage === "attack") f.dodge = true;
    }
    return f;
  }
}
