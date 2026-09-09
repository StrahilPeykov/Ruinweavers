import { PRINCIPLES } from "../experiments/config";
import { idleInput, type FrameInput } from "../simulation/types";

export interface InputPacket {
  version: 1;
  epoch: number;
  seq: number;
  input: FrameInput;
  clear?: boolean;
}
export function validateInput(value: unknown): FrameInput | null {
  const v = value as FrameInput;
  if (
    !v ||
    !v.aim ||
    ![-1, 0, 1].includes(v.moveX) ||
    ![-1, 0, 1].includes(v.moveZ)
  )
    return null;
  if (
    ![v.aim.x, v.aim.y, v.aim.z].every(
      (n) => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 100,
    )
  )
    return null;
  if (
    ![v.primary, v.secondary, v.dodge, v.interact].every(
      (b) => typeof b === "boolean",
    )
  )
    return null;
  if (v.select !== undefined && !PRINCIPLES.includes(v.select)) return null;
  if (v.cycle !== undefined && ![-1, 0, 1].includes(v.cycle)) return null;
  return {
    ...idleInput({
      x: v.aim.x,
      y: v.aim.y,
      z: v.aim.z,
      body: v.aim.body === true,
      invalid: v.aim.invalid === true,
    }),
    moveX: v.moveX,
    moveZ: v.moveZ,
    primary: v.primary,
    secondary: v.secondary,
    dodge: v.dodge,
    interact: v.interact,
    revive: v.revive === true,
    select: v.select,
    cycle: v.cycle,
    primaryDevice:
      v.primaryDevice === "keyboard-fallback" ? "keyboard-fallback" : "mouse",
    secondaryDevice:
      v.secondaryDevice === "keyboard-fallback" ? "keyboard-fallback" : "mouse",
  };
}
/** Held state plus at most one discrete cast, not a future-action queue. */
export class InputMailbox {
  latest = idleInput();
  secondary?: FrameInput;
  dodge = false;
  interact = false;
  seq = -1;
  received = -Infinity;
  stale = true;
  rejected = 0;
  window = 0;
  count = 0;
  receive(value: unknown, epoch: number, now: number) {
    const p = value as InputPacket;
    if (now - this.window >= 1000) {
      this.window = now;
      this.count = 0;
    }
    if (
      ++this.count > 120 ||
      !p ||
      p.version !== 1 ||
      p.epoch !== epoch ||
      !Number.isSafeInteger(p.seq) ||
      p.seq <= this.seq
    ) {
      this.rejected++;
      return false;
    }
    const input = validateInput(p.input);
    if (!input) {
      this.rejected++;
      return false;
    }
    this.seq = p.seq;
    this.received = now;
    this.stale = false;
    if (p.clear) this.clear();
    this.latest = input;
    if (input.secondary) this.secondary = structuredClone(input);
    this.dodge ||= input.dodge;
    this.interact ||= input.interact;
    return true;
  }
  clear() {
    this.latest = idleInput();
    this.secondary = undefined;
    this.dodge = this.interact = false;
  }
  consume(now: number) {
    if (now - this.received > 250) {
      this.clear();
      this.stale = true;
    }
    let input = {
      ...this.latest,
      secondary: false,
      dodge: this.dodge,
      interact: this.interact,
      cycle: 0,
    };
    if (this.secondary) {
      input = {
        ...input,
        secondary: true,
        aim: this.secondary.aim,
        select: this.secondary.select,
      };
      this.secondary = undefined;
    }
    this.latest.select = undefined;
    this.latest.cycle = 0;
    this.dodge = this.interact = false;
    return input;
  }
}
