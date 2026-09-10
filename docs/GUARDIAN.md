# Guardian 0.1 — The Bound Warden

Baseline: clean main 3ddebb2, Build Identity 0.2. One Guardian replaces the ordinary fifth court; the original final lineup remains an explicit regression scene. No spell, upgrade-pool, normal-enemy or movement retuning. Prior evidence stays historical and intact.

Baseline validation: 96 units and production build pass; browser sweep 48 passed, one opt-in live TURN skip, one pre-existing failure at coop.spec.ts:265 (allied-projectile contact timeout). Its screenshots show the pointer no longer over the partner after the fixture teleport/camera follow. Preserve this as a harness finding; a constant screen pointer is not a constant world target while the camera settles. No Guardian runtime had been loaded during this sweep.

## Research → implementation hypotheses

- Supergiant's [Big Bad patch notes](https://www.supergiantgames.com/blog/hades-big-bad-update-patch-notes/) explicitly shorten boss invulnerability, restore knock-away relevance, and adjust tracking/attack speed/visual alignment. Use no immunity phase, lock committed routes, and test existing force rather than disabling it. These are documented iterations, not a claim to reproduce their implementation.
- Beca Vessal's [firsthand Psychonauts 2 GDC slides](https://media.gdcvault.com/gdc2023/Slides/CraftingEpicBoss_Vessal_Beca.pdf), especially the common telegraph/attack/recovery chain and phase reuse, support a small finite maneuver model. We need three concrete chains, not their general editor/behavior-tree tooling.
- Passtech's [June 2024 official notes](https://store.steampowered.com/news/posts/?enddate=1719501134&feed=steam_community_announcements) scale elite/boss stagger resistance by chapter. This establishes resistance as tunable rather than control deletion; first test Ruinweavers' existing .4 s / 1.4 s stagger gate and material mass/cohesion. Do not import their percentages.
- Andrii Honcharuk's [co-op design account](https://www.gamedeveloper.com/business/ready-player-two-co-op-is-a-new-big-thing-) distinguishes shared objects, targeting and support pressures. Our limited application: alternate valid living targets at maneuver selection, keep shared cover and risky revival useful. No compulsory two-person puzzle; no assumption that doubling HP solves co-op.

## Initial prototype, not final tuning

A heavy structural core and two fitted, wettable structural plates use ordinary heat, water, cohesion and impulse operations. Plates intercept real attacks and detach when cohesion fails; the core is always damageable. Existing force/stagger remains active. A plate is optional protection, never a mandatory HP gate. No ownership/build checks in Guardian behavior.

Shard volley: a small fixed fan of blockable/deflectable projectiles. Bound march: late route lock, committed travel, visible recovery. Furnace pulse: marked local heat burst; the construction retains real heat. One short phase transition loosens an exterior binding and recombines the same actions. Initial solo HP/tempo and any later co-op adjustments must be evaluated and recorded below before recommendation.

Authoritative maneuver state is replicated explicitly; cosmetic poses never choose attacks or damage. No unbounded debris. The two plate bodies themselves supply movable material. Shared Vapour remains unchanged and receives a matched with/without test.

## Implemented rules

The final run court and isolated `?scene=guardian` contain a 900-HP, mass-32 core and two 140-HP, mass-8 plates. They are ordinary wettable structural entities: core cohesion .65, plates .8. Rapier fixed joints bind plates until HP or cohesion reaches zero. Core death releases both; phase two releases one surviving binding. There is no damage transfer, immunity window or prerequisite part gate. Loose plates use the existing momentum-impact rule and keep source/recipient attribution. Two bodies are the entire debris budget.

| Maneuver | Telegraph / locked commitment / attack / recovery | Consequence |
| --- | --- | --- |
| Shard volley | 1.2 / .35 / .2 / 1.7 s | Three low shards, 8 m/s, 14 ordinary hostile damage, ±.27 rad fan. Gale redirects; Stone/terrain blocks; first body intercepts. |
| Bound march | 1.1 / .4 / up to 1.25 / 1.8 s | Target followed during preparation only; then fixed direction, at most 8.5 m. Physical drive at 7 m/s (8 in phase two), one 18-damage contact per living player per march. Cover/footing/impulses remain real. |
| Furnace pulse | 1.25 / .35 / .2 / 1.9 s | 4.5 m radius plus body radius, terrain obstruction and generous 3 m vertical tolerance. 12 direct damage +65 heat to nearby bodies; +85 heat to attached construction. Existing water/heat rules decide steam, including self-attributed thermal stress. |

