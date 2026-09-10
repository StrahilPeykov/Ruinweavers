# Run Prototype 0.1 — The Broken Court

Current playable milestone. Default `/?scene=run`; `?scene=trial` and all Lab/isolated trial scenes preserve their unmodified no-upgrade baseline. Model A, balanced camera/tempo and accepted bindings remain the default. No classes, economy, permanent progression or new enemies.

## Route and choices

Five authored beats: The threshold (two sentinels), Footsteps in the court (three pursuers), The divided hall (two of each), The closing circle (three pursuers and a sentinel), The last ward (two sentinels and three pursuers). They reuse the open, cross-cover and side-cover courts. Enemy HP/damage and party rules are unchanged.

After beats 1 and 3, each mage chooses one of three seeded offers, then continues/readies. No timer, contested pickup or forced shared build. Health and chosen alterations carry. Existing 35-HP downed revival and encounter-clear recovery remain; no extra healing. Victory/defeat offers a complete restart. The same seed produces the same offers; change seed in the URL for another reproducible offer sequence.

| Alteration | Compatibility and behavior |
| --- | --- |
| Double inscription | All Model A Secondaries: +1 simultaneous major manifestation; oldest is replaced at capacity. |
| Through the embers | Ember Primary: one extra creature/prop pierced, each at most once. Terrain still stops the bolt. |
| Stone remembers | Stone Primary: one additional eruption at the original point, 0.65 s after the first. No recursion. |
| Undertow | Tide Primary: reverses the jet impulse toward the caster; damage and saturation are unchanged. |
| Travelling basin | Tide Secondary: travels away from caster at 1.2 m/s; stops at solid terrain or unsupported height changes. |
| Tethered updraft | Gale Secondary: placements within 3 m follow the caster along connected ground; farther placements remain stationary. |

The pool is deliberately asymmetric. Capacity + moving fields and piercing + Stone echo are bounded pair checks, not promises of equal power. Model B remains available in the Lab; its inverse operations do not acquire new Secondaries.

## Authority and bounds

`simulation/run.ts` owns the small catalogue, five lineups, deterministic offers and validation. `State.run` stores run ID, actor-owned upgrades and the current reward. No shared CAST/config mutation. Restart increments the run generation, clears upgrades/rewards/effects and restores starting health. Offers exclude already-owned upgrades; partners can independently own the same upgrade.

Host controls identify the authenticated peer as mage-2 and validate run ID, reward ID, encounter, offered option and absence of an earlier choice. Clients cannot nominate another actor. Choice does not imply readiness. Both personal choices and both ready states gate advancement. Between menus freeze combat and clear combat intent through the existing epoch boundary. Ordinary enemy/prop deaths and partner downing do not clear living guest input.

Protocol 3 explicitly adds run/reward/upgrades to compact snapshots. Build fingerprints prevent mixed clients. Existing bounded events, input acknowledgements, interpolation/prediction, ally-damage suppression and TURN credential exchange remain intact. No provider or billing changes.

Maximum selected upgrades: two per actor. Capacity increases once; at the default each actor can hold at most two fields. Piercing stores at most two hit IDs; Stone schedules one extra pending eruption per original cast. Moving fields retain the original 12-second lifetime. No descendant recursion, independent damage authority or whole-world prediction.

## Evidence and limits

Lifecycle correction a0cffdf was reproduced before editing: a non-final enemy kill stopped held guest W/LMB. After correction the guest continued moving and casting; focused tests also cover prop destruction, partner downing, local death/revive and epoch resets. Only affected presentation entities reset their history. The fix was pushed and the existing Cloudflare Workers build reported success.

`npm run evaluate:run` uses the existing policies-1 against real Simulation/Rapier: two seeds, solo/pair, attack-move/basin-ember/state-aware, delayed observation/imperfect aim, keyboard motor, first offered choice, 360-second cap. It is a synthetic diagnostic, not a human-skill or balance model. Artifacts are under `artifacts/run-0.1/`; historical trial benchmarks remain intact.

Initial 12-case batch: all completed five beats. Solo attack-move 89–99 s, Basin+Ember 47–50 s, mixed 51–54 s. Pair attack-move 60 s, Basin+Ember 31–32 s, mixed 38–39 s. No damage/HP tuning was applied to stretch duration or equalize these strategies. A several-minute human duration remains unvalidated; stronger play can finish quickly.

Browser journeys use those policies only to choose intent, then execute real Playwright keyboard/mouse and reward-card clicks. They do not change HP, disable AI, teleport or inject casts. Separate lifecycle fixtures cover down/revive and stale choices. Local two-browser WebRTC proves the local integration, not remote laptop/TURN performance. Full test and screenshot results are recorded in TESTING.md.

Remaining gameplay questions: whether the five beats sustain interest beyond the first run; whether moving-field tradeoffs and the second reward are understandable; whether the short co-op duration feels like a satisfying culmination. The following milestone is visual distinction for this compact slice, not more systems.
