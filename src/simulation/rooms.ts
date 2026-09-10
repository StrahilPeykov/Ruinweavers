import type { TerrainBox } from "./lab";
import type { Kind, Vec } from "./types";

export interface RoomSpec {
  id: string;
  name: string;
  thesis: string;
  width: number;
  depth: number;
  terrain: TerrainBox[];
  starts: [Vec, Vec];
  anchors: Vec[];
  props: { id: string; kind: Kind; x: number; z: number; y?: number }[];
  bridge?: { x: number; z: number; w: number; d: number };
  presentation: {
    pigment: number;
    landmark: [number, number, number];
    columns: number[];
  };
}
const v = (x: number, z: number, y = 0) => ({ x, y, z });
const box = (
  x: number,
  z: number,
  w: number,
  d: number,
  h = 1.7,
  name = "Cover",
): TerrainBox => ({ x, z, w, d, h, y: h / 2, name });
function room(
  id: string,
  name: string,
  width: number,
  depth: number,
  thesis: string,
  cover: TerrainBox[],
  starts: [Vec, Vec],
  anchors: Vec[],
  props: RoomSpec["props"] = [],
): RoomSpec {
  return {
    id,
    name,
    width,
    depth,
    thesis,
    starts,
    anchors,
    props,
    terrain: [
      { x: 0, y: -0.5, z: 0, w: width, h: 1, d: depth, name: "Floor" },
      box(-width / 2 - 0.3, 0, 0.6, depth, 2.6, "Boundary"),
      box(width / 2 + 0.3, 0, 0.6, depth, 2.6, "Boundary"),
      box(0, -depth / 2 - 0.3, width, 0.6, 2.6, "Boundary"),
      box(0, depth / 2 + 0.3, width, 0.6, 1.1, "Boundary"),
      ...cover,
    ],
    presentation: {
      pigment: 0x79969b,
      landmark: [-width / 2 - 0.85, 1.3, -depth / 2 + 5],
      columns: [-width / 2 + 3, width / 2 - 3],
    },
  };
}
export const ROOMS: Record<string, RoomSpec> = {
  split: room(
    "split",
    "The split court",
    26,
    18,
    "Crossfire across staggered sight breaks.",
    [box(-4, -1, 2, 3), box(4, 2, 2, 3)],
    [v(-2, 6.5), v(2, 6.5)],
    [v(-9, -5), v(9, -5), v(-8, 2), v(8, 3)],
    [{ id: "timber", kind: "wood", x: -4, z: 2.8 }],
  ),
  gallery: room(
    "gallery",
    "The offset gallery",
    22,
    24,
    "Three circulation lanes around alternating piers.",
    [box(-3, -5, 2.2, 3), box(3, 0, 2.2, 3), box(-3, 5, 2.2, 3)],
    [v(-7, 8), v(1, 9)],
    [v(-7, -8), v(6, -8), v(7, 4), v(0, -9)],
    [{ id: "loose-1", kind: "loose", x: 0, z: 3 }],
  ),
  rotunda: room(
    "rotunda",
    "The silent rotunda",
    24,
    22,
    "A central island splits sight and approach.",
    [box(0, 0, 5, 6, 2.4, "Masonry")],
    [v(-3, 8), v(3, 8)],
    [v(-7, -6), v(7, -6), v(-8, 3), v(8, 3)],
    [],
  ),
  terrace: room(
    "terrace",
    "The rising court",
    24,
    22,
    "Low broad ascent changes height and cast support.",
    [
      {
        x: 0,
        z: 0,
        y: 0.33 - 0.25 / Math.cos(Math.atan(0.03)),
        w: 24,
        h: 0.5,
        d: Math.hypot(22, 0.66),
        pitch: Math.atan(0.03),
        name: "Ramp",
      },
      box(-5, 3, 2, 2.8),
      box(5, -6, 2, 2.8),
    ],
    [v(-3, 7), v(3, 7)],
    [v(-8, -8, 0.6), v(8, -8, 0.6), v(-7, -1, 0.24), v(7, 4)],
    [{ id: "ballast", kind: "heavy", x: 4, z: -8, y: 0.6 }],
  ),
  broken: room(
    "broken",
    "The broken link",
    26,
    20,
    "Two bypasses around an optional construction shortcut.",
    [],
    [v(-7, 5), v(-5, 6)],
    [v(7, -5), v(8, 5), v(-8, -6), v(6, 0)],
    [],
  ),
  yard: room(
    "yard",
    "The repair yard",
    26,
    22,
    "Broad elbow changes firing direction; materials line useful impacts.",
    [box(-8, -6, 10, 10, 2.5, "Masonry"), box(6, 3, 2, 2.5)],
    [v(-8, 7), v(-4, 7)],
    [v(7, -7), v(8, 0), v(-8, 0), v(6, 6)],
    [
      { id: "timber", kind: "wood", x: -1, z: 1 },
      { id: "ballast", kind: "heavy", x: 5, z: -2 },
      { id: "column", kind: "brittle", x: 3, z: 3 },
      { id: "loose-1", kind: "loose", x: 1, z: -2 },
    ],
  ),
  warden: room(
    "warden",
    "The Warden crossing",
    28,
    24,
    "Open diagonal marches; distinct peripheral sight breaks and rescue approaches.",
    [box(-8, -2, 2.2, 3), box(8, 3, 2.2, 3), box(-4, 8, 2.5, 1.8)],
    [v(-2, 8), v(2, 8)],
    [v(0, -6)],
    [
      { id: "ballast", kind: "heavy", x: 7, z: -6 },
      { id: "loose-1", kind: "loose", x: -6, z: 3 },
    ],
  ),
  archive: room(
    "archive",
    "The narrow archive",
    18,
    26,
    "Negative candidate: long divider and cramped turn invite camping.",
    [box(0, 0, 3, 19, 2.3, "Masonry")],
    [v(-5, 9), v(-4, 10)],
    [v(5, -8), v(5, 8), v(-5, -8), v(5, 0)],
    [],
  ),
};
ROOMS.broken.terrain = [
  ...ROOMS.broken.terrain.slice(1),
  { x: -7, y: -0.5, z: 0, w: 12, h: 1, d: 20, name: "Floor" },
  { x: 7, y: -0.5, z: 0, w: 12, h: 1, d: 20, name: "Floor" },
  { x: 0, y: -0.5, z: -8, w: 2, h: 1, d: 4, name: "Floor" },
  { x: 0, y: -0.5, z: 8, w: 2, h: 1, d: 4, name: "Floor" },
];
ROOMS.broken.bridge = { x: 0, z: 0, w: 2, d: 12 };
export function roomSpec(id?: string) {
  return id ? ROOMS[id] : undefined;
}
export function bridgeAt(id: string | undefined, p: Vec, legacyLab = false) {
  const b =
    roomSpec(id)?.bridge ??
    (legacyLab ? { x: 9.5, z: 0, w: 3, d: 8 } : undefined);
  return !!b && Math.abs(p.x - b.x) <= b.w / 2 && Math.abs(p.z - b.z) < b.d / 2;
}
