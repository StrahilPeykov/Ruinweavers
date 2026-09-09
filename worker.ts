import { parseIceServers } from "./src/network/turn";
export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  // Runtime secrets, not VITE_ build variables. Neither option is enabled by default.
  TURN_ICE_SERVERS?: string;
  TURN_KEY_ID?: string;
  TURN_KEY_API_TOKEN?: string;
}
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export async function handleTurn(
  request: Request,
  env: Partial<Env>,
  upstream: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Use POST" }, 405);
  const origin = request.headers.get("Origin");
  if (
    (origin && origin !== new URL(request.url).origin) ||
    request.headers.get("Sec-Fetch-Site") === "cross-site"
  )
    return json({ error: "Origin rejected" }, 403);
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    return json({ error: "Use JSON" }, 415);
  try {
    if (env.TURN_ICE_SERVERS)
      return json({
        configured: true,
        iceServers: parseIceServers(JSON.parse(env.TURN_ICE_SERVERS)),
      });
    if (!env.TURN_KEY_ID && !env.TURN_KEY_API_TOKEN)
      return json({ configured: false });
    if (
      !env.TURN_KEY_ID ||
      !env.TURN_KEY_API_TOKEN ||
      !/^[a-zA-Z0-9_-]+$/.test(env.TURN_KEY_ID)
    )
      return json({ error: "Relay secrets incomplete" }, 503);
    const response = await upstream(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: 3600 }),
        signal: AbortSignal.timeout(4000),
      },
    );
    if (!response.ok)
      return json({ error: "Relay provider rejected credential request" }, 502);
    const data = (await response.json()) as { iceServers: unknown };
    return json({
      configured: true,
      iceServers: parseIceServers(data.iceServers),
    });
  } catch {
    return json({ error: "Relay configuration unavailable" }, 503);
  }
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname === "/api/turn")
      return handleTurn(request, env);
    return env.ASSETS.fetch(request);
  },
};
