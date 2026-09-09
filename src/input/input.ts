import { PRINCIPLES } from "../experiments/config";
import { idleInput, type FrameInput, type Vec } from "../simulation/types";
export type Action =
  | "up"
  | "down"
  | "left"
  | "right"
  | "primary"
  | "secondary"
  | "principle1"
  | "principle2"
  | "principle3"
  | "principle4"
  | "next"
  | "previous"
  | "dodge"
  | "interact";
export type Profile = "desktop" | "laptop" | "custom";
export const DEFAULT_BINDINGS: Record<Action, string[]> = {
  up: ["KeyW"],
  down: ["KeyS"],
  left: ["KeyA"],
  right: ["KeyD"],
  primary: ["Mouse0", "KeyJ"],
  secondary: ["Mouse2", "KeyF", "KeyK"],
  principle1: ["Digit1"],
  principle2: ["Digit2"],
  principle3: ["Digit3"],
  principle4: ["Digit4"],
  next: ["Tab"],
  previous: ["KeyQ"],
  dodge: ["Space"],
  interact: ["KeyE"],
};
export class Input {
  onClear = () => {};
  bindings = structuredClone(DEFAULT_BINDINGS);
  profile: Profile = "desktop";
  wheelEnabled = false;
  held = new Set<string>();
  pressed = new Set<string>();
  triggers: string[] = [];
  pointer = { x: 0, y: 0, active: false };
  lastDevice = "mouse";
  wheel = 0;
  constructor(public canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", (e) => {
      if (this.editing(e.target)) return;
      const action = this.actionFor(e.code);
      if (action) {
        e.preventDefault();
        // Focus/menu cancellation must not turn an OS repeat into a fresh press.
        if (e.repeat) return;
        if (!this.held.has(e.code)) {
          this.pressed.add(e.code);
          this.triggers.push(`${action}:keyboard`);
        }
        this.held.add(e.code);
      }
    });
    window.addEventListener("keyup", (e) => this.held.delete(e.code));
    canvas.addEventListener("pointermove", (e) => {
      this.pointer = { x: e.clientX, y: e.clientY, active: true };
      this.lastDevice = e.pointerType;
    });
    canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      canvas.focus();
      this.pointer = { x: e.clientX, y: e.clientY, active: true };
      const code = `Mouse${e.button}`;
      this.held.add(code);
      this.pressed.add(code);
      this.lastDevice = e.pointerType;
    });
    window.addEventListener("pointerup", (e) =>
      this.held.delete(`Mouse${e.button}`),
    );
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener(
      "wheel",
      (e) => {
        if (this.wheelEnabled) {
          e.preventDefault();
          this.wheel += Math.sign(e.deltaY);
          this.triggers.push("cycle:optional-wheel");
        }
      },
      { passive: false },
    );
    window.addEventListener("blur", () => this.clear());
    document.addEventListener("visibilitychange", () => this.clear());
    document.addEventListener("focusin", (e) => {
      if (this.editing(e.target)) this.clear();
    });
  }
  editing(target: EventTarget | null) {
    return (
      target instanceof HTMLElement &&
      !!target.closest("input,select,button,textarea,summary")
    );
  }
  actionFor(code: string) {
    return (Object.keys(this.bindings) as Action[]).find((a) =>
      this.bindings[a].includes(code),
    );
  }
  is(action: Action, pressed = false) {
    return this.bindings[action].some((k) =>
      (pressed ? this.pressed : this.held).has(k),
    );
  }
  device(action: Action) {
    return this.bindings[action].some(
      (k) =>
        !k.startsWith("Mouse") && (this.held.has(k) || this.pressed.has(k)),
    )
      ? "keyboard-fallback"
      : this.lastDevice;
  }
  sample(aim: Vec): FrameInput {
    const out = idleInput(aim);
    out.moveX = Number(this.is("right")) - Number(this.is("left"));
    out.moveZ = Number(this.is("down")) - Number(this.is("up"));
    out.primary = this.is("primary") || this.is("primary", true);
    out.secondary = this.is("secondary", true);
    out.dodge = this.is("dodge", true);
    out.interact = this.is("interact", true);
    out.revive = this.is("interact");
    for (let i = 0; i < 4; i++)
      if (this.is(`principle${i + 1}` as Action, true))
        out.select = PRINCIPLES[i];
    out.cycle =
      Number(this.is("next", true)) -
      Number(this.is("previous", true)) +
      this.wheel;
    out.primaryDevice = this.device("primary");
    out.secondaryDevice = this.device("secondary");
    out.triggers = this.triggers;
    this.pressed.clear();
    this.wheel = 0;
    this.triggers = [];
    return out;
  }
  clear() {
    this.onClear();
    this.held.clear();
    this.pressed.clear();
    this.triggers = [];
    this.wheel = 0;
  }
  setProfile(profile: Profile) {
    if (!["desktop", "laptop", "custom"].includes(profile))
      throw Error("Unknown input profile");
    this.profile = profile;
    if (profile !== "custom") this.bindings = structuredClone(DEFAULT_BINDINGS);
    this.clear();
  }
  setBinding(action: Action, bindings: string[]) {
    if (
      !(action in this.bindings) ||
      !bindings.length ||
      bindings.some(
        (b) =>
          !/^((Key[A-Z])|(Digit[0-9])|Space|Tab|ShiftLeft|ControlLeft|Mouse[02]|Arrow(Up|Down|Left|Right))$/.test(
            b,
          ),
      )
    )
      throw Error("Invalid binding");
    const conflict = bindings.find((b) =>
      (Object.keys(this.bindings) as Action[]).some(
        (a) => a !== action && this.bindings[a].includes(b),
      ),
    );
    if (conflict) throw Error(`${conflict} already belongs to another action`);
    this.bindings[action] = [...new Set(bindings)];
    this.profile = "custom";
    this.clear();
  }
}
