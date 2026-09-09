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
      reset: () => void;
      combat: () => void;
      configure: (patch: Partial<Config>) => void;
      pause: () => void;
      export: () => void;
    },
  ) {
    this.root = document.createElement("div");
    this.root.id = "ui";
    document.body.append(this.root);
    this.root.innerHTML = `<header><div class="eyebrow">EXPERIMENTAL PRE-PRODUCTION · 01</div><h1>RUINWEAVERS <span>/ MAGIC LAB</span></h1><div id="status">Explore the rules. Reset freely.</div></header>
      <div class="top-actions"><button id="pause">Pause</button><button id="reset">Reset lab</button><button id="experiments" aria-expanded="false">Experiments</button></div>
      <aside id="panel" hidden><div class="panel-title">Lab instruments <button id="close">×</button></div>
      <label>Casting model<select id="model"><option value="primary-secondary">A · Primary / Secondary</option><option value="weave-unweave">B · Weave / Unweave</option></select></label>
      <label>Camera<select id="camera">${["tactical", "balanced", "cinematic"].map((s) => `<option>${s}</option>`).join("")}</select></label>
      <label>Tempo<select id="tempo">${["deliberate", "balanced", "faster"].map((s) => `<option>${s}</option>`).join("")}</select></label>
      <label>Input profile<select id="profile"><option value="desktop">Desktop mouse</option><option value="laptop">Laptop · keyboard fallback</option><option value="custom">Custom / rebound</option></select></label>
      <label>Named scene<select id="scene">${SCENES.map((s) => `<option>${s}</option>`).join("")}</select></label>
      <details><summary>Selected tunables</summary><label>Move speed<input id="moveSpeed" type="range" min="3" max="8" step=".1"></label><label>Dodge distance<input id="dodgeDistance" type="range" min="2" max="5" step=".1"></label><label>Dodge recovery<input id="dodgeRecovery" type="range" min=".4" max="1.4" step=".05"></label><label>Cast recovery multiplier<input id="castRecovery" type="range" min=".65" max="1.5" step=".05"></label><label>Secondary capacity<input id="secondaryCapacity" type="number" min="1" max="3"></label><label>Secondary fallback<select id="fallback"><option value="KeyF">F</option><option value="KeyR">R</option><option value="ShiftLeft">Left Shift</option></select></label><label>Next Principle<select id="cycle"><option value="Tab">Tab</option><option value="KeyC">C</option><option value="KeyR">R</option></select></label><label class="check"><input id="wheel" type="checkbox"> Optional wheel cycling</label></details>
      <details><summary>Controls & rules</summary><p>WASD moves; pointer aims independently. Hold LMB or J for Primary. RMB, F or K for discrete Secondary. 1–4 select; Tab next; Q previous. Space dodges. E toggles pressure near the ballast plate.</p><p>Heat + moisture → steam. Thermal shock weakens structure. Force moves mass and exploits fracture. Stone binds and stabilizes. The plate responds to weight.</p><p>Trackpad: aim with one finger, cast using J / F or K. Palm rejection and keyboard rollover require testing on your hardware. Both mouse bindings stay available.</p><p>One major field at a time. A new Secondary dissolves the old; residual target states remain. Stone slabs bridge the gap and obstruct low bolts. No mana.</p></details>
      <button id="combat-reset">Reset combat station</button> <button id="export">Export observations</button><pre id="metrics"></pre><p id="feedback" role="status"></p></aside>
      <div id="inspect"></div><div id="notice" hidden></div>
      <footer><div id="principles">${PRINCIPLES.map((p, i) => `<div data-principle="${p}"><kbd>${i + 1}</kbd><span>${p}</span></div>`).join("")}</div><div id="spell"></div><div class="hint">WASD move · LMB / J cast · RMB / F secondary · Space dodge · Tab / Q cycle</div><div id="health"></div></footer>`;
    const byId = (id: string) =>
      this.root.querySelector<HTMLElement>(`#${id}`)!;
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
    const toggle = () => {
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
    ])
      (this.root.querySelector(`#${key}`) as HTMLInputElement).value = String(
        this.config[key as keyof Config],
      );
  }
  update(s: State, view: View, paused: boolean) {
    if (s.time - this.last < 0.08 && s.time >= this.last) return;
    this.last = s.time;
    const get = (id: string) => this.root.querySelector<HTMLElement>(`#${id}`)!;
    const player = s.entities[0],
      enemy = s.entities.find((e) => e.id === "sentinel")!;
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
      `${view.metrics().frameMs.toFixed(1)} ms/frame · ${view.metrics().drawCalls} draws\nSentinel ${Math.ceil(enemy.hp)} / ${enemy.maxHp} · ${s.sentinel.enabled ? "pressure on" : "pressure off"}\n${s.metrics.switches} switches · ${s.metrics.dodges} dodges\n${Object.entries(
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
    const notice = get("notice");
    notice.hidden = !(paused || player.hp <= 0 || view.contextLost);
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
