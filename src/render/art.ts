import { roomPresentation } from "./rooms";
import { BUILD_ID } from "../network/protocol";
import { performMage } from "./performance";
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
  paintTexture?: T.Texture;
  treatment: string;
  constructor() {
    const q = new URLSearchParams(location.search);
    const value =
      q.get("art") ??
      (!q.has("scene") || q.get("scene") === "run" ? "illustrated" : "off");
    this.mode =
      value === "storybook" || value === "ink" || value === "illustrated"
        ? value
        : "off";
    this.treatment =
      q.get("treatment") === "illustrated" || this.mode === "illustrated"
        ? "illustrated"
        : "original";
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
          ...(this.mode === "illustrated" ? ["surround"] : []),
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
            if (o instanceof T.Mesh) {
              this.geometry.add(o.geometry);
              for (const m of Array.isArray(o.material)
                ? o.material
                : [o.material]) {
                if (m.map && this.mode === "illustrated") {
                  if (!this.paintTexture) this.paintTexture = m.map;
                  else if (m.map !== this.paintTexture) {
                    m.map.dispose();
                    m.map = this.paintTexture;
                  }
                }
              }
            }
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
    return (
      this.ready &&
      this.mode !== "off" &&
      ((this.mode === "illustrated" && !!roomPresentation(s)) ||
        s.trial?.encounter === 2)
    );
  }
  get palette() {
    if (this.treatment === "illustrated") return ART.illustrated;
    return ART[this.mode === "ink" ? "ink" : "storybook"];
  }
  clone(name: string, actor?: string) {
    const gltf = this.library.get(name)!;
    const group = gltf.scene.clone(true);
    group.name = "art-model";
    const silhouettes: T.Mesh[] = [];
    group.traverse((o) => {
      if (!(o instanceof T.Mesh)) return;
      o.castShadow = true;
      // Graphic surface values carry form. Standard adds ground shadows; avoid
      // self-shadow striping on small fitted ornament at the gameplay camera.
      o.receiveShadow = this.mode !== "illustrated";
      const convert = (base: T.MeshStandardMaterial) => {
        const color = base.color.clone();
        if (
          this.treatment === "illustrated" &&
          this.mode !== "illustrated" &&
          base.name in PIGMENT
        )
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
        m.map = base.map;
        m.vertexColors = !!o.geometry.getAttribute("color");
        return m;
      };
      o.material = Array.isArray(o.material)
        ? o.material.map(convert)
        : convert(o.material);
      if (
        this.mode === "illustrated" &&
        ["mage", "sentinel", "pursuer"].includes(name)
      )
        silhouettes.push(o);
    });
    for (const mesh of silhouettes) {
      const edge = new T.Mesh(
        mesh.geometry,
        new T.MeshBasicMaterial({ color: 0x344653, side: T.BackSide }),
      );
      edge.name = "silhouette";
      edge.scale.setScalar(1.025);
      mesh.add(edge);
    }
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
    // Source human crown is 1.90 m; fit the visible body to the existing capsule.
    // The measuring-staff tip extends slightly above it, without joining picking.
    if (this.mode === "illustrated" && e.kind === "player")
      model.scale.setScalar(e.height / 1.9);
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
  updateEntity(group: T.Group, e: Entity, s: State, delta = 0, paused = false) {
    const model = group.getObjectByName("art-model");
    if (!model) return;
    if (this.mode === "illustrated" && e.kind === "player")
      performMage(model, e, s, delta, paused);
    const mixer = this.mixers.get(model);
    if (mixer)
      mixer.setTime(
        s.time * (Math.hypot(e.velocity.x, e.velocity.z) > 0.2 ? 2.5 : 1),
      );
    // Bounded root tilt leaves feet/hurt volume stable; attacks are still state-driven.
    model.rotation.x =
      e.kind === "pursuer" && e.ai?.phase === "telegraph" ? -0.13 : 0;
    if (this.mode === "illustrated" && e.ai) {
      const moving = Math.min(1, Math.hypot(e.velocity.x, e.velocity.z) / 4);
      model.position.y =
        -e.height / 2 +
        (e.kind === "pursuer"
          ? Math.abs(Math.sin(s.time * 13)) * moving * 0.05
          : 0);
      model.rotation.x =
        e.ai.phase === "telegraph"
          ? e.kind === "pursuer"
            ? -0.22
            : -0.12
          : e.ai.phase === "recover"
            ? 0.1
            : 0;
    }
    model.traverse((o) => {
      if (o instanceof T.Mesh)
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if ("emissive" in m) {
            m.emissive.setHex(
              s.time - e.hitAt < 0.1
                ? 0x9d6f41
                : e.heat > 30
                  ? 0x531602
                  : this.mode === "illustrated" &&
                      e.ai?.phase === "telegraph" &&
                      ["trim", "light"].includes(m.name)
                    ? 0xc15a38
                    : 0,
            );
            m.emissiveIntensity = 0.35;
          }
        }
    });
  }
  decorate(terrain: T.Group, s: State) {
    const room = this.mode === "illustrated" ? roomPresentation(s) : undefined;
    // Thin inlay, not extra walking/collision geometry. Broad quiet tiles avoid
    // concentric ground symbols that could be mistaken for active fields.
    const tiles = new T.InstancedMesh(
      new T.BoxGeometry(3.98, 0.014, this.mode === "illustrated" ? 3.98 : 1.98),
      new T.MeshStandardMaterial({ color: this.palette.tile, roughness: 1 }),
      this.mode === "illustrated" ? 30 : 60,
    );
    const matrix = new T.Matrix4();
    let index = 0;
    for (let x = -10; x <= 10; x += 4)
      for (
        let z = this.mode === "illustrated" ? -8 : -9;
        z <= 9;
        z += this.mode === "illustrated" ? 4 : 2
      ) {
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
    if (this.mode === "illustrated") {
      // Surviving pigment is confined to the court's edges; no luminous floor sigils.
      const pigment = new T.MeshStandardMaterial({
        color: room?.pigment ?? 0x748f93,
        roughness: 1,
      });
      for (const x of [-11.5, 11.5]) {
        const edge = new T.Mesh(
          new T.BoxGeometry(0.72, 0.018, 20),
          pigment.clone(),
        );
        edge.position.set(x, 0.015, 0);
        terrain.add(edge);
      }
      for (const z of [-10.5, 10.5]) {
        const edge = new T.Mesh(
          new T.BoxGeometry(22.3, 0.018, 0.72),
          pigment.clone(),
        );
        edge.position.set(0, 0.015, z);
        terrain.add(edge);
      }
      pigment.dispose();
    }
    const landmark = this.clone("landmark");
    if (this.mode === "illustrated") {
      const location = room?.landmark ?? [-12.84, 1.5, -3];
      landmark.position.set(location[0], location[1], location[2]);
      landmark.scale.setScalar(room?.scale ?? 0.65);
      landmark.rotation.y = Math.PI / 2;
      terrain.add(this.clone("surround"));
      if (room) {
        // Remote colonnade stays outside the solid arena boundary. Reuse one kit.
        for (const x of room.columns) {
          const column = this.clone("cover");
          column.position.set(x, 0, -12.4);
          column.scale.set(0.6, room.role === "approach" ? 1.6 : 2.2, 0.6);
          terrain.add(column);
        }
      }
      if (room?.role === "ward") {
        landmark.name = "final-ward";
        const binding = new T.Group();
        binding.name = "ward-binding";
        for (let i = 0; i < 3; i++) {
          const stroke = new T.Mesh(
            new T.BoxGeometry(0.09, 3, 0.09),
            new T.MeshBasicMaterial({ color: 0xdca071 }),
          );
          stroke.position.set(0, 3.5, (i - 1) * 0.85);
          stroke.rotation.x = (i - 1) * 0.22;
          binding.add(stroke);
        }
        landmark.add(binding);
        // A fitted wall crest closes when authority declares victory. It is on
        // existing solid masonry, not an interactive door or a ground hazard.
        const crest = new T.Group();
        crest.name = "ward-crest";
        crest.position.set(0, 1.08, -10.96);
        for (let i = 0; i < 3; i++) {
          const arc = new T.Mesh(
            new T.TorusGeometry(0.75, 0.065, 5, 16, Math.PI * 0.59),
            new T.MeshBasicMaterial({ color: 0xd6ad78 }),
          );
          arc.rotation.z = (i * Math.PI * 2) / 3 + 0.15;
          crest.add(arc);
        }
        terrain.add(crest);
      }
    } else landmark.position.set(0, 0, -13.2);
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
  updateRoom(terrain: T.Group, s: State) {
    const crest = terrain.getObjectByName("ward-crest");
    if (crest)
      crest.children.forEach((arc, i) => {
        arc.rotation.z =
          (i * Math.PI * 2) / 3 + (s.trial?.status === "victory" ? 0 : 0.15);
        arc.position.y = s.trial?.status === "victory" ? 0 : (i - 1) * 0.08;
        ((arc as T.Mesh).material as T.MeshBasicMaterial).color.setHex(
          s.trial?.status === "victory" ? 0xc3e3cc : 0xd6ad78,
        );
      });
    const ward = terrain.getObjectByName("ward-binding");
    if (ward) {
      const resolved = s.trial?.status === "victory";
      ward.rotation.x = resolved ? Math.PI / 2 : 0;
      ward.scale.y = resolved ? 0.12 : 1;
      ward.traverse((o) => {
        if (o instanceof T.Mesh)
          (o.material as T.MeshBasicMaterial).color.setHex(
            resolved ? 0xb8dfcc : 0xdca071,
          );
      });
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
      articulated: this.mode === "illustrated",
    };
  }
}
