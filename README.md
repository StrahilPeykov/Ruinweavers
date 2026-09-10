# Ruinweavers — Run Prototype 0.1

A small, complete solo/co-op run through the Broken Court. Five authored encounters, personal magic alterations after the first and third, carried health, and a final ward. No classes, economy or permanent progression.

```sh
npm install
npm run dev
```

Open [the run](http://127.0.0.1:5173/) and press **Begin run / E**. Choose one of three personal alterations at each reward stop, then Continue. Restart run resets health, offers and upgrades. Instruments stay collapsed.

For remote co-op, both open the same [existing deployed build](https://ruinweavers.strahil-peykov.workers.dev/) and refresh together after updates. Leave **Public Nostr** selected. One clicks **Create co-op**, copies the six-character code, and the other enters it and presses **Enter / Join co-op**. Both choose their own rewards and press **Ready**. Hold **E** near a downed partner to revive; encounter clears also restore them. [Connection and TURN limitations](docs/COOP.md).

WASD move; pointer aims independently; LMB/J Primary (hold repeats); RMB/F/K Secondary; 1–4 select; Tab/Q cycle; Space dodge; E continue/revive. Optional wheel cycling stays off by default. Mute, Pause and device-local Standard/Lightweight rendering remain available.

Run uses Model A with balanced camera/tempo. Try Tide Basin (2 + RMB/F), then Ember (1 + LMB); Gale creates space and Stone creates cover. [Six alterations and run rules](docs/RUN.md). The unmodified trial is `?scene=trial`; isolated encounters are `trial/ranged`, `trial/pursuit`, `trial/mixed`; original Lab is `?scene=states`. Model B remains available there through Experiments.

Validation: `npm test`, `npm run test:e2e`, `npm run build`, `npm run evaluate:run`. Historical benchmark/evaluators remain unchanged. First browser setup: `npx playwright install chromium`. [Current evidence and limits](docs/TESTING.md). Synthetic play does not validate human duration, balance, physical trackpad comfort or fun.

Standing workflow: after every checked coherent commit, immediately push to the existing upstream and verify it. The existing Cloudflare pipeline may deploy that push. No force-push, new provider/account, billing changes or unrelated direct deployment. See [AGENTS.md](AGENTS.md) and [deployment setup](docs/DEPLOYMENT.md).

Stop at this prototype. The next intended milestone is visual distinction for one compact slice, not broad content or system expansion.
