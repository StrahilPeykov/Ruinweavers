import { it, expect, vi } from "vitest";
import { parseIceServers, loadTurnServers } from "../../src/network/turn";
import { handleTurn } from "../../worker";
const servers = [
  {
    urls: [
      "turn:relay.example:3478?transport=udp",
      "turns:relay.example:443?transport=tcp",
    ],
    username: "test-user",
    credential: "test-rtc-credential",
  },
];
const request = (origin = "https://game.example") =>
  new Request("https://game.example/api/turn", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
  });
it("relay endpoint remains disabled without secrets and rejects cross-origin requests", async () => {
  expect(await (await handleTurn(request(), {})).json()).toEqual({
    configured: false,
  });
  expect((await handleTurn(request("https://other.example"), {})).status).toBe(
    403,
  );
  expect(
    (await handleTurn(new Request("https://game.example/api/turn"), {})).status,
  ).toBe(405);
});
it("Cloudflare account token stays upstream and only RTC credentials return uncached", async () => {
  const upstream = vi
    .fn()
    .mockResolvedValue(
      Response.json({ iceServers: servers, apiToken: "must-not-return" }),
    );
  const response = await handleTurn(
    request(),
    { TURN_KEY_ID: "key-123", TURN_KEY_API_TOKEN: "private-account-token" },
    upstream,
  );
  expect(upstream).toHaveBeenCalledWith(
    "https://rtc.live.cloudflare.com/v1/turn/keys/key-123/credentials/generate-ice-servers",
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: "Bearer private-account-token",
      }),
      body: '{"ttl":3600}',
    }),
  );
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({
    configured: true,
    iceServers: servers,
  });
});
it("static free-provider RTC credentials work without Cloudflare TURN activation", async () => {
  const upstream = vi.fn();
  const r = await handleTurn(
    request(),
    { TURN_ICE_SERVERS: JSON.stringify(servers) },
    upstream,
  );
  expect(await r.json()).toEqual({ configured: true, iceServers: servers });
  expect(upstream).not.toHaveBeenCalled();
});
it("bad relay config and provider failures produce sanitized errors, not leaked secrets", async () => {
  expect(() =>
    parseIceServers([
      { urls: "https://not-turn.example", username: "a", credential: "b" },
    ]),
  ).toThrow();
  expect(() => parseIceServers([{ urls: "turn:relay.example:443" }])).toThrow();
  expect(() =>
    parseIceServers([{ urls: "stun:relay.example:3478" }]),
  ).toThrow();
  const r = await handleTurn(
    request(),
    { TURN_KEY_ID: "a", TURN_KEY_API_TOKEN: "private" },
    vi
      .fn()
      .mockResolvedValue(
        new Response("secret provider response", { status: 401 }),
      ),
  );
  expect(r.status).toBe(502);
  expect(await r.text()).not.toContain("secret provider response");
});
it("client distinguishes missing endpoint from configured relay errors and validates credentials", async () => {
  expect(
    await loadTurnServers(
      vi.fn().mockResolvedValue(new Response("Not found", { status: 404 })),
    ),
  ).toEqual([]);
  expect(
    await loadTurnServers(
      vi.fn().mockResolvedValue(Response.json({ configured: false })),
    ),
  ).toEqual([]);
  expect(
    await loadTurnServers(
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ configured: true, iceServers: servers }),
        ),
    ),
  ).toEqual(servers);
  await expect(
    loadTurnServers(
      vi.fn().mockResolvedValue(new Response("Oops", { status: 503 })),
    ),
  ).rejects.toThrow("site owner");
});
