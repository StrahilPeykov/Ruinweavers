# Ruinweavers

Experimental pre-production: a solo 3D Magic Lab for a future systemic action roguelite. Improve magic through evidence. No roguelite, multiplayer, classes, additional Principles, or final art in this phase.

- Stack: TypeScript, Vite, vanilla Three.js WebGL, Rapier, DOM UI, Vitest, Playwright. Local only.
- Commands: `npm install`, `npm run dev`, `npm run build`, `npm test`, `npm run test:e2e`, `npm run benchmark`.
- Design authority: `docs/VISION.md`, `docs/MAGIC.md`. Boundaries: `docs/ARCHITECTURE.md`. Current evidence and recommendations: `docs/EXPERIMENTS.md`, `docs/TESTING.md`. Research and decisions have their own focused docs.
- Simulation owns serializable state, stable IDs and actor provenance. Three.js and DOM never own rules. Fixed 60 Hz simulation; physics through its adapter.
- Semantic bindings support multiple inputs. Number selection, keyboard cycling, and keyboard Secondary must work without external mouse hardware. Do not claim real trackpad validation from emulation.
- Preserve both casting models and three camera/tempo presets. Never force symmetric spell geometry.
- Validate changes with focused simulation tests and real browser input, inspect screenshots AND inspection API state. Record limitations honestly. Keep a runnable checkpoint in Git; no public remote or deployment.
