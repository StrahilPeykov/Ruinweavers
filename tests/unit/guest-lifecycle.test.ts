import { beforeAll, it, expect, vi } from "vitest";
import { initPhysics } from "../../src/physics/world";
import { Simulation } from "../../src/simulation/simulation";
import { configFromQuery } from "../../src/experiments/config";
import { CoopSession } from "../../src/network/session";
import { encodeSnapshot } from "../../src/network/wire";
const fake = vi.hoisted(() => ({ actions: {} as Record<string, any> }));
vi.mock("@trystero-p2p/ws-relay", () => ({
  joinRoom: () => ({
    makeAction: (name: string) =>
      (fake.actions[name] = { send: async () => {} }),
    leave: async () => {},
    getPeers: () => ({}),
  }),
}));
beforeAll(initPhysics);
it("guest intent belongs to local lifecycle, not enemy/prop/partner discontinuities", async () => {
  const host = new Simulation(configFromQuery("?scene=trial"));
  host.addPartner();
  host.ready("mage-1");
  host.ready("mage-2");
  const guest = new Simulation(host.config),
    clear = vi.fn();
  const session = new CoopSession(guest, () => {}, clear);
  await session.connect("guest", "ABCDEF", "local");
  session.peerId = "host";
  let seq = 0;
  const send = () =>
    fake.actions.state.onMessage(
      encodeSnapshot(host.state, host.config, ++seq, false, true),
      { peerId: "host" },
    );
  send();
  clear.mockClear();
  for (const id of [
    host.state.entities.find((e) => e.ai)!.id,
    "timber",
    "mage-1",
  ]) {
    host.state.entities.find((e) => e.id === id)!.hp = 0;
    send();
    expect(clear).not.toHaveBeenCalled();
  }
  host.state.entities.find((e) => e.id === "ballast")!.pos.x += 4;
  send();
  expect(clear).not.toHaveBeenCalled();
  host.players[1].hp = 0;
  send();
  expect(clear).toHaveBeenCalledTimes(1);
  host.players[1].hp = 35;
  send();
  expect(clear).toHaveBeenCalledTimes(2);
  host.state.party!.epoch++;
  send();
  expect(clear).toHaveBeenCalledTimes(3);
  await session.leave();
  host.dispose();
  guest.dispose();
});
