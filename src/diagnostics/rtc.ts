/** Safe export: selected path only, never addresses, URLs or credentials. */
export function summarizeRtc(rows: any[]) {
  const transport = rows.find(
    (r) => r.type === "transport" && r.selectedCandidatePairId,
  );
  const pair = rows.find((r) => r.id === transport?.selectedCandidatePairId);
  const local = rows.find((r) => r.id === pair?.localCandidateId);
  const remote = rows.find((r) => r.id === pair?.remoteCandidateId);
  return {
    selected: !!pair,
    state: pair?.state ?? null,
    localType: local?.candidateType ?? null,
    remoteType: remote?.candidateType ?? null,
    relayProtocol: local?.relayProtocol ?? null,
    rttMs:
      typeof pair?.currentRoundTripTime === "number"
        ? pair.currentRoundTripTime * 1000
        : null,
    bytesSent: pair?.bytesSent ?? null,
    bytesReceived: pair?.bytesReceived ?? null,
    channels: rows
      .filter((r) => r.type === "data-channel")
      .map((r) => ({
        state: r.state,
        messagesSent: r.messagesSent,
        messagesReceived: r.messagesReceived,
        bytesSent: r.bytesSent,
        bytesReceived: r.bytesReceived,
      })),
  };
}
