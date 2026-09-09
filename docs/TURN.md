# Remote connection fallback

The two remote laptops found each other through signaling and exchanged SDP, but could not establish a direct WebRTC path. Changing room codes does not repair that network limitation. TURN relays gameplay packets when direct connections fail; hosting static assets on Cloudflare alone does not provide this relay.

## Free-only verification — 2026-09-09

**Cloudflare does not qualify through this account's available provisioning flow.** Signed-in TURN navigation redirected to enrollment. Its review screen requires payment details and describes an automatically renewing usage-based subscription: 1,000 GB/month included, then $0.05 per additional GB. No hard-stop-at-free-quota control was shown. No payment information was entered, subscription activated, terms accepted or key created. The marketing table's free-plan column and allowance do not establish a hard-capped path available to this account. The [TURN FAQ](https://developers.cloudflare.com/realtime/turn/faq/) confirms overage pricing; SFU rate/session limits are not a TURN billing cap.

**Open Relay remains unconfirmed.** The ongoing [Open Relay page](https://www.metered.ca/tools/openrelay/) advertises 20 GB each month. Its linked signup at `https://dashboard.metered.ca/signup?tool=turnserver` is visibly labelled OpenRelay TURN Server. The owner has no account yet, so the actual plan and exhaustion behavior could not be inspected. The separate [commercial pricing](https://www.metered.ca/pricing) advertises a 500 MB trial, which is excluded. Realtime Messaging's documented hard caps apply to signaling connections/messages, not proof of TURN bandwidth enforcement. Do not provision credentials until an actual ongoing plan and no billed overages/automatic upgrades at exhaustion are confirmed.

No provider was activated. The owner has already deployed credential-endpoint commit `1f823e2`, confirmed in Cloudflare deployment history; that is not TURN provisioning or successful relay validation. Account access or provider clarification is the remaining gate.

## Conditional Open Relay setup

[Metered Open Relay](https://www.metered.ca/tools/openrelay/) advertises a free 20 GB/month plan; its [free-tier page](https://www.metered.ca/tools/openrelay/webrtc-signaling-server/) says no credit card is required. Use the free account only, without enabling a paid plan. Account creation and credentials must be done by the owner. We have not provisioned this service or verified its account-specific quota behavior.

1. Obtain the dedicated TURN **server URLs, username and credential** from the provider. These are RTC credentials, not the account API key. Use the provider's actual values and available UDP/TCP/TLS URLs.
2. In the Ruinweavers Cloudflare Worker settings, add a runtime **Secret** named `TURN_ICE_SERVERS`. Its value is a JSON array in this shape (placeholders below are not working credentials):

```json
[{"urls":["turn:YOUR_PROVIDER_HOST:PORT","turns:YOUR_PROVIDER_HOST:TLS_PORT?transport=tcp"],"username":"YOUR_RTC_USERNAME","credential":"YOUR_RTC_CREDENTIAL"}]
```

3. Deploy the updated repository through the existing workflow, preserving the runtime secret. Do not put credentials in Git, `VITE_` variables, screenshots or chat. Deploying is a separate owner action.
4. Both laptops reload the same deployed build, use Public Nostr, create/join a fresh room and press Ready. The status should say **TURN fallback available**. This means configured, not proof that packets actually used the relay.
5. To test relay specifically, open `?scene=trial&relay=required` on both laptops. A successful connection in that mode requires TURN. Remove `relay=required` for normal play so direct connections remain preferred.

RTC credentials necessarily reach players' browsers and are not private account tokens. Use dedicated restricted/free-quota credentials and rotate them when appropriate. Origin checks are not authentication or a spending cap. No paid plan is authorized by this project.

## Cloudflare integration retained, inactive

Cloudflare Realtime TURN has a 1,000 GB/month free allowance, then $0.05/GB egress; it is **not a guarantee of zero cost**. Do not enable a billable service under the project's free-only requirement without the owner's explicit decision. See [official pricing FAQ](https://developers.cloudflare.com/realtime/turn/faq/).

If using an already authorized TURN account, create a TURN key following [Cloudflare's credentials guide](https://developers.cloudflare.com/realtime/turn/generate-credentials/) and store runtime secrets `TURN_KEY_ID` and `TURN_KEY_API_TOKEN`. Leave `TURN_ICE_SERVERS` unset for this option. The Worker exchanges the private token server-side for one-hour RTC credentials. Neither secret is compiled into the game. The static-provider option takes precedence if both are set.

## Local checks and limits

`npm run dev` remains direct-only unless a credential endpoint is provided. `npx wrangler dev --local --port 8787` exercises the real Worker; runtime secrets can be supplied via an ignored `.dev.vars` file. No credentials are included in the repository. `npm run deploy:check` is a dry run, not publication.

The client requests `/api/turn` before public matchmaking and passes the result to Trystero `turnConfig`. Local loopback signaling is unchanged. `getNetworkState()` reports configuration/errors without credentials; `getRtcStats()` includes ICE candidate types for diagnosis. Configured credentials are not proof that a provider is reachable or its quota is available. Each new join loads fresh credentials; long-session credential renewal is not implemented in this short trial.

Validation: credential parsing, server-only token exchange and errors tested with fixtures; missing credentials/error UI tested with actual browser controls; real local Worker routing verified. A small probe of the provider's documented public static-auth relay produced no relay candidates in this environment (701 lookup errors), so it was not shipped as a presumed working fallback. No authenticated relay connection or successful cross-country retest has occurred yet.

## Remote validation after provisioning

Two clients on this PC do not count as two remote laptops. No remote success, RTT or provider usage measurement exists for this setup yet. Follow the Game Studio playtest workflow: normal actions plus state evidence and visual inspection.

1. Record deployed version, UTC start, both laptop/browser environments and provider usage before testing. Keep credentials, room codes and private IPs out of committed evidence.
2. Confirm configuration retains the provider's `turns:HOST:443?transport=tcp` entry. Plain `turn:` on 443 is not TLS. Existing parsing/Worker exchange preserve TLS URLs, covered by fixtures; reachability is not established by configuration.
3. On both real laptops, load `?scene=trial&relay=required`, create/join and Ready. Keep host foreground. Both move/cast through part of an encounter. Record success/failure and duration.
4. Use `await window.__RUINWEAVERS__.getRtcStats()` on each laptop. Resolve the transport's `selectedCandidatePairId` to the candidate-pair row, then its local/remote candidate IDs. Require a selected, succeeded pair with a `relay` candidate. Merely gathered relay candidates are insufficient. Record types/protocol, omitting addresses and credentials. Sample `currentRoundTripTime * 1000` in ms; absent values are unavailable, not zero. Report sample count/min/median/max.
5. Compare start/end selected-pair bytes and data-channel message/byte counters over a stated interval. Require growth in both directions, snapshots received and guest controls visibly affecting the authoritative world. ICE consent traffic alone is not gameplay. Channel/pair bytes are not provider quota accounting.
6. Record provider usage after its reporting delay, accounting unit and difference. Missing/delayed usage is not zero. Successful UDP relay does not prove TLS/443 fallback; a separate bounded TLS-only test would be needed to claim that path was exercised.
7. Leave, remove `relay=required` on both laptops, reload and join a fresh room. Forced relay is a per-page query setting; normal operation prefers direct connections with relay fallback.

### Credential lifetime and remaining limitations

Cloudflare currently issues one-hour credentials (`ttl:3600`). There is no in-session renewal or ICE restart with fresh credentials; fetching happens at join. Allocation survival at expiry is provider/browser dependent and untested. Static Open Relay credentials use the provider's lifetime/rotation policy, still unknown for the actual account. Fetching an expired static secret again does not renew it.

Account tokens remain server-side. Trystero and `/api/turn` are unchanged. Guest response includes network/snapshot delay without prediction/interpolation. Host background throttling or six seconds without a heartbeat stops the attempt; no host migration/reconnect recovery. Network changes, quota exhaustion and long-duration relay sessions remain untested. No local test proves the remote relay works.
