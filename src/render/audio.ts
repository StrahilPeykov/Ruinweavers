import type { State } from "../simulation/types";
import { readPreference, writePreference } from "../preferences";

/** Small local cues; audio never advances or changes simulation. */
export class LabAudio {
  context?: AudioContext;
  muted = readPreference("ruinweavers-muted-v1") === true;
  lastEvent = 0;
  played = 0;
  roomCue = "";
  constructor() {
    const unlock = () => {
      this.context ??= new AudioContext();
      void this.context.resume();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
  }
  reset() {
    this.lastEvent = 0;
  }
  toggleMute() {
    this.muted = !this.muted;
    writePreference("ruinweavers-muted-v1", this.muted);
    return this.muted;
  }
  update(s: State) {
    const events = s.events.filter((e) => e.id > this.lastEvent);
    this.lastEvent = Math.max(this.lastEvent, ...events.map((e) => e.id));
    const ctx = this.context;
    if (!ctx || ctx.state !== "running" || this.muted) return;
    const cueKey = s.run
      ? `${s.run.id}:${s.trial?.encounter}:${s.trial?.status}`
      : "";
    if (cueKey !== this.roomCue) {
      this.roomCue = cueKey;
      if (s.run && ["active", "victory"].includes(s.trial?.status ?? "")) {
        const resolved = s.trial?.status === "victory";
        for (const [i, hz] of (resolved
          ? [196, 247, 294, 392]
          : [147, 196]
        ).entries()) {
          const osc = ctx.createOscillator(),
            gain = ctx.createGain(),
            at = ctx.currentTime + i * 0.18;
          osc.frequency.value = hz;
          gain.gain.setValueAtTime(0, at);
          gain.gain.linearRampToValueAtTime(0.012, at + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.3);
          osc.connect(gain).connect(ctx.destination);
          osc.start(at);
          osc.stop(at + 1.4);
          osc.onended = () => {
            osc.disconnect();
            gain.disconnect();
          };
        }
      }
    }
    let voices = 0;
    for (const e of events) {
      if (s.time - e.time > 0.2 || voices >= 4) continue;
      const pitch = { Ember: 240, Tide: 390, Gale: 150, Stone: 95 }[
        e.principle ?? "Stone"
      ];
      const cue: Record<string, [number, number, number]> = {
        cast: [pitch, pitch * 0.72, 0.08],
        impact: [180, 75, 0.09],
        steam: [700, 180, 0.24],
        shatter: [140, 45, 0.16],
        wet: [540, 760, 0.07],
        structure: [190, 310, 0.1],
        rejected: [100, 85, 0.06],
        dissolve: [260, 80, 0.18],
        manifestation: [pitch * 0.8, pitch * 1.5, 0.16],
        "vapour-link": [580, 850, 0.12],
        "seal-release": [110, 420, 0.18],
        "inscription-drift": [170, 350, 0.15],
        "warden-windup": [90, 170, 0.35],
        "warden-volley": [180, 55, 0.2],
        "warden-march": [85, 45, 0.3],
        "warden-furnace": [140, 400, 0.4],
        "warden-shift": [240, 65, 0.6],
        "warden-unbind": [220, 90, 0.16],
        "warden-fall": [130, 35, 0.8],
      };
      const spec = cue[e.type];
      if (!spec) continue;
      voices++;
      this.played++;
      const [start, end, length] = spec,
        now = ctx.currentTime;
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.type = e.type === "steam" ? "triangle" : "sine";
      osc.frequency.setValueAtTime(start, now);
      osc.frequency.exponentialRampToValueAtTime(end, now + length);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.025, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + length + 0.01);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    }
  }
}
