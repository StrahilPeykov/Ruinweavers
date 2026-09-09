import type { State } from "../simulation/types";
import { readPreference, writePreference } from "../preferences";

/** Small local cues; audio never advances or changes simulation. */
export class LabAudio {
  context?: AudioContext;
  muted = readPreference("ruinweavers-muted-v1") === true;
  lastEvent = 0;
  played = 0;
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
