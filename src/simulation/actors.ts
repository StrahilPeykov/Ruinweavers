import { vec, type ActorState, type State } from "./types";
export const actorState = (): ActorState => ({
  activePrinciple: "Ember",
  aim: vec(0, 0, -4.5),
  primaryReady: 0,
  secondaryReady: 0,
  dodgeReady: 0,
  dodgeUntil: 0,
  invulnerableUntil: 0,
  dodgeDirection: vec(),
  castUntil: 0,
  verticalSpeed: 0,
  reviveProgress: 0,
});
// Deprecated solo inspection setters/getters. Actor records are the only authority.
export function legacyActorAccessors(s: State) {
  for (const key of [
    ...Object.keys(actorState()),
    "bufferedCast",
  ] as (keyof ActorState)[]) {
    Object.defineProperty(s, key, {
      enumerable: true,
      configurable: true,
      get: () => s.actors["mage-1"][key],
      set: (v) => {
        (s.actors["mage-1"] as any)[key] = v;
      },
    });
  }
  return s;
}
