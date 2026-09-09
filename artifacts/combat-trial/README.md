# Combat Trial 0.1 evidence

Root evaluation JSON is corrected dry-arena evidence at simulation checkpoint a23f175. Each file records the runtime, tuning, policy version and source hashes. Compare matched scenarios/modes; do not mix isolated encounters with carried-health full trials or motor ablations.

- baseline-development / candidate-development: 96 cases each, before/after pursuit tuning.
- baseline-no-dodge / candidate-no-dodge: 96 cases each, same policies with dodge disabled.
- candidate-standing: 96 cases, movement and dodge disabled for every policy.
- candidate-held-out: 48 unrestricted cases plus 24 adaptive restrictions; layouts were held out until tuning froze, then rerun after the invisible-water correctness fix.
- candidate-full-trials: 32 carried-health sequences across the four development layouts.
- baseline-lab / legacy-benchmark-final: byte-identical old benchmark; unchanged historical evidence.
- browser: trial screenshots with state/config/renderer JSON. `fixture-stage-*` uses 1 HP enemies solely for real-input lifecycle checks; `fixture-defeat` uses 1 HP player. `03-mouse-reaction-control` only arranges positions; health and damage are normal.
- validation: legacy Lab journeys rerun against current runtime. Historical 1.1 files are preserved in their original directory.
- iterations/pre-dry-arena: superseded results with accidental invisible Lab water; retained for provenance, not current conclusions.

Read docs/EVALUATION.md and docs/TESTING.md for interpretation and limitations. Browser rendering is Chromium/SwiftShader software rendering, not a laptop GPU performance benchmark.
