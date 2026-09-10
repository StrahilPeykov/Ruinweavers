import * as T from "three";
import type { State } from "../simulation/types";
import { WARDEN } from "../simulation/guardian";

/** A bounded seven-mesh overlay; geometry describes the authoritative maneuver. */
export class GuardianDanger extends T.Group {
  lanes: T.Mesh[] = [];
  circle: T.Mesh;
  constructor() {
    super();
    const material = new T.MeshBasicMaterial({
      color: 0xd95643,
      transparent: true,
      opacity: 0.72,
      depthTest: false,
      depthWrite: false,
      side: T.DoubleSide,
    });
    const geometry = new T.BoxGeometry(1, 0.025, 1);
    for (let i = 0; i < 6; i++) {
      const m = new T.Mesh(geometry, material);
      m.renderOrder = 22;
      this.lanes.push(m);
      this.add(m);
    }
    this.circle = new T.Mesh(new T.RingGeometry(0.97, 1, 80), material);
    this.circle.rotation.x = -Math.PI / 2;
    this.circle.renderOrder = 22;
    this.add(this.circle);
  }
  update(s: State) {
    const g = s.guardian,
      core = s.entities.find((e) => e.id === g?.core);
    this.visible = !!(
      g &&
      core &&
      core.hp > 0 &&
      s.trial?.status === "active" &&
      ["telegraph", "commit", "attack"].includes(g.stage)
    );
    if (!this.visible || !g || !core) return;
    this.lanes.forEach((m) => (m.visible = false));
    this.circle.visible = false;
    const a =
      g.stage === "attack" && g.maneuver === "march" ? g.origin : core.pos;
    const theta = Math.atan2(g.direction.x, g.direction.z);
    const line = (
      i: number,
      angle: number,
      length: number,
      offset: number,
      width: number,
    ) => {
      const m = this.lanes[i];
      m.visible = true;
      m.scale.set(width, 1, length);
      m.position.set(
        a.x + (Math.sin(angle) * length) / 2 + Math.cos(angle) * offset,
        0.08,
        a.z + (Math.cos(angle) * length) / 2 - Math.sin(angle) * offset,
      );
      m.rotation.y = angle;
    };
    if (g.maneuver === "volley")
      for (let i = 0; i < 3; i++) line(i, theta + (i - 1) * 0.27, 18, 0, 0.16);
    if (g.maneuver === "march") {
      line(0, theta, WARDEN.marchDistance, -1.7, 0.12);
      line(1, theta, WARDEN.marchDistance, 1.7, 0.12);
      line(2, theta, WARDEN.marchDistance, 0, 0.08);
    }
    if (g.maneuver === "furnace") {
      this.circle.visible = true;
      this.circle.scale.setScalar(WARDEN.pulseRadius);
      this.circle.position.set(core.pos.x, 0.09, core.pos.z);
    }
    (this.circle.material as T.MeshBasicMaterial).opacity =
      g.stage === "telegraph" ? 0.48 : 0.85;
  }
}
