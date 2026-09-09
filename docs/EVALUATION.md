# Encounter evaluation

Default: Model A, balanced camera/tempo, 120 ms buffer, one manifestation, `scenario=cross-cover`. Three encounters: two sentinels; three pursuers; two of each. HP carries; between encounters positions, fields, projectiles and transient combat state reset. E/the card continues; Restart trial restores 100 HP. No rewards or progression.

## Method

The evaluator runs the actual fixed-step Simulation and Rapier, not a combat approximation. `policies-1` has four transparent heuristics: Ember attack/move; Basin placement plus Ember; Gale near threats plus Stone cover/updraft; and state-aware wet/heat/cluster/control choices. All receive the same observation fields and share 10 Hz decisions, movement probes, reactive dodge, aiming and cast cadence. Enemy phase is visible, exact AI timers/locked future aims are not. Cover policy can obstruct its own shots; these are implementations to inspect, not optimized champions of their families.

Exact-state runs use current coordinates. Delayed-aim runs use 200 ms observation delay and a deterministic perpendicular aim offset up to .6 units. Their success need not rank below exact-state: different trajectories change contacts. Neither mode models validated human skill, physical ergonomics or subjective fun. Shared motor probes use current collision geometry, an explicit synthetic advantage.

Four development layouts vary range, spread, angle, start and zero/two cover pillars. Two held-out layouts vary diagonal approaches/offsets. All policies run matched layouts. Each isolated case has 55 simulated seconds; full carried-health trials have 165. No repeated identical case is counted as new coverage. Held-out layouts were inspected after tuning froze; a subsequent correctness repair removed invisible inherited Lab water and required rerunning them. They are therefore a retained check, not an untouched second hold-out or basis for further tuning.

## Final isolated results

Delayed-aim, reactive movement/dodge; four configurations per cell. Entries are mean **seconds / HP lost**. All four policies clear 12/12 cases. High completion is acceptable; no 50% win-rate target was used.

| Policy | Ranged | Pursuit | Mixed |
| --- | ---: | ---: | ---: |
| attack-move | 15.1 / 7.0 | 12.9 / 6.0 | 21.8 / 14.0 |
| basin-ember | 7.8 / 7.0 | 5.3 / 0.0 | 11.6 / 3.5 |
| control-cover | 16.7 / 0.0 | 15.1 / 0.0 | 32.8 / 0.0 |
| state-aware | 8.4 / 0.0 | 7.5 / 3.0 | 13.3 / 0.0 |

Basin + Ember remains the fastest tested moving routine. Control/cover takes longer but avoids damage in these isolated development cases. This does not establish universal dominance or prove that each component of a combined policy helped. In particular, zero damage is not a measured amount of damage prevented.

## Carried health and sensitivity

Full trials over the four development layouts, delayed-aim: all policies finish 4/4. Mean combat time / HP lost:

- attack-move: 51.2 s / 24.0 HP.
- basin-ember: 25.9 s / 10.5 HP.
- control-cover: 60.9 s / 24.5 HP.
- state-aware: 28.4 s / 3.5 HP.

The exact-state attack policy finishes 3/4 full trials, despite clearing all isolated encounters. Carrying health and encounter history matter. Removing all movement/dodging for every policy is a separately labelled motor ablation: stationary Basin + Ember clears 6/12, versus 12/12 with reactive movement. This rules out that particular camping shortcut across this sample, not every possible exploit. No-dodge results are also preserved separately; motor ablations are not mixed into the principal comparison.

## Restricted actions

State-aware policy adapts its primary fallback and Secondary choices when a family is excluded. Held-out delayed-aim results (six encounters each):

| Excluded | Clears | Mean seconds | Mean HP lost |
| --- | ---: | ---: | ---: |
| None | 6/6 | 10.4 | 2.3 |
| Ember | 6/6 | 13.4 | 13.0 |
| Tide | 6/6 | 20.3 | 9.0 |
| Gale | 6/6 | 10.4 | 4.3 |
| Stone | 6/6 | 10.4 | 2.3 |

Ember/Tide exclusions cost this heuristic time; Gale exclusion adds some damage. Stone exclusion changes nothing here: the cluster heuristic rarely selects its Primary and does not use slabs. That is inadequate evidence about Stone's usefulness, not a reason to remove it. No family is mandatory and no elemental immunity was added.

## Bounded changes and evidence

