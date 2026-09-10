import { initPhysics } from "../src/physics/world";
import { Simulation } from "../src/simulation/simulation";
import { configFromQuery } from "../src/experiments/config";
import { offerRewards, type UpgradeId } from "../src/simulation/run";
await initPhysics();
const builds: Record<string, UpgradeId[]> = {
  reaction: ["forked-tide", "undertow", "shared-vapour"],
  field: ["double-inscription", "cross-seam", "migrating-inscriptions"],
  structure: ["stone-echo", "fault-line", "break-seal"],
  legacyHost: ["double-inscription"],
  legacyGuest: ["tethered-updraft"],
};
for (const names of [
  ["reaction"],
  ["field"],
  ["structure"],
  ["reaction", "structure"],
  ["field", "field"],
]) {
  const sim = new Simulation(configFromQuery("?scene=run"));
  if (names.length === 2) sim.addPartner();
  let found = -1;
  for (let seed = 0; seed < 50000; seed++) {
    sim.state.seed = seed;
    sim.state.trial!.status = "between";
    sim.state.run!.upgrades = Object.fromEntries(
      names.map((_, i) => [`mage-${i + 1}`, []]),
    );
    let good = true;
    for (const [stop, encounter] of [0, 2, 3].entries()) {
      sim.state.trial!.encounter = encounter;
      sim.state.run!.reward = undefined;
      offerRewards(sim.state);
      const reward = sim.state.run!.reward!;
      for (const [i, name] of names.entries()) {
        const actor = `mage-${i + 1}`,
          choice = builds[name][stop];
        if (!reward.offers[actor].includes(choice)) {
          good = false;
          break;
        }
        sim.chooseUpgrade(actor, sim.state.run!.id, reward.id, choice);
      }
      if (!good) break;
    }
    if (good) {
      found = seed;
      break;
    }
  }
  console.log(names.join("+"), found);
  sim.dispose();
}
// Preserve the previous art-motion comparison's exact original abilities.
const sim = new Simulation(configFromQuery("?scene=run"));
sim.addPartner();
for (let seed = 0; seed < 10000; seed++) {
  sim.state.seed = seed;
  sim.state.run!.reward = undefined;
  offerRewards(sim.state);
  const r = sim.state.run!.reward!.offers;
  if (
    ["double-inscription", "travelling-basin"].every((id) =>
      r["mage-1"].includes(id as UpgradeId),
    ) &&
    ["stone-echo", "tethered-updraft"].every((id) =>
      r["mage-2"].includes(id as UpgradeId),
    )
  ) {
    console.log("legacy-art", seed);
    break;
  }
}
sim.dispose();
