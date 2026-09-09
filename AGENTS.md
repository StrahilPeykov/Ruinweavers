# Ruinweavers

Experimental pre-production: Combat Trial 0.1 extends the Magic Lab with three encounters and one pursuing archetype. Keep the accepted controls and four families as a working baseline. No roguelite, multiplayer, classes, additional Principles, or final art in this phase. Actual two-player validation is the next intended milestone, not automatically authorized work.

- Stack: TypeScript, Vite, vanilla Three.js WebGL, Rapier, DOM UI, Vitest, Playwright. Local only.
- Commands: `npm install`, `npm run dev`, `npm run build`, `npm test`, `npm run test:e2e`, `npm run benchmark`, `npm run evaluate`. Evaluation method/results: `docs/EVALUATION.md`. Preserve historical benchmark evidence.
- Design authority: `docs/VISION.md`, `docs/MAGIC.md`. Boundaries: `docs/ARCHITECTURE.md`. Current evidence and recommendations: `docs/EXPERIMENTS.md`, `docs/TESTING.md`. Research and decisions have their own focused docs.
- Cloudflare build setup: `docs/DEPLOYMENT.md`. `npm run deploy:check` builds and validates a dry run without publishing. Configuration fixes do not authorize pushing or publishing.
- Simulation owns serializable state, stable IDs and actor provenance. Three.js and DOM never own rules. Fixed 60 Hz simulation; physics through its adapter.
- Semantic bindings support multiple inputs. Number selection, keyboard cycling, and keyboard Secondary must work without external mouse hardware. Do not claim real trackpad validation from emulation.
- Preserve both casting models and three camera/tempo presets. Never force symmetric spell geometry.
- Validate changes with focused simulation tests and real browser input, inspect screenshots AND inspection API state. Record limitations honestly. Keep a runnable checkpoint in Git; no public remote or deployment.
