import * as T from "three";
import { hasUpgrade } from "../simulation/run";
import { ArtStudy } from "./art";
import { CAST, type Config, type Principle } from "../experiments/config";
import { PAD, TERRAIN, WATER } from "../simulation/lab";
import { distance, Simulation } from "../simulation/simulation";
import { type Entity, type State, type Vec, vec } from "../simulation/types";
export const COLORS: Record<Principle, number> = {
  Ember: 0xff9860,
  Tide: 0x5ecbd6,
  Gale: 0xc1e6b3,
  Stone: 0xd0b2ef,
};
const material = (
  color: number,
  extra: Partial<T.MeshStandardMaterialParameters> = {},
) => new T.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
export class View {
  art = new ArtStudy();
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(43, 1, 0.1, 140);
  entities = new Map<string, T.Group>();
  fields = new Map<string, T.Group>();
  bolts = new Map<string, T.Mesh>();
  effects = new Map<number, T.Group>();
  actorId = "mage-1";
  previewAim?: import("../simulation/types").AimPoint;
  aim = new T.Group();
  dangers = new Map<string, T.Group>();
  terrainGroup = new T.Group();
  terrainKey = "";
  labDecor = new T.Group();
  placement = new T.Group();
  pad: T.Mesh;
  labels: { sprite: T.Sprite; pos: Vec }[] = [];
  raycaster = new T.Raycaster();
  ground = new T.Plane(new T.Vector3(0, 1, 0), 0);
  center = new T.Vector3();
  geometries = {
    box: new T.BoxGeometry(1, 1, 1),
    sphere: new T.IcosahedronGeometry(1, 1),
    ring: new T.RingGeometry(0.88, 1, 48),
  };
  quality: "standard" | "lightweight" = "standard";
  rendererIdentity = "unavailable";
  lastFrame = 0;
  displayedState?: State;
  intervals: number[] = [];
  contextLost = false;
  constructor(
    public canvas: HTMLCanvasElement,
    public config: Config,
    public simulation: Simulation,
  ) {
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    const gl = this.renderer.getContext();
    const rendererInfo = gl.getExtension("WEBGL_debug_renderer_info");
    this.rendererIdentity = rendererInfo
      ? String(gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER));
    let savedQuality: string | null = null;
    try {
      savedQuality = localStorage.getItem("ruinweavers-render-quality");
    } catch {}
    this.quality =
      (new URLSearchParams(location.search).get("quality") ?? savedQuality) ===
      "lightweight"
        ? "lightweight"
        : "standard";
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = this.quality === "standard";
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.setClearColor(0x18252b);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.scene.fog = new T.Fog(0x18252b, 38, 85);
    this.scene.add(new T.HemisphereLight(0xd9ecf0, 0x61706a, 2.1));
    const sun = new T.DirectionalLight(0xffe1b9, 2.8);
    sun.position.set(-9, 18, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {
      left: -22,
      right: 22,
      top: 22,
      bottom: -22,
      near: 1,
      far: 65,
    });
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.035;
    this.scene.add(sun);
    this.scene.add(this.terrainGroup, this.labDecor);
    for (const t of TERRAIN) {
      const mesh = this.box(t.w, t.h, t.d, t.name ? 0x667675 : 0x43545a);
      mesh.position.set(t.x, t.y, t.z);
      this.terrainGroup.add(mesh);
    }
    const grid = new T.GridHelper(30, 30, 0x82928f, 0x5a6c70);
    grid.position.y = 0.012;
    grid.material.transparent = true;
    grid.material.opacity = 0.19;
    this.labDecor.add(grid);
    const water = new T.Mesh(
      new T.CircleGeometry(WATER.radius, 64),
      material(0x427d89, {
        transparent: true,
        opacity: 0.65,
        metalness: 0.45,
        roughness: 0.25,
      }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(WATER.x, 0.035, WATER.z);
    this.labDecor.add(water);
    this.pad = this.disc(PAD.radius, 0x718485, 0.7);
    this.pad.position.set(PAD.x, 0.04, PAD.z);
    this.labDecor.add(this.pad);
    for (const [label, x, z] of [
      ["SATURATION", -7, 1.7],
      ["MATERIALS", -4.5, -8.7],
      ["PRESSURE", 5, -11],
      ["TRAVERSAL", 12.7, 5],
      ["ELEVATION", -10, -12.6],
      ["BALLAST → PLATE", 5.7, 3.8],
    ] as [string, number, number][])
      this.label(label, vec(x, 0.08, z));
    this.scene.add(this.aim, this.placement);
    const footprint = this.ring(2.5, 0xffffff, 0.55);
    footprint.geometry = new T.RingGeometry(0.985, 1, 64);
    footprint.material.depthTest = false;
    footprint.renderOrder = 12;
    this.placement.add(footprint);
    for (const [w, d] of [
      [6, 6],
      [1.6, 4],
    ]) {
      const outline = new T.LineSegments(
        new T.EdgesGeometry(new T.BoxGeometry(w, 0.02, d)),
        new T.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.45,
          depthTest: false,
        }),
      );
      this.placement.add(outline);
    }
    this.aim.add(this.ring(0.42, 0xffffff));
    const dot = this.disc(0.07, 0xffffff);
    dot.position.y = 0.02;
    this.aim.add(dot);
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.contextLost = true;
    });
    canvas.addEventListener("webglcontextrestored", () => {
      this.contextLost = false;
    });
    window.addEventListener("resize", () => this.resize());
    this.resize();
  }
  box(w: number, h: number, d: number, color: number) {
    const m = new T.Mesh(this.geometries.box, material(color));
    m.scale.set(w, h, d);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
  disc(r: number, color: number, opacity = 0.6) {
    const m = new T.Mesh(
      new T.CircleGeometry(r, 48),
      new T.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        side: T.DoubleSide,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    return m;
  }
  ring(r: number, color: number, opacity = 0.8) {
    const m = new T.Mesh(
      this.geometries.ring,
      new T.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        side: T.DoubleSide,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    m.scale.setScalar(r);
    return m;
  }
  label(text: string, pos: Vec) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 64;
    const ctx = c.getContext("2d")!;
    ctx.font = "500 25px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#c0cecc";
    ctx.fillText(text, 256, 40);
    const texture = new T.CanvasTexture(c);
    const s = new T.Sprite(
      new T.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      }),
    );
    s.position.set(pos.x, pos.y + 0.2, pos.z);
    s.scale.set(6, 0.8, 1);
    this.scene.add(s);
    this.labels.push({ sprite: s, pos });
  }
  makeEntity(e: Entity) {
    const group = new T.Group(),
      kind = e.kind;
    let body: T.Mesh;
    if (kind === "player") {
      body = new T.Mesh(new T.ConeGeometry(0.42, 1.1, 6), material(0xe4e8cf));
      body.position.y = -0.05;
      const head = new T.Mesh(
        new T.IcosahedronGeometry(0.24, 1),
        material(0x233a42),
      );
      head.position.y = 0.6;
      group.add(head);
      const staff = this.box(0.09, 1.35, 0.09, 0x95b8ad);
      staff.position.set(0.48, 0.12, 0);
      group.add(staff);
      const orb = new T.Mesh(
        new T.IcosahedronGeometry(0.13),
        material(0xffbd83, { emissive: 0xff8844, emissiveIntensity: 1 }),
      );
      orb.position.set(0.48, 0.88, 0);
      orb.name = "orb";
      group.add(orb);
      const facing = this.box(0.12, 0.07, 0.65, 0xeff5d9);
      facing.position.set(0, -0.57, -0.62);
      group.add(facing);
    } else if (kind === "pursuer") {
      body = new T.Mesh(
        new T.DodecahedronGeometry(0.58, 0),
        material(0xba8264),
      );
      body.scale.set(1, 0.7, 1.15);
      const muzzle = this.box(0.65, 0.2, 0.5, 0x593d38);
      muzzle.position.set(0, 0.05, 0.45);
      group.add(muzzle);
      for (const side of [-1, 1]) {
        const ear = new T.Mesh(
          new T.ConeGeometry(0.15, 0.45, 4),
          material(0xf1c698),
        );
        ear.position.set(side * 0.35, 0.35, 0);
        group.add(ear);
      }
    } else if (kind === "sentinel") {
      body = new T.Mesh(new T.OctahedronGeometry(0.8), material(0xb27e73));
      const eye = new T.Mesh(
        new T.IcosahedronGeometry(0.2),
        material(0xff684f, { emissive: 0xff3b20, emissiveIntensity: 1 }),
      );
      eye.position.set(0, 0.3, 0.65);
      group.add(eye);
      const base = this.box(1.45, 0.25, 1.45, 0x756b6c);
      base.position.y = -0.68;
      group.add(base);
    } else if (kind === "dummy" || kind === "moving") {
      body = this.box(
        e.radius * 1.3,
        e.height,
        0.4,
        kind === "moving" ? 0xb8b4a4 : 0xb2c0ba,
      );
      const cross = this.box(1.25, 0.22, 0.35, 0x789b97);
      cross.position.y = 0.2;
      group.add(cross);
    } else
      body = this.box(
        e.radius * 2,
        e.height,
        e.radius * 2,
        kind === "wood"
          ? 0xa0835f
          : kind === "brittle"
            ? 0xb6b7ad
            : kind === "heavy"
              ? 0x6d818c
              : 0xa0a6a0,
      );
    body.name = "body";
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    const wet = this.ring(e.radius + 0.22, COLORS.Tide);
    wet.name = "wet";
    wet.position.y = -e.height / 2 + 0.055;
    group.add(wet);
    const heat = new T.Mesh(
      new T.ConeGeometry(e.radius * 0.8, e.height * 1.3, 5, 1, true),
      new T.MeshBasicMaterial({
        color: COLORS.Ember,
        transparent: true,
        opacity: 0.4,
        side: T.DoubleSide,
        depthWrite: false,
      }),
    );
    heat.name = "heat";
    heat.position.y = e.height * 0.15;
    group.add(heat);
    const crack = new T.LineSegments(
      new T.EdgesGeometry(new T.IcosahedronGeometry(e.radius * 1.2, 0)),
      new T.LineBasicMaterial({ color: 0xf6dbff }),
    );
    crack.scale.y = e.height / (e.radius * 2);
    crack.name = "crack";
    group.add(crack);
    const anchor = this.ring(e.radius + 0.08, COLORS.Stone);
    anchor.name = "anchor";
    anchor.position.y = -e.height / 2 + 0.08;
    group.add(anchor);
    if (e.ai) {
      const back = this.box(1.3, 0.06, 0.12, 0x3b2729);
      back.position.y = e.height / 2 + 0.38;
      group.add(back);
      const hp = this.box(1.28, 0.065, 0.13, 0xf3b79d);
      hp.position.y = e.height / 2 + 0.38;
      hp.name = "hp";
      group.add(hp);
    }
    this.scene.add(group);
    if (this.art.active) this.art.dressEntity(group, e);
    this.entities.set(e.id, group);
    return group;
  }
  resize() {
    const w = innerWidth,
      h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const ratio =
      this.quality === "lightweight"
        ? Math.min(devicePixelRatio, 1, 1280 / w, 720 / h)
        : Math.min(devicePixelRatio, 1.5);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w, h);
  }
  aimFromPointer(x: number, y: number) {
    this.raycaster.setFromCamera(
      new T.Vector2((x / innerWidth) * 2 - 1, (-y / innerHeight) * 2 + 1),
      this.camera,
    );
    return this.simulation.physics.pick(
      this.raycaster.ray.origin,
      this.raycaster.ray.direction,
      this.actorId,
      this.simulation.replica ? this.displayedState?.entities : undefined,
    );
  }
  project(pos: Vec) {
    const v = new T.Vector3(pos.x, pos.y, pos.z).project(this.camera);
    return {
      x: ((v.x + 1) / 2) * innerWidth,
      y: ((1 - v.y) / 2) * innerHeight,
    };
  }
  line(a: Vec, b: Vec, color: number, width = 0.09) {
    const v = new T.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
    const m = new T.Mesh(
      this.geometries.box,
      new T.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      }),
    );
    m.scale.set(width, 0.045, v.length());
    m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + 0.04, (a.z + b.z) / 2);
    if (v.lengthSq() > 0)
      m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), v.normalize());
    return m;
  }
  destroy(group: T.Object3D) {
    this.art.release(group);
    group.traverse((o) => {
      if (o instanceof T.Mesh || o instanceof T.LineSegments) {
        if (o instanceof T.InstancedMesh) o.dispose();
        if (
          !Object.values(this.geometries).includes(o.geometry as never) &&
          !this.art.geometry.has(o.geometry)
        )
          o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose());
      }
    });
    group.removeFromParent();
  }
  reset() {
    for (const map of [this.entities, this.fields, this.bolts, this.effects]) {
      map.forEach((o) => this.destroy(o));
      map.clear();
    }
    this.center.set(0, 0, 0);
    this.dangers.forEach((g) => this.destroy(g));
    this.dangers.clear();
  }
  render(s: State, delta: number, paused = false) {
    const artActive = this.art.enabled(s);
    if (artActive !== this.art.active) {
      this.reset();
      this.terrainKey = "";
      this.art.active = artActive;
      document.body.dataset.art = artActive ? this.art.mode : "off";
      this.renderer.setClearColor(artActive ? this.art.palette.sky : 0x18252b);
      this.scene.fog = artActive
        ? this.art.mode === "illustrated"
          ? new T.Fog(0xb8c9c7, 36, 80)
          : null
        : new T.Fog(0x18252b, 38, 85);
      this.scene.children.forEach((o) => {
        if (o instanceof T.HemisphereLight) {
          o.intensity = artActive ? 1.8 : 2.1;
          o.color.setHex(artActive ? 0xd9e4e0 : 0xd9ecf0);
          o.groundColor.setHex(artActive ? this.art.palette.dark : 0x61706a);
        }
        if (o instanceof T.DirectionalLight) {
          o.intensity = artActive ? 2 : 2.8;
          o.color.setHex(artActive ? this.art.palette.sun : 0xffe1b9);
        }
      });
    }
    this.displayedState = s;
    const p =
        s.entities.find((e) => e.id === this.actorId) ??
        s.entities.find((e) => e.id === "mage-1")!,
      actor = s.actors[p.id],
      aim = this.previewAim ?? actor.aim,
      t = s.time;
    const terrain = s.terrain ?? TERRAIN,
      key =
        JSON.stringify(terrain) + (s.run ? `run:${s.trial?.encounter}` : "");
    if (key !== this.terrainKey) {
      for (const child of [...this.terrainGroup.children]) this.destroy(child);
      for (const box of terrain) {
        const mesh = this.box(
          box.w,
          box.h,
          box.d,
          this.art.active
            ? box.h <= 1
              ? this.art.palette.floor
              : this.art.palette.wall
            : s.run
              ? box.name
                ? 0x827e6a
                : box.h <= 1
                  ? 0x374947
                  : 0x59665e
              : box.name
                ? 0x667675
                : 0x43545a,
        );
        mesh.position.set(box.x, box.y, box.z);
        if (this.art.active && box.name === "Cover") mesh.visible = false;
        if (this.art.active && this.art.mode === "illustrated" && box.h === 2.6)
          mesh.visible = false;
        this.terrainGroup.add(mesh);
      }
      if (this.art.active) this.art.decorate(this.terrainGroup, s);
      if (s.run && !this.art.active) {
        // Non-colliding inlaid court markings, outside the aim/physics queries.
        for (const radius of [4.5, 9.5]) {
          const ring = new T.Mesh(
            new T.RingGeometry(radius - 0.025, radius, 64),
            new T.MeshBasicMaterial({
              color: 0xa79d71,
              transparent: true,
              opacity: 0.28,
            }),
          );
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = 0.015;
          this.terrainGroup.add(ring);
        }
        for (let i = 0; i < 5; i++) {
          const mark = this.box(
            0.8,
            0.025,
            0.15,
            i <= s.trial!.encounter ? 0xcbb575 : 0x5b6961,
          );
          mark.position.set((i - 2) * 1.2, 0.025, 8.8);
          this.terrainGroup.add(mark);
        }
      }
      this.terrainKey = key;
    }
    if (this.art.active) this.art.updateRoom(this.terrainGroup, s);
    this.labDecor.visible = !s.trial;
    this.labels.forEach((label) => (label.sprite.visible = !s.trial));
    for (const [id, g] of this.entities)
      if (!s.entities.some((e) => e.id === id)) {
        this.destroy(g);
        this.entities.delete(id);
      }
    this.center.lerp(
      new T.Vector3(
        s.run && s.trial?.status === "victory" ? 0 : p.pos.x * 0.82,
        0,
        s.run && s.trial?.status === "victory" ? 0 : p.pos.z * 0.82,
      ),
      1 - Math.exp(-delta * 12),
    );
    const pitch = (this.config.cameraPitch * Math.PI) / 180,
      d = this.config.cameraDistance;
    this.camera.position.set(
      this.center.x,
      this.center.y + d * Math.sin(pitch),
      this.center.z + d * Math.cos(pitch),
    );
    this.camera.lookAt(this.center);
    for (const e of s.entities) {
      const g = this.entities.get(e.id) || this.makeEntity(e);
      g.visible = e.hp > 0 || e.kind === "player";
      const flattenDown =
        !(this.art.active && this.art.mode === "illustrated") &&
        e.kind === "player" &&
        e.hp <= 0;
      g.scale.y = flattenDown ? 0.3 : 1;
      g.position.set(
        e.pos.x,
        e.pos.y - (flattenDown ? e.height * 0.35 : 0),
        e.pos.z,
      );
      if (e.kind === "player")
        g.rotation.y = Math.atan2(
          e.pos.x - s.actors[e.id].aim.x,
          e.pos.z - s.actors[e.id].aim.z,
        );
      else if (e.ai) {
        g.rotation.y = Math.atan2(
          e.ai.locked.x - e.pos.x,
          e.ai.locked.z - e.pos.z,
        );
        const hp = g.getObjectByName("hp");
        if (hp) hp.scale.x = 1.28 * Math.max(0, e.hp / e.maxHp);
      } else if (["heavy", "loose"].includes(e.kind))
        g.quaternion.set(
          e.rotation.x,
          e.rotation.y,
          e.rotation.z,
          e.rotation.w,
        );
      g.getObjectByName("wet")!.visible = e.wet > 0.1;
      g.getObjectByName("heat")!.visible = e.heat > 30;
      const heat = g.getObjectByName("heat") as T.Mesh<
        T.BufferGeometry,
        T.MeshBasicMaterial
      >;
      heat.scale.setScalar(e.burning ? 1 + Math.sin(t * 15) * 0.1 : 0.65);
      heat.material.opacity = e.burning ? (this.art.active ? 0.24 : 0.4) : 0.16;
      g.getObjectByName("crack")!.visible = e.cohesion < -0.25;
      g.getObjectByName("anchor")!.visible = e.cohesion > 0.25;
      const body = g.getObjectByName("body") as T.Mesh<
        T.BufferGeometry,
        T.MeshStandardMaterial
      >;
      body.material.emissive.setHex(
        t - e.hitAt < 0.12 ? 0xffffff : e.heat > 25 ? 0x7a2308 : 0,
      );
      body.material.emissiveIntensity =
        t - e.hitAt < 0.12 ? 0.65 : e.heat / 130;
      if (e.kind === "player") {
        const orb = g.getObjectByName("orb") as T.Mesh<
          T.BufferGeometry,
          T.MeshStandardMaterial
        >;
        orb.material.color.setHex(COLORS[s.actors[e.id].activePrinciple]);
        body.material.color.setHex(e.id === "mage-1" ? 0xe4e8cf : 0xb6cbea);
        orb.material.emissive.setHex(COLORS[s.actors[e.id].activePrinciple]);
      }
      if (this.art.active)
        this.art.updateEntity(
          g,
          e,
          s,
          delta,
          paused || (!!s.trial && s.trial.status !== "active"),
        );
    }
    for (const f of s.fields) {
      let g = this.fields.get(f.id);
      if (!g) {
        g = new T.Group();
        const color = COLORS[f.principle];
        if (f.principle === "Stone") {
          const step = this.box(6, 0.4, 6, 0x746d80);
          step.position.y = 0.13;
          g.add(step);
          const slab = this.box(4.4, 0.9, 4.4, 0x8f829d);
          slab.position.y = 0.33;
          g.add(slab);
          const rim = this.ring(1.7, color);
          rim.position.y = 0.79;
          g.add(rim);
        } else if (f.principle === "Ember") {
          const seam = this.box(1.6, 0.12, 4, color);
          seam.rotation.y = Math.atan2(f.end.x - f.pos.x, f.end.z - f.pos.z);
          seam.position.set(
            (f.end.x - f.pos.x) / 2,
            0.1,
            (f.end.z - f.pos.z) / 2,
          );
          g.add(seam);
        } else {
          g.add(
            this.disc(f.radius, color, 0.17),
            this.ring(f.radius, color, 0.55),
          );
          if (f.principle === "Gale")
            for (let i = 0; i < 3; i++) {
              const r = this.ring(1 + i * 0.4, color, 0.35);
              r.position.y = i * 0.65;
              g.add(r);
            }
        }
        g.children[g.children.length - 1].name = "expiry-cue";
        if (this.art.active) {
          // Fitted, open strokes: boundaries remain exact; nothing hides bodies.
          if (f.principle === "Tide" || f.principle === "Gale") {
            for (let i = 0; i < 3; i++) {
              const stroke = new T.Mesh(
                new T.RingGeometry(
                  1.1 + i * 0.38,
                  1.15 + i * 0.38,
                  28,
                  1,
                  i * 1.9,
                  1.35,
                ),
                new T.MeshBasicMaterial({
                  color,
                  transparent: true,
                  opacity: 0.6,
                  depthWrite: false,
                  side: T.DoubleSide,
                }),
              );
              stroke.rotation.x = -Math.PI / 2;
              stroke.position.y =
                0.025 + i * (f.principle === "Gale" ? 0.33 : 0);
              g.add(stroke);
            }
          }
          if (f.principle === "Stone") {
            const joint = new T.LineSegments(
              new T.EdgesGeometry(new T.BoxGeometry(4.36, 0.89, 4.36)),
              new T.LineBasicMaterial({ color: 0xe5d2f4 }),
            );
            joint.position.y = 0.33;
            g.add(joint);
          }
          const owner = this.disc(0.1, 0xffeac4, 0.8);
          owner.name = "owner-mark";
          owner.position.set(-0.18, f.principle === "Stone" ? 0.8 : 0.12, 0);
          g.add(owner);
          if (f.source === "mage-2") {
            const second = this.disc(0.1, 0xffeac4, 0.8);
            second.position.set(0.18, f.principle === "Stone" ? 0.8 : 0.12, 0);
            g.add(second);
          }
        }
        this.fields.set(f.id, g);
        this.scene.add(g);
      }
      g.position.set(f.pos.x, f.pos.y + 0.07, f.pos.z);
      if (f.principle === "Gale") g.rotation.y = t;
      // Solid cover never blinks out visually while it still has a collider.
      const rim = g.getObjectByName("expiry-cue") as T.Mesh;
      if (rim.material && "opacity" in rim.material)
        rim.material.opacity =
          f.life < 2 ? 0.35 + 0.35 * Math.sin(t * 7) ** 2 : 0.7;
    }
    for (const [id, g] of this.fields)
      if (!s.fields.some((f) => f.id === id)) {
        this.destroy(g);
        this.fields.delete(id);
      }
    for (const b of s.bolts) {
      let mesh = this.bolts.get(b.id);
      if (!mesh) {
        mesh = new T.Mesh(
          this.art.active && b.principle !== "hostile"
            ? new T.ConeGeometry(0.16, 0.75, 5)
            : this.geometries.sphere,
          new T.MeshBasicMaterial({
            color: b.principle === "hostile" ? 0xff5345 : COLORS[b.principle],
          }),
        );
        mesh.scale.setScalar(
          this.art.active && b.principle !== "hostile" ? 1 : b.radius,
        );
        if (this.art.active && b.principle === "hostile") {
          const core = new T.Mesh(
            this.geometries.sphere,
            new T.MeshBasicMaterial({ color: 0xffedcc, depthTest: false }),
          );
          core.scale.setScalar(0.58);
          core.renderOrder = 21;
          mesh.add(core);
        }
        this.scene.add(mesh);
        this.bolts.set(b.id, mesh);
      }
      mesh.position.set(b.pos.x, b.pos.y, b.pos.z);
      if (this.art.active && b.principle !== "hostile")
        mesh.quaternion.setFromUnitVectors(
          new T.Vector3(0, 1, 0),
          new T.Vector3(b.velocity.x, b.velocity.y, b.velocity.z).normalize(),
        );
    }
    for (const [id, m] of this.bolts)
      if (!s.bolts.some((b) => b.id === id)) {
        this.destroy(m);
        this.bolts.delete(id);
      }
    for (const e of s.events) {
      if (t - e.time > e.duration) continue;
      let g = this.effects.get(e.id);
      if (!g) {
        g = new T.Group();
        const color =
          e.type === "rejected" || e.type === "melee-strike"
            ? 0xff6a66
            : e.type === "buffered"
              ? 0xecc879
              : e.principle
                ? COLORS[e.principle]
                : e.type === "steam"
                  ? 0xdaeff0
                  : 0xf2ecda;
        if (e.type === "rejected") {
          g.add(
            this.line(vec(-0.2, 0, -0.2), vec(0.2, 0, 0.2), color, 0.08),
            this.line(vec(0.2, 0, -0.2), vec(-0.2, 0, 0.2), color, 0.08),
          );
        } else if (e.type === "empty") {
          g.add(this.ring(0.2, 0x879597, 0.3));
        } else if (
          ["jet", "vapour-link", "inscription-drift"].includes(e.type) &&
          e.end
        ) {
          g.add(
            this.line(
              vec(),
              vec(e.end.x - e.pos.x, e.end.y - e.pos.y, e.end.z - e.pos.z),
              color,
              e.type === "jet" ? 0.32 : 0.1,
            ),
          );
        } else if (e.type === "fan" && e.end) {
          for (let i = -2; i <= 2; i++) {
            const a =
              Math.atan2(e.end.x, e.end.z) +
              i * (Math.acos(Number(e.target) || 0.72) / 2);
            g.add(
              this.line(
                vec(),
                vec(
                  Math.sin(a) * (e.value ?? 6),
                  0,
                  Math.cos(a) * (e.value ?? 6),
                ),
                color,
                0.07,
              ),
            );
          }
        } else if (e.type === "eruption") {
          for (let i = 0; i < 5; i++) {
            const spike = new T.Mesh(
              new T.ConeGeometry(0.34, 1.6, 4),
              material(color),
            );
            spike.position.set(
              Math.cos(i * 2.4) * 0.6,
              0.5,
              Math.sin(i * 2.4) * 0.6,
            );
            g.add(spike);
          }
        } else if (e.type === "steam") {
          if (this.art.active) {
            for (let i = 0; i < 3; i++) {
              const stroke = new T.Mesh(
                new T.RingGeometry(
                  0.45 + i * 0.1,
                  0.5 + i * 0.1,
                  24,
                  1,
                  i * 1.8,
                  2.8,
                ),
                new T.MeshBasicMaterial({
                  color: 0xf6eedb,
                  transparent: true,
                  opacity: 0.65,
                  depthWrite: false,
                  side: T.DoubleSide,
                }),
              );
              stroke.position.y = i * 0.3;
              stroke.rotation.set(-Math.PI / 2 + 0.3, 0, i * 0.5);
              g.add(stroke);
            }
          } else
            for (let i = 0; i < 5; i++) {
              const puff = new T.Mesh(
                this.geometries.sphere,
                new T.MeshBasicMaterial({
                  color,
                  transparent: true,
                  opacity: 0.24,
                  depthWrite: false,
                }),
              );
              puff.position.set(
                Math.sin(i * 3) * 0.55,
                i * 0.25,
                Math.cos(i * 3) * 0.55,
              );
              puff.scale.setScalar(0.6);
              g.add(puff);
            }
        } else
          g.add(
            this.ring(
              e.type === "melee-strike"
                ? 1.45
                : e.type === "inverse"
                  ? 2.8
                  : e.type === "eruption-warning"
                    ? 1.25
                    : 0.55,
              color,
            ),
          );
        if (e.type === "rejected")
          g.traverse((o) => {
            if (o instanceof T.Mesh) {
              o.material.depthTest = false;
              o.renderOrder = 15;
            }
          });
        g.position.set(e.pos.x, Math.max(0.08, e.pos.y), e.pos.z);
        this.scene.add(g);
        this.effects.set(e.id, g);
      }
      const age = (t - e.time) / e.duration;
      if (e.type === "steam") {
        g.position.y = e.pos.y + age * 1.3;
        g.scale.setScalar(1 + age * 0.6);
      } else if (e.type === "dissolve")
        g.scale.setScalar(Math.max(0.1, 1 - age));
      else if (
        ["impact", "dodge", "shatter", "force", "wet", "structure"].includes(
          e.type,
        )
      )
        g.scale.setScalar(1 + age * 2);
    }
    for (const [id, g] of this.effects)
      if (!s.events.some((e) => e.id === id && t - e.time < e.duration)) {
        this.destroy(g);
        this.effects.delete(id);
      }
    const primary = this.simulation.withActor(this.actorId, () =>
        this.simulation.targeting("primary", actor.activePrinciple, aim),
      ),
      target = this.simulation.withActor(this.actorId, () =>
        this.simulation.targeting("secondary", actor.activePrinciple, aim),
      );
    this.aim.position.set(aim.x, aim.y + 0.08, aim.z);
    (
      this.aim.children[0] as T.Mesh<T.BufferGeometry, T.MeshBasicMaterial>
    ).material.color.setHex(
      primary.valid ? COLORS[actor.activePrinciple] : 0xff6a66,
    );
    const color = !target.valid
      ? 0xff6a66
      : target.clamped
        ? 0xecc879
        : COLORS[actor.activePrinciple];
    this.placement.position.set(
      target.pos.x,
      target.pos.y + 0.08,
      target.pos.z,
    );
    const inverse = this.config.model === "weave-unweave";
    this.placement.children.forEach((o, i) => {
      o.visible =
        i ===
        (inverse
          ? 0
          : actor.activePrinciple === "Stone"
            ? 1
            : actor.activePrinciple === "Ember"
              ? 2
              : 0);
      (
        o as T.Mesh<T.BufferGeometry, T.MeshBasicMaterial>
      ).material.color.setHex(color);
    });
    this.placement.children[0].scale.setScalar(inverse ? 2.8 : 2.5);
    this.placement.rotation.y =
      actor.activePrinciple === "Ember" && !inverse
        ? Math.atan2(target.pos.x - p.pos.x, target.pos.z - p.pos.z) +
          (hasUpgrade(s, p.id, "cross-seam") ? Math.PI / 2 : 0)
        : 0;
    for (const e of s.entities) {
      const ai = e.ai ?? (e.id === "sentinel" ? s.sentinel : undefined);
      if (!ai) continue;
      let g = this.dangers.get(e.id);
      if (!g) {
        g = new T.Group();
        g.add(
          this.line(vec(), vec(0, 0, 1), 0xff6657, 0.18),
          this.ring(e.kind === "pursuer" ? 1.45 : 0.9, 0xff7864),
        );
        if (this.art.active) {
          const edge = this.ring(e.kind === "pursuer" ? 1.49 : 0.94, 0x221e29);
          g.add(edge);
          const teeth = new T.Mesh(
            new T.RingGeometry(
              e.kind === "pursuer" ? 1.3 : 0.75,
              e.kind === "pursuer" ? 1.44 : 0.89,
              12,
            ),
            new T.MeshBasicMaterial({
              color: 0xffe5bd,
              depthTest: false,
              side: T.DoubleSide,
            }),
          );
          teeth.rotation.x = -Math.PI / 2;
          g.add(teeth);
        }
        g.traverse((o) => {
          if (o instanceof T.Mesh) {
            o.material.depthTest = false;
            o.material.depthWrite = false;
            o.renderOrder = 20;
          }
        });
        this.scene.add(g);
        this.dangers.set(e.id, g);
      }
      g.visible =
        ai.phase === "telegraph" &&
        ai.enabled &&
        e.hp > 0 &&
        (!s.trial || s.trial.status === "active");
      if (g.visible) {
        const a = e.pos,
          b = ai.locked,
          line = g.children[0];
        line.visible = e.kind !== "pursuer";
        line.scale.set(0.18, 0.045, distance(a, b));
        line.position.set((a.x + b.x) / 2, 0.08, (a.z + b.z) / 2);
        line.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
        g.children[1].position.set(b.x, 0.09, b.z);
        for (let i = 2; i < g.children.length; i++)
          g.children[i].position.set(b.x, 0.09 + i * 0.001, b.z);
      }
    }
    for (const [id, g] of this.dangers)
      if (!s.entities.some((e) => e.id === id)) {
        this.destroy(g);
        this.dangers.delete(id);
      }
    (this.pad.material as T.MeshBasicMaterial).color.setHex(
      s.mechanism ? 0xdbe8a0 : 0x718485,
    );
    if (!this.contextLost) this.renderer.render(this.scene, this.camera);
    if (delta > 0) {
      this.intervals.push(delta * 1000);
      if (this.intervals.length > 300) this.intervals.shift();
    }
  }
  setQuality(quality: "standard" | "lightweight") {
    if (quality !== "standard" && quality !== "lightweight")
      throw Error("Invalid rendering quality");
    this.quality = quality;
    this.renderer.shadowMap.enabled = quality === "standard";
    this.scene.traverse((o) => {
      if (o instanceof T.Mesh)
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          m.needsUpdate = true;
    });
    this.resize();
    this.intervals.length = 0;
    try {
      localStorage.setItem("ruinweavers-render-quality", quality);
    } catch {}
  }
  metrics() {
    const a = [...this.intervals].sort((a, b) => a - b);
    return {
      quality: this.quality,
      browser: navigator.userAgent,
      renderer: this.rendererIdentity,
      viewport: { width: innerWidth, height: innerHeight },
      drawingBuffer: { width: this.canvas.width, height: this.canvas.height },
      pixelRatio: this.renderer.getPixelRatio(),
      shadows: this.renderer.shadowMap.enabled,
      samples: a.length,
      frameMs: a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0,
      p95FrameMs: a[Math.floor(a.length * 0.95)] || 0,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      activeVfx: this.effects.size,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      contextLost: this.contextLost,
      art: this.art.metrics(),
      courtResolved:
        !!this.terrainGroup.getObjectByName("ward-binding") &&
        this.displayedState?.trial?.status === "victory",
      performances:
        this.art.mode === "illustrated"
          ? [...this.entities]
              .filter(([id]) => id.startsWith("mage-"))
              .map(([id, g]) => ({
                id,
                pose: g.getObjectByName("art-model")?.userData.pose,
                bodyScale: g.getObjectByName("art-model")?.scale.y,
              }))
          : [],
      fieldFeedback: [...this.fields].map(([id, group]) => {
        const cue = group.getObjectByName("expiry-cue") as T.Mesh<
          T.BufferGeometry,
          T.Material
        >;
        const owner = group.getObjectByName("owner-mark") as
          T.Mesh<T.BufferGeometry, T.Material> | undefined;
        return {
          id,
          expiryOpacity: cue?.material.opacity,
          ownerOpacity: owner?.material.opacity,
          ownerHeight: owner?.position.y,
        };
      }),
    };
  }
}
