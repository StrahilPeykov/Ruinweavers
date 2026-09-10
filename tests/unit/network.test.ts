import { PROTOCOL } from "../../src/network/protocol";
import { it, expect } from "vitest";
import { InputMailbox, validateInput } from "../../src/network/input-mailbox";
import { idleInput, vec } from "../../src/simulation/types";
it("wire inputs validate finite eight-direction commands and reject invalid controls", () => {
  expect(validateInput({ ...idleInput(), moveX: 0.3 })).toBeNull();
  expect(validateInput({ ...idleInput(), aim: vec(NaN, 0, 0) })).toBeNull();
  expect(validateInput({ ...idleInput(), select: "Lightning" })).toBeNull();
  expect(validateInput({ ...idleInput(), moveX: -1, moveZ: 1 })).not.toBeNull();
});
it("mailbox rejects replay/old epochs, captures discrete aim and stops stale holds", () => {
  const m = new InputMailbox();
  const packet = (seq: number, input = idleInput()) => ({
    version: PROTOCOL,
    epoch: 3,
    seq,
    input,
  });
  expect(
    m.receive(
      packet(1, {
        ...idleInput(vec(2, 0, 2)),
        secondary: true,
        select: "Stone",
        moveX: 1,
        primary: true,
      }),
      3,
      100,
    ),
  ).toBe(true);
  expect(m.receive(packet(1), 3, 110)).toBe(false);
  expect(m.receive({ ...packet(2), epoch: 2 }, 3, 110)).toBe(false);
  m.receive(
    packet(2, {
      ...idleInput(vec(-2, 0, -2)),
      select: "Tide",
      primary: true,
      moveX: 1,
    }),
    3,
    120,
  );
  const cast = m.consume(130);
  expect(cast.secondary).toBe(true);
  expect(cast.select).toBe("Stone");
  expect(cast.aim.x).toBe(2);
  expect(m.consume(140).secondary).toBe(false);
  expect(m.consume(371).primary).toBe(false);
  expect(m.consume(372).moveX).toBe(0);
  expect(m.stale).toBe(true);
});
it("focus release clears a pending cast even before the stale timeout", () => {
  const m = new InputMailbox();
  m.receive(
    {
      version: PROTOCOL,
      epoch: 0,
      seq: 1,
      input: { ...idleInput(), secondary: true },
    },
    0,
    0,
  );
  m.receive(
    { version: PROTOCOL, epoch: 0, seq: 2, input: idleInput(), clear: true },
    0,
    1,
  );
  expect(m.consume(2).secondary).toBe(false);
});
