# Build Identity 0.2

Working question: can three personal choices change how the same mage solves the same encounters? Keep the five rooms, illustrated presentation, base tuning, authority and controls. This is not a class system or a completion-rate target.

## Targeted research (10 September 2026)

- Contingent99's [Arcana combinations demonstration](https://www.moddb.com/games/wizard-of-legend/features/a-closer-look-at-arcana-combinations-in-wizard-of-legend) and [developer interview](https://www.gamedeveloper.com/design/designing-i-wizard-of-legend-i-s-fighting-game-inspired-spell-combos) distinguish opening, extending and finishing a combination. **Application:** describe the tactical role an alteration changes; test its follow-up, not only its isolated damage. We do not copy their controls or spells.
- Hopoo's [Providence Trials developer announcement](https://store.steampowered.com/news/posts/?enddate=1679587233&feed=steam_community_announcements) demonstrates mobility, survival and combat challenges, including an item-choice challenge; [official achievement definitions](https://steamcommunity.com/stats/1337520/achievements) expose alternate routes to ability unlocks. **Application:** evaluate utility in more than DPS and let variety appear immediately. We are not importing permanent unlocks. These sources establish examples, not a universal item-design formula.
- Supergiant's [Nighty Night notes](https://www.supergiantgames.com/blog/hades-the-nighty-night-update-patch-notes/) distinguish magnetic gathering and finishing variants of the same weapon. Their [post-launch notes](https://www.supergiantgames.com/blog/hades-updates/) explicitly repair a prerequisite registration bug. **Application:** three choices must change action relationships, and eligibility needs deterministic tests. The [Hades II developer interview](https://www.gamesradar.com/games/hades/weve-learned-to-love-and-trust-the-process-how-hades-2-built-on-supergiants-early-access-legacy-to-deliver-the-best-roguelike-of-2025/) describes relocating a more involved Boon behavior into an Aspect. Our inference: a clever effect can belong at a different layer or deserve removal; no copied Aspect/loadout system.
- Passtech's [September 2026 talent-rework account and earlier statistics](https://steamcommunity.com/app/2071280/allnews/?l=english) distinguish numerical adjustment, replacement and dismissal of talents, and publish pick-rate observations. **Application:** inspect why a choice fails; usage alone is not utility. No attempt to equalize pick rates or copy their roster. Community claims were not needed as design authority.

## Acceptance criteria

An alteration changes delivery, timing, positioning or a specific action's affordance. A theorem changes a reusable relationship. Each must have visible consequences, a concise compatibility statement, a useful follow-up, and a bounded cost. Avoid universal compatibility, stat-only rewards and automatic recursive reactions. An attractive card that the evaluation never exploits is untested, not successful.

Reward stops: after encounters **1, 3 and 4**. First: independent direction. Second: reinforce or pivot. Third: another alteration or an eligible theorem. Each offer has three distinct eligible options; a compatible theorem may occupy one final slot, with remaining slots retaining alternatives. No guaranteed named build. Eligibility is actor-local, visible and revalidated by the host. Same seed plus choices reproduces offers.

## Prototype hypotheses

Keep the original six provisionally. New candidates: returning Ember bolt (reposition across a return lane), crosswise seam (intercept pursuit), forked jet (spread saturation), focused gust (range for width), fault line (anticipate approach), converging gust (gather), and impact splash (spread heat). Test overlap before retaining the latter two.

Theorem candidates: Shared vapour (reaction redistributes moisture once), Break the seal (force releases positive cohesion into the existing fracture rule), Migrating inscriptions (gust redirects owned non-solid fields), and automatic basin infusion (a field imbues traversing attacks). The last risks making the already useful Basin/Ember routine more automatic; prototype it before rejecting or retaining it.

The hypotheses above were starting candidates, not an approved catalogue.

## Retention and first comparisons

Retain the original six plus Crosswise inscription, Divided stream, Long breath and Walking fault: **ten Alterations**. Retain Shared vapour, Break the seal and Migrating inscriptions as three provisional Theorems. Their compatibility appears directly on cards; settings contain build descriptions. This is a selection for playtesting, not proof of equal utility.

Rejected prototypes (actual Simulation/Rapier, results preserved in artifacts/build-0.2):

- Converging gust: reverses existing pressure. It gathers, but overlaps Undertow and removes the reliable outward emergency action. Its control-cover policy had 24/14 damage in pursuit/mixed; policy mismatch limits that comparison. Keep gathering on Tide instead of two inverse-force cards.
- Impact splash: one nonrecursive 2 m heat splash. Zero/one/one secondary applications in ranged/pursuit/mixed development probes; unchanged completion times. Insufficient benefit at ordinary spacing, and it overlaps Shared vapour's group-state role.
- Automatic infusion: .7 moisture added to heat impacts inside a basin. Ranged/mixed fell 7.43 -> 6.65 s and 10.70 -> 8.83 s under the unchanged Basin/Ember policy; no new decisions. Rejected for automating the already effective routine, not because Basin itself needs nerfing.
- Homeward Ember: actual one-turn projectile prototype, after .35 s or final body contact, retaining hit IDs. In six delayed-observation v2 cases it turned 96 times but added **zero enemy hits and one timber hit**. No extra completion benefit worth a reward. Wider tactical return lanes could work elsewhere, but not demonstrated here; removed from live code/pool.

Two corrections before retention: v1's fork policy aimed into its own gap; v2 offsets aim so one branch meets the observed target. This is a policy repair, not a Tide buff. The initial Walking fault allowed overlapping points to multiply hits on one body; it now shares a per-wave hit list, with an independent echo-wave list. A vertical Stone lift alone cannot release its own new binding. Existing spell damage and cadence remain unchanged. These changes and the rejected return are labelled separately in v1/v2 summaries.

No human ergonomics, fun, remote-laptop performance or universal dominance is inferred from these synthetic policies. Final matched/held-out evidence and graphical checks follow below.
