import type { Room, MessageAction, JoinRoom } from "@trystero-p2p/core";
import { Simulation } from "../simulation/simulation";
import { PRINCIPLES, type Config, type Principle } from "../experiments/config";
import { idleInput, type FrameInput, type State } from "../simulation/types";
import { InputMailbox, type InputPacket } from "./input-mailbox";

export class CoopSession {
  role: "solo" | "host" | "guest" = "solo";
  status = "solo";
  message = "Solo trial";
  code = "";
  strategy = "public";
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
            : {}),
        },
        this.code,
        {
          handshakeTimeoutMs: 8000,
          onPeerHandshake: async (_peer, send, receive) => {
            await send({ version: 1, role });
            const hello = (await receive()).data as any;
            if (
              generation !== this.generation ||
              (this.peerId && this.peerId !== _peer) ||
              (admittedPeer && admittedPeer !== _peer) ||
              hello?.version !== 1 ||
              hello.role === role ||
              !["host", "guest"].includes(hello.role) ||
              (role === "host" && this.sim.state.trial?.status !== "ready")
            )
              throw Error("Room full, incompatible, or trial already started");
            admittedPeer = _peer;
          },
          onJoinError: ({ error }) => {
            if (!this.peerId && generation === this.generation)
              this.fail(
                `Connection failed: ${error}. Try another room; some networks require TURN, which is not configured.`,
              );
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
          if (data.clear)
            this.sim.state.actors["mage-2"].bufferedCast = undefined;
        }
      };
      this.snapshotAction.onMessage = (data, { peerId }) => {
        if (
          this.role !== "guest" ||
          peerId !== this.peerId ||
          data?.version !== 1 ||
          !Number.isSafeInteger(data.seq) ||
          data.seq <= this.acceptedSnapshot ||
          !data.state?.actors?.["mage-2"] ||
          !Array.isArray(data.state.entities) ||
          data.state.entities.length > 64
        )
          return;
        this.acceptedSnapshot = data.seq;
        this.lastReceive = performance.now();
        const before = this.epoch;
        this.sim.acceptSnapshot(data.state as State);
        this.epoch = data.state.party.epoch;
        // Host owns gameplay config; local camera remains local.
        const { camera, cameraDistance, cameraPitch } = this.sim.config;
        Object.assign(this.sim.config, data.config, {
          camera,
          cameraDistance,
          cameraPitch,
        });
        this.paused = data.paused === true;
        this.status = "connected";
        this.message = "Connected · guest · WebRTC";
        this.snapshotsReceived++;
        if (before !== this.epoch) {
          this.selected = this.sim.state.actors[this.actorId].activePrinciple;
          this.pending = idleInput();
          this.castIntent = undefined;
          this.clearLocal();
        }
        this.changed();
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
            "No partner connection after 25 seconds. Check the room code and signaling choice, then retry. No TURN relay is configured.",
          );
      }, 25000);
    } catch (error) {
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
    this.sim.state.pending = [];
    for (const a of Object.values(this.sim.state.actors))
      a.bufferedCast = undefined;
    this.clearLocal();
    this.changed();
    void room?.leave();
  }
  schedule(action: () => Promise<void>) {
    const generation = this.generation,
      n = ++this.scheduleCount;
    const jitter =
      this.profile.jitterMs * Math.sin(n * 12.9898 + this.profile.seed);
    const delay = Math.max(0, this.profile.delayMs + jitter);
    return new Promise<void>((resolve) => {
      const send = () => {
        if (generation !== this.generation) {
          resolve();
          return;
        }
        action()
          .catch(() => {})
          .finally(resolve);
      };
      if (delay) setTimeout(send, delay);
      else send();
    });
  }
  release() {
    this.local.clear();
    this.pending = idleInput();
    this.castIntent = undefined;
    const a = this.sim.state.actors[this.actorId];
    if (a) a.bufferedCast = undefined;
    if (this.role === "guest" && this.connected) this.sendInput(true);
  }
  sendInput(clear = false) {
    if (!this.inputAction || !this.peerId) return;
    const packet: InputPacket = {
      version: 1,
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
      clear,
    };
    this.castIntent = undefined;
    this.pending = {
      ...this.pending,
      secondary: false,
      dodge: false,
      interact: false,
      cycle: 0,
    };
    void this.schedule(() =>
      this.inputAction!.send(packet as any, { target: this.peerId }),
    );
  }
  submit(input: FrameInput, now: number) {
    if (input.select) this.selected = input.select;
    if (input.cycle)
      this.selected =
        PRINCIPLES[(PRINCIPLES.indexOf(this.selected) + input.cycle + 4) % 4];
    if (this.role === "host")
      this.local.receive(
        {
          version: 1,
          seq: ++this.seq,
          epoch: this.epoch,
          input: { ...input, select: this.selected, cycle: 0 },
        },
        this.epoch,
        now,
      );
    else {
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
          this.sim.stepParty({
            "mage-1": this.local.consume(now),
            "mage-2": remote,
          });
          this.accumulator -= 1 / 60;
          if (this.epoch !== this.sim.state.party!.epoch) {
            this.epoch = this.sim.state.party!.epoch;
            this.local.clear();
            this.remote.clear();
            this.selected = this.sim.state.actors[this.actorId].activePrinciple;
            this.clearLocal();
            this.accumulator = 0;
            break;
          }
        }
      } else this.accumulator = 0;
      if (
        now - this.lastSnapshot >= 50 &&
        !this.sending &&
        this.snapshotAction
      ) {
        this.sending = true;
        this.lastSnapshot = now;
        const packet = {
          version: 1,
          seq: ++this.snapshotSeq,
          state: structuredClone(this.sim.state),
          config: { ...this.sim.config },
          paused: this.paused,
        };
        this.bytesSent += JSON.stringify(packet).length;
        this.snapshotsSent++;
        void this.schedule(() =>
          this.snapshotAction!.send(packet as any, { target: this.peerId }),
        ).finally(() => (this.sending = false));
      }
    }
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
      role: this.role,
      status: this.status,
      message: this.message,
      actorId: this.actorId,
      code: this.code,
      strategy: this.strategy,
      transport: "Trystero WebRTC data channel",
      peerId: this.peerId,
      epoch: this.epoch,
      paused: this.paused,
      snapshotsReceived: this.snapshotsReceived,
      snapshotsSent: this.snapshotsSent,
      bytesSent: this.bytesSent,
      remoteStale: this.remote.stale,
      remoteSequence: this.remote.seq,
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
          ["candidate-pair", "data-channel", "transport"].includes(r.type),
        ),
      ),
    );
  }
}
