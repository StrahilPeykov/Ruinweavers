import type { Object3D } from "three";
import type { Entity, State } from "../simulation/types";

/** Continuous cosmetic movement; authoritative stage changes only select poses. */
export function performWarden(
  model: Object3D,
  e: Entity,
  s: State,
  elapsed: number,
  paused: boolean,
) {
  const g = s.guardian;
  if (!g) return;
  const d = model.userData,
    previous = d.wardenPosition;
  const dt = paused || elapsed > 0.25 ? 0 : Math.min(0.05, elapsed);
  const travel = previous
    ? Math.hypot(e.pos.x - previous.x, e.pos.z - previous.z)
    : 0;
  d.wardenPosition = { ...e.pos };
  d.wardenGait =
    (d.wardenGait ?? 0) + (travel < 0.5 && dt > 0 ? travel * 2.8 : 0);
  if (d.wardenSerial !== g.serial) {
    d.wardenAge = 0;
    d.wardenSerial = g.serial;
  } else d.wardenAge = (d.wardenAge ?? 0) + dt;
  const joints: Record<string, Object3D> = (d.wardenJoints ??=
    Object.fromEntries(
      ["torso", "head", "legL", "legR", "armL", "armR"].map((n) => [
        n,
        model.getObjectByName(n)!,
      ]),
    ));
  if (!joints.torso) return;
  for (const j of Object.values(joints)) j.rotation.set(0, 0, 0);
  const walking = travel > 0.0001 && travel < 0.5;
  const stride = walking ? Math.sin(d.wardenGait) * 0.3 : 0;
  joints.legL.rotation.x = stride;
  joints.legR.rotation.x = -stride;
  const preparing = ["telegraph", "commit"].includes(g.stage);
  const amount = preparing
    ? Math.min(1, 0.3 + d.wardenAge * 1.5)
    : g.stage === "attack"
      ? 1
      : Math.max(0, 1 - d.wardenAge * 2);
  if (g.maneuver === "volley") {
    joints.armL.rotation.x = -1.1 * amount;
    joints.armR.rotation.x = -1.1 * amount;
  }
  if (g.maneuver === "march") {
    joints.torso.rotation.x = 0.18 * amount;
    joints.armL.rotation.x = -0.45 * amount;
    joints.armR.rotation.x = -0.45 * amount;
  }
  if (g.maneuver === "furnace") {
    joints.armL.rotation.z = -0.65 * amount;
    joints.armR.rotation.z = 0.65 * amount;
    joints.head.rotation.x = -0.15 * amount;
  }
  model.position.y = -e.height / 2;
  if (e.hp <= 0) {
    joints.torso.rotation.x = 0.75;
    joints.legL.rotation.x = -0.8;
    joints.legR.rotation.x = -0.8;
    model.position.y -= 0.55;
  }
  d.pose = { stride, stage: g.stage, age: d.wardenAge };
}

