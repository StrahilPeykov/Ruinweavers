# Run Topology 0.3

Working implementation; final browser/evaluation evidence is being collected. No session coordinator or recovery service is implemented.

## Research translated into decisions

- **Verified:** [Supergiant's Welcome to Hell notes](https://www.supergiantgames.com/blog/hades-welcome-to-hell-update-patch-notes/) explicitly added multiple Chaos exits with chamber-reward previews. [Level designer Ed Gorinstein's account](https://threadreaderapp.com/thread/1311777010239193088) describes authored chambers and exit counts influencing choices. **Our inference:** preview a truthful spatial opportunity before commitment; preserve whole rooms rather than randomizing their cover. Our forks do not promise a particular upgrade or imitate Hades' reward economy.
- **Verified:** [Dave Crooks on Gungeon](https://www.gamedeveloper.com/design/q-a-the-guns-and-dungeons-of-i-enter-the-gungeon-i-) describes repeatedly playing hand-designed rooms, then assembling floors by rules. **Our inference:** navigation and combat acceptance precede adding a candidate to the route pool; number of possible permutations is not a quality score.
- **Verified:** [Hopoo's Risk of Rain 2 interview](https://www.gamedeveloper.com/design/how-moving-from-2d-to-3d-shaped-the-design-of-i-risk-of-rain-2-i-) describes the cost of memorable procedural 3D maps and variations within premade stages. **Our inference:** separate RoomSpec from encounter package, keep enemy pressure controlled while spatial order varies.
- [Mega Crit's developer newsletter](https://www.megacrit.com/news/2026-4-17-neowsletter-issue-21/) shows the shared map as a social surface and discusses the added difficulties of stranger matchmaking. Its map imagery is an observed presentation reference, **not evidence of an exact voting/graph algorithm**. Our two-person unanimous choice, visible votes and no timer are explicit Ruinweavers decisions. We retain friend-room connection and do not add matchmaking or replicate a giant node map.

Criteria: each option must describe a real spatial difference, every route must work without an upgrade, no repeated room on a path, four normal fights only, no hidden build-conditioned selection, no additional resource/reward economy. A fixed opening teaches the shared vocabulary; three short forks vary the following spaces. Ordinary pressure remains pursuit, mixed, then pursuit with ranged support, independent of room identity.

## Authored pool and graph

Six ordinary rooms: Split court, Offset gallery, Rotunda, Repair yard, **Leaning approach**, **Oblique court**. Warden crossing is the fixed finale. Rejected Rising Court/Broken Link/Archive remain explicit diagnostics. `run-spatial` preserves the previous fixed physical run; `run-classic` and `run-legacy` preserve older baselines.

Leaning approach: broad asymmetry, one sheltered lateral aisle and ballast near an interception line. Oblique court: long crossed diagonals with two broad lateral bypasses and fracture/loose material off the main transit line. Both reuse the illustrated kit and flat supported floors. No new traversal or AI system.

```
Split -> choose 1 of 2 -> choose 1 of 2 -> choose 1 of 2 -> Warden
reward 1                reward 2         reward 3
```

The graph has 16 nodes (1 + 2 + 4 + 8 ordinary nodes + one shared finale), eight possible paths per seed. `ROUTE_VERSION=1` plus uint32 seed determines the entire graph. A fixed PRNG/shuffle traverses the binary tree in a fixed order; every child excludes its ancestors' room IDs. Display names are not protocol IDs. There is no reroll based on builds, HP or votes. Room IDs may exist in different branches, never twice on a visited path. Seeds need not produce unique graphs.

Stages have stable identities (`threshold`, `pursuit`, `convergence`, `approach`, `warden`), encounter-package references and reward boundary keys (`first`, `second`, `final`). The final choice retains existing Theorem eligibility. Reward randomness stays independent of route randomness; same seed, route choices and personal choices reproduce the same offers. No additional RNG cursor is needed.

## Shared routes, personal builds

After personal rewards are complete, both clients see the same two destinations and material/pressure descriptions. Each may vote/change vote until all active actors agree. Agreement locks the destination; both still explicitly ready to begin combat. A lone player commits with one vote. No tie-breaker, host override or countdown. The final Warden destination is fixed, explicitly shown, and still requires readiness.

Votes validate run ID, decision ID, boundary incarnation, actor ownership and offered node; the network additionally validates current party epoch. Unknown actors, wrong nodes, stale/duplicate-after-agreement requests are rejected. Readiness before agreement is ignored. Combat clicks cannot select route cards; rewards and routes use fresh-pointer protection. Combat intent is cleared at existing safe/menu boundaries, not ordinary enemy deaths.

Protocol 4 sends the bounded graph only with static/bootstrap data. Live snapshots carry current path, boundary, decision/votes/selection and personal run state. Exact source build compatibility remains required. No change to public Nostr signaling or TURN.

## Safe checkpoint contract (local only)

`src/simulation/checkpoint.ts`: schema 1 includes run ID, seed, route version, visited node IDs, boundary incarnation, optional agreed next node, current personal reward offers/choices, carried actor HP and up to three upgrades per actor. Graph and offers are regenerated/validated. No projectiles, fields, bodies, contacts, enemy poses, Guardian maneuver, VFX, transport IDs or tokens are included.

Allowed phases:

- `ENCOUNTER_READY`: freshly authored encounter, before combat starts.
- `REWARD_PENDING`: cleared encounter, at least one personal choice outstanding.
- `REWARD_COMPLETE`: choices complete, shared route not agreed yet.
- `ROUTE_PENDING`: no personal reward at this clear; shared route outstanding.
- `NEXT_ENCOUNTER_READY`: destination agreed, awaiting fresh party readiness.

Active combat, victory and defeat are not checkpoint capture phases. A coordinator can save the initial ready state or next-ready state immediately before combat; a future mid-fight recovery returns to that boundary and starts the encounter from authored data. Restore clears readiness and uncommitted votes, increments boundary incarnation, rebuilds fresh Rapier from RoomSpec, and preserves personal choice ownership. Expected run ID and exact stored boundary must be supplied by the trusted caller; incompatible schema/generator, malformed path, HP, upgrades, offers or phase are rejected. There is no production checkpoint-import endpoint.

**Future only:** a coordinator could retain the authoritative host on guest disconnect and let that guest rejoin; on host loss it could grant authority to a replacement, load the latest safe checkpoint and restart the encounter. This is restart-based recovery, not exact physics migration. Persistence, reconnect identity, hosted signaling, leases and authority reassignment are NOT implemented here.

## Evidence status

Baseline e3985cc: 124 unit tests and production build passed. New deterministic coverage includes every path across 500 seeds, personal reward ownership, changed votes/disagreement, stale controls, JSON wire transport and safe checkpoint round trips. Candidate navigation v1 found a diagonal prop snag and a lower cover crowding pocket; moving the props and shortening/repositioning that cover yielded all 18 pursuer approaches at six tested positions. No AI, spell or enemy-stat tuning.

Final seed distribution, matched-route simulations, browser journeys and resource evidence will be summarized here after validation. Synthetic policies are diagnostic, not models of human skill; local WebRTC does not validate remote laptops or TURN.

Initial integration: 130 units and build pass; complete solo and local WebRTC pair runs reached victory on different paths, with three rewards and route disagreement/agreement. Chrome 153 / Intel UHD D3D11, 1440x900 CSS, Lightweight 1152x720. A separate held-input test initially failed at browser launch before navigation; unchanged focused rerun passed. Final broader sweep remains pending.
