import type { Object3D } from "three";
import type { Entity, State } from "../simulation/types";

/** Cosmetic joint performance only. No input, gameplay clocks or outcome writes. */
export function performMage(model: Object3D, entity: Entity, state: State) {
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
  const dt = Math.max(
    0,
    Math.min(0.1, state.time - (data.previousTime ?? state.time)),
  );
  data.previousTime = state.time;
  const speed = Math.hypot(entity.velocity.x, entity.velocity.z);
  data.gait = (data.gait ?? 0) + speed * dt * 3.6;
  const stride = Math.sin(data.gait) * Math.min(1, speed / 4.8);
  for (const joint of Object.values(joints)) joint.rotation.set(0, 0, 0);
  const hips = joints.hips;
  hips.position.y =
    speed > 0.2
      ? Math.abs(Math.cos(data.gait)) * 0.035
      : Math.sin(state.time * 2) * 0.008;
  const heading = (model.parent?.rotation.y ?? 0) + Math.PI;
  const forward =
    speed > 0.1
      ? (entity.velocity.x * Math.sin(heading) +
          entity.velocity.z * Math.cos(heading)) /
        speed
      : 1;
  const side =
    speed > 0.1
      ? (entity.velocity.x * Math.cos(heading) -
          entity.velocity.z * Math.sin(heading)) /
        speed
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
  const age = cast ? state.time - cast.time : 99;
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
  const hitAge = state.time - entity.hitAt;
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
    castAge: age,
    secondary: !!secondary,
    downed: entity.hp <= 0,
  };
}
