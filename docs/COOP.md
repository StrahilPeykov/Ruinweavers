# Solo/co-op connection - current illustrated Broken Court

## Play and connect

Run `npm install` once, then `npm run dev`. Root http://127.0.0.1:5173/ opens the complete illustrated five-beat run. Begin run plays solo. Explicit `?scene=trial` and Lab scenes retain their diagnostics. See [run structure and personal rewards](RUN.md). Model A, balanced camera/tempo, 120 ms Secondary buffer and one base field per mage remain. Controls/settings start collapsed.

For separate computers, open the same deployed build and keep Public Nostr selected. One player chooses Create co-op and copies the six-character room code; the partner enters it and presses Enter or Join co-op. Both Ready. After encounters one, three and four, each chooses a personal upgrade before party readiness. The final offer can include a compatible Theorem with its prerequisite printed on the card. Both ready again between encounters. Joining an active attempt is not supported.

After victory/defeat, New run requests a fresh host-owned seed; Retry same seed preserves the offer sequence given the same choices. Both clear the previous build and health, create fresh run identity and wait for party readiness. Top Restart same seed abandons the attempt under the existing reset/readiness rules. The accepted TURN setup, TLS/443 fallback and one-hour credential lifetime without in-session renewal are unchanged. This milestone makes no new remote-laptop relay claim.

For two windows on this computer, the same public path works, or choose **Local relay Â· same machine test** on both. `npm run dev` starts the official Trystero WebSocket signaling relay on loopback port 4174 alongside Vite on 5173. Local relay is not an internet/LAN hosting service. New rooms use six characters, without easily confused I/O/0/1. The join field accepts lowercase and whitespace, and still accepts legacy RW codes. The read-only share field supports native selection/copy; if clipboard permission is denied, Copy code selects it and shows the keyboard shortcut.

Public discovery uses external signaling/STUN. Direct connections need no TURN account, but restrictive networks require a relay. The client now loads optional TURN credentials from the deployment; see [TURN setup](TURN.md).

WASD move; pointer aim; LMB/J Primary (hold repeats); RMB/F/K Secondary (discrete); 1â€“4 select; Tab/Q next/previous; Space dodge. **Hold E near a downed partner for 1.2 seconds** to restore 35 HP and brief invulnerability. Clearing an encounter also restores a downed partner. Both down ends the attempt. Health otherwise carries. Pause is shared; cameras and input profiles are local. Optional wheel cycling stays off by default.

Try independent attacks first, then let one mage place Tide's Basin while the other heats its targets. Swap roles. Use a partner's Stone cover and Gale to redirect incoming projectiles. The same spell catalogue is available to both; these are play suggestions, not classes.

Mute, input profile, bindings and optional wheel preference are saved in this browser on this site. The instruments show restored values. Choosing Desktop/Laptop restores default bindings; optional wheel remains an independent preference. Invalid stored controls fall back to defaults, and blocked/full storage leaves session controls usable. Ctrl/Cmd/Alt combinations are reserved for browser/OS shortcuts and clear held/pending gameplay input; press gameplay keys again after the shortcut. Shift remains available as a Secondary fallback. Camera changes preserve both players' manifestations; buffered/rejected-cast text belongs to the local mage.

## Shared-world rules

Each actor owns aim, Principle, timings/buffer, dodge/invulnerability, movement/gravity, HP and fields. Replacing your field preserves your partner's field and residual target states. Enemies choose the nearest living mage and retain a valid target during their readable telegraph. A melee strike can hit both players inside its shown area; projectiles hit their first contact.

Direct damage attributed to the other mage is suppressed, including their heat/steam/burning ticks. Self-attributed damage, enemy attacks and falls remain. Allied spells still intercept on bodies and can apply wetness, heat or structure; those states can alter a later self-attributed reaction. Cover blocks either mage's low shots, bodies/props can obstruct movement, and replacing/expiring support can drop a partner. Gale moves dynamic props; the existing kinematic players do not receive its lift. This is not complete immunity to environmental interference. Cross-player steam records primer, transformer and damage recipient, with no Resonance bonus.

## Authority and limitations

Host alone advances gameplay/Rapier at 60 Hz. Guest sends validated semantic inputs at a target of about 30 Hz; host snapshots remain capped at about 20 Hz. Main-thread stalls can lower both effective rates. Protocol 3 requires matching source build IDs and explicitly includes personal run offers/upgrades. Compact snapshots carry live state and acknowledged events; terrain, materials and configuration bootstrap each epoch until acknowledged. Full balance telemetry stays on the host.

Guest remote bodies and projectiles use a bounded 75 ms presentation timeline. The local guest instead previews walking with the query-only Rapier controller and reconciles against processed-input acknowledgements (at most 32 samples / 350 ms). Aim and selection respond locally. Damage, collision outcomes, casts, dodge success, death, revival and victory remain authoritative. No gameplay world rollback exists. See [smoothness evidence and limits](SMOOTHNESS.md).

Inputs older than 250 ms stop movement/held casting and clear pending intent. Sequence numbers and encounter epochs reject replayed/obsolete input. Focus loss releases controls. Six seconds without an accepted input/snapshot heartbeat stops the attempt; leaving/disconnecting also freezes it with an explanation. Missing rooms time out after 25 seconds. Return to solo or create/join a fresh room; no reconnect recovery or host migration. Keep the host browser running in the foreground: OS/browser background throttling can stall it. TURN fallback is used only when the site owner configures relay credentials. Without those credentials, restrictive NAT/firewalls can prevent joining. Public relay availability is outside this local project.

