# Decisions

- **2026-09-09:** Keep requested TypeScript/Vite/vanilla Three.js/WebGL stack. Rapier is justified by mass-sensitive force, movable ballast, loose-body impacts, elevation and bridge traversal. No engine/editor or asset pipeline needed.
- **2026-09-09:** Use four families: thermal, moisture, cohesion, momentum. Burning is a derived thermal/material condition. No spell-pair lookup table.
- **2026-09-09:** Default A, balanced camera and tempo, one field. Keep B and all camera/tempo alternatives. Preserve differing cast geometry.
- **2026-09-09:** Keyboard alternatives are always enabled: Tab/Q selection, F/K Secondary, J Primary. F is the discoverable default; K supports right-hand key placement if desired. Optional wheel is off by default. Binding conflicts are rejected instead of silently breaking another action.
- **2026-09-09:** Stagger recovery added after a deterministic probe exposed repeated steam interrupts. Preserve useful reactions while allowing enemy attacks to proceed.
- **2026-09-09:** Continuous burn damage no longer retriggers bright hit flashes every tick; that made heated timber look white and obscured the heat color. UI reset updates camera immediately to avoid projection drift after scene/model changes.
- **2026-09-09:** No multiplayer, Runes, classes, progression or additional content. This artifact is ready for subjective human assessment, not a conclusion that the final combat design is solved.

- **2026-09-09, Magic Lab 1.1:** Keep catalogue, damage, movement/dodge tuning, models and presets. Reproduced rear Gale deflection, cross-floor basin saturation and dropped near-recovery Secondary presses in failing regressions; fixed spatial rules and added a 120 ms one-intent buffer with zero comparison. Surface-aware preview excludes support scheduled for replacement. Losing a slab still has its original physical consequence.
- **2026-09-09, Magic Lab 1.1:** Use low-cost local sound and state/impact cues. Visual review caught invalid previews hidden under slabs; preview/rejection cues now remain visible. The benchmark's eight defeat times remained unchanged, including Basin + Ember at 2.68 s. This is diagnostic evidence, not a reason to nerf it or a verdict on fun.
