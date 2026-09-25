# Current showcase and selected history

`/topology/index.html` is the current gameplay showcase, captured after the wall-trim fix (gameplay build `5bb3a08e74c4`). Its clip, route decisions and room images are real engine output, not concept art. Refresh this small set when a visible change makes it inaccurate; do not automatically regenerate every historical milestone.

`/history/index.html` retains two contact sheets that explain the illustrated direction. They are prominently marked historical and pre-wall-fix. `/spatial/index.html` retains authored room plans and diagnostic trajectories. Old gallery URLs remain useful landing pages, with links to current media and the exact archived source.

Retired: 112 older public-gallery and duplicate art-study media files, 36,398,829 bytes before retaining the two small comparison copies (25,458,498 bytes from public galleries). No Git history was rewritten. Full paths and sizes: `artifacts/media-archive/retired.json`. To inspect an old file, use the GitHub tree at commit `dc4bf509b4925ceb0c3d10bc82d5d6aecd3a7c5b`, or extract that exact path from the commit into a temporary directory. Do not reset the working tree.

Keep numerical results, design decisions, targeted bug evidence and meaningful before/after comparisons. Existing mechanical/network screenshots remain regression evidence. Runtime GLBs, Blender sources, gameplay/proof scenes and combat regressions are unchanged. Old reports may mention retired filenames; the manifest/source commit is their archive location.

Historical capture packagers now write to ignored `artifacts/media-archive/raw/`, so running an old recipe cannot republish obsolete clips. They may require source captures recovered from that commit or newly recorded inputs. The current asset-generation pipeline continues to write `public/art`; it is separate from gallery packaging. Current showcase packaging remains `scripts/topology-captures.py`.

Gallery tests verify retirement notices, working current-play links, selected comparison images and current video playback. They no longer demand obsolete clip counts. Gameplay and historical playable-proof tests remain enabled.