**Verified locally:** actual WebRTC with two independent Chromium clients on one Windows machine, using both loopback signaling and public Nostr discovery. **Remote owner report (2026-09-09):** after Cloudflare TURN activation, both real laptops connected in relay-only mode. With the weak laptop hosting, both were choppy; with the strong laptop hosting, only the weak laptop remained choppy. This supports using the stronger laptop as host for now. Remote selected-candidate details/RTT remain unmeasured; the TLS/443 probe in `docs/TURN.md` was on one machine. Physical input comfort and remote GPU performance are not established by automated tests.

### Choppy rendering follow-up

The supplied observation export measured 43.18 ms/frame (~23 FPS), p95 50 ms, 62 draws, 1,604 triangles and no active VFX. That establishes slow frames, not their cause: the old export lacked renderer identity, viewport and network statistics.

**Experiments â†’ Rendering â†’ Lightweight** is a saved, device-local option: no shadows and a drawing buffer capped at 1280Ã—720, with aspect preserved. Standard stays the default. `?scene=trial&quality=lightweight` also selects it. It does not change simulation, field capacity, host settings, controls or networking. Switching can briefly stall for shader compilation. Prefer normal direct-or-relay mode (omit `relay=required`) after relay diagnostics.

Export observations now records renderer/browser/viewport/resolution, frame sample count, network role, selected ICE candidate types/RTT/byte counters, guest snapshot intervals and application duration. Missing RTT is null, not zero. Scheduled snapshot JSON bytes exclude protocol overhead and are not provider-billed TURN usage. Addresses, room codes and TURN credentials are excluded from network summaries. Inspect a fresh export after 15â€“20 seconds of actual play to distinguish frame slowdown from arrival jitter or expensive snapshot application. This export change was not evidence that remote choppiness was fixed. The subsequent smoothness pass adds pose interpolation and local walking prediction; remote hardware performance remains unverified.

## Exploratory encounter comparison

`npm run evaluate:coop` uses actual Simulation/Rapier, not a networking model. Three matched layouts (open-near, cross-cover, side-cover) Ã— three isolated encounters; 55-second limit, unchanged enemy HP. All policies use eight-direction keyboard movement, 10 Hz decisions, 200 ms delayed observations and deterministic imperfect aim. The independent pair runs two state-aware heuristics; the cooperating pair shares a midpoint target, using a Basin/Tide/Stone primer and Ember striker. They have the same motor/observation capabilities, but the cooperating policy also restricts defensive spell choices. Its poorer result does not establish a need for bonus damage. Allied projectile interception remains a later gameplay comparison. No latency is simulated in this batch.

| Policy | Clears | Mean seconds | Mean party HP lost | Enemy cross-player reactions, total |
| --- | ---: | ---: | ---: | ---: |
| Solo | 9/9 | 9.39 | 2.89 | 0 |
| Independent pair | 9/9 | 6.19 | 3.11 | 64 |
| Cooperating pair | 9/9 | 6.63 | 11.22 | 107 |

Party damage sums both recipients; it is not a normalized solo difficulty score. Ordinary shared states already create cross-player reactions, including between independent policies. Deliberate priming produced more reactions but did not outperform this independent pair; positioning/target selection and policy quality remain confounders. No HP scaling, spell rebalance or cooperation bonus was justified or added. The small sample contains no fresh co-op hold-out, no carried-health co-op benchmark and no human skill model. Near-partner revive is supported by the policies, but they do not navigate specifically to a distant downed partner. See JSON damage routes and outcomes for collateral versus enemy totals. Stone's older exclusion result never tested slab use and cannot establish redundancy.

## Reproduce evidence

`npm test`, `npm run build`, `npm run test:e2e`. Local co-op journeys: `npx playwright test tests/browser/coop.spec.ts`. Public path in PowerShell: `$env:RUIN_SIGNALING='public'; npx playwright test tests/browser/coop.spec.ts -g 'independent actors'`; remove that environment variable afterward for the local suite.

`npm run evaluate:coop`; `npm run measure:pursuit`; `npm run evaluate -- --keyboard --output=artifacts/coop-trial/new-keyboard.json`. Without `--keyboard`, the labelled legacy continuous-heading motor remains available. Use new output filenames for comparisons. Evidence resides in `artifacts/coop-trial/`; historical Combat Trial/Lab evidence remains untouched.

Current synthetic browser sensitivity uses 80 ms Ã‚±20 ms deterministic application delay on outgoing input and snapshot messages (seed 42), over a real WebRTC channel. It can reorder scheduled inputs; sequence checks reject old packets. Control/readiness messages are not delayed. This is not an emulated network link, packet-loss study or measured human reaction delay.

The original delay harness also held the snapshot send gate while waiting, reducing frequency. Protocol 2 schedules bounded messages independently of that delay, retaining the existing 50 ms minimum send interval. Compare arrival measurements, not the delay label alone. That historical smoothness pass preceded the now-authorized Run Prototype 0.1. The next intended milestone is visual distinction for this compact slice.
