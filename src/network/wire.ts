import type { Config } from "../experiments/config";
import type { Entity, State } from "../simulation/types";
import { createState } from "../simulation/lab";
import { PROTOCOL } from "./protocol";
const dynamic = (e: Entity) => ({
  id: e.id,
  pos: e.pos,
  velocity: e.velocity,
  rotation: e.rotation,
  hp: e.hp,
  heat: e.heat,
  wet: e.wet,
  cohesion: e.cohesion,
  burning: e.burning,
  stagger: e.stagger,
  staggerReady: e.staggerReady,
  sources: e.sources,
  hitAt: e.hitAt,
  ai: e.ai,
});
export function encodeSnapshot(
  s: State,
  config: Config,
  seq: number,
  paused: boolean,
  bootstrap: boolean,
  eventAck = 0,
  ackSample = 0,
  ackPrimary = 0,
) {
  return structuredClone({
    version: PROTOCOL,
    seq,
    epoch: s.party!.epoch,
    paused,
    ackSample,
    ackPrimary,
    staticData: bootstrap
      ? {
          config,
          terrain: s.terrain,
          seed: s.seed,
          entities: s.entities.map((e) => ({
            id: e.id,
            kind: e.kind,
            label: e.label,
            radius: e.radius,
            height: e.height,
            mass: e.mass,
            maxHp: e.maxHp,
            material: e.material,
          })),
        }
      : undefined,
    live: {
      time: s.time,
      tick: s.tick,
      entities: s.entities.map(dynamic),
      actors: s.actors,
      fields: s.fields,
      bolts: s.bolts,
      pending: s.pending,
      trial: s.trial,
      run: s.run ?? null,
      guardian: s.guardian ?? null,
      party: s.party,
      serial: s.serial,
      sentinel: s.sentinel,
      mechanism: s.mechanism,
    },
    events: s.events.filter((e) => e.id > eventAck),
  });
}
export type SnapshotPacket = ReturnType<typeof encodeSnapshot>;
export class WireReader {
  epoch = -1;
  staticData?: NonNullable<SnapshotPacket["staticData"]>;
  eventAck = 0;
  reset() {
    this.epoch = -1;
    this.staticData = undefined;
    this.eventAck = 0;
  }
  read(p: SnapshotPacket, previous: State): State | null {
    if (
      p.version !== PROTOCOL ||
      !Number.isSafeInteger(p.epoch) ||
      !p.live ||
      !Array.isArray(p.live.entities) ||
      p.live.entities.length > 64 ||
      !p.live.actors?.["mage-2"] ||
      !Array.isArray(p.events) ||
      p.events.length > 180 ||
      p.live.fields.length > 8 ||
      p.live.bolts.length > 256 ||
      p.live.pending.length > 64 ||
      !Number.isFinite(p.live.time) ||
      !Number.isSafeInteger(p.live.tick) ||
      p.live.party?.epoch !== p.epoch
    )
      return null;
    const changed = p.epoch !== this.epoch;
    const base = p.staticData ?? (!changed ? this.staticData : undefined);
    if (
      !base ||
      base.entities.length > 64 ||
      p.live.entities.some((e) => !base.entities.some((t) => t.id === e.id))
    )
      return null;
    const events = [...(!changed ? previous.events : []), ...p.events];
    const unique = new Map(events.map((e) => [e.id, e]));
    const liveEvents = [...unique.values()]
      .filter((e) => p.live.time - e.time < Math.max(2, e.duration))
      .sort((a, b) => a.id - b.id)
      .slice(-180);
    this.epoch = p.epoch;
    this.staticData = base;
    this.eventAck = Math.max(
      changed ? 0 : this.eventAck,
      ...p.events.map((e) => e.id),
    );
    return {
      ...previous,
      ...p.live,
      run: p.live.run ?? undefined,
      guardian: p.live.guardian ?? undefined,
      seed: base.seed,
      terrain: base.terrain,
      entities: p.live.entities.map((e) => ({
        ...base.entities.find((t) => t.id === e.id)!,
        ...e,
      })),
      events: liveEvents,
      metrics: changed ? createState(base.config).metrics : previous.metrics,
    };
  }
}
