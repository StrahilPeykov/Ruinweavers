import { NodeIO } from "@gltf-transform/core";
import { dedup, prune, weld } from "@gltf-transform/functions";
import validator from "gltf-validator";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
const io = new NodeIO();
const report = {
  tool: "Blender 5.2 / glTF Transform / Khronos validator",
  assets: [],
};
for (const style of process.argv[2]
  ? [process.argv[2]]
  : ["storybook", "ink"]) {
  await mkdir(`public/art/${style}`, { recursive: true });
  for (const file of (await readdir(`assets/art-source/${style}`))
    .filter((f) => f.endsWith(".glb"))
    .sort()) {
    const input = `assets/art-source/${style}/${file}`,
      output = `public/art/${style}/${file}`;
    const doc = await io.read(input);
    if (style === "illustrated") {
      const pigment = doc
        .createTexture("shared-pigment")
        .setImage(await readFile("assets/art-source/shared-pigment.png"))
        .setMimeType("image/png");
      for (const m of doc.getRoot().listMaterials())
        if (["stone", "patina", "cloth", "wood"].includes(m.getName()))
          m.setBaseColorTexture(pigment);
    }
    // Preserve named hierarchy and node animation. Tiny texture-free meshes do
    // not justify a new runtime geometry decoder.
    await doc.transform(weld(), dedup(), prune({ keepLeaves: true }));
    await io.write(output, doc);
    const bytes = await readFile(output);
    const result = await validator.validateBytes(new Uint8Array(bytes), {
      uri: file,
    });
    if (result.issues.numErrors)
      throw Error(`${output}: ${JSON.stringify(result.issues)}`);
    report.assets.push({
      path: output,
      bytes: bytes.length,
      sourceBytes: (await readFile(input)).length,
      meshes: doc.getRoot().listMeshes().length,
      materials: doc.getRoot().listMaterials().length,
      animations: doc.getRoot().listAnimations().length,
      textures: doc.getRoot().listTextures().length,
      errors: result.issues.numErrors,
      warnings: result.issues.numWarnings,
    });
  }
}
await writeFile(
  process.argv[2]
    ? "artifacts/art-finish/assets.json"
    : "artifacts/art-proof/assets.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
