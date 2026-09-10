import type { State, Vec } from "../simulation/types";
const mix = (a: Vec, b: Vec, t: number): Vec => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
});
const gap = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
/** Bounded, timestamped poses. Lifecycle/state always comes from the newest truth. */
export class PresentationTimeline {
  frames: { seq: number; time: number; received: number; state: State }[] = [];
  entityReset = new Map<string, number>();
  epoch = -1;
  paused = false;
  resets = 0;
  underruns = 0;
  delayMs = 75;
  playTime?: number;
  lastSample = 0;
  reset() {
    this.frames = [];
    this.entityReset.clear();
    this.epoch = -1;
    this.resets++;
    this.playTime = undefined;
    this.lastSample = 0;
  }
  push(state: State, seq: number, now: number, paused: boolean) {
    const last = this.frames.at(-1);
    if (last && seq <= last.seq) return;
    const discontinuity =
      state.party?.epoch !== this.epoch ||
      paused !== this.paused ||
      (last && state.tick < last.state.tick);
    if (discontinuity) this.reset();
    else if (last)
      for (const e of state.entities) {
        const old = last.state.entities.find((o) => o.id === e.id);
        if (!old || old.hp > 0 !== e.hp > 0 || gap(old.pos, e.pos) > 3)
          this.entityReset.set(e.id, seq);
      }
    for (const id of this.entityReset.keys())
      if (!state.entities.some((e) => e.id === id)) this.entityReset.delete(id);
    this.epoch = state.party?.epoch ?? 0;
    this.paused = paused;
    this.frames.push({ seq, time: state.time, received: now, state });
    if (this.frames.length > 12) this.frames.shift();
  }
  sample(latest: State, localId: string, now: number): State {
    const last = this.frames.at(-1);
    if (!last || this.paused || this.frames.length < 2) return latest;
    if (this.playTime === undefined)
      this.playTime = Math.max(
        this.frames[0].time,
        last.time - this.delayMs / 1000,
      );
    const delta = this.lastSample
      ? Math.max(0, Math.min(0.1, (now - this.lastSample) / 1000))
      : 0;
    this.lastSample = now;
    const buffer = last.time - this.playTime;
    this.playTime = Math.min(
      last.time,
      Math.max(
        this.frames[0].time,
        this.playTime + delta * (buffer > 0.15 ? 1.1 : buffer < 0.04 ? 0.9 : 1),
      ),
    );
    const time = this.playTime;
    let a = this.frames[0],
      b = last;
    for (let i = 1; i < this.frames.length; i++) {
      if (this.frames[i].time >= time) {
        a = this.frames[i - 1];
        b = this.frames[i];
        break;
      }
    }
    const t =
      b.time > a.time
        ? Math.max(0, Math.min(1, (time - a.time) / (b.time - a.time)))
        : 1;
    if (time >= last.time) this.underruns++;
    return {
      ...latest,
      entities: latest.entities.map((e) => {
        if (
          e.id === localId ||
          e.hp <= 0 ||
          a.seq < (this.entityReset.get(e.id) ?? 0)
        )
          return e;
        const from = a.state.entities.find((o) => o.id === e.id),
          to = b.state.entities.find((o) => o.id === e.id);
        return from && to && from.hp > 0 && to.hp > 0
          ? { ...e, pos: mix(from.pos, to.pos, t) }
          : {
              ...e,
              pos:
                this.frames
                  .find((f) => f.state.entities.some((o) => o.id === e.id))
                  ?.state.entities.find((o) => o.id === e.id)?.pos ?? e.pos,
            };
      }),
      bolts: latest.bolts.map((e) => {
        const from = a.state.bolts.find((o) => o.id === e.id),
          to = b.state.bolts.find((o) => o.id === e.id);
        return from && to
          ? { ...e, pos: mix(from.pos, to.pos, t) }
          : {
              ...e,
              pos:
                this.frames
                  .find((f) => f.state.bolts.some((o) => o.id === e.id))
                  ?.state.bolts.find((o) => o.id === e.id)?.pos ?? e.pos,
            };
      }),
    };
  }
}
