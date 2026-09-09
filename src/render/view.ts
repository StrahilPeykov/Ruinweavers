import * as T from "three";
import { CAST, type Config, type Principle } from "../experiments/config";
import { PAD, TERRAIN, WATER } from "../simulation/lab";
import { distance } from "../simulation/simulation";
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
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(43, 1, 0.1, 140);
  entities = new Map<string, T.Group>();
  fields = new Map<string, T.Group>();
  bolts = new Map<string, T.Mesh>();
  effects = new Map<number, T.Group>();
  aim = new T.Group();
  danger = new T.Group();
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
  lastFrame = 0;
  intervals: number[] = [];
  contextLost = false;
  constructor(
    public canvas: HTMLCanvasElement,
    public config: Config,
  ) {
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
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
    for (const t of TERRAIN) {
      const mesh = this.box(t.w, t.h, t.d, t.name ? 0x667675 : 0x43545a);
      mesh.position.set(t.x, t.y, t.z);
      this.scene.add(mesh);
    }
    const grid = new T.GridHelper(30, 30, 0x82928f, 0x5a6c70);
    grid.position.y = 0.012;
    grid.material.transparent = true;
    grid.material.opacity = 0.19;
    this.scene.add(grid);
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
    this.scene.add(water);
    this.pad = this.disc(PAD.radius, 0x718485, 0.7);
    this.pad.position.set(PAD.x, 0.04, PAD.z);
    this.scene.add(this.pad);
    for (const [label, x, z] of [
      ["SATURATION", -7, 1.7],
      ["MATERIALS", -4.5, -8.7],
      ["PRESSURE", 5, -11],
      ["TRAVERSAL", 12.7, 5],
      ["ELEVATION", -10, -12.6],
      ["BALLAST → PLATE", 5.7, 3.8],
    ] as [string, number, number][])
      this.label(label, vec(x, 0.08, z));
    this.scene.add(this.aim, this.danger);
    this.aim.add(this.ring(0.42, 0xffffff));
    const dot = this.disc(0.07, 0xffffff);
    dot.position.y = 0.02;
    this.aim.add(dot);
    this.danger.add(
      this.line(vec(), vec(0, 0, 1), 0xff5c53, 0.2),
      this.ring(0.9, 0xff7864),
    );
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
    this.scene.add(group);
    this.entities.set(e.id, group);
    return group;
  }
  resize() {
    const w = innerWidth,
      h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
  aimFromPointer(x: number, y: number): Vec {
    this.raycaster.setFromCamera(
      new T.Vector2((x / innerWidth) * 2 - 1, (-y / innerHeight) * 2 + 1),
      this.camera,
    );
    // Terrain surface intersections preserve elevated targeting; ignore entities to avoid cursor snapping.
    let best: T.Vector3 | null = null;
    for (const height of [0, 0.45, 1.2]) {
      const hit = new T.Vector3();
      if (
        this.raycaster.ray.intersectPlane(
          new T.Plane(new T.Vector3(0, 1, 0), -height),
          hit,
        )
      ) {
        if (
          height === 0 ||
          (height === 1.2 &&
            hit.x > -13 &&
            hit.x < -7 &&
            hit.z < -7.5 &&
            hit.z > -12.5)
        ) {
          if (!best || hit.y > best.y) best = hit;
        }
      }
    }
    return best ? vec(best.x, best.y, best.z) : vec();
  }
  project(pos: Vec) {
    const v = new T.Vector3(pos.x, pos.y, pos.z).project(this.camera);
    return {
      x: ((v.x + 1) / 2) * innerWidth,
      y: ((1 - v.y) / 2) * innerHeight,
    };
  }
  line(a: Vec, b: Vec, color: number, width = 0.09) {
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const m = new T.Mesh(
      this.geometries.box,
      new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }),
    );
    m.scale.set(width, 0.045, Math.hypot(dx, dz));
    m.position.set((a.x + b.x) / 2, a.y + 0.04, (a.z + b.z) / 2);
    m.rotation.y = Math.atan2(dx, dz);
    return m;
  }
  destroy(group: T.Object3D) {
    group.traverse((o) => {
      if (o instanceof T.Mesh || o instanceof T.LineSegments) {
        if (!Object.values(this.geometries).includes(o.geometry as never))
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
  }
  render(s: State, delta: number) {
    const p = s.entities[0],
      t = s.time;
    this.center.lerp(
      new T.Vector3(p.pos.x * 0.82, 0, p.pos.z * 0.82),
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
      g.visible = e.hp > 0;
      g.position.set(e.pos.x, e.pos.y, e.pos.z);
      if (e.kind === "player")
        g.rotation.y = Math.atan2(p.pos.x - s.aim.x, p.pos.z - s.aim.z);
      else if (["heavy", "loose"].includes(e.kind))
        g.quaternion.set(
          e.rotation.x,
          e.rotation.y,
          e.rotation.z,
          e.rotation.w,
        );
      g.getObjectByName("wet")!.visible = e.wet > 0.1;
      g.getObjectByName("heat")!.visible = e.heat > 30;
      g.getObjectByName("heat")!.scale.setScalar(1 + Math.sin(t * 15) * 0.1);
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
        orb.material.color.setHex(COLORS[s.activePrinciple]);
        orb.material.emissive.setHex(COLORS[s.activePrinciple]);
      }
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
          const seam = this.box(0.55, 0.18, 4.6, color);
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
        this.fields.set(f.id, g);
        this.scene.add(g);
      }
      g.position.set(f.pos.x, f.pos.y + 0.07, f.pos.z);
      if (f.principle === "Gale") g.rotation.y = t;
      g.visible = f.life > 1 || Math.floor(t * 7) % 2 === 0;
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
          this.geometries.sphere,
          new T.MeshBasicMaterial({
            color: b.principle === "hostile" ? 0xff5345 : COLORS[b.principle],
          }),
        );
        mesh.scale.setScalar(b.radius);
        this.scene.add(mesh);
        this.bolts.set(b.id, mesh);
      }
      mesh.position.set(b.pos.x, b.pos.y, b.pos.z);
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
        const color = e.principle
          ? COLORS[e.principle]
          : e.type === "steam"
            ? 0xdaeff0
            : 0xf2ecda;
        if (e.type === "jet" && e.end) {
          g.add(
            this.line(
              vec(),
              vec(e.end.x - e.pos.x, 0, e.end.z - e.pos.z),
              color,
              0.32,
            ),
          );
        } else if (e.type === "fan" && e.end) {
          for (let i = -2; i <= 2; i++) {
            const a = Math.atan2(e.end.x, e.end.z) + i * 0.16;
            g.add(
              this.line(
                vec(),
                vec(Math.sin(a) * 5.5, 0, Math.cos(a) * 5.5),
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
              e.type === "inverse"
                ? 2.8
                : e.type === "eruption-warning"
                  ? 1.25
                  : 0.55,
              color,
            ),
          );
        g.position.set(e.pos.x, Math.max(0.08, e.pos.y), e.pos.z);
        this.scene.add(g);
        this.effects.set(e.id, g);
      }
      const age = (t - e.time) / e.duration;
      if (e.type === "steam") {
        g.position.y = e.pos.y + age * 1.3;
        g.scale.setScalar(1 + age * 0.6);
      } else if (["impact", "dodge", "shatter", "force"].includes(e.type))
        g.scale.setScalar(1 + age * 2);
    }
    for (const [id, g] of this.effects)
      if (!s.events.some((e) => e.id === id && t - e.time < e.duration)) {
        this.destroy(g);
        this.effects.delete(id);
      }
    const range = CAST[s.activePrinciple].range,
      dist = distance(p.pos, s.aim),
      ratio = Math.min(1, range / (dist || 1));
    this.aim.position.set(
      p.pos.x + (s.aim.x - p.pos.x) * ratio,
      s.aim.y + 0.1,
      p.pos.z + (s.aim.z - p.pos.z) * ratio,
    );
    (
      this.aim.children[0] as T.Mesh<T.BufferGeometry, T.MeshBasicMaterial>
    ).material.color.setHex(
      dist > range ? 0x929995 : COLORS[s.activePrinciple],
    );
    const enemy = s.entities.find((e) => e.id === "sentinel")!;
    this.danger.visible =
      s.sentinel.phase === "telegraph" && s.sentinel.enabled && enemy.hp > 0;
    if (this.danger.visible) {
      const a = enemy.pos,
        b = s.sentinel.locked,
        line = this.danger.children[0];
      line.scale.set(0.2, 0.045, distance(a, b));
      line.position.set((a.x + b.x) / 2, 0.08, (a.z + b.z) / 2);
      line.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      this.danger.children[1].position.set(b.x, 0.08, b.z);
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
  metrics() {
    const a = [...this.intervals].sort((a, b) => a - b);
    return {
      frameMs: a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0,
      p95FrameMs: a[Math.floor(a.length * 0.95)] || 0,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      activeVfx: this.effects.size,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      contextLost: this.contextLost,
    };
  }
}
