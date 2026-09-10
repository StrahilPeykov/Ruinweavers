import { ScriptedPolicy, type ObservationMode } from "./policies";
import { distance, type Simulation } from "../simulation/simulation";
import { vec } from "../simulation/types";

export const BUILD_POLICY_VERSION = "build-policies-3";
export const BUILD_NAMES = ["reaction", "field", "structure"] as const;
export type BuildName = (typeof BUILD_NAMES)[number];
// Transparent intent generator. Shares the existing delayed observations, keyboard
// motor/probes and visible-danger dodge. Never reads AI timers or future state.
export class BuildPolicy extends ScriptedPolicy {
  nextField = 0;
  constructor(
    public build: BuildName,
    mode: ObservationMode = "delayed-aim",
    seed = 123,
  ) {
    super("attack-move", mode, seed, undefined, "keyboard");
  }
  override decide(o: Parameters<ScriptedPolicy["decide"]>[0], sim: Simulation) {
    const input = super.decide(o, sim);
    const target = o.enemies.find((e) => e.id === this.lastTarget);
    if (!target) return input;
    const owned = o.fields.filter((f) => f.source === o.player.id);
    const d = distance(o.player.pos, target.pos);
    const secondary = (
      principle: "Ember" | "Tide" | "Gale",
      point = input.aim,
    ) => {
      input.select = principle;
      input.aim = point;
      input.primary = false;
      input.secondary = true;
      this.nextField = o.time + 1.1;
    };
    if (this.build === "reaction") {
      // Jet establishes wetness, return lane exploits it; no automatic basin loop.
      input.select = target.wet < 0.2 ? "Tide" : "Ember";
      if (
        input.select === "Tide" &&
        sim.state.run?.upgrades[sim.actorId]?.includes("forked-tide")
      ) {
        // Put one branch on the selected body, not the deliberate gap between jets.
        const dx = input.aim.x - o.player.pos.x,
          dz = input.aim.z - o.player.pos.z;
        input.aim.x =
          o.player.pos.x + dx * Math.cos(0.22) + dz * Math.sin(0.22);
        input.aim.z =
          o.player.pos.z + dz * Math.cos(0.22) - dx * Math.sin(0.22);
      }
    } else if (this.build === "structure") {
      input.select = target.cohesion >= 0.25 && d < 5.7 ? "Gale" : "Stone";
      // A close updraft buys space and can release bindings on structural targets.
      if (d < 3.5 && !owned.length && o.time >= this.nextField)
        secondary("Gale", vec(o.player.pos.x, 0, o.player.pos.z));
    } else {
      const seam = owned.find((f) => f.principle === "Ember");
      const updraft = owned.find((f) => f.principle === "Gale");
      if (
        o.time >= this.nextField &&
        (!seam || seam.life < 1 || distance(seam.pos, target.pos) > 5)
      )
        secondary("Ember");
      else if (
        o.time >= this.nextField &&
        !updraft &&
        sim.state.run?.upgrades[sim.actorId]?.includes("double-inscription")
      )
        secondary("Gale", input.aim);
      else {
        // Redirect only a field lying between us and the target, not one already
        // beyond it. Otherwise feed moisture into heat or erupt to hold the lane.
        const transferable = owned.find(
          (f) =>
            f.principle !== "Stone" &&
            distance(f.pos, o.player.pos) < 5.7 &&
            distance(f.pos, target.pos) > 1.3 &&
            distance(f.pos, target.pos) < d &&
            (f.pos.x - o.player.pos.x) * (target.pos.x - f.pos.x) +
              (f.pos.z - o.player.pos.z) * (target.pos.z - f.pos.z) >
              0,
        );
        if (
          transferable &&
          sim.state.run?.upgrades[sim.actorId]?.includes(
            "migrating-inscriptions",
          )
        ) {
          input.select = "Gale";
          input.aim = { ...transferable.pos };
        } else input.select = target.heat >= 25 ? "Tide" : "Stone";
      }
    }
    return input;
  }
}
