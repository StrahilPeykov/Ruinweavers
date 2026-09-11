import { expect, it } from "vitest";
import * as T from "three";
import { ART, ArtStudy } from "../../src/render/art";
import { ROOMS, RUN_ROOMS } from "../../src/simulation/rooms";
import type { State } from "../../src/simulation/types";

it("authored stone trim has no exposed face coplanar with the wall top", () => {
  for (const id of RUN_ROOMS) {
    const group = new T.Group();
    // Exercise the real decoration builder without loading browser GLBs.
    ArtStudy.prototype.decorateAuthored.call(
      {
        palette: ART.illustrated,
        clone: () =>
          new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial()),
      } as unknown as ArtStudy,
      group,
      { roomId: id } as State,
    );
    const trim = group.children.find(
      (o) =>
        o instanceof T.InstancedMesh &&
        (o.geometry as T.BoxGeometry).parameters.width === 1,
    ) as T.InstancedMesh;
    const walls = ROOMS[id].terrain.filter((b) =>
      ["Boundary", "Masonry"].includes(b.name ?? ""),
    );
    const matrix = new T.Matrix4();
    walls.forEach((wall, i) => {
      trim.getMatrixAt(i * 2, matrix);
      const trimTop = matrix.elements[13] + matrix.elements[5] / 2;
      expect(
        trimTop - (wall.y + wall.h / 2),
        `${id} wall ${i}`,
      ).toBeGreaterThan(0.01);
    });
    group.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          m.dispose();
      }
    });
  }
});
