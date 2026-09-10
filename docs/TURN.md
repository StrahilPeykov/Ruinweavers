# Remote connection fallback

The two remote laptops found each other through signaling and exchanged SDP, but could not establish a direct WebRTC path. Changing room codes does not repair that network limitation. TURN relays gameplay packets when direct connections fail; hosting static assets on Cloudflare alone does not provide this relay.

## Current authorization — 2026-09-09

The owner subsequently chose Cloudflare TURN and explicitly accepted potential overage liability after clarification that a zero-limit Revolut card blocks payments, not accrued Cloudflare charges. This is a narrow exception to the earlier free-only/no-card constraint, not permission to buy other services. Open Relay is abandoned. The owner personally activated Realtime, verified through its TURN dashboard. Dedicated app `ruinweavers-coop-trial` now supplies `TURN_KEY_ID` and `TURN_KEY_API_TOKEN` as encrypted runtime secrets in the existing Ruinweavers Worker. Both were deployed through the dashboard; no account token was printed, committed or included in client assets. The live endpoint returns configured RTC credentials with no-store, including TLS/443. Do not treat the historical free-only gate below as requiring repeated approval for this accepted choice.

## Activation and initial relay evidence

- Live `/api/turn`: HTTP 200, configured true, provider UDP/TCP URLs and `turns:turn.cloudflare.com:443?transport=tcp` retained. One-hour generated credentials; no in-session renewal.
- Owner's two real laptops connected using `relay=required` and reported gameplay, but **both have choppy visuals while solo is smooth**. This is a functional connection report, not satisfactory remote performance. Their selected ICE rows, remote RTT and frame measurements have not yet been collected. Investigate host/frame pacing and snapshot/rendering costs before attributing this to geographic latency. At that historical test, guest rendering had no interpolation. The local Protocol 2 smoothness pass now adds it, but has not been deployed or remotely validated.
- Follow-up host swap: when the stronger laptop hosts it is smooth, and only this local laptop remains choppy. This supports a local performance/host-pacing investigation; it does not isolate GPU, CPU, snapshot handling or network delay yet. The local player uses a separate Chrome/Edge window. Four obsolete localhost game tabs were still open in Codex and were closed to remove competing work; effect awaits user retest. Prefer the stronger host for now. Local hardware inventory includes i7-10750H, Intel UHD and Quadro T1000 Max-Q; actual game GPU/renderer is not yet identified. No OS or graphics-driver setting was changed.
- Lightweight live TLS/443-only probe: two RTCPeerConnections on ONE Windows computer selected relay/relay with TLS, delivered ten messages and ten echoes. Selected-pair RTT samples were 9 ms and 15 ms; application echo RTT was 7.7–19 ms. These are NOT the two remote laptops' RTT. Sanitized evidence: `artifacts/turn-live/tls-443-transport.json`.
- Cloudflare Last 24 hours analytics subsequently displayed total egress **382.17 KB**, ingress **1.26 MB**. This is account aggregate traffic during setup/probes/user testing with reporting delay, not isolated per-session usage or a measured monthly projection. The earlier display was No data, not a zero-byte baseline.
- An initial full-game live journey timed out because it waited for development-only `__RUINWEAVERS__` on the production build. It never established a co-op session; this was a harness mistake, not a TURN failure. Its second case was cancelled to avoid competing with human gameplay. Replaced with the bounded transport-only probe using the existing Playwright harness; no simulated game or networking rewrite.

Live probe is opt-in: set `RUIN_RELAY_TEST_URL=https://ruinweavers.strahil-peykov.workers.dev`, then `npx playwright test tests/browser/turn-live.spec.ts`. It consumes a small amount of real TURN traffic and otherwise skips. Remove `relay=required` from both laptop URLs and create a fresh room to resume normal direct-or-relay operation after diagnosis.

## Historical free-only verification — 2026-09-09

