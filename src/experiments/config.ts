export type Principle = "Ember" | "Tide" | "Gale" | "Stone";
export const PRINCIPLES: Principle[] = ["Ember", "Tide", "Gale", "Stone"];
export type Model = "primary-secondary" | "weave-unweave";
export type CameraPreset = "tactical" | "balanced" | "cinematic";
export type Tempo = "deliberate" | "balanced" | "faster";
export const TEMPOS = {
  deliberate: {
    moveSpeed: 4.6,
    dodgeDistance: 3.1,
    dodgeDuration: 0.25,
    dodgeRecovery: 0.95,
    castRecovery: 1.18,
    telegraph: 1.25,
  },
  balanced: {
    moveSpeed: 5.6,
    dodgeDistance: 3.5,
    dodgeDuration: 0.22,
    dodgeRecovery: 0.8,
    castRecovery: 1,
    telegraph: 1.05,
  },
  faster: {
    moveSpeed: 6.7,
    dodgeDistance: 3.9,
    dodgeDuration: 0.19,
    dodgeRecovery: 0.65,
    castRecovery: 0.82,
    telegraph: 0.85,
  },
};
export interface Config {
  model: Model;
  camera: CameraPreset;
  tempo: Tempo;
  scene: string;
  seed: number;
  moveSpeed: number;
  dodgeDistance: number;
  dodgeDuration: number;
  dodgeRecovery: number;
  castRecovery: number;
  telegraph: number;
  secondaryCapacity: number;
  invulnerability: number;
  castMoveMultiplier: number;
  cameraDistance: number;
  cameraPitch: number;
  inputBuffer: number;
}
export const CAMERAS = {
  tactical: { cameraDistance: 27, cameraPitch: 64 },
  balanced: { cameraDistance: 24, cameraPitch: 51 },
  cinematic: { cameraDistance: 22, cameraPitch: 37 },
};
export const SCENES = [
  "free",
  "ergonomics",
  "states",
  "combat",
  "traversal",
  "input-compatibility",
];
export function configFromQuery(query = ""): Config {
  const q = new URLSearchParams(query);
  const tempo = q.get("tempo") as Tempo;
  const camera = q.get("camera") as CameraPreset;
  return {
    model:
      q.get("model") === "weave-unweave"
        ? "weave-unweave"
        : "primary-secondary",
    camera: camera in CAMERAS ? camera : "balanced",
    tempo: tempo in TEMPOS ? tempo : "balanced",
    scene: SCENES.includes((q.get("scene") || "").replace("magic-lab/", ""))
      ? q.get("scene")!.replace("magic-lab/", "")
      : "free",
    seed: Number(q.get("seed")) || 123,
    ...TEMPOS[tempo in TEMPOS ? tempo : "balanced"],
    ...CAMERAS[camera in CAMERAS ? camera : "balanced"],
    secondaryCapacity: 1,
    inputBuffer: q.get("buffer") === "0" ? 0 : 0.12,
    invulnerability: 0.17,
    castMoveMultiplier: 0.78,
  };
}
export const CAST = {
  Ember: {
    cadence: 0.32,
    range: 11,
    primary: "Heat bolt",
    secondary: "Cinder seam",
    inverse: "Cool / quench",
  },
  Tide: {
    cadence: 0.42,
    range: 8,
    primary: "Saturating jet",
    secondary: "Flow basin",
    inverse: "Drain / draw",
  },
  Gale: {
    cadence: 0.5,
    range: 6,
    primary: "Pressure fan",
    secondary: "Updraft",
    inverse: "Pull",
  },
  Stone: {
    cadence: 0.64,
    range: 9,
    primary: "Binding eruption",
    secondary: "Raise slab",
    inverse: "Fracture",
  },
};
