import { RUN_BEATS, UPGRADES, fieldCapacity } from "../simulation/run";
import type { CoopSession } from "../network/session";
import { ENCOUNTERS } from "../simulation/trial";
import { CAST, PRINCIPLES, SCENES, type Config } from "../experiments/config";
import type { Input } from "../input/input";
import type { State } from "../simulation/types";
import type { View } from "../render/view";
import { localCastFeedback } from "./cast-feedback";
export class UI {
  root: HTMLElement;
  last = 0;
  rewardKey = "";
  phaseKey = "";
  pointerButtons = 0;
  freshPointerPress = false;
  network?: CoopSession;
  constructor(
    public config: Config,
    public input: Input,
    public actions: {
      advance: () => void;
      choose: (runId: string, rewardId: string, upgrade: string) => void;
      reset: () => void;
      combat: () => void;
      configure: (patch: Partial<Config>) => void;
      pause: () => void;
      export: () => void;
      quality: (value: "standard" | "lightweight") => void;
      getQuality: () => string;
      mute: () => boolean;
      getMuted: () => boolean;
    },
  ) {
    this.root = document.createElement("div");
    this.root.id = "ui";
    document.body.append(this.root);
    // Physical pointer state survives semantic combat cancellation. A release or
    // repeated down carried over from the arena must not activate a new card.
    window.addEventListener(
      "pointerdown",
      (e) => {
        this.freshPointerPress = e.button === 0 && !(this.pointerButtons & 1);
        this.pointerButtons = e.buttons;
      },
      true,
    );
    window.addEventListener(
      "pointerup",
      (e) => {
        this.pointerButtons = e.buttons;
      },
      true,
    );
    window.addEventListener("blur", () => {
      this.pointerButtons = 0;
    });
    this.root.innerHTML = `<header><div class="eyebrow">EXPERIMENTAL PRE-PRODUCTION</div><h1>RUINWEAVERS <span id="mode-title">/ MAGIC LAB</span></h1><div id="connection-status"></div><div id="status">Explore the rules. Reset freely.</div></header>
      <div class="top-actions"><button id="disconnect" hidden>Leave co-op</button><button id="mute" aria-pressed="false">Mute</button><button id="pause">Pause</button><button id="reset">Reset lab</button><button id="experiments" aria-expanded="false">Experiments</button></div>
      <aside id="panel" hidden><div class="panel-title">Lab instruments <button id="close">×</button></div>
      <label>Casting model<select id="model"><option value="primary-secondary">A · Primary / Secondary</option><option value="weave-unweave">B · Weave / Unweave</option></select></label>
      <label>Camera<select id="camera">${["tactical", "balanced", "cinematic"].map((s) => `<option>${s}</option>`).join("")}</select></label>
      <label>Tempo<select id="tempo">${["deliberate", "balanced", "faster"].map((s) => `<option>${s}</option>`).join("")}</select></label>
      <label>Rendering<select id="quality"><option value="standard">Standard</option><option value="lightweight">Lightweight</option></select></label><small>Lightweight lowers resolution and disables shadows on this device.</small>
      <label>Input profile<select id="profile"><option value="desktop">Desktop mouse</option><option value="laptop">Laptop · keyboard fallback</option><option value="custom">Custom / rebound</option></select></label>
      <label>Named scene<select id="scene">${SCENES.map((s) => `<option>${s}</option>`).join("")}</select></label>
      <details><summary>Selected tunables</summary><label>Move speed<input id="moveSpeed" type="range" min="3" max="8" step=".1"></label><label>Dodge distance<input id="dodgeDistance" type="range" min="2" max="5" step=".1"></label><label>Dodge recovery<input id="dodgeRecovery" type="range" min=".4" max="1.4" step=".05"></label><label>Cast recovery multiplier<input id="castRecovery" type="range" min=".65" max="1.5" step=".05"></label><label>Secondary buffer (seconds; 0 disables)<input id="inputBuffer" type="range" min="0" max=".15" step=".01"></label><label>Secondary capacity<input id="secondaryCapacity" type="number" min="1" max="3"></label><label>Secondary fallback<select id="fallback"><option value="KeyF">F</option><option value="KeyR">R</option><option value="ShiftLeft">Left Shift</option></select></label><label>Next Principle<select id="cycle"><option value="Tab">Tab</option><option value="KeyC">C</option><option value="KeyR">R</option></select></label><label class="check"><input id="wheel" type="checkbox"> Optional wheel cycling</label></details>
      <details><summary>Controls & rules</summary><p>WASD moves; pointer aims independently. Hold LMB or J for Primary. RMB, F or K for discrete Secondary. 1–4 select; Tab next; Q previous. Space dodges. E toggles pressure near the ballast plate.</p><p>Heat + moisture → steam. Thermal shock weakens structure. Force moves mass and exploits fracture. Stone binds and stabilizes. The plate responds to weight.</p><p>Trackpad: aim with one finger, cast using J / F or K. Palm rejection and keyboard rollover require testing on your hardware. Both mouse bindings stay available.</p><p>One major field at a time. A new Secondary dissolves the old; residual target states remain. Stone slabs bridge the gap and obstruct low bolts. No mana.</p></details>
      <button id="combat-reset">Reset combat station</button> <button id="export">Export observations</button><pre id="metrics"></pre><p id="feedback" role="status"></p></aside>
      <section id="trial-card" hidden><div class="eyebrow" id="run-eyebrow">CO-OP TRIAL 0.1</div><h2 id="trial-title"></h2><p id="trial-copy"></p><div id="reward-cards" hidden></div><button id="trial-action">Start trial</button><div id="net-setup"><hr><p>Or share this trial with one partner</p><label>Room code<input id="room-code" placeholder="e.g. K7M9Q2" maxlength="15" autocomplete="off" spellcheck="false" autocapitalize="characters"></label><div class="net-buttons"><button id="create-room">Create co-op</button><button id="join-room">Join co-op</button></div><details><summary>Connection options</summary><label>Signaling<select id="signaling"><option value="public">Public Nostr · internet</option><option value="local">Local relay · same machine test</option></select></label><small>Both players use the same build and signaling option. Internet play uses TURN fallback when configured by the site owner.</small></details></div><div id="room-share" hidden><label for="share-code">Share this room code</label><div class="room-share-row"><input id="share-code" aria-label="Your room code" readonly spellcheck="false"><button id="copy-code">Copy code</button></div><p id="copy-feedback" role="status" aria-live="polite"></p></div><p id="room-status" role="status"></p><button id="leave-room" hidden>Return to solo</button><p class="trial-keys">E to continue · WASD move · LMB cast · RMB / F secondary · Space dodge</p></section><div id="inspect"></div><div id="cast-feedback" role="status"></div><div id="notice" hidden></div>
      <div id="upgrades"></div><footer><div id="principles">${PRINCIPLES.map((p, i) => `<div data-principle="${p}"><kbd>${i + 1}</kbd><span>${p}</span></div>`).join("")}</div><div id="spell"></div><div id="control-hint" class="hint">WASD move · LMB / J cast · RMB / F secondary · Space dodge · Tab / Q cycle</div><div id="health"></div></footer>`;
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
    const quality = byId("quality") as HTMLSelectElement;
    quality.value = actions.getQuality();
    quality.onchange = () => {
      input.clear();
      actions.quality(quality.value as "standard" | "lightweight");
      this.unfocus();
    };
    const showMute = (muted: boolean) => {
      byId("mute").textContent = muted ? "Unmute" : "Mute";
      byId("mute").setAttribute("aria-pressed", String(muted));
    };
    showMute(actions.getMuted());
    byId("mute").onclick = () => {
      showMute(actions.mute());
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
      this.syncControls();
      this.unfocus();
    };
    (byId("wheel") as HTMLInputElement).onchange = (e) =>
      input.setWheelEnabled((e.target as HTMLInputElement).checked);
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
        this.syncControls();
        this.unfocus();
      };
    this.syncControls();
  }
  syncControls() {
    const get = (id: string) =>
      this.root.querySelector<HTMLSelectElement>(`#${id}`)!;
    get("profile").value = this.input.profile;
    (this.root.querySelector("#wheel") as HTMLInputElement).checked =
      this.input.wheelEnabled;
    for (const [id, value] of [
      [
        "fallback",
        this.input.bindings.secondary.find(
          (k) => k !== "Mouse2" && k !== "KeyK",
        ),
      ],
      ["cycle", this.input.bindings.next[0]],
    ]) {
      const el = get(id!);
      const selected = value ?? "custom";
      if (!Array.from(el.options).some((o) => o.value === selected))
        el.add(
          new Option(value?.replace("Key", "") ?? "Custom bindings", selected),
        );
      el.value = selected;
    }
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
  bindNetwork(net: CoopSession) {
    this.network = net;
    const get = (id: string) => this.root.querySelector<HTMLElement>(`#${id}`)!;
    const shareCode = get("share-code") as HTMLInputElement;
    shareCode.onclick = () => shareCode.select();
    get("copy-code").onclick = async () => {
      const code = shareCode.value;
      try {
        await navigator.clipboard.writeText(code);
        if (shareCode.value === code)
          get("copy-feedback").textContent = "Copied! Send it to your partner.";
      } catch {
        shareCode.focus();
        shareCode.select();
        get("copy-feedback").textContent =
          "Press Ctrl+C (or ⌘C) to copy the selected code.";
      }
    };
    get("create-room").onclick = () => {
      const bytes = crypto.getRandomValues(new Uint8Array(6)),
        alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join(
        "",
      );
      (get("room-code") as HTMLInputElement).value = code;
      if (this.config.scene !== "run") this.config.scene = "trial";
      this.config.model = "primary-secondary";
      void net.connect(
        "host",
        code,
        (get("signaling") as HTMLSelectElement).value,
      );
      this.unfocus();
    };
    const join = () => {
      if (this.config.scene !== "run") this.config.scene = "trial";
      this.config.model = "primary-secondary";
      void net.connect(
        "guest",
        (get("room-code") as HTMLInputElement).value,
        (get("signaling") as HTMLSelectElement).value,
      );
      this.unfocus();
    };
    get("join-room").onclick = join;
    get("room-code").onkeydown = (e) => {
      if (
        e.key === "Enter" &&
        !e.repeat &&
        !e.isComposing &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        join();
      }
    };
    get("disconnect").onclick = () => {
      void net.leave();
      this.unfocus();
    };
    get("leave-room").onclick = () => {
      void net.leave();
      this.unfocus();
    };
  }
  update(s: State, view: View, paused: boolean) {
    const now = performance.now() / 1000;
    if (now - this.last < 0.08) return;
    this.last = now;
    const get = (id: string) => this.root.querySelector<HTMLElement>(`#${id}`)!;
    // Compose final labels first: intermediate solo/party labels must not replace text nodes.
    const labels: Record<string, string> = {};
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
    labels["control-hint"] =
      `WASD move · ${pretty(this.input.bindings.primary)} cast · ${pretty(this.input.bindings.secondary)} secondary · Space dodge · ${pretty(this.input.bindings.next)} / ${pretty(this.input.bindings.previous)} cycle`;
    (get("profile") as HTMLSelectElement).value = this.input.profile;
    const player = s.entities.find((e) => e.id === view.actorId)!,
      actor = s.actors[player.id],
      enemies = s.entities.filter((e) => e.ai && e.hp > 0),
      enemy = s.entities.find((e) => e.id === "sentinel");
    for (const el of this.root.querySelectorAll<HTMLElement>(
      "[data-principle]",
    ))
      el.classList.toggle(
        "active",
        el.dataset.principle === actor.activePrinciple,
      );
    const p = CAST[actor.activePrinciple];
    labels["spell"] =
      `${p.primary}  /  ${this.config.model === "weave-unweave" ? p.inverse : p.secondary}`;
    labels["health"] =
      `Integrity ${Math.ceil(player.hp)} / 100  ·  Dodge ${s.time >= actor.dodgeReady ? "ready" : (actor.dodgeReady - s.time).toFixed(1) + "s"}  ·  Fields ${s.fields.filter((f) => f.source === player.id).length}/${fieldCapacity(s, player.id, this.config.secondaryCapacity)}`;
    labels["status"] =
      `${this.config.model === "primary-secondary" ? "A · Primary / Secondary" : "B · Weave / Unweave"}  ·  ${this.config.camera}  ·  ${this.config.tempo}  ·  ${this.config.scene}`;
    labels["metrics"] =
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
    if (this.network?.role === "guest")
      labels["metrics"] =
        `${view.metrics().frameMs.toFixed(1)} ms/frame · ${view.metrics().drawCalls} draws\nFull combat telemetry stays on the host. Export there for balance counters.`;
    const target = s.entities
      .filter((e) => e.hp > 0 && e.id !== player.id)
      .sort(
        (a, b) =>
          Math.hypot(a.pos.x - actor.aim.x, a.pos.z - actor.aim.z) -
          Math.hypot(b.pos.x - actor.aim.x, b.pos.z - actor.aim.z),
      )[0];
    if (
      target &&
      Math.hypot(target.pos.x - actor.aim.x, target.pos.z - actor.aim.z) < 1.8
    ) {
      labels["inspect"] =
        `${target.label} · ${Math.ceil(target.hp)} integrity${target.wet > 0.1 ? " · Wet" : ""}${target.heat > 25 ? " · Heated" : ""}${target.burning ? " · Burning" : ""}${target.cohesion < -0.25 ? " · Fractured" : ""}${target.cohesion > 0.25 ? " · Bound" : ""}${Math.hypot(target.velocity.x, target.velocity.z) > 1 ? " · Displaced" : ""}`;
    } else labels["inspect"] = "";
    const localFeedback = localCastFeedback(s, player.id);
    const placement = view.simulation.withActor(view.actorId, () =>
      view.simulation.targeting(
        "secondary",
        actor.activePrinciple,
        view.previewAim ?? actor.aim,
      ),
    );
    const field = s.fields.find((f) => f.source === player.id);
    labels["cast-feedback"] =
      localFeedback ??
      (!placement.valid
        ? placement.reason
        : `${placement.clamped ? "Range-limited footprint · " : ""}RMB / F footprint${field ? ` · replaces ${field.principle} (${field.life.toFixed(1)}s)` : ""}`);
    const capacity = fieldCapacity(s, player.id, this.config.secondaryCapacity);
    if (s.fields.filter((f) => f.source === player.id).length < capacity)
      labels["cast-feedback"] = labels["cast-feedback"]?.replace(
        / · replaces.*$/,
        "",
      );
    const trial = s.trial,
      card = get("trial-card");
    const phaseKey = trial
      ? `${s.run?.id ?? ""}:${trial.encounter}:${trial.status}`
      : "";
    if (phaseKey !== this.phaseKey) {
      this.phaseKey = phaseKey;
      if (trial && trial.status !== "active") this.input.clear();
    }
    card.hidden = !trial || trial.status === "active" || paused;
    get("cast-feedback").hidden = !!trial && trial.status !== "active";
    get("inspect").hidden = !!trial && trial.status !== "active";
    labels["reset"] = trial ? "Restart trial" : "Reset lab";
    labels["mode-title"] = trial ? "/ COMBAT TRIAL" : "/ MAGIC LAB";
    if (trial) {
      labels["status"] =
        `${trial.encounter + 1} / 3 · ${ENCOUNTERS[trial.encounter]} · ${enemies.length} remaining · Health carries forward`;
      const title =
        trial.status === "ready"
          ? "Three encounters. One health bar."
          : trial.status === "between"
            ? `${ENCOUNTERS[trial.encounter]} cleared`
            : trial.status === "victory"
              ? "Trial complete"
              : "Trial ended";
      labels["trial-title"] =
        trial.isolated && trial.status === "ready"
          ? ENCOUNTERS[trial.encounter]
          : title;
      labels["trial-copy"] =
        trial.status === "ready"
          ? "Ranged pressure, pursuit, then both. Use the magic you know. Cover stops your bolts too."
          : `${Math.ceil(player.hp)} integrity remaining · ${trial.elapsed.toFixed(1)} seconds fighting. ${trial.status === "between" ? "Your health carries into the next encounter." : "Restart for another attempt."}`;
      labels["trial-action"] =
        trial.status === "ready"
          ? "Start trial"
          : trial.status === "between"
            ? "Next encounter"
            : "Restart trial";
    }
    if (s.party) {
      if (trial?.status === "ready")
        labels["trial-title"] = "Three encounters. Two mages.";
      const partner = s.entities.find(
        (e) => e.kind === "player" && e.id !== player.id,
      )!;
      labels["health"] +=
        ` · Partner ${Math.ceil(partner.hp)} · ${player.hp <= 0 ? "Downed — partner can revive you" : partner.hp <= 0 ? "Hold E nearby to revive" : trial?.status === "active" ? "Hold E near a downed partner" : "E: party ready"}${actor.reviveProgress > 0 ? ` · Reviving ${((actor.reviveProgress / 1.2) * 100).toFixed(0)}%` : ""}`;
      labels["trial-action"] = s.party.ready.includes(player.id)
        ? "Waiting for partner"
        : "Ready";
      if (trial?.status !== "active")
        labels["trial-copy"] +=
          ` Both players must be ready (${s.party.ready.length}/2).`;
    }
    const reward = s.run?.reward;
    let artLinks = this.root.querySelector("#art-links") as HTMLElement | null;
    if (!artLinks) {
      artLinks = document.createElement("nav");
      artLinks.id = "art-links";
      artLinks.innerHTML =
        '<a href="/?scene=trial/mixed&art=storybook">Fitted court</a><a href="/?scene=trial/mixed&art=ink">Folded court</a><a href="/?scene=run">Play the run</a>';
      get("trial-card").append(artLinks);
    }
    artLinks.hidden = !view.art.active;
    const rewardCards = get("reward-cards");
    rewardCards.hidden = !reward || trial?.status !== "between";
    labels["upgrades"] = (s.run?.upgrades[player.id] ?? [])
      .map((id) => UPGRADES[id].name)
      .join("  ·  ");
    document.body.classList.toggle("run-mode", !!s.run);
    labels["run-eyebrow"] = s.run
      ? "RUN PROTOTYPE 0.1 · THE BROKEN COURT"
      : "CO-OP TRIAL 0.1";
    if (s.run && trial) {
      labels["reset"] = "Restart run";
      labels["mode-title"] = "/ THE BROKEN COURT";
      labels["status"] =
        `${trial.encounter + 1} / 5 · ${RUN_BEATS[trial.encounter].name} · ${enemies.length} remaining`;
      labels["trial-title"] =
        trial.status === "ready"
          ? "Enter the broken court"
          : trial.status === "between"
            ? reward
              ? "Choose what you carry forward"
              : `${RUN_BEATS[trial.encounter].name} cleared`
            : trial.status === "victory"
              ? "The last ward is silent"
              : "The court claims another attempt";
      labels["trial-copy"] =
        trial.status === "ready"
          ? "Five encounters. One health bar. Discover a personal alteration after the first and third. Play solo, or enter together."
          : `${Math.ceil(player.hp)} integrity · ${trial.elapsed.toFixed(1)} seconds fighting. ${reward ? (s.party ? "Choose one alteration. Your partner chooses independently; both then ready up." : "Choose one alteration, then continue into the court.") : trial.status === "between" ? "Health and alterations carry forward." : "Restart to try a new path. All alterations will be cleared."}`;
      labels["trial-action"] = s.party
        ? s.party.ready.includes(player.id)
          ? "Waiting for partner"
          : "Ready"
        : trial.status === "ready"
          ? "Begin run"
          : trial.status === "between"
            ? "Continue"
            : "Run again";
    }
    if (view.art.active) {
      labels["mode-title"] = "/ ART DIRECTION PROOF";
      labels["run-eyebrow"] =
        view.art.mode === "ink"
          ? "B · INK & PIGMENT"
          : "A · SCULPTURAL STORYBOOK";
      if (trial?.status === "ready") {
        labels["trial-title"] = view.art.palette.title;
        labels["trial-copy"] =
          "One familiar mixed encounter. Explore, cast, or enter together. Same combat and cover; a different visual language.";
        if (!s.party) labels["trial-action"] = "Enter the court";
      }
    }
    const rewardKey = reward
      ? `${reward.id}:${player.id}:${reward.choices[player.id] ?? ""}`
      : "";
    if (rewardKey !== this.rewardKey) {
      this.rewardKey = rewardKey;
      rewardCards.replaceChildren();
      for (const id of reward?.offers[player.id] ?? []) {
        const upgrade = UPGRADES[id],
          button = document.createElement("button");
        button.dataset.upgrade = id;
        button.innerHTML = `<small>${upgrade.family}</small><strong>${upgrade.name}</strong><span>${upgrade.description}</span>`;
        button.disabled = !!reward?.choices[player.id];
        button.classList.toggle("chosen", reward?.choices[player.id] === id);
        let deliberate = false;
        button.onpointerdown = () => {
          deliberate = this.freshPointerPress;
        };
        button.onclick = (event) => {
          if (event.detail !== 0 && !deliberate) return;
          deliberate = false;
          this.actions.choose(s.run!.id, reward!.id, id);
          this.unfocus();
        };
        rewardCards.append(button);
      }
    }
    (get("trial-action") as HTMLButtonElement).disabled =
      !!reward && !reward.choices[player.id];
    const net = this.network;
    if (net) {
      get("net-setup").hidden =
        (net.active && net.status !== "failed") ||
        (!!trial && trial.status !== "ready" && net.status !== "failed");
      get("leave-room").hidden = !net.active;
      get("disconnect").hidden = !net.active;
      get("room-share").hidden = !net.active || !net.code;
      const shareCode = get("share-code") as HTMLInputElement;
      if (shareCode.value !== net.code) {
        shareCode.value = net.code;
        get("copy-feedback").textContent = "";
      }
      labels["room-status"] = net.active
        ? `${net.message}${net.strategy === "public" ? (net.turnStatus === "configured" ? " · TURN fallback available" : net.turnStatus === "not-configured" ? " · Direct only: relay not configured" : "") : ""}`
        : "";
      labels["connection-status"] = net.active
        ? `${net.actorId === "mage-1" ? "Mage 1 · Host" : "Mage 2 · Guest"} · ${net.status}`
        : "";
      get("trial-action").hidden = net.active && !net.connected;
      if (net.active && !net.connected) {
        card.hidden = false;
        labels["trial-title"] =
          net.status === "failed" ? "Connection stopped" : "Co-op lobby";
        labels["trial-copy"] =
          net.status === "hosting"
            ? "Share the room code with your partner. Both press Ready once connected."
            : "Use the same room code, build and signaling choice.";
      }
      for (const id of [
        "model",
        "tempo",
        "scene",
        "moveSpeed",
        "dodgeDistance",
        "dodgeRecovery",
        "castRecovery",
        "inputBuffer",
        "secondaryCapacity",
        "combat-reset",
      ])
        (get(id) as HTMLInputElement).disabled = net.active;
    }
    (get("model") as HTMLSelectElement).disabled = !!s.run || !!net?.active;
    const notice = get("notice");
    notice.hidden = !(paused || (!trial && player.hp <= 0) || view.contextLost);
    labels["notice"] = view.contextLost
      ? "Graphics context lost. Waiting for recovery."
      : player.hp <= 0
        ? "Integrity depleted · Reset lab to continue"
        : paused
          ? "Paused · Resume above"
          : "";
    labels["pause"] = paused ? "Resume" : "Pause";
    for (const [id, value] of Object.entries(labels)) {
      const element = get(id);
      if (element.textContent !== value) element.textContent = value;
    }
  }
}
