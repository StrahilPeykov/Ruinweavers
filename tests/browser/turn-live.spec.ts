const evidenceRoot = `test-results/evidence-turn-live.spec-${Date.now()}`;
import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
// Opt-in: a small amount of real provider bandwidth; no game rendering.
const target = process.env.RUIN_RELAY_TEST_URL;
test.skip(!target, "Set RUIN_RELAY_TEST_URL for the live TURN probe");
test("TLS 443 relays data between two peers on ONE computer", async ({
  page,
  request,
}) => {
  test.setTimeout(30000);
  const response = await request.post(`${target}/api/turn`, { data: {} });
  expect(response.ok()).toBe(true);
  const config = await response.json();
  const servers = config.iceServers
    .map((s: any) => ({
      ...s,
      urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u: string) =>
        /^turns:.*:443\?transport=tcp$/.test(u),
      ),
    }))
    .filter((s: any) => s.urls.length);
  expect(servers.length).toBeGreaterThan(0);
  const result = await page.evaluate(async (iceServers) => {
    const a = new RTCPeerConnection({
      iceServers,
      iceTransportPolicy: "relay",
    });
    const b = new RTCPeerConnection({
      iceServers,
      iceTransportPolicy: "relay",
    });
    const pendingA: RTCIceCandidate[] = [],
      pendingB: RTCIceCandidate[] = [];
    a.onicecandidate = (e) => {
      if (e.candidate)
        b.remoteDescription
          ? void b.addIceCandidate(e.candidate)
          : pendingB.push(e.candidate);
    };
    b.onicecandidate = (e) => {
      if (e.candidate)
        a.remoteDescription
          ? void a.addIceCandidate(e.candidate)
          : pendingA.push(e.candidate);
    };
    const channel = a.createDataChannel("bounded-relay-probe");
    let received = 0;
    b.ondatachannel = (e) => {
      e.channel.onmessage = (m) => {
        received++;
        e.channel.send(m.data);
      };
    };
    const echoes: number[] = [];
    channel.onmessage = (e) => echoes.push(performance.now() - Number(e.data));
    try {
      await a.setLocalDescription(await a.createOffer());
      await b.setRemoteDescription(a.localDescription!);
      for (const c of pendingB) await b.addIceCandidate(c);
      await b.setLocalDescription(await b.createAnswer());
      await a.setRemoteDescription(b.localDescription!);
      for (const c of pendingA) await a.addIceCandidate(c);
      const deadline = performance.now() + 15000;
      while (channel.readyState !== "open" && performance.now() < deadline)
        await new Promise((r) => setTimeout(r, 100));
      if (channel.readyState !== "open")
        return { connected: false, a: a.connectionState, b: b.connectionState };
      for (let i = 0; i < 10; i++) {
        channel.send(String(performance.now()));
        await new Promise((r) => setTimeout(r, 100));
      }
      await new Promise((r) => setTimeout(r, 500));
      const peers = [];
      for (const pc of [a, b]) {
        const rows = Array.from((await pc.getStats()).values());
        const transport = rows.find(
          (r) => r.type === "transport" && r.selectedCandidatePairId,
        );
        const pair = rows.find(
          (r) => r.id === transport?.selectedCandidatePairId,
        );
        const local = rows.find((r) => r.id === pair?.localCandidateId),
          remote = rows.find((r) => r.id === pair?.remoteCandidateId);
        peers.push({
          state: pair?.state,
          localType: local?.candidateType,
          remoteType: remote?.candidateType,
          relayProtocol: local?.relayProtocol,
          rttMs:
            pair?.currentRoundTripTime == null
              ? null
              : pair.currentRoundTripTime * 1000,
          bytesSent: pair?.bytesSent,
          bytesReceived: pair?.bytesReceived,
        });
      }
      return { connected: true, received, echoes, peers };
    } finally {
      a.close();
      b.close();
    }
  }, servers);
  mkdirSync(`${evidenceRoot}/turn-live`, { recursive: true });
  writeFileSync(
    `${evidenceRoot}/turn-live/tls-443-transport.json`,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        scope:
          "Two RTCPeerConnections on ONE Windows machine; not remote laptop RTT or gameplay validation",
        result,
      },
      null,
      2,
    ),
  );
  expect(result.connected).toBe(true);
  expect(result.received).toBe(10);
  expect(result.echoes?.length).toBe(10);
  for (const peer of result.peers ?? []) {
    expect(peer.localType).toBe("relay");
    expect(peer.remoteType).toBe("relay");
    expect(peer.relayProtocol).toBe("tls");
    expect(peer.bytesSent).toBeGreaterThan(0);
    expect(peer.bytesReceived).toBeGreaterThan(0);
  }
});
