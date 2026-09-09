import { ENCOUNTERS } from "../simulation/trial";
import { CAST, PRINCIPLES, SCENES, type Config } from "../experiments/config";
import type { Input } from "../input/input";
import type { State } from "../simulation/types";
import type { View } from "../render/view";
export class UI {
  root: HTMLElement;
  last = 0;
  constructor(
    public config: Config,
    public input: Input,
    public actions: {
      advance: () => void;
      reset: () => void;
      combat: () => void;
      configure: (patch: Partial<Config>) => void;
      pause: () => void;
      export: () => void;
      mute: () => boolean;
    },
  ) {
    this.root = document.createElement("div");
    this.root.id = "ui";
    document.body.append(this.root);
    this.root.innerHTML = `<header><div class="eyebrow">EXPERIMENTAL PRE-PRODUCTION</div><h1>RUINWEAVERS <span>/ MAGIC LAB</span></h1><div id="status">Explore the rules. Reset freely.</div></header>
      <div class="top-actions"><button id="mute" aria-pressed="false">Mute</button><button id="pause">Pause</button><button id="reset">Reset lab</button><button id="experiments" aria-expanded="false">Experiments</button></div>
      <aside id="panel" hidden><div class="panel-title">Lab instruments <button id="close">×</button></div>
      <label>Casting model<select id="model"><option value="primary-secondary">A · Primary / Secondary</option><option value="weave-unweave">B · Weave / Unweave</option></select></label>
      <label>Camera<select id="camera">${["tactical", "balanced", "cinematic"].map((s) => `<option>${s}</option>`).join("")}</select></label>
      <label>Tempo<select id="tempo">${["deliberate", "balanced", "faster"].map((s) => `<option>${s}</option>`).join("")}</select></label>
      <label>Input profile<select id="profile"><option value="desktop">Desktop mouse</option><option value="laptop">Laptop · keyboard fallback</option><option value="custom">Custom / rebound</option></select></label>
      <label>Named scene<select id="scene">${SCENES.map((s) => `<option>${s}</option>`).join("")}</select></label>
      <details><summary>Selected tunables</summary><label>Move speed<input id="moveSpeed" type="range" min="3" max="8" step=".1"></label><label>Dodge distance<input id="dodgeDistance" type="range" min="2" max="5" step=".1"></label><label>Dodge recovery<input id="dodgeRecovery" type="range" min=".4" max="1.4" step=".05"></label><label>Cast recovery multiplier<input id="castRecovery" type="range" min=".65" max="1.5" step=".05"></label><label>Secondary buffer (seconds; 0 disables)<input id="inputBuffer" type="range" min="0" max=".15" step=".01"></label><label>Secondary capacity<input id="secondaryCapacity" type="number" min="1" max="3"></label><label>Secondary fallback<select id="fallback"><option value="KeyF">F</option><option value="KeyR">R</option><option value="ShiftLeft">Left Shift</option></select></label><label>Next Principle<select id="cycle"><option value="Tab">Tab</option><option value="KeyC">C</option><option value="KeyR">R</option></select></label><label class="check"><input id="wheel" type="checkbox"> Optional wheel cycling</label></details>
      <details><summary>Controls & rules</summary><p>WASD moves; pointer aims independently. Hold LMB or J for Primary. RMB, F or K for discrete Secondary. 1–4 select; Tab next; Q previous. Space dodges. E toggles pressure near the ballast plate.</p><p>Heat + moisture → steam. Thermal shock weakens structure. Force moves mass and exploits fracture. Stone binds and stabilizes. The plate responds to weight.</p><p>Trackpad: aim with one finger, cast using J / F or K. Palm rejection and keyboard rollover require testing on your hardware. Both mouse bindings stay available.</p><p>One major field at a time. A new Secondary dissolves the old; residual target states remain. Stone slabs bridge the gap and obstruct low bolts. No mana.</p></details>
      <button id="combat-reset">Reset combat station</button> <button id="export">Export observations</button><pre id="metrics"></pre><p id="feedback" role="status"></p></aside>
      <section id="trial-card" hidden><div class="eyebrow">COMBAT TRIAL 0.1</div><h2 id="trial-title"></h2><p id="trial-copy"></p><button id="trial-action">Start trial</button><p class="trial-keys">E to continue · WASD move · LMB cast · RMB / F secondary · Space dodge</p></section><div id="inspect"></div><div id="cast-feedback" role="status"></div><div id="notice" hidden></div>
      <footer><div id="principles">${PRINCIPLES.map((p, i) => `<div data-principle="${p}"><kbd>${i + 1}</kbd><span>${p}</span></div>`).join("")}</div><div id="spell"></div><div class="hint">WASD move · LMB / J cast · RMB / F secondary · Space dodge · Tab / Q cycle</div><div id="health"></div></footer>`;
    const byId = (id: string) =>
      this.root.querySelector<HTMLElement>(`#${id}`)!;
    byId("trial-action").onclick = () => {
      input.clear();
      actions.advance();
      this.unfocus();
    };
    byId("reset").onclick = () => {
      actions.reset();
      this.unfocus();
    };
    byId("combat-reset").onclick = () => {
      actions.combat();
      this.unfocus();
    };
    byId("pause").onclick = () => {
      actions.pause();
      this.unfocus();
    };
    byId("export").onclick = actions.export;
    byId("mute").onclick = () => {
      const muted = actions.mute();
      byId("mute").textContent = muted ? "Unmute" : "Mute";
      byId("mute").setAttribute("aria-pressed", String(muted));
      this.unfocus();
    };
    const toggle = () => {
      input.clear();
      const panel = byId("panel");
      panel.hidden = !panel.hidden;
      byId("experiments").setAttribute("aria-expanded", String(!panel.hidden));
      this.unfocus();
    };
    byId("experiments").onclick = toggle;
    byId("close").onclick = toggle;
    for (const key of [
      "model",
      "camera",
      "tempo",
      "scene",
      "moveSpeed",
      "dodgeDistance",
      "dodgeRecovery",
      "castRecovery",
      "secondaryCapacity",
      "inputBuffer",
    ]) {
      const el = byId(key) as HTMLInputElement;
      el.value = String(config[key as keyof Config]);
      el.onchange = () => {
        actions.configure({
          [key]:
            el.type === "range" || el.type === "number"
              ? Number(el.value)
              : el.value,
        });
        this.unfocus();
      };
    }
    (byId("profile") as HTMLSelectElement).onchange = (e) => {
      input.setProfile(
        (e.target as HTMLSelectElement).value as typeof input.profile,
      );
      this.unfocus();
    };
    (byId("wheel") as HTMLInputElement).onchange = (e) =>
      (input.wheelEnabled = (e.target as HTMLInputElement).checked);
    for (const key of ["fallback", "cycle"])
      byId(key).onchange = (e) => {
        try {
          const value = (e.target as HTMLSelectElement).value;
          input.setBinding(
            key === "fallback" ? "secondary" : "next",
            key === "fallback" ? ["Mouse2", value, "KeyK"] : [value],
          );
          byId("feedback").textContent = "Binding updated.";
        } catch (error) {
          byId("feedback").textContent = String(error);
        }
        this.unfocus();
      };
  }
  unfocus() {
    (document.activeElement as HTMLElement)?.blur();
  }
  sync() {
    for (const key of [
      "model",
      "camera",
      "tempo",
      "scene",
      "moveSpeed",
      "dodgeDistance",
      "dodgeRecovery",
      "castRecovery",
      "secondaryCapacity",
      "inputBuffer",
    ])
      (this.root.querySelector(`#${key}`) as HTMLInputElement).value = String(
        this.config[key as keyof Config],
      );
  }
  update(s: State, view: View, paused: boolean) {
    const now = performance.now() / 1000;
    if (now - this.last < 0.08) return;
    this.last = now;
    const get = (id: string) => this.root.querySelector<HTMLElement>(`#${id}`)!;
    const pretty = (keys: string[]) =>
      keys
        .map((k) =>
          k
            .replace("Key", "")
            .replace("Mouse0", "LMB")
            .replace("Mouse2", "RMB")
            .replace("ShiftLeft", "Shift"),
        )
        .join(" / ");
    this.root.querySelector(".hint")!.textContent =
      `WASD move · ${pretty(this.input.bindings.primary)} cast · ${pretty(this.input.bindings.secondary)} secondary · Space dodge · ${pretty(this.input.bindings.next)} / ${pretty(this.input.bindings.previous)} cycle`;
    (get("profile") as HTMLSelectElement).value = this.input.profile;
    const player = s.entities[0],
      enemies = s.entities.filter((e) => e.ai && e.hp > 0),
      enemy = s.entities.find((e) => e.id === "sentinel");
    for (const el of this.root.querySelectorAll<HTMLElement>(
      "[data-principle]",
    ))
      el.classList.toggle("active", el.dataset.principle === s.activePrinciple);
    const p = CAST[s.activePrinciple];
    get("spell").textContent =
      `${p.primary}  /  ${this.config.model === "weave-unweave" ? p.inverse : p.secondary}`;
    get("health").textContent =
      `Integrity ${Math.ceil(player.hp)} / 100  ·  Dodge ${s.time >= s.dodgeReady ? "ready" : (s.dodgeReady - s.time).toFixed(1) + "s"}  ·  Fields ${s.fields.length}/${this.config.secondaryCapacity}`;
    get("status").textContent =
      `${this.config.model === "primary-secondary" ? "A · Primary / Secondary" : "B · Weave / Unweave"}  ·  ${this.config.camera}  ·  ${this.config.tempo}  ·  ${this.config.scene}`;
    get("metrics").textContent =
      `${view.metrics().frameMs.toFixed(1)} ms/frame · ${view.metrics().drawCalls} draws\nSentinel ${enemy ? Math.ceil(enemy.hp) : enemies.length} / ${enemy ? enemy.maxHp : s.entities.filter((e) => e.ai).length} · ${s.sentinel.enabled ? "pressure on" : "pressure off"}\n${s.metrics.switches} switches · ${s.metrics.dodges} dodges\n${Object.entries(
        s.metrics.transformations,
      )
        .map(([k, v]) => `${k}: ${v}`)
        .join(
          " · ",
        )}\nInput: ${this.input.profile} · wheel ${this.input.wheelEnabled ? "optional/on" : "off"}\n${Object.entries(
        s.metrics.inputs,
      )
        .filter(([k]) => /secondary|principle|next|previous/.test(k))
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")}`;
    const target = s.entities
      .filter((e) => e.hp > 0 && e.id !== player.id)
      .sort(
        (a, b) =>
          Math.hypot(a.pos.x - s.aim.x, a.pos.z - s.aim.z) -
          Math.hypot(b.pos.x - s.aim.x, b.pos.z - s.aim.z),
      )[0];
    if (
      target &&
      Math.hypot(target.pos.x - s.aim.x, target.pos.z - s.aim.z) < 1.8
    ) {
      get("inspect").textContent =
        `${target.label} · ${Math.ceil(target.hp)} integrity${target.wet > 0.1 ? " · Wet" : ""}${target.heat > 25 ? " · Heated" : ""}${target.burning ? " · Burning" : ""}${target.cohesion < -0.25 ? " · Fractured" : ""}${target.cohesion > 0.25 ? " · Bound" : ""}${Math.hypot(target.velocity.x, target.velocity.z) > 1 ? " · Displaced" : ""}`;
    } else get("inspect").textContent = "";
    const recent = s.events
      .filter((e) => e.type === "rejected" && s.time - e.time < 0.65)
      .at(-1);
    const placement = view.simulation.targeting("secondary");
    const field = s.fields.find((f) => f.source === player.id);
    get("cast-feedback").textContent = recent
      ? recent.target!
      : s.bufferedCast
        ? "Secondary buffered"
        : !placement.valid
          ? placement.reason
          : `${placement.clamped ? "Range-limited footprint · " : ""}RMB / F footprint${field ? ` · replaces ${field.principle} (${field.life.toFixed(1)}s)` : ""}`;
    const trial = s.trial,
      card = get("trial-card");
    card.hidden = !trial || trial.status === "active" || paused;
    get("reset").textContent = trial ? "Restart trial" : "Reset lab";
    this.root.querySelector("h1 span")!.textContent = trial
      ? "/ COMBAT TRIAL"
      : "/ MAGIC LAB";
    if (trial) {
      get("status").textContent =
        `${trial.encounter + 1} / 3 · ${ENCOUNTERS[trial.encounter]} · ${enemies.length} remaining · Health carries forward`;
      const title =
        trial.status === "ready"
          ? "Three encounters. One health bar."
          : trial.status === "between"
            ? `${ENCOUNTERS[trial.encounter]} cleared`
            : trial.status === "victory"
              ? "Trial complete"
              : "Trial ended";
      get("trial-title").textContent =
        trial.isolated && trial.status === "ready"
          ? ENCOUNTERS[trial.encounter]
          : title;
      get("trial-copy").textContent =
        trial.status === "ready"
          ? "Ranged pressure, pursuit, then both. Use the magic you know. Cover stops your bolts too."
          : `${Math.ceil(player.hp)} integrity remaining · ${trial.elapsed.toFixed(1)} seconds fighting. ${trial.status === "between" ? "Your health carries into the next encounter." : "Restart for another attempt."}`;
      get("trial-action").textContent =
        trial.status === "ready"
          ? "Start trial"
          : trial.status === "between"
            ? "Next encounter"
            : "Restart trial";
    }
    const notice = get("notice");
    notice.hidden = !(paused || (!trial && player.hp <= 0) || view.contextLost);
    notice.textContent = view.contextLost
      ? "Graphics context lost. Waiting for recovery."
      : player.hp <= 0
        ? "Integrity depleted · Reset lab to continue"
        : paused
          ? "Paused · Resume above"
          : "";
    get("pause").textContent = paused ? "Resume" : "Pause";
  }
}
