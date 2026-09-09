# Remote connection fallback

The two remote laptops found each other through signaling and exchanged SDP, but could not establish a direct WebRTC path. Changing room codes does not repair that network limitation. TURN relays gameplay packets when direct connections fail; hosting static assets on Cloudflare alone does not provide this relay.

## Free-provider setup

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

## Alternative: existing Cloudflare TURN account

Cloudflare Realtime TURN has a 1,000 GB/month free allowance, then $0.05/GB egress; it is **not a guarantee of zero cost**. Do not enable a billable service under the project's free-only requirement without the owner's explicit decision. See [official pricing FAQ](https://developers.cloudflare.com/realtime/turn/faq/).

If using an already authorized TURN account, create a TURN key following [Cloudflare's credentials guide](https://developers.cloudflare.com/realtime/turn/generate-credentials/) and store runtime secrets `TURN_KEY_ID` and `TURN_KEY_API_TOKEN`. Leave `TURN_ICE_SERVERS` unset for this option. The Worker exchanges the private token server-side for one-hour RTC credentials. Neither secret is compiled into the game. The static-provider option takes precedence if both are set.

## Local checks and limits

`npm run dev` remains direct-only unless a credential endpoint is provided. `npx wrangler dev --local --port 8787` exercises the real Worker; runtime secrets can be supplied via an ignored `.dev.vars` file. No credentials are included in the repository. `npm run deploy:check` is a dry run, not publication.

The client requests `/api/turn` before public matchmaking and passes the result to Trystero `turnConfig`. Local loopback signaling is unchanged. `getNetworkState()` reports configuration/errors without credentials; `getRtcStats()` includes ICE candidate types for diagnosis. Configured credentials are not proof that a provider is reachable or its quota is available. Each new join loads fresh credentials; long-session credential renewal is not implemented in this short trial.

Validation: credential parsing, server-only token exchange and errors tested with fixtures; missing credentials/error UI tested with actual browser controls; real local Worker routing verified. A small probe of the provider's documented public static-auth relay produced no relay candidates in this environment (701 lookup errors), so it was not shipped as a presumed working fallback. No authenticated relay connection or successful cross-country retest has occurred yet.
