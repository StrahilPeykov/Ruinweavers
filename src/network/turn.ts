/** Only RTC credentials cross this boundary; never an account API token. */
export function parseIceServers(value: unknown): RTCIceServer[] {
  if (!Array.isArray(value) || !value.length || value.length > 8)
    throw Error("Invalid relay configuration");
  const servers = value.map((item: any) => {
    const urls = typeof item?.urls === "string" ? [item.urls] : item?.urls;
    if (
      !Array.isArray(urls) ||
      !urls.length ||
      urls.length > 8 ||
      urls.some(
        (u: unknown) =>
          typeof u !== "string" ||
          u.length > 512 ||
          !/^(?:stun|turn|turns):[^\s/@]+(?::[0-9]+)?(?:\?transport=(?:udp|tcp))?$/.test(
            u,
          ),
      )
    )
      throw Error("Invalid relay URLs");
    const turn = urls.some((u: string) => /^turns?:/.test(u));
    if (
      turn &&
      (typeof item.username !== "string" ||
        !item.username ||
        item.username.length > 512 ||
        typeof item.credential !== "string" ||
        !item.credential ||
        item.credential.length > 2048)
    )
      throw Error("Missing relay credentials");
    return {
      urls,
      ...(turn ? { username: item.username, credential: item.credential } : {}),
    };
  });
  if (!servers.some((s) => s.urls.some((u: string) => /^turns?:/.test(u))))
    throw Error("No TURN relay configured");
  return servers;
}

export async function loadTurnServers(
  request: typeof fetch = fetch,
): Promise<RTCIceServer[]> {
  const response = await request("/api/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  // A plain Vite/static preview has no credential endpoint. Direct-only still works there.
  if (
    response.status === 404 ||
    (response.ok &&
      !response.headers.get("Content-Type")?.includes("application/json"))
  )
    return [];
  if (!response.ok)
    throw Error(
      "TURN relay configuration could not be loaded. The site owner needs to check its relay credentials.",
    );
  const data = await response.json();
  if (data.configured === false) return [];
  return parseIceServers(data.iceServers);
}
