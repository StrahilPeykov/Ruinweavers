import { CoopSession } from "./network/session";
import "./ui/style.css";
import {
  CAMERAS,
  TEMPOS,
  SCENES,
  configFromQuery,
  type Config,
} from "./experiments/config";
import { initPhysics } from "./physics/world";
import { Simulation } from "./simulation/simulation";
import { Input } from "./input/input";
import { View } from "./render/view";
import { LabAudio } from "./render/audio";
import { UI } from "./ui/ui";
import { SCENARIOS } from "./simulation/trial";
import { idleInput } from "./simulation/types";

async function boot() {
  const root = document.querySelector("#app")!;
  root.textContent = "Preparing the Magic Lab…";
  await initPhysics();
  const canvas = document.createElement("canvas");
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "Ruinweavers Magic Lab");
  root.replaceChildren(canvas);
  const config = configFromQuery(location.search);
  const sim = new Simulation(config),
    input = new Input(canvas),
    view = new View(canvas, config, sim);
  let net: CoopSession;
  input.onClear = () => {
    if (net?.active) net.release();
    else sim.cancelBufferedCast();
  };
  const localPlayer = () =>
    sim.state.entities.find((e) => e.id === view.actorId)!;
  const localActor = () => sim.state.actors[view.actorId];
  const audio = new LabAudio();
  let paused = false;
  const reset = () => {
    if (net?.active) {
      net.restart();
      return;
    }
    input.clear();
    sim.reset();
    view.reset();
    audio.reset();
    view.center.set(sim.player.pos.x * 0.82, 0, sim.player.pos.z * 0.82);
    view.render(sim.state, 0);
    ui.last = 0;
    paused = false;
  };
  const configure = (patch: Partial<Config>) => {
    if (
      net?.active &&
      Object.keys(patch).some(
        (k) => !["camera", "cameraDistance", "cameraPitch"].includes(k),
      )
    )
      throw Error("Gameplay configuration is fixed while connected");
    if (
      patch.model &&
      !["primary-secondary", "weave-unweave"].includes(patch.model)
    )
      throw Error("Invalid model");
    if (patch.camera) {
      if (!(patch.camera in CAMERAS)) throw Error("Invalid camera");
      Object.assign(config, CAMERAS[patch.camera]);
    }
    if (patch.tempo) {
      if (!(patch.tempo in TEMPOS)) throw Error("Invalid tempo");
      Object.assign(config, TEMPOS[patch.tempo]);
    }
    if (patch.scene && !SCENES.includes(patch.scene.replace("magic-lab/", "")))
      throw Error("Invalid scene");
    const limits: Record<string, [number, number]> = {
      inputBuffer: [0, 0.15],
      moveSpeed: [3, 8],
      dodgeDistance: [2, 5],
      dodgeDuration: [0.1, 0.4],
      dodgeRecovery: [0.4, 1.4],
      castRecovery: [0.65, 1.5],
      telegraph: [0.6, 2],
      secondaryCapacity: [1, 3],
      invulnerability: [0, 0.3],
      castMoveMultiplier: [0.3, 1],
      cameraDistance: [16, 35],
      cameraPitch: [30, 70],
    };
    for (const [k, v] of Object.entries(patch))
      if (
        k in limits &&
        (!Number.isFinite(v) ||
          Number(v) < limits[k][0] ||
          Number(v) > limits[k][1])
      )
        throw Error(`Invalid ${k}`);
    if (patch.secondaryCapacity && !Number.isInteger(patch.secondaryCapacity))
      throw Error("Capacity must be an integer");
    if (patch.scenario && !(patch.scenario in SCENARIOS))
      throw Error("Invalid scenario");
    if (
      patch.encounterVersion &&
      !["baseline", "candidate"].includes(patch.encounterVersion)
    )
      throw Error("Invalid encounter version");
    input.clear();
    const shouldReset =
      !!patch.scene ||
      !!patch.model ||
      !!patch.scenario ||
      !!patch.encounterVersion;
    Object.assign(config, patch);
    if (patch.scene) config.scene = patch.scene.replace("magic-lab/", "");
    while (sim.state.fields.length > config.secondaryCapacity)
      sim.state.fields.shift();
    sim.physics.syncFields(sim.state.fields);
    if (shouldReset) reset();
    view.render(sim.state, 0);
    ui.sync();
    ui.last = 0;
  };
  const exportData = () => {
    const b = new Blob(
      [
        JSON.stringify(
          {
            config,
            input: { profile: input.profile, bindings: input.bindings },
            state: sim.state,
            render: view.metrics(),
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ruinweavers-observations.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const combatReset = () => {
    config.scene = "combat";
    reset();
    ui.sync();
  };
  const advance = () => {
    input.clear();
    if (net?.active) net.ready();
    else sim.advanceTrial();
    ui.last = 0;
  };
  const ui = new UI(config, input, {
    advance,
    reset,
    combat: combatReset,
    configure,
    pause: () => {
      if (net?.active) {
        net.togglePause();
        return;
      }
      paused = !paused;
      input.clear();
      ui.last = 0;
    },
    export: exportData,
    mute: () => (audio.muted = !audio.muted),
  });
  net = new CoopSession(
    sim,
    () => {
      view.actorId = sim.state.actors[net.actorId] ? net.actorId : "mage-1";
      paused = false;
      ui.last = 0;
    },
    () => input.clear(),
  );
  net.forceRelay =
    new URLSearchParams(location.search).get("relay") === "required";
  ui.bindNetwork(net);
  setInterval(() => {
    if (!net.active) return;
    const aim = input.pointer.active
      ? view.aimFromPointer(input.pointer.x, input.pointer.y)
      : localActor().aim;
    const command =
      !document.hidden && !view.contextLost
        ? input.sample(aim)
        : idleInput(aim);
    net.tick(command);
  }, 1000 / 60);
  const api = {
    advanceTrial: advance,
    getNetworkState: () => net.info(),
    getRtcStats: () => net.rtcStats(),
    setNetworkProfile: (profile: {
      delayMs: number;
      jitterMs: number;
      seed: number;
    }) => {
      if (
        !Number.isFinite(profile.delayMs) ||
        profile.delayMs < 0 ||
        profile.delayMs > 250 ||
        !Number.isFinite(profile.jitterMs) ||
        profile.jitterMs < 0 ||
        profile.jitterMs > 100 ||
        !Number.isSafeInteger(profile.seed)
      )
        throw Error("Invalid network test profile");
      net.profile = { ...profile };
      net.scheduleCount = 0;
    },
    silenceNetworkInput: (ms: number) => {
      if (!Number.isFinite(ms) || ms < 0 || ms > 8000)
        throw Error("Invalid silence duration");
      net.silenceUntil = performance.now() + ms;
    },
    getState: () => structuredClone(sim.state),
    getTargeting: () => ({
      primary: sim.withActor(view.actorId, () => sim.targeting("primary")),
      secondary: sim.withActor(view.actorId, () => sim.targeting("secondary")),
    }),
    // Setup only: actions under test must still arrive through real inputs.
    setupTestState: (patch: {
      entities?: {
        id: string;
        pos?: { x: number; y: number; z: number };
        wet?: number;
        hp?: number;
        heat?: number;
        cohesion?: number;
        aiEnabled?: boolean;
      }[];
      dodgeRemaining?: number;
      secondaryRemaining?: number;
      fieldLife?: number;
      enemyEnabled?: boolean;
    }) => {
      if (net.role === "guest") throw Error("Only host can arrange test state");
      if (!(net.active ? net.paused : paused))
        throw Error("Pause before test setup");
      if (patch.enemyEnabled !== undefined)
        sim.state.entities.forEach((e) => {
          if (e.ai) e.ai.enabled = patch.enemyEnabled!;
        });
      for (const change of patch.entities ?? []) {
        const entity = sim.state.entities.find((e) => e.id === change.id);
        if (!entity) throw Error("Unknown entity");
        const { aiEnabled, ...values } = structuredClone(change);
        Object.assign(entity, values);
        if (aiEnabled !== undefined && entity.ai) entity.ai.enabled = aiEnabled;
        sim.physics.teleport(entity);
      }
      if (patch.dodgeRemaining !== undefined)
        localActor().dodgeUntil = sim.state.time + patch.dodgeRemaining;
      if (patch.secondaryRemaining !== undefined)
        localActor().secondaryReady = sim.state.time + patch.secondaryRemaining;
      if (patch.fieldLife !== undefined)
        sim.state.fields.forEach((f) => (f.life = patch.fieldLife!));
      sim.physics.world.step();
      view.center.set(sim.player.pos.x * 0.82, 0, sim.player.pos.z * 0.82);
      view.render(sim.state, 0);
    },
    getPlayerState: () => structuredClone(localPlayer()),
    getActivePrinciple: () => localActor().activePrinciple,
    getWorldStates: () => structuredClone(sim.state.entities),
    getMetrics: () => ({
      ...structuredClone(sim.state.metrics),
      render: view.metrics(),
      audio: {
        muted: audio.muted,
        context: audio.context?.state ?? "locked",
        played: audio.played,
      },
      activeManifestations: sim.state.fields.length,
    }),
    getExperimentConfig: () => ({ ...config }),
    setExperimentConfig: configure,
    resetLab: reset,
    resetCombatStation: combatReset,
    setCameraPreset: (preset: Config["camera"]) =>
      configure({ camera: preset }),
    getInputProfile: () => ({
      profile: input.profile,
      wheelOptional: input.wheelEnabled,
    }),
    setInputProfile: (profile: Parameters<Input["setProfile"]>[0]) =>
      input.setProfile(profile),
    getBindings: () => structuredClone(input.bindings),
    setBinding: (...args: Parameters<Input["setBinding"]>) =>
      input.setBinding(...args),
    projectWorld: (pos: Parameters<View["project"]>[0]) => view.project(pos),
    setPaused: (value: boolean) => {
      if (net.role === "guest")
        throw Error("Host controls deterministic pause");
      if (net.active) {
        net.paused = value;
        sim.state.party!.epoch++;
      } else paused = value;
      input.clear();
      ui.last = 0;
    },
    step: (ticks = 1) => {
      if (net.active)
        throw Error("Use host real-time play for networking journeys");
      if (!paused) throw Error("Pause before deterministic stepping");
      for (let i = 0; i < Math.min(ticks, 600); i++)
        sim.step(idleInput(sim.state.aim));
      view.render(sim.state, 0);
    },
  };
  if (import.meta.env.DEV) window.__RUINWEAVERS__ = api;
  let previousTick = 0;
  let last = performance.now(),
    accumulator = 0;
  view.center.set(sim.player.pos.x * 0.82, 0, sim.player.pos.z * 0.82);
  view.render(sim.state, 0);
  function frame(now: number) {
    const rawElapsed = (now - last) / 1000;
    const elapsed = Math.min(rawElapsed, 0.1);
    last = now;
    if (!net.active && !paused && !document.hidden && !view.contextLost) {
      accumulator += elapsed;
      while (accumulator >= 1 / 60) {
        const aim = input.pointer.active
          ? view.aimFromPointer(input.pointer.x, input.pointer.y)
          : sim.state.aim;
        sim.step(input.sample(aim));
        accumulator -= 1 / 60;
      }
    } else accumulator = 0;
    if (sim.state.tick < previousTick) {
      view.reset();
      audio.reset();
    }
    previousTick = sim.state.tick;
    view.previewAim =
      net.active && input.pointer.active
        ? view.aimFromPointer(input.pointer.x, input.pointer.y)
        : undefined;
    view.render(sim.state, rawElapsed);
    audio.update(sim.state);
    ui.update(sim.state, view, net.active ? net.paused : paused);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
boot().catch((error) => {
  document.querySelector("#app")!.textContent =
    `The Magic Lab could not start: ${String(error)}. A WebGL 2 browser is required.`;
  console.error(error);
});
declare global {
  interface Window {
    __RUINWEAVERS__: any;
  }
}