At 55% HP, the next recovery becomes a .9-second construction shift. Already telegraphed attacks finish; damage is never gated. Phase two repeats Volley → March → Furnace → March with recovery at 85% of the original duration. Existing repeated-stagger gating pauses maneuver progress without resetting it. This gives control time without an endless restart loop.

Target selection rotates through sorted living actor IDs at each maneuver selection. A committed attack retains its route even if the target moves or falls; next selection excludes the downed actor. Normal revive and encounter-clear recovery remain unchanged. Co-op core HP is 1.35× (1,215); plate HP, damage, projectile count and rules are identical. Both players share the physical consequences; no build-name or elemental-weakness checks occur in Guardian AI.

## Bounded iteration log

1. `baseline-layouts.json` is the first valid 48-case configuration sweep. Earlier `baseline-full.json` is retained under ignored raw evidence: the run overrode its isolated layout labels, so it is not claimed as two-layout coverage. Same policy, 10 Hz decisions, 200 ms delayed observations plus imperfect aim; exact-state diagnostics are labelled separately.
2. Initial phase switching could cancel a promised attack. Transition now waits for recovery, with a focused regression. This is a reliability correction, not a DPS adjustment.
3. Paired Structure/Basin won in roughly 7 seconds and usually skipped Furnace. Test 1.35× core durability, retaining alternating targets and all damage. `candidate.json` gives stronger builds roughly 9–11 seconds and other paired builds about 16–34 seconds. Strong pairs can still end before Furnace; no further HP padding merely to force an identical moveset exposure.
4. A low shard at .85 m skimmed Stone's .85 m top. Move it to the existing hostile .65 m height. Both real-input and simulation blocking checks cover this boundary.
5. A 14-unit gust moved the fully bound core only about .0005 m with inherited friction. Guardian/plate bronze footing now uses .08 friction with the minimum combine rule; mass and cohesion still resist. Normal enemies and props are unchanged. This is modest sliding, not launchability or immunity. The phase/force/cover regressions pass together.
6. Loose-body impacts execute after the maneuver tick. Added final lifecycle resolution before victory freezes the world, so a final impact cannot leave a live-looking stage behind a victory result.
7. Stationary fire exposed a layout problem: the old central cover gap was about .14 m narrower than the fitted body. Three base-mage marches travelled only 4.8 m total. Guardian-only cover moves .8 m outward on each side, with matching rendered/physical geometry. The old trial and `run-legacy` footprints stay intact. Stationary base changes from victory/42 damage to defeat/100; moving base still wins (43.43 s /14 damage). Strong Basin/Structure remain fast. No spell or enemy damage inflation was used.
8. The isolated scene was not on the Create/Join scene allowlist, so hosting converted it to a normal trial. Both paths now preserve Guardian and legacy-run scenes. The two-browser regression then passed, including a real E-held revive during active Guardian AI.

## Tooling and production

`node scripts/art/build.mjs --guardian` authors the original model and plate from `warden-author.py`, reusing the illustrated export/material helpers. Editable sources: `assets/art-source/warden.blend` and `wardplate.blend`. Runtime core 188,084 bytes / six meshes / five materials; shared plate 80,436 bytes / one mesh / four materials; Khronos validation zero warnings/errors. Mesh count is not draw-call count: material groups produce multiple calls. One shared pigment texture joins the existing shared runtime texture. No external art or paid assets.

`simulation/guardian.ts` owns finite maneuver state, explicitly included in compact `live.guardian`; exact-build compatibility remains. `render/guardian.ts` has seven reusable danger meshes. Cosmetic articulated poses consume rendered motion/delta and authoritative stage changes, never advance gameplay. The final crest and binding settle on normal authoritative victory. `run-legacy` and `npm run evaluate:run` retain the original unmodified five-lineup regression; root remains the current Guardian run.

Use `npx tsx scripts/evaluate-guardian.ts --output=...` for actual Simulation/Rapier batches, `--held-out` for untouched offset/side-cover conditions, and `--stationary` for a deliberately immobile/no-dodge sensitivity check. The wrapper observing Shared Vapour delegates every operation to the real rule; it reports offered water, transfers, newly wet targets and immediate reactions, not counterfactual damage credit. These policies are not human skill models. Browser fixture builds are explicitly labelled; all claimed attacks/revival use real controls.
