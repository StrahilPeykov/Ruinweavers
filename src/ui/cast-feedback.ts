import type { State } from "../simulation/types";
export function localCastFeedback(s: State, actorId: string) {
  const rejected = s.events
    .filter(
      (e) =>
        e.type === "rejected" && e.source === actorId && s.time - e.time < 0.65,
    )
    .at(-1);
  if (rejected) return rejected.target;
  if (s.actors[actorId]?.bufferedCast) return "Secondary buffered";
  return undefined;
}
