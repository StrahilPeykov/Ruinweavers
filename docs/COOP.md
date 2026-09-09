# Co-op Trial 0.1

## Play and connect

Run `npm install` once, then `npm run dev`. Open http://127.0.0.1:5173/. **Start trial / E** plays solo. Defaults remain Model A, balanced camera/tempo, 120 ms Secondary buffer, one field per mage. Instruments start collapsed.

For two people on separate computers, open the same deployed build, or run this checkout locally on each computer. Leave **Connection options → Public Nostr · internet** selected on both. One clicks **Create co-op**, clicks **Copy code** and shares the six-character code privately, and the other enters it and clicks **Join co-op**. Both press **Ready**. Both must be ready again between encounters and to restart after victory/defeat. The top Restart button during combat abandons the attempt and waits for the partner's readiness. Joining an active attempt is not supported.

For two windows on this computer, the same public path works, or choose **Local relay · same machine test** on both. `npm run dev` starts the official Trystero WebSocket signaling relay on loopback port 4174 alongside Vite on 5173. Local relay is not an internet/LAN hosting service. New rooms use six characters, without easily confused I/O/0/1. The join field accepts lowercase and whitespace, and still accepts legacy RW codes. The read-only share field supports native selection/copy; if clipboard permission is denied, Copy code selects it and shows the keyboard shortcut.

Public discovery uses external signaling/STUN. Direct connections need no TURN account, but restrictive networks require a relay. The client now loads optional TURN credentials from the deployment; see [TURN setup](TURN.md).

WASD move; pointer aim; LMB/J Primary (hold repeats); RMB/F/K Secondary (discrete); 1–4 select; Tab/Q next/previous; Space dodge. **Hold E near a downed partner for 1.2 seconds** to restore 35 HP and brief invulnerability. Clearing an encounter also restores a downed partner. Both down ends the attempt. Health otherwise carries. Pause is shared; cameras and input profiles are local. Optional wheel cycling stays off by default.

Try independent attacks first, then let one mage place Tide's Basin while the other heats its targets. Swap roles. Use a partner's Stone cover and Gale to redirect incoming projectiles. The same spell catalogue is available to both; these are play suggestions, not classes.

## Shared-world rules

Each actor owns aim, Principle, timings/buffer, dodge/invulnerability, movement/gravity, HP and fields. Replacing your field preserves your partner's field and residual target states. Enemies choose the nearest living mage and retain a valid target during their readable telegraph. A melee strike can hit both players inside its shown area; projectiles hit their first contact.

Direct damage attributed to the other mage is suppressed, including their heat/steam/burning ticks. Self-attributed damage, enemy attacks and falls remain. Allied spells still intercept on bodies and can apply wetness, heat or structure; those states can alter a later self-attributed reaction. Cover blocks either mage's low shots, bodies/props can obstruct movement, and replacing/expiring support can drop a partner. Gale moves dynamic props; the existing kinematic players do not receive its lift. This is not complete immunity to environmental interference. Cross-player steam records primer, transformer and damage recipient, with no Resonance bonus.

## Authority and limitations

Host alone advances gameplay/Rapier at 60 Hz. Guest sends validated semantic inputs at about 30 Hz; host sends state/event snapshots at about 20 Hz. Guest physics contains fixed query colliders for cursor/placement, never a second gameplay simulation. Rendering follows authoritative positions directly with camera smoothing; there is no prediction or pose interpolation. Guest response therefore includes network and snapshot latency.

Inputs older than 250 ms stop movement/held casting and clear pending intent. Sequence numbers and encounter epochs reject replayed/obsolete input. Focus loss releases controls. Six seconds without an accepted input/snapshot heartbeat stops the attempt; leaving/disconnecting also freezes it with an explanation. Missing rooms time out after 25 seconds. Return to solo or create/join a fresh room; no reconnect recovery or host migration. Keep the host browser running in the foreground: OS/browser background throttling can stall it. TURN fallback is used only when the site owner configures relay credentials. Without those credentials, restrictive NAT/firewalls can prevent joining. Public relay availability is outside this local project.

**Verified:** actual WebRTC with two independent Chromium clients on one Windows machine, using both loopback signaling and public Nostr discovery. **Remote report:** two laptops on different networks exchanged SDP but failed the direct connection. Authenticated TURN has not yet been retested on those laptops. **Not verified:** successful play between two physical computers on different networks, physical trackpad/keyboard comfort, subjective guest latency, or remote GPU performance. The public signaling test is still a same-machine transport test.

## Exploratory encounter comparison

`npm run evaluate:coop` uses actual Simulation/Rapier, not a networking model. Three matched layouts (open-near, cross-cover, side-cover) × three isolated encounters; 55-second limit, unchanged enemy HP. All policies use eight-direction keyboard movement, 10 Hz decisions, 200 ms delayed observations and deterministic imperfect aim. The independent pair runs two state-aware heuristics; the cooperating pair shares a midpoint target, using a Basin/Tide/Stone primer and Ember striker. They have the same motor/observation capabilities. No latency is simulated in this batch.

| Policy | Clears | Mean seconds | Mean party HP lost | Enemy cross-player reactions, total |
| --- | ---: | ---: | ---: | ---: |
| Solo | 9/9 | 9.39 | 2.89 | 0 |
| Independent pair | 9/9 | 6.19 | 3.11 | 64 |
| Cooperating pair | 9/9 | 6.63 | 11.22 | 107 |

Party damage sums both recipients; it is not a normalized solo difficulty score. Ordinary shared states already create cross-player reactions, including between independent policies. Deliberate priming produced more reactions but did not outperform this independent pair; positioning/target selection and policy quality remain confounders. No HP scaling, spell rebalance or cooperation bonus was justified or added. The small sample contains no fresh co-op hold-out, no carried-health co-op benchmark and no human skill model. Near-partner revive is supported by the policies, but they do not navigate specifically to a distant downed partner. See JSON damage routes and outcomes for collateral versus enemy totals. Stone's older exclusion result never tested slab use and cannot establish redundancy.

## Reproduce evidence

`npm test`, `npm run build`, `npm run test:e2e`. Local co-op journeys: `npx playwright test tests/browser/coop.spec.ts`. Public path in PowerShell: `$env:RUIN_SIGNALING='public'; npx playwright test tests/browser/coop.spec.ts -g 'independent actors'`; remove that environment variable afterward for the local suite.

`npm run evaluate:coop`; `npm run measure:pursuit`; `npm run evaluate -- --keyboard --output=artifacts/coop-trial/new-keyboard.json`. Without `--keyboard`, the labelled legacy continuous-heading motor remains available. Use new output filenames for comparisons. Evidence resides in `artifacts/coop-trial/`; historical Combat Trial/Lab evidence remains untouched.

Synthetic browser sensitivity uses 80 ms ±20 ms deterministic application delay on outgoing input and snapshot messages (seed 42), over a real WebRTC channel. It can reorder scheduled inputs; sequence checks reject old packets. Control/readiness messages are not delayed. This is not an emulated network link, packet-loss study or measured human reaction delay.
