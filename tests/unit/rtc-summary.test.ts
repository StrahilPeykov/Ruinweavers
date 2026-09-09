import { it, expect } from "vitest";
import { summarizeRtc } from "../../src/diagnostics/rtc";
it("reports the selected pair and omits unused relay candidates and private details", () => {
  const result = summarizeRtc([
    { id: "t", type: "transport", selectedCandidatePairId: "p" },
    {
      id: "p",
      type: "candidate-pair",
      localCandidateId: "l",
      remoteCandidateId: "r",
      state: "succeeded",
      currentRoundTripTime: 0.042,
      bytesSent: 123,
      bytesReceived: 456,
    },
    {
      id: "l",
      type: "local-candidate",
      candidateType: "host",
      address: "private-ip",
      usernameFragment: "secret",
    },
    { id: "r", type: "remote-candidate", candidateType: "srflx" },
    {
      id: "unused",
      type: "local-candidate",
      candidateType: "relay",
      url: "turn:private.example",
    },
  ]);
  expect(result).toMatchObject({
    selected: true,
    localType: "host",
    remoteType: "srflx",
    rttMs: 42,
    bytesSent: 123,
  });
  expect(JSON.stringify(result)).not.toMatch(/private|secret|unused/);
});
it("missing stats remain unavailable rather than reporting zero latency", () => {
  expect(summarizeRtc([])).toMatchObject({
    selected: false,
    rttMs: null,
    bytesSent: null,
  });
});
