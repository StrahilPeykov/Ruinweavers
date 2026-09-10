import { beforeAll, it, expect, vi } from "vitest";
import { initPhysics } from "../../src/physics/world";
import { Simulation } from "../../src/simulation/simulation";
import { configFromQuery } from "../../src/experiments/config";
import { CoopSession } from "../../src/network/session";
import { InputMailbox } from "../../src/network/input-mailbox";
import { idleInput } from "../../src/simulation/types";
beforeAll(initPhysics);
it("newer release overtaking a tap still delivers one press, and retransmission cannot duplicate it", () => {
  const sim = new Simulation(configFromQuery("?scene=trial"));
  sim.addPartner();
  sim.ready("mage-1");
  sim.ready("mage-2");
  const guest = new CoopSession(
    sim,
    () => {},
    () => {},
  );
  guest.role = "guest";
  guest.peerId = "test";
  guest.epoch = sim.state.party!.epoch;
  guest.lastSend = 100;
  const packets: any[] = [];
  guest.inputAction = {
    send: async (p: any) => {
      packets.push(p);
    },
  } as any;
  guest.submit({ ...idleInput(), primary: true }, 116);
  guest.submit(idleInput(), 133);
  guest.submit(idleInput(), 166);
  const box = new InputMailbox();
  expect(box.receive(packets[1], guest.epoch, 210)).toBe(true);
  expect(box.receive(packets[0], guest.epoch, 220)).toBe(false);
  sim.stepParty({ "mage-2": box.consume(221) });
  expect(sim.state.metrics.outcomes["mage-2:cast:Ember:primary"]).toBe(1);
  // A new sequence can carry the same press ID, even after cooldown: still one action.
  for (let i = 0; i < 60; i++)
    sim.stepParty({ "mage-2": box.consume(230 + i * 17) });
  box.receive({ ...packets[1], seq: 99 }, guest.epoch, 1500);
  sim.stepParty({ "mage-2": box.consume(1501) });
  expect(sim.state.metrics.outcomes["mage-2:cast:Ember:primary"]).toBe(1);
  sim.dispose();
});
it("guest tap sampled 116ms and released 133ms survives send boundary and casts exactly once", () => {
  const sim = new Simulation(configFromQuery("?scene=trial"));
  sim.addPartner();
  sim.ready("mage-1");
  sim.ready("mage-2");
  const guest = new CoopSession(
    sim,
    () => {},
    () => {},
  );
  guest.role = "guest";
  guest.peerId = "test";
  guest.epoch = sim.state.party!.epoch;
  guest.lastSend = 100;
  const box = new InputMailbox();
  const packets: any[] = [];
  guest.inputAction = {
    send: async (p: any) => {
      packets.push(p);
      box.receive(p, guest.epoch, 133);
    },
  } as any;
  guest.submit({ ...idleInput(), primary: true }, 116);
  guest.submit(idleInput(), 133);
  expect(packets).toHaveLength(1);
  sim.stepParty({ "mage-2": box.consume(134) });
  expect(sim.state.metrics.outcomes["mage-2:cast:Ember:primary"]).toBe(1);
  for (let i = 0; i < 60; i++)
    sim.stepParty({ "mage-2": box.consume(150 + i * 17) });
  expect(sim.state.metrics.outcomes["mage-2:cast:Ember:primary"]).toBe(1);
  sim.dispose();
});
it("tap intent never bypasses cooldown or survives clear/stale boundaries; holds still repeat", () => {
  const sim = new Simulation(configFromQuery("?scene=trial"));
  sim.addPartner();
  sim.ready("mage-1");
  sim.ready("mage-2");
  const box = new InputMailbox();
  let seq = 0;
  const receive = (primary: boolean, now: number, clear = false) =>
    box.receive(
      {
        version: 2,
        seq: ++seq,
        epoch: 0,
        input: { ...idleInput(), primary },
        clear,
      },
      0,
      now,
    );
  sim.state.actors["mage-2"].primaryReady = 1;
  receive(true, 100);
  receive(false, 110);
  sim.stepParty({ "mage-2": box.consume(120) });
  for (let i = 0; i < 90; i++)
    sim.stepParty({ "mage-2": box.consume(130 + i * 17) });
  expect(
    sim.state.metrics.outcomes["mage-2:cast:Ember:primary"],
  ).toBeUndefined();
  for (let i = 0; i < 60; i++) {
    receive(true, 2000 + i * 17);
    sim.stepParty({ "mage-2": box.consume(2000 + i * 17) });
  }
  const count = sim.state.metrics.outcomes["mage-2:cast:Ember:primary"];
  expect(count).toBeGreaterThan(1);
  receive(false, 3100, true);
  for (let i = 0; i < 60; i++)
    sim.stepParty({ "mage-2": box.consume(3100 + i * 17) });
  expect(sim.state.metrics.outcomes["mage-2:cast:Ember:primary"]).toBe(count);
  receive(true, 5000);
  expect(box.consume(5251).primary).toBe(false);
  sim.dispose();
});
it("focus release cancels an application-delayed tap rather than sending it later", async () => {
  vi.useFakeTimers();
  const sim = new Simulation(configFromQuery("?scene=trial"));
  sim.addPartner();
  const guest = new CoopSession(
    sim,
    () => {},
    () => {},
  );
  guest.role = "guest";
  guest.status = "connected";
  guest.peerId = "test";
  guest.profile.delayMs = 80;
  guest.lastSend = 100;
  const packets: any[] = [];
  guest.inputAction = {
    send: async (p: any) => {
      packets.push(p);
    },
  } as any;
  try {
    guest.submit({ ...idleInput(), primary: true }, 116);
    guest.submit(idleInput(), 133);
    guest.release();
    await vi.advanceTimersByTimeAsync(100);
    expect(packets).toHaveLength(1);
    expect(packets[0].clear).toBe(true);
    expect(packets[0].primaryPress).toBeUndefined();
    guest.submit({ ...idleInput(), primary: true }, 150);
    await guest.leave();
    expect(guest.primaryIntent).toBeUndefined();
  } finally {
    sim.dispose();
    vi.useRealTimers();
  }
});
it("host sampling also preserves a tap before the next simulation step", () => {
  const sim = new Simulation(configFromQuery("?scene=trial"));
  sim.addPartner();
  sim.ready("mage-1");
  sim.ready("mage-2");
  const host = new CoopSession(
    sim,
    () => {},
    () => {},
  );
  host.role = "host";
  host.epoch = sim.state.party!.epoch;
  host.submit({ ...idleInput(), primary: true }, 116);
  host.submit(idleInput(), 133);
  sim.stepParty({ "mage-1": host.local.consume(134) });
  expect(sim.state.metrics.outcomes["mage-1:cast:Ember:primary"]).toBe(1);
  sim.dispose();
});
