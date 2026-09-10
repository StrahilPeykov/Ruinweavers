import { loadTurnServers } from "./turn";
import { summarizeRtc } from "../diagnostics/rtc";
import type { Room, MessageAction, JoinRoom } from "@trystero-p2p/core";
import { Simulation } from "../simulation/simulation";
import { PRINCIPLES, type Config, type Principle } from "../experiments/config";
import { idleInput, type FrameInput, type State } from "../simulation/types";
import { InputMailbox, type InputPacket } from "./input-mailbox";
import { PROTOCOL, BUILD_ID } from "./protocol";
import { encodeSnapshot, WireReader } from "./wire";
import { PresentationTimeline } from "./presentation";
import { LocalPrediction } from "./prediction";
import { record, distribution } from "../diagnostics/timing";

export class CoopSession {
  wire = new WireReader();
  timeline = new PresentationTimeline();
  prediction = new LocalPrediction();
  predictionEnabled = true;
  interpolationEnabled = true;
  sample = 0;
  ackSample = 0;
  sampleTimes = new Map<number, number>();
  inputAckMs: number[] = [];
  hostTickMs: number[] = [];
  hostStepMs: number[] = [];
  serializationMs: number[] = [];
  wireBytes: number[] = [];
  remoteMetaAck = -1;
  remoteEventAck = 0;
  scheduled = 0;
  peakScheduled = 0;
  snapshotsScheduled = 0;
  droppedSnapshots = 0;
  inputGeneration = 0;
  role: "solo" | "host" | "guest" = "solo";
  status = "solo";
  message = "Solo trial";
  code = "";
  strategy = "public";
  turnStatus = "not-configured";
  forceRelay = false;
  lastConnectionError = "";
  snapshotIntervals: number[] = [];
  snapshotApplyMs: number[] = [];
  snapshotBytes = 0;
  private snapshotEncoder = new TextEncoder();
  previousSnapshotAt = 0;
  actorId = "mage-1";
  peerId = "";
  room?: Room;
  inputAction?: MessageAction<any>;
  snapshotAction?: MessageAction<any>;
  controlAction?: MessageAction<any>;
  local = new InputMailbox();
  remote = new InputMailbox();
  selected: Principle = "Ember";
  seq = 0;
  generation = 0;
  lastSend = 0;
  lastSnapshot = 0;
  lastReceive = 0;
  accumulator = 0;
  lastTick = performance.now();
  epoch = 0;
  snapshotSeq = 0;
  acceptedSnapshot = -1;
  sending = false;
  silenceUntil = 0;
  castIntent?: FrameInput;
  primaryIntent?: FrameInput;
  primaryIntentAt = -Infinity;
  primaryIntentId = 0;
  pending = idleInput();
  snapshotsReceived = 0;
  snapshotsSent = 0;
  bytesSent = 0;
  staleClears = 0;
  paused = false;
  profile = { delayMs: 0, jitterMs: 0, seed: 123 };
  scheduleCount = 0;
  constructor(
    public sim: Simulation,
    public changed: () => void,
    public clearLocal: () => void,
  ) {}
  get active() {
    return this.role !== "solo";
  }
  get connected() {
    return this.status === "connected";
  }
  async leave(reset = true) {
    this.generation++;
    const room = this.room;
    this.room = undefined;
    this.role = "solo";
    this.status = "solo";
    this.message = "Solo trial";
    this.actorId = "mage-1";
    this.peerId = "";
    this.local = new InputMailbox();
    this.remote = new InputMailbox();
    this.pending = idleInput();
    this.primaryIntent = this.castIntent = undefined;
    this.wire.reset();
    this.timeline.reset();
    this.prediction.reset();
    this.paused = false;
    if (reset) {
      delete this.sim.state.actors["mage-2"];
      this.sim.state.party = undefined;
      this.sim.reset();
    }
    this.changed();
    await room?.leave();
  }
  async connect(role: "host" | "guest", code: string, strategy = "public") {
    await this.leave();
    this.role = role;
    this.actorId = role === "host" ? "mage-1" : "mage-2";
    this.strategy = strategy;
    this.turnStatus = strategy === "local" ? "local" : "loading";
    this.lastConnectionError = "";
    this.snapshotIntervals = [];
    this.snapshotApplyMs = [];
    this.snapshotBytes = 0;
    this.snapshotsSent = 0;
    this.snapshotsReceived = 0;
    this.bytesSent = 0;
    this.previousSnapshotAt = 0;
    this.remoteMetaAck = -1;
    this.remoteEventAck = 0;
    this.sample = 0;
    this.ackSample = 0;
    this.sampleTimes.clear();
    this.hostTickMs = [];
    this.hostStepMs = [];
    this.serializationMs = [];
    this.inputAckMs = [];
    this.wireBytes = [];
    this.code = code.replace(/\s/g, "").toUpperCase();
    if (!/^(?:[A-Z2-9]{6}|RW-[A-Z0-9]{12})$/.test(this.code)) {
      this.fail("Enter the six-character room code.");
      return;
    }
    this.status = role === "host" ? "hosting" : "connecting";
    this.message =
      role === "host"
        ? "Share the room code. Waiting for one partner…"
        : "Finding the host…";
    this.selected = "Ember";
    this.seq = 0;
    this.snapshotSeq = 0;
    this.acceptedSnapshot = -1;
    this.sending = false;
    this.epoch = 0;
    this.lastReceive = performance.now();
    this.changed();
    const generation = this.generation;
    let admittedPeer = "";
    try {
      const iceServers = strategy === "local" ? [] : await loadTurnServers();
      if (generation !== this.generation) return;
      this.turnStatus =
        strategy === "local"
          ? "local"
          : iceServers.length
            ? "configured"
            : "not-configured";
      if (this.forceRelay && !iceServers.length)
        throw Error(
          "Relay-only test needs configured TURN credentials on this deployment.",
        );
      this.changed();
      const module =
        strategy === "local"
          ? await import("@trystero-p2p/ws-relay")
          : await import("trystero");
      if (generation !== this.generation) return;
      this.room = (module.joinRoom as JoinRoom)(
        {
          appId: "ruinweavers-coop-trial-01-v1",
          password: this.code,
          ...(strategy === "local"
            ? {
                relayConfig: { urls: ["ws://127.0.0.1:4174"] },
                rtcConfig: { iceServers: [] },
              }
            : {
                turnConfig: iceServers,
                ...(this.forceRelay
                  ? { rtcConfig: { iceTransportPolicy: "relay" as const } }
                  : {}),
              }),
        },
        this.code,
        {
          handshakeTimeoutMs: 8000,
          onPeerHandshake: async (_peer, send, receive) => {
            await send({ version: PROTOCOL, build: BUILD_ID, role });
            const hello = (await receive()).data as any;
            if (
              generation !== this.generation ||
              (this.peerId && this.peerId !== _peer) ||
              (admittedPeer && admittedPeer !== _peer) ||
              hello?.version !== PROTOCOL ||
              hello?.build !== BUILD_ID ||
              hello.role === role ||
              !["host", "guest"].includes(hello.role) ||
              (role === "host" && this.sim.state.trial?.status !== "ready")
            )
              throw Error("Room full, incompatible, or trial already started");
            admittedPeer = _peer;
          },
          onJoinError: ({ error }) => {
            if (!this.peerId && generation === this.generation) {
              this.lastConnectionError = error;
              this.fail(
                /after exchanging SDP|could not connect to peer/i.test(error)
                  ? this.turnStatus === "configured"
                    ? "Connection failed, including TURN fallback. Check relay credentials and network access, then create a fresh room."
                    : "The browsers could not connect directly. This deployment needs TURN relay credentials for these networks; another room code will not fix that."
                  : `Connection failed: ${error}`,
              );
            }
          },
        },
      );
      this.inputAction = this.room.makeAction("input");
      this.snapshotAction = this.room.makeAction("state");
      this.controlAction = this.room.makeAction("control");
      this.inputAction.onMessage = (data, { peerId }) => {
        if (this.role !== "host" || peerId !== this.peerId) return;
        if (
          this.remote.receive(
            data,
            this.sim.state.party?.epoch ?? 0,
            performance.now(),
          )
        ) {
          this.lastReceive = performance.now();
          if (Number.isSafeInteger(data.metaAck))
            this.remoteMetaAck = data.metaAck;
          if (Number.isSafeInteger(data.eventAck))
            this.remoteEventAck = Math.max(this.remoteEventAck, data.eventAck);
          if (data.clear)
            this.sim.state.actors["mage-2"].bufferedCast = undefined;
        }
      };
      this.snapshotAction.onMessage = (data, { peerId }) => {
        if (
          this.role !== "guest" ||
          peerId !== this.peerId ||
          data?.version !== PROTOCOL ||
          !Number.isSafeInteger(data.seq) ||
          data.seq <= this.acceptedSnapshot
        )
          return;
        const receivedAt = performance.now();
        let snapshot: State | null;
        try {
          snapshot = this.wire.read(data, this.sim.state);
        } catch {
          return;
        }
        if (!snapshot) return;
        if (this.previousSnapshotAt)
          record(this.snapshotIntervals, receivedAt - this.previousSnapshotAt);
        this.previousSnapshotAt = receivedAt;
        this.acceptedSnapshot = data.seq;
        this.lastReceive = receivedAt;
        const previous = this.sim.state;
        const localBefore = previous.entities.find(
          (e) => e.id === this.actorId,
        );
        const localAfter = snapshot.entities.find((e) => e.id === this.actorId);
        const discontinuity =
          this.epoch !== data.epoch ||
          this.paused !== data.paused ||
          !localBefore ||
          !localAfter ||
          localBefore.hp > 0 !== localAfter.hp > 0 ||
          Math.hypot(
            localBefore.pos.x - localAfter.pos.x,
            localBefore.pos.y - localAfter.pos.y,
            localBefore.pos.z - localAfter.pos.z,
          ) > 3;
        this.sim.acceptSnapshot(snapshot);
        this.epoch = data.epoch;
        const { camera, cameraDistance, cameraPitch } = this.sim.config;
        Object.assign(this.sim.config, this.wire.staticData!.config, {
          camera,
          cameraDistance,
          cameraPitch,
        });
        this.paused = data.paused === true;
        this.status = "connected";
        this.message = "Connected · guest · WebRTC";
        this.snapshotsReceived++;
        if (discontinuity) {
          this.selected = snapshot.actors[this.actorId].activePrinciple;
          this.clearLocal();
          this.prediction.reset();
        }
        if (
          previous.fields.map((f) => f.id).join("|") !==
          snapshot.fields.map((f) => f.id).join("|")
        )
          this.prediction.reset();
        this.timeline.push(snapshot, data.seq, receivedAt, this.paused);
        if (
          Number.isSafeInteger(data.ackPrimary) &&
          data.ackPrimary >= this.primaryIntentId
        )
          this.primaryIntent = undefined;
        if (
          Number.isSafeInteger(data.ackSample) &&
          data.ackSample > this.ackSample
        ) {
          const at = this.sampleTimes.get(data.ackSample);
          if (at !== undefined) record(this.inputAckMs, receivedAt - at);
          this.ackSample = data.ackSample;
          for (const id of this.sampleTimes.keys())
            if (id <= this.ackSample) this.sampleTimes.delete(id);
        }
        this.prediction.reconcile(
          this.ackSample,
          snapshot,
          this.actorId,
          this.sim.config,
          this.sim.physics,
          receivedAt,
        );
        this.changed();
        record(this.snapshotApplyMs, performance.now() - receivedAt);
      };
      this.controlAction.onMessage = (data, { peerId }) => {
        if (peerId !== this.peerId) return;
        if (data?.type === "leave")
          this.fail(
            "Partner disconnected. Attempt stopped. Return to solo or create a new room.",
          );
        if (
          this.role === "host" &&
          data?.epoch === this.sim.state.party?.epoch
        ) {
          if (data.type === "choose")
            this.sim.chooseUpgrade(
              "mage-2",
              data.runId,
              data.rewardId,
              data.upgrade,
            );
          if (data.type === "ready") this.sim.ready("mage-2");
          if (data.type === "restart") this.restartRequest("mage-2");
          if (data.type === "pause") this.togglePause();
        }
      };
      this.room.onPeerJoin = (peerId) => {
        if (this.peerId) return;
        this.peerId = peerId;
        this.lastReceive = performance.now();
        if (role === "host") {
          this.sim.addPartner();
          this.epoch = this.sim.state.party!.epoch;
          this.remoteEventAck = 0;
          this.remoteMetaAck = -1;
          this.status = "connected";
          this.message = "Connected · host · WebRTC";
        }
        this.changed();
      };
      this.room.onPeerLeave = (peerId) => {
        if (peerId === this.peerId)
          this.fail(
            "Partner disconnected. Attempt stopped. Return to solo or create a new room.",
          );
      };
      setTimeout(() => {
        if (
          this.generation === generation &&
          role === "guest" &&
          !this.connected
        )
          this.fail(
            "No partner connection after 25 seconds. Check the room code and signaling choice, then retry.",
          );
      }, 25000);
    } catch (error) {
      if (generation !== this.generation) return;
      this.turnStatus = "unavailable";
      this.fail(String(error));
    }
  }
  fail(message: string) {
    const room = this.room;
    this.room = undefined;
    this.generation++;
    this.status = "failed";
    this.message = message;
    this.local.clear();
    this.remote.clear();
    this.pending = idleInput();
    this.sim.state.events = [];
    this.primaryIntent = this.castIntent = undefined;
    this.inputGeneration++;
    this.wire.reset();
    this.timeline.reset();
    this.prediction.reset();
    this.sim.state.pending = [];
    for (const a of Object.values(this.sim.state.actors))
      a.bufferedCast = undefined;
    this.clearLocal();
    this.changed();
    void room?.leave();
  }
  schedule(action: () => Promise<void>, inputToken?: number) {
    const generation = this.generation,
      epoch = this.epoch,
      n = ++this.scheduleCount;
    if (this.scheduled >= 24) {
      this.fail(
        "Network send backlog exceeded the bounded queue. Create a fresh room.",
      );
      return Promise.resolve();
    }
    this.scheduled++;
    this.peakScheduled = Math.max(this.peakScheduled, this.scheduled);
    const delay = Math.max(
      0,
      this.profile.delayMs +
        this.profile.jitterMs * Math.sin(n * 12.9898 + this.profile.seed),
    );
    return new Promise<void>((resolve) => {
      const send = () => {
        if (
          generation !== this.generation ||
          epoch !== this.epoch ||
          (inputToken !== undefined && inputToken !== this.inputGeneration)
        ) {
          this.scheduled--;
          resolve();
          return;
        }
        action()
          .catch(() => {})
          .finally(() => {
            this.scheduled--;
            resolve();
          });
      };
      if (delay) setTimeout(send, delay);
      else send();
    });
  }
  release() {
    this.inputGeneration++;
    this.prediction.reset();
    this.local.clear();
    this.pending = idleInput();
    this.castIntent = undefined;
    this.primaryIntent = undefined;
    const a = this.sim.state.actors[this.actorId];
    if (a) a.bufferedCast = undefined;
    if (this.role === "guest" && this.connected) this.sendInput(true);
  }
  sendInput(clear = false) {
    if (!this.inputAction || !this.peerId) return;
    const packet: InputPacket = {
      version: PROTOCOL,
      seq: ++this.seq,
      epoch: this.epoch,
      input: {
        ...this.pending,
        select: this.selected,
        ...(this.castIntent
          ? {
              secondary: true,
              aim: this.castIntent.aim,
              select: this.castIntent.select,
              secondaryDevice: this.castIntent.secondaryDevice,
            }
          : {}),
      },
      sample: this.sample,
      metaAck: this.wire.epoch,
      eventAck: this.wire.eventAck,
      clear,
      primaryPress: clear ? undefined : this.primaryIntent,
      primaryPressId:
        clear || !this.primaryIntent ? undefined : this.primaryIntentId,
    };
    this.castIntent = undefined;
    this.pending = {
      ...this.pending,
      secondary: false,
      dodge: false,
      interact: false,
      cycle: 0,
    };
    void this.schedule(
      () => this.inputAction!.send(packet as any, { target: this.peerId }),
      this.inputGeneration,
    );
  }
  submit(input: FrameInput, now: number) {
    this.sample++;
    const entity = this.sim.state.entities.find((e) => e.id === this.actorId);
    if (entity && entity.hp <= 0) {
      this.primaryIntent = this.castIntent = undefined;
      input = idleInput(input.aim);
    }
    if (this.role === "guest") {
      this.sampleTimes.set(this.sample, now);
      while (this.sampleTimes.size > 128)
        this.sampleTimes.delete(this.sampleTimes.keys().next().value!);
      if (this.predictionEnabled && !this.paused && this.sim.replica)
        this.prediction.capture(
          this.sample,
          input,
          now,
          this.sim.state,
          this.actorId,
          this.sim.config,
          this.sim.physics,
        );
    }
    if (input.select) this.selected = input.select;
    if (input.cycle)
      this.selected =
        PRINCIPLES[(PRINCIPLES.indexOf(this.selected) + input.cycle + 4) % 4];
    if (this.role === "host")
      this.local.receive(
        {
          version: PROTOCOL,
          seq: ++this.seq,
          epoch: this.epoch,
          sample: this.sample,
          input: { ...input, select: this.selected, cycle: 0 },
        },
        this.epoch,
        now,
      );
    else {
      if (input.primary && !this.pending.primary) {
        this.primaryIntent = { ...input, select: this.selected };
        this.primaryIntentAt = now;
        this.primaryIntentId = this.sample;
      }
      if (now - this.primaryIntentAt > 250) this.primaryIntent = undefined;
      if (input.secondary)
        this.castIntent = { ...input, select: this.selected };
      this.pending = {
        ...input,
        secondary: input.secondary || this.pending.secondary,
        dodge: input.dodge || this.pending.dodge,
        interact: input.interact || this.pending.interact,
        cycle: 0,
      };
      if (now - this.lastSend >= 30 && now >= this.silenceUntil) {
        this.sendInput();
        this.lastSend = now;
      }
    }
  }
  tick(input: FrameInput, now = performance.now()) {
    if (this.role === "host" && this.connected)
      record(this.hostTickMs, now - this.lastTick);
    const elapsed = Math.min(0.1, (now - this.lastTick) / 1000);
    this.lastTick = now;
    if (!this.connected) return;
    this.submit(input, now);
    if (now - this.lastReceive > 6000) {
      this.fail(
        "Connection heartbeat lost. Attempt stopped; return to solo or create a new room.",
      );
      return;
    }
    if (this.role === "host") {
      if (this.epoch !== this.sim.state.party!.epoch) {
        this.epoch = this.sim.state.party!.epoch;
        this.remoteEventAck = 0;
        this.remoteMetaAck = -1;
        this.local.clear();
        this.remote.clear();
        this.pending = idleInput();
        this.clearLocal();
      }
      if (!this.paused) {
        this.accumulator += elapsed;
        while (this.accumulator >= 1 / 60) {
          const remote = this.remote.consume(now);
          if (this.remote.stale) {
            const a = this.sim.state.actors["mage-2"];
            if (a.bufferedCast) {
              a.bufferedCast = undefined;
              this.staleClears++;
            }
          }
          const stepStart = performance.now();
          this.sim.stepParty({
            "mage-1": this.local.consume(now),
            "mage-2": remote,
          });
          record(this.hostStepMs, performance.now() - stepStart);
          if (this.sim.players[0].hp <= 0) this.local.clear();
          if (this.sim.players[1]?.hp <= 0) this.remote.clear();
          this.accumulator -= 1 / 60;
          if (this.epoch !== this.sim.state.party!.epoch) {
            this.epoch = this.sim.state.party!.epoch;
            this.remoteEventAck = 0;
            this.remoteMetaAck = -1;
            this.local.clear();
            this.remote.clear();
            this.selected = this.sim.state.actors[this.actorId].activePrinciple;
            this.clearLocal();
            this.accumulator = 0;
            break;
          }
        }
      } else this.accumulator = 0;
      if (now - this.lastSnapshot >= 50 && this.snapshotAction) {
        this.lastSnapshot = now;
        const t = performance.now();
        const packet = encodeSnapshot(
          this.sim.state,
          this.sim.config,
          ++this.snapshotSeq,
          this.paused,
          this.remoteMetaAck !== this.epoch,
          this.remoteEventAck,
          this.remote.processedSample,
          this.remote.processedPrimaryId,
        );
        const bytes = this.snapshotEncoder.encode(
          JSON.stringify(packet),
        ).byteLength;
        record(this.serializationMs, performance.now() - t);
        record(this.wireBytes, bytes);
        this.snapshotsScheduled++;
        void this.schedule(async () => {
          if (this.sending) {
            this.droppedSnapshots++;
            return;
          }
          this.sending = true;
          try {
            this.snapshotBytes = bytes;
            this.bytesSent += bytes;
            this.snapshotsSent++;
            await this.snapshotAction!.send(packet as any, {
              target: this.peerId,
            });
          } finally {
            this.sending = false;
          }
        });
      }
    }
  }
  presentation(now = performance.now()): State {
    const s = this.sim.state;
    if (this.role !== "guest" || !this.connected) return s;
    const shown = this.interpolationEnabled
      ? this.timeline.sample(s, this.actorId, now)
      : s;
    const pos =
      this.predictionEnabled && !this.paused ? this.prediction.pos : undefined;
    return {
      ...shown,
      entities: pos
        ? shown.entities.map((e) =>
            e.id === this.actorId && e.hp > 0 ? { ...e, pos } : e,
          )
        : shown.entities,
      actors: {
        ...shown.actors,
        [this.actorId]: {
          ...shown.actors[this.actorId],
          activePrinciple: this.selected,
        },
      },
    };
  }
  choose(runId: string, rewardId: string, upgrade: string) {
    if (!this.connected) return;
    if (this.role === "host")
      this.sim.chooseUpgrade(this.actorId, runId, rewardId, upgrade);
    else
      void this.controlAction?.send(
        { type: "choose", epoch: this.epoch, runId, rewardId, upgrade },
        { target: this.peerId },
      );
  }
  ready() {
    if (!this.connected) return;
    if (this.role === "host") this.sim.ready(this.actorId);
    else
      void this.controlAction?.send(
        { type: "ready", epoch: this.epoch },
        { target: this.peerId },
      );
  }
  restartRequest(id: string) {
    if (this.sim.state.trial?.status === "active") {
      this.sim.reset();
      this.epoch = this.sim.state.party!.epoch;
      this.remoteEventAck = 0;
      this.remoteMetaAck = -1;
      this.local.clear();
      this.remote.clear();
      this.clearLocal();
    }
    this.sim.ready(id);
  }
  restart() {
    if (!this.connected) return;
    if (this.role === "host") this.restartRequest("mage-1");
    else
      void this.controlAction?.send(
        { type: "restart", epoch: this.epoch },
        { target: this.peerId },
      );
  }
  togglePause() {
    if (!this.connected) return;
    if (this.role === "guest") {
      void this.controlAction?.send(
        { type: "pause", epoch: this.epoch },
        { target: this.peerId },
      );
      return;
    }
    this.paused = !this.paused;
    this.local.clear();
    this.remote.clear();
    this.sim.state.party!.epoch++;
    this.clearLocal();
  }
  info() {
    return {
      build: BUILD_ID,
      protocol: PROTOCOL,
      role: this.role,
      status: this.status,
      message: this.message,
      actorId: this.actorId,
      code: this.code,
      strategy: this.strategy,
      turnStatus: this.turnStatus,
      forceRelay: this.forceRelay,
      lastConnectionError: this.lastConnectionError,
      transport: "Trystero WebRTC data channel",
      peerId: this.peerId,
      epoch: this.epoch,
      paused: this.paused,
      snapshotsReceived: this.snapshotsReceived,
      snapshotsSent: this.snapshotsSent,
      bytesSent: this.bytesSent,
      remoteStale: this.remote.stale,
      remoteSequence: this.remote.seq,
      lastInputSendAt: this.lastSend,
      rejectedInputs: this.remote.rejected,
      profile: this.profile,
      connections: Object.values(this.room?.getPeers() ?? {}).map((pc) => ({
        connection: pc.connectionState,
        ice: pc.iceConnectionState,
      })),
    };
  }
  async rtcStats() {
    return Promise.all(
      Object.values(this.room?.getPeers() ?? {}).map(async (pc) =>
        Array.from((await pc.getStats()).values()).filter((r) =>
          [
            "candidate-pair",
            "data-channel",
            "transport",
            "local-candidate",
            "remote-candidate",
          ].includes(r.type),
        ),
      ),
    );
  }
  async diagnostics() {
    let paths: ReturnType<typeof summarizeRtc>[] = [];
    let statsAvailable = true;
    try {
      paths = (await this.rtcStats()).map(summarizeRtc);
    } catch {
      statsAvailable = false;
    }
    return {
      build: BUILD_ID,
      protocol: PROTOCOL,
      role: this.role,
      status: this.status,
      forceRelay: this.forceRelay,
      combatTelemetry:
        this.role === "guest"
          ? "host-only; export on host"
          : "authoritative-local",
      turnStatus: this.turnStatus,
      snapshotsSent: this.snapshotsSent,
      snapshotsReceived: this.snapshotsReceived,
      lastOutgoingSnapshotJsonBytes: this.snapshotBytes || null,
      scheduledSnapshotJsonBytes: this.bytesSent,
      snapshotIntervals: distribution(this.snapshotIntervals),
      snapshotApply: distribution(this.snapshotApplyMs),
      hostTickPacing: distribution(this.hostTickMs),
      hostStep: distribution(this.hostStepMs),
      serialization: distribution(this.serializationMs),
      wireBytes: {
        samples: this.wireBytes.length,
        mean: this.wireBytes.length
          ? this.wireBytes.reduce((a, b) => a + b, 0) / this.wireBytes.length
          : null,
        max: this.wireBytes.length ? Math.max(...this.wireBytes) : null,
      },
      inputAcknowledgement: distribution(this.inputAckMs),
      ackSample: this.ackSample,
      scheduled: this.scheduled,
      peakScheduled: this.peakScheduled,
      snapshotsScheduled: this.snapshotsScheduled,
      droppedSnapshots: this.droppedSnapshots,
      presentation: {
        interpolation: this.interpolationEnabled,
        delayMs: this.timeline.delayMs,
        frames: this.timeline.frames.length,
        resets: this.timeline.resets,
        underruns: this.timeline.underruns,
        prediction: this.predictionEnabled,
        replayFrames: this.prediction.history.length,
        droppedReplay: this.prediction.dropped,
        correctionDistances: this.prediction.corrections,
      },
      statsAvailable,
      paths,
    };
  }
}
