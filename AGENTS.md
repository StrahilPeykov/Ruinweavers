# Ruinweavers

Experimental pre-production: Co-op Trial 0.1 makes the existing three encounters playable solo or by two mages. Keep accepted controls, four families and baseline tuning. No roguelite, classes, new Principles, final art or further phase without authorization. Co-op rules, connection steps and evidence: `docs/COOP.md`.

- Stack: TypeScript, Vite, vanilla Three.js WebGL, Rapier, DOM UI, Vitest, Playwright. Local only.
- Commands: `npm install`, `npm run dev`, `npm run build`, `npm test`, `npm run test:e2e`, `npm run benchmark`, `npm run evaluate`, `npm run evaluate:coop`, `npm run measure:pursuit`. Evaluation method/results: `docs/EVALUATION.md`. Preserve historical benchmark evidence.
- Design authority: `docs/VISION.md`, `docs/MAGIC.md`. Boundaries: `docs/ARCHITECTURE.md`. Current evidence and recommendations: `docs/EXPERIMENTS.md`, `docs/TESTING.md`. Research and decisions have their own focused docs.
- Cloudflare build setup: `docs/DEPLOYMENT.md`. `npm run deploy:check` builds and validates a dry run without publishing. Configuration fixes do not authorize pushing or publishing.
- Simulation owns serializable state, stable IDs and actor provenance. Three.js and DOM never own rules. Fixed 60 Hz host-authoritative simulation; physics through its adapter. Actor-owned state; guest collider mirror is query-only.
- Semantic bindings support multiple inputs. Number selection, keyboard cycling, and keyboard Secondary must work without external mouse hardware. Do not claim real trackpad validation from emulation.
- Preserve both casting models and three camera/tempo presets. Never force symmetric spell geometry.
- Validate changes with focused simulation tests and real browser input, inspect screenshots AND inspection API state. Record limitations honestly. Keep a runnable checkpoint in Git; no public remote or deployment.
