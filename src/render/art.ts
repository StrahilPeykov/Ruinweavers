import { BUILD_ID } from "../network/protocol";
import * as T from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import type { Entity, State } from "../simulation/types";
export type ArtMode = "off" | "storybook" | "ink" | "illustrated";
const PIGMENT = {
  cloth: 0x754966,
  trim: 0xe3b976,
  stone: 0xe5d8b5,
  dark: 0x334554,
  patina: 0x447e8b,
  light: 0xffedc9,
  wood: 0x976450,
};
export const ART = {
  illustrated: {
    title: "The painted court",
    floor: 0xb8b6a4,
    tile: 0xc8c7b5,
    wall: 0x79969b,
    dark: 0x334554,
    sky: 0xb8c9c7,
    sun: 0xffe8cf,
  },
  storybook: {
    title: "The fitted court",
    floor: 0x9d9981,
    tile: 0xb3aa8d,
    wall: 0xb1a184,
    dark: 0x293d3e,
    sky: 0x737b79,
    sun: 0xffe0b0,
  },
  ink: {
    title: "The folded court",
    floor: 0x647779,
    tile: 0x87958f,
    wall: 0x526e78,
    dark: 0x192c39,
    sky: 0x485968,
    sun: 0xffd391,
  },
};
/** A device-local presentation adapter. Never modifies Simulation or its queries. */
export class ArtStudy {
  mode: ArtMode;
  active = false;
  ready = false;
  error = "";
  loadMs = 0;
  bytes = 0;
  library = new Map<string, GLTF>();
  geometry = new Set<T.BufferGeometry>();
  mixers = new Map<T.Object3D, T.AnimationMixer>();
  bounds: Record<string, number[]> = {};
  gradient?: T.DataTexture;
  treatment: string;
  constructor() {
    const q = new URLSearchParams(location.search);
    const value = q.get("art") ?? (!q.has("scene") ? "storybook" : "off");
    this.mode = value === "storybook" || value === "ink" ? value : "off";
    this.treatment =
      q.get("treatment") === "illustrated" ? "illustrated" : "original";
  }
  async load() {
    if (this.mode === "off") return;
    const start = performance.now(),
      loader = new GLTFLoader();
    // Three discrete diffuse bands. All other material handling stays built-in.
    this.gradient = new T.DataTexture(
      new Uint8Array([65, 150, 245]),
      3,
      1,
      T.RedFormat,
    );
    this.gradient.minFilter = this.gradient.magFilter = T.NearestFilter;
    this.gradient.needsUpdate = true;
    try {
      await Promise.all(
        [
          "mage",
          "sentinel",
          "pursuer",
          "cover",
          "landmark",
          "vessel",
          "timber",
          "ballast",
          "loose",
        ].map(async (name) => {
          const response = await fetch(
            `/art/${this.mode}/${name}.glb?v=${BUILD_ID}`,
          );
          if (!response.ok) throw Error(`Asset ${name}: ${response.status}`);
          const buffer = await response.arrayBuffer();
          this.bytes += buffer.byteLength;
          const gltf = await loader.parseAsync(buffer, "");
          gltf.scene.updateMatrixWorld(true);
          const box = new T.Box3().setFromObject(gltf.scene),
            size = box.getSize(new T.Vector3());
          this.bounds[name] = [...box.min.toArray(), ...box.max.toArray()];
          if (!Number.isFinite(size.length()) || size.y <= 0)
            throw Error(`Invalid asset bounds: ${name}`);
          gltf.scene.traverse((o) => {
            if (o instanceof T.Mesh) this.geometry.add(o.geometry);
          });
          this.library.set(name, gltf);
        }),
      );
      this.ready = true;
    } catch (e) {
      this.error = String(e);
      console.error("Art proof fallback:", e);
    }
    this.loadMs = performance.now() - start;
  }
  enabled(s: State) {
    return this.ready && this.mode !== "off" && s.trial?.encounter === 2;
  }
  get palette() {
    if (this.treatment === "illustrated") return ART.illustrated;
    return ART[this.mode === "ink" ? "ink" : "storybook"];
  }
  clone(name: string, actor?: string) {
    const gltf = this.library.get(name)!;
    const group = gltf.scene.clone(true);
    group.name = "art-model";
    group.traverse((o) => {
      if (!(o instanceof T.Mesh)) return;
      o.castShadow = o.receiveShadow = true;
      const convert = (base: T.MeshStandardMaterial) => {
        const color = base.color.clone();
        if (this.treatment === "illustrated" && base.name in PIGMENT)
          color.setHex(PIGMENT[base.name as keyof typeof PIGMENT]);
        // Stable personal mantle/accent, independent of the selected Principle.
        if (actor === "mage-2" && base.name === "cloth")
          color.setHex(this.mode === "ink" ? 0x915b43 : 0x3d676a);
        if (actor === "mage-2" && base.name === "trim") color.setHex(0xe0dac2);
        const m =
          this.mode === "ink" || this.treatment === "illustrated"
            ? new T.MeshToonMaterial({ color, gradientMap: this.gradient })
            : new T.MeshStandardMaterial({
                color,
                roughness: base.roughness,
                metalness: base.metalness,
              });
        m.name = base.name;
        m.side = base.side;
        return m;
      };
      o.material = Array.isArray(o.material)
        ? o.material.map(convert)
        : convert(o.material);
    });
    if (gltf.animations.length) {
      const mixer = new T.AnimationMixer(group);
      for (const clip of gltf.animations) mixer.clipAction(clip).play();
      this.mixers.set(group, mixer);
    }
    return group;
  }
  release(root: T.Object3D) {
    root.traverse((o) => {
      const mixer = this.mixers.get(o);
      if (mixer) {
        mixer.stopAllAction();
        mixer.uncacheRoot(o);
        this.mixers.delete(o);
      }
    });
  }
  dressEntity(group: T.Group, e: Entity) {
    const asset =
      e.kind === "player"
        ? "mage"
        : e.kind === "wood"
          ? "timber"
          : e.kind === "heavy"
            ? "ballast"
            : e.kind === "loose"
              ? "loose"
              : e.kind;
    if (!this.library.has(asset)) return;
    // Keep the established state indicators; replace only the primitive costume.
    for (const o of group.children)
      if (!["wet", "heat", "crack", "anchor", "hp"].includes(o.name))
        o.visible = false;
    const model = this.clone(asset, e.id);
    model.position.y = -e.height / 2;
    if (e.kind === "player") model.rotation.y = Math.PI; // asset +Z forward; player adapter -Z forward.
    group.add(model);
    const shadow = new T.Mesh(
      new T.CircleGeometry(e.radius * 0.98, 24),
      new T.MeshBasicMaterial({
        color: 0x172d32,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -e.height / 2 + 0.018;
    shadow.name = "contact";
    group.add(shadow);
    if (e.kind === "player") {
      // One disc / two bars remain distinct in grayscale and at the same spell color.
      const n = e.id === "mage-1" ? 1 : 2;
      for (let i = 0; i < n; i++) {
        const marker = new T.Mesh(
          n === 1
            ? new T.CircleGeometry(0.105, 16)
            : new T.PlaneGeometry(0.07, 0.23),
          new T.MeshBasicMaterial({ color: 0xfff1cf, depthTest: false }),
        );
        marker.rotation.x = -Math.PI / 2;
        marker.position.set(
          (i - (n - 1) / 2) * 0.15,
          -e.height / 2 + 0.035,
          0.64,
        );
        marker.renderOrder = 14;
        group.add(marker);
      }
    }
  }
  updateEntity(group: T.Group, e: Entity, s: State) {
    const model = group.getObjectByName("art-model");
    if (!model) return;
    const mixer = this.mixers.get(model);
    if (mixer)
      mixer.setTime(
        s.time * (Math.hypot(e.velocity.x, e.velocity.z) > 0.2 ? 2.5 : 1),
      );
    // Bounded root tilt leaves feet/hurt volume stable; attacks are still state-driven.
    model.rotation.x =
      e.kind === "pursuer" && e.ai?.phase === "telegraph" ? -0.13 : 0;
    model.traverse((o) => {
      if (o instanceof T.Mesh)
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if ("emissive" in m) {
            m.emissive.setHex(
              s.time - e.hitAt < 0.1 ? 0x9d6f41 : e.heat > 30 ? 0x531602 : 0,
            );
            m.emissiveIntensity = 0.35;
          }
        }
    });
  }
  decorate(terrain: T.Group, s: State) {
    // Thin inlay, not extra walking/collision geometry. Broad quiet tiles avoid
    // concentric ground symbols that could be mistaken for active fields.
    const tiles = new T.InstancedMesh(
      new T.BoxGeometry(3.98, 0.014, 1.98),
      new T.MeshStandardMaterial({ color: this.palette.tile, roughness: 1 }),
      60,
    );
    const matrix = new T.Matrix4();
    let index = 0;
    for (let x = -10; x <= 10; x += 4)
      for (let z = -9; z <= 9; z += 2) {
        matrix.makeTranslation(x, 0.005, z);
        tiles.setMatrixAt(index, matrix);
        tiles.setColorAt(
          index,
          new T.Color(0xffffff).multiplyScalar(
            0.98 + ((index * 17) % 7) * 0.004,
          ),
        );
        index++;
      }
    tiles.receiveShadow = true;
    terrain.add(tiles);
    const landmark = this.clone("landmark");
    landmark.position.set(0, 0, -13.2);
    terrain.add(landmark);
    for (const x of [-8, 8]) {
      const vessel = this.clone("vessel");
      vessel.position.set(x, 2.12, -11.35);
      terrain.add(vessel);
    }
    for (const box of s.terrain ?? [])
      if (box.name === "Cover") {
        const cover = this.clone("cover");
        cover.position.set(box.x, box.y - box.h / 2, box.z);
        terrain.add(cover);
      }
  }
  metrics() {
    return {
      mode: this.mode,
      treatment: this.treatment,
      active: this.active,
      ready: this.ready,
      error: this.error,
      loadMs: this.loadMs,
      downloadBytes: this.bytes,
      assets: this.library.size,
      animationMixers: this.mixers.size,
      sharedGeometries: this.geometry.size,
      bounds: this.bounds,
    };
  }
}