**Cloudflare does not qualify through this account's available provisioning flow.** Signed-in TURN navigation redirected to enrollment. Its review screen requires payment details and describes an automatically renewing usage-based subscription: 1,000 GB/month included, then $0.05 per additional GB. No hard-stop-at-free-quota control was shown. No payment information was entered, subscription activated, terms accepted or key created. The marketing table's free-plan column and allowance do not establish a hard-capped path available to this account. The [TURN FAQ](https://developers.cloudflare.com/realtime/turn/faq/) confirms overage pricing; SFU rate/session limits are not a TURN billing cap.

**Open Relay account inspected after owner signup; activation blocked by the no-payment-method rule.** The signed-in TURN page offers an ongoing Free 20GB plan at $0/month, explicitly labelled No Overages. It states automatic payments are disabled and TURN stops if monthly usage is exceeded. However, selecting that plan opens payment-information onboarding requiring a credit card for identity/abuse verification. The page says the card will not be charged and there are no automatic charges, but adding a payment method is independently prohibited by the owner. The only no-card alternative shown is the excluded Global 500 MB trial. Neither was activated. The underlying dashboard says Current Plan: FREE but displays `0GB / NaNGB` and no renewal date; this is not evidence of an active, usable 20 GB allocation. Quota exhaustion is documented by the account UI, not experimentally tested.

At this earlier review, no provider had been activated. The owner had already deployed credential-endpoint commit `1f823e2`, confirmed in Cloudflare deployment history; that is not TURN provisioning or successful relay validation. An ongoing no-card 20 GB activation path from Metered would be needed to proceed within the existing constraints. No payment details were entered, trial started, automatic payments enabled or credentials created/configured.

## Archived alternative: Open Relay (abandoned; do not configure)

[Metered Open Relay](https://www.metered.ca/tools/openrelay/) advertises 20 GB/month; the related [signaling page](https://www.metered.ca/tools/openrelay/webrtc-signaling-server/) advertises no-card access. The actual TURN onboarding above requires a card, so do not infer no-card TURN eligibility from that marketing. The following configuration steps remain conditional on an authorized, eligible ongoing plan; they do not authorize entering payment details or starting a trial.

1. Obtain the dedicated TURN **server URLs, username and credential** from the provider. These are RTC credentials, not the account API key. Use the provider's actual values and available UDP/TCP/TLS URLs.
2. In the Ruinweavers Cloudflare Worker settings, add a runtime **Secret** named `TURN_ICE_SERVERS`. Its value is a JSON array in this shape (placeholders below are not working credentials):

```json
[{"urls":["turn:YOUR_PROVIDER_HOST:PORT","turns:YOUR_PROVIDER_HOST:TLS_PORT?transport=tcp"],"username":"YOUR_RTC_USERNAME","credential":"YOUR_RTC_CREDENTIAL"}]
```

3. Deploy the updated repository through the existing workflow, preserving the runtime secret. Do not put credentials in Git, `VITE_` variables, screenshots or chat. Deploying is a separate owner action.
4. Both laptops reload the same deployed build, use Public Nostr, create/join a fresh room and press Ready. The status should say **TURN fallback available**. This means configured, not proof that packets actually used the relay.
5. To test relay specifically, open `?scene=trial&relay=required` on both laptops. A successful connection in that mode requires TURN. Remove `relay=required` for normal play so direct connections remain preferred.

RTC credentials necessarily reach players' browsers and are not private account tokens. Use dedicated restricted/free-quota credentials and rotate them when appropriate. Origin checks are not authentication or a spending cap. This archived alternative has no authorization. Only the Cloudflare exception at the top of this document is current.

## Current Cloudflare integration

Cloudflare Realtime TURN has a 1,000 GB/month free allowance, then $0.05/GB egress; it is **not a guarantee of zero cost**. The owner explicitly accepted this narrowly scoped exception; do not expand it to another provider or purchase. See [official pricing FAQ](https://developers.cloudflare.com/realtime/turn/faq/).

The existing authorized TURN key follows [Cloudflare's credentials guide](https://developers.cloudflare.com/realtime/turn/generate-credentials/) and uses runtime secrets `TURN_KEY_ID` and `TURN_KEY_API_TOKEN`. Leave `TURN_ICE_SERVERS` unset for this option. The Worker exchanges the private token server-side for one-hour RTC credentials. Neither secret is compiled into the game. The static-provider option takes precedence if both are set.

## Local checks and limits

`npm run dev` remains direct-only unless a credential endpoint is provided. `npx wrangler dev --local --port 8787` exercises the real Worker; runtime secrets can be supplied via an ignored `.dev.vars` file. No credentials are included in the repository. `npm run deploy:check` is a dry run, not publication.

The client requests `/api/turn` before public matchmaking and passes the result to Trystero `turnConfig`. Local loopback signaling is unchanged. `getNetworkState()` reports configuration/errors without credentials; `getRtcStats()` includes ICE candidate types for diagnosis. Configured credentials are not proof that a provider is reachable or its quota is available. Each new join loads fresh credentials; long-session credential renewal is not implemented in this short trial.

Validation: credential parsing, server-only token exchange and errors tested with fixtures; missing credentials/error UI tested with actual browser controls; real local Worker routing verified. A small probe of the provider's documented public static-auth relay produced no relay candidates in this environment (701 lookup errors), so it was not shipped as a presumed working fallback. Those were pre-activation checks. Current local authenticated TLS evidence and the owner-reported remote connection are recorded above; they do not establish remote performance.

## Remote validation after provisioning

Two clients on this PC do not count as two remote laptops. Remote success is owner-reported; selected remote ICE path, remote RTT and isolated remote usage still need measurements. Account aggregate usage and the one-machine TLS probe above are separate evidence. Follow the Game Studio playtest workflow: normal actions plus state evidence and visual inspection.

1. Record deployed version, UTC start, both laptop/browser environments and provider usage before testing. Keep credentials, room codes and private IPs out of committed evidence.
2. Confirm configuration retains the provider's `turns:HOST:443?transport=tcp` entry. Plain `turn:` on 443 is not TLS. Existing parsing/Worker exchange preserve TLS URLs, covered by fixtures; reachability is not established by configuration.
3. On both real laptops, load `?scene=trial&relay=required`, create/join and Ready. Keep host foreground. Both move/cast through part of an encounter. Record success/failure and duration.
4. Use **Export observations** on each laptop; this works on production without the development global. Its sanitized network paths resolve the transport's selected candidate pair. Development-only `getRtcStats()` can provide raw diagnosis, but do not commit its addresses. Require a selected, succeeded pair with a `relay` candidate. Merely gathered relay candidates are insufficient. Record types/protocol, omitting addresses and credentials. Sample `currentRoundTripTime * 1000` in ms; absent values are unavailable, not zero. Report sample count/min/median/max.
5. Compare start/end selected-pair bytes and data-channel message/byte counters over a stated interval. Require growth in both directions, snapshots received and guest controls visibly affecting the authoritative world. ICE consent traffic alone is not gameplay. Channel/pair bytes are not provider quota accounting.
6. Record provider usage after its reporting delay, accounting unit and difference. Missing/delayed usage is not zero. Successful UDP relay does not prove TLS/443 fallback; a separate bounded TLS-only test would be needed to claim that path was exercised.
7. Leave, remove `relay=required` on both laptops, reload and join a fresh room. Forced relay is a per-page query setting; normal operation prefers direct connections with relay fallback.

### Credential lifetime and remaining limitations

Cloudflare currently issues one-hour credentials (`ttl:3600`). There is no in-session renewal or ICE restart with fresh credentials; fetching happens at join. Allocation survival at expiry is provider/browser dependent and untested. The unused static-provider adapter does not renew expired static credentials; Open Relay remains abandoned.

Account tokens remain server-side. Trystero and `/api/turn` are unchanged. Authoritative guest outcomes include network/snapshot delay. The local Protocol 2 build adds remote interpolation and bounded local walking prediction; it is not proof of smooth remote gameplay and requires matching client builds. Host background throttling or six seconds without a heartbeat stops the attempt; no host migration/reconnect recovery. Network changes, quota exhaustion and long-duration relay sessions remain untested. No local test proves the remote relay works.