/** Cosmetic joint performance only. No input, gameplay clocks or outcome writes. */
export function performMage(
  model: Object3D,
  entity: Entity,
  state: State,
  elapsed = 0,
  paused = false,
) {
  const data = model.userData;
  const joints: Record<string, Object3D> = (data.joints ??= Object.fromEntries(
    [
      "hips",
      "chest",
      "head",
      "cape",
      "thighL",
      "thighR",
      "shinL",
      "shinR",
      "upperL",
      "upperR",
      "foreL",
      "foreR",
    ].map((n) => [n, model.getObjectByName(n)!]),
  ));
  if (!joints.hips) return;
  // Advance only cosmetics. Motion comes from the displayed pose, including
  // local guest prediction; frozen network truth cannot keep walking in place.
  const previous = data.motion;
  const reset =
    !previous ||
    previous.epoch !== state.party?.epoch ||
    previous.run !== state.run?.id ||
    previous.encounter !== state.trial?.encounter ||
    previous.tick > state.tick ||
    previous.alive !== entity.hp > 0 ||
    elapsed > 0.25;
  const dt = paused || reset ? 0 : Math.max(0, Math.min(0.05, elapsed));
  const dx = previous ? entity.pos.x - previous.x : 0;
  const dz = previous ? entity.pos.z - previous.z : 0;
  const distance = Math.hypot(dx, dz);
  const validMotion =
    dt > 0 && distance < Math.max(0.3, dt * 12) && entity.hp > 0;
  const vx = validMotion ? dx / dt : 0,
    vz = validMotion ? dz / dt : 0;
  const motionLength = Math.hypot(vx, vz);
  const speed = Math.min(8, motionLength);
  data.motion = {
    x: entity.pos.x,
    z: entity.pos.z,
    epoch: state.party?.epoch,
    run: state.run?.id,
    encounter: state.trial?.encounter,
    tick: state.tick,
    alive: entity.hp > 0,
  };
  if (paused && !reset) return;
  if (reset || (!validMotion && distance > 0.3)) data.gait = 0;
  data.cosmeticTime = (reset ? 0 : (data.cosmeticTime ?? 0)) + dt;
  data.gait = (data.gait ?? 0) + speed * dt * 3.6;
  const stride = Math.sin(data.gait) * Math.min(1, speed / 4.8);
  for (const joint of Object.values(joints)) joint.rotation.set(0, 0, 0);
  const hips = joints.hips;
  hips.position.y =
    speed > 0.2
      ? Math.abs(Math.cos(data.gait)) * 0.035
      : Math.sin(data.cosmeticTime * 2) * 0.008;
  const heading = (model.parent?.rotation.y ?? 0) + Math.PI;
  const forward =
    speed > 0.1
      ? (vx * Math.sin(heading) + vz * Math.cos(heading)) / motionLength
      : 1;
  const side =
    speed > 0.1
      ? (vx * Math.cos(heading) - vz * Math.sin(heading)) / motionLength
      : 0;
  joints.thighL.rotation.x = stride * 0.65 * forward;
  joints.thighR.rotation.x = -stride * 0.65 * forward;
  joints.thighL.rotation.z = stride * 0.42 * side;
  joints.thighR.rotation.z = -stride * 0.42 * side;
  joints.shinL.rotation.x = Math.max(0, -stride) * 0.8;
  joints.shinR.rotation.x = Math.max(0, stride) * 0.8;
  joints.upperL.rotation.x = -stride * 0.25;
  joints.upperR.rotation.x = stride * 0.2;
  joints.foreL.rotation.x = -0.18;
  joints.foreR.rotation.x = -0.15;
  joints.cape.rotation.x =
    0.05 + Math.min(0.22, speed * 0.04) + Math.sin(data.gait - 1) * 0.05;
  joints.chest.rotation.z = stride * 0.035;
  // Authoritative cast events begin the impulse immediately; pose recovers after it.
  const cast = [...state.events]
    .reverse()
    .find((e) => e.source === entity.id && e.type === "cast");
  const castKey = cast ? `${cast.id}:${cast.time}` : "";
  if (reset || data.castKey !== castKey) {
    data.castAge = cast ? Math.max(0, state.time - cast.time) : 99;
    data.castKey = castKey;
  } else if (cast) data.castAge += dt;
  const age = data.castAge;
  const secondary =
    cast &&
    state.events.some(
      (e) =>
        e.source === entity.id &&
        e.type === "manifestation" &&
        e.time === cast.time,
    );
  const duration = secondary ? 0.52 : 0.3;
  if (age >= 0 && age < duration) {
    const strength = (1 - age / duration) ** 0.65;
    joints.upperR.rotation.x = -1.35 * strength;
    joints.foreR.rotation.x = -0.48 * strength;
    joints.upperL.rotation.x = -(secondary ? 1.15 : 0.75) * strength;
    joints.upperL.rotation.z = -0.3 * strength;
    joints.chest.rotation.y = -0.16 * strength;
    joints.chest.rotation.x = -0.09 * strength;
    joints.cape.rotation.x += 0.16 * strength;
  }
  if (reset || data.hitAt !== entity.hitAt) {
    data.hitAge = Math.max(0, state.time - entity.hitAt);
    data.hitAt = entity.hitAt;
  } else data.hitAge += dt;
  const hitAge = data.hitAge;
  if (hitAge >= 0 && hitAge < 0.24) {
    joints.chest.rotation.x += 0.2 * (1 - hitAge / 0.24);
    joints.head.rotation.x -= 0.1;
  }
  if (entity.hp <= 0) {
    hips.position.y = -0.4;
    joints.thighL.rotation.x = -1.05;
    joints.thighR.rotation.x = -0.8;
    joints.shinL.rotation.x = 1.9;
    joints.shinR.rotation.x = 1.65;
    joints.chest.rotation.x = 0.5;
    joints.head.rotation.x = 0.4;
    joints.upperL.rotation.x = -0.35;
    joints.upperR.rotation.x = -0.5;
    joints.cape.rotation.x = 0.3;
  }
  data.pose = {
    stride,
    cosmeticTime: data.cosmeticTime,
    speed,
    castAge: age,
    secondary: !!secondary,
    downed: entity.hp <= 0,
  };
}