The earlier enemy-tuning hypothesis was that pursuers should close while the mage casts and continue approaching during their readable wind-up. The measurement below corrects the unsupported closing-speed interpretation. Baseline speed 4.8 became 6; wind-up advance became 70% chase speed. The .65 s wind-up, final .3 s target lock, 12 damage, recovery, player movement/dodge and every spell number remain unchanged. Both enemy versions are reproducible by query.

The corrected matched no-dodge comparison raises attack/move mean damage from 26.5 to 34.8 HP in delayed mode; control/cover falls from 11.7 to 8.2. Reactive delayed attack/move is nearly unchanged (9.2 to 9.0). This modest evidence supports pressure with usable counterplay, not a claim that the adjustment universally increases difficulty. No additional tuning followed the held-out check. No Basin nerf or Gale damage equalization.

Correctness: Gale deflection alone no longer reports empty. Trial-only AI is independent. Lab water/plate rules no longer invisibly affect this dry arena. The pre-repair results are archived in `iterations/pre-dry-arena`; do not mix them with the corrected tables. The old eight-strategy Lab benchmark is byte-identical to its baseline.

## Reproduce and interpret

`npm run evaluate` runs development comparisons. Use `npx tsx scripts/evaluate-encounters.ts` with `--baseline`, `--held-out --restrictions`, `--trial`, or `--motor=no-dodge|standing`; supply a unique `--output=artifacts/combat-trial/name.json` to preserve earlier evidence. Configuration definitions are in `src/simulation/trial.ts`. JSON records tuning, policy version, source hashes, runtime commit, seeds and horizon.

Rows include completion/defeat/timeout, elapsed time, HP damage, casts, switches, dodges, reactions, remaining enemy state, field contact/replacement and control duration/attack events. Instant hit/miss means application/contact (including useful deflection), not necessarily damage. Bolts separately record body recipient, terrain block, deflection and expiry. Damage routes retain current source, recipient, reason and HP actually removed; enemy totals exclude props/caster. Original projectile emitter remains in projectile counters. Friendly fire/collateral and residual states are intentional shared-rule outcomes. Counts of blocks/deflections are never labelled damage prevented.

## Remaining questions

1. Is mixed pressure readable and satisfying with human aim and reaction delays?
2. Does Basin + Ember leave enough practical reasons for cover/control beyond these particular heuristics?
3. Does Stone offer useful opportunities a better policy/person can exploit, including elevated cover, without a camping loophole?

The historical tables above use continuous headings. Co-op Trial evidence follows; no further phase is automatically authorized.

## Co-op Trial corrections — unchanged tuning

`--keyboard` restricts the existing motor to eight actual WASD headings; continuous mode is preserved and labelled. On the same 12 isolated development cases, all four policies clear 12/12 in both modes. Delayed-aim aggregate mean seconds / HP lost:

| Policy | Legacy continuous | Keyboard |
| --- | ---: | ---: |
| attack-move | 16.6 / 9.0 | 17.1 / 9.0 |
| basin-ember | 8.3 / 3.5 | 8.0 / 1.2 |
| control-cover | 21.5 / 0.0 | 23.0 / 3.5 |
| state-aware | 9.7 / 1.0 | 9.2 / 3.3 |

The zero-damage control result depends on the synthetic motor. Continuous-mode reruns reproduce prior aggregate outcomes; historical files remain preserved. This correction does not establish human difficulty or require spell tuning.

`npm run measure:pursuit` uses one real damped Rapier pursuer in a 2-second open lane, starting 8 units away. First .5 seconds and telegraphs are excluded from sampled chase speed; total gap includes all motion. Baseline/current steering settings 4.8/6 produce measured chase speeds **1.77/2.56 units/s**, respectively. Current end gaps are **3.15 stationary, 14.26 retreating, 13.20 retreating while casting Ember**. The pursuer closes on a stationary player, but not these retreating players. This is one unobstructed lane, not a full encounter or speed guarantee under force/contact. No tuning changed to match a label.

The older Stone-exclusion finding concerns a heuristic that does not cast slabs. It cannot establish redundancy or measure cover/traversal usefulness. Co-op comparison and limitations are in [COOP](COOP.md); party damage is summed by recipient, enemy reactions exclude props/allies. JSON includes per-source/recipient routes and actual blocks/deflections, never assumed damage prevented.
