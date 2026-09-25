"""Summarize local browser evidence without connection identifiers or repeated logs.
Run only after the final browser sweep. Raw captures remain ignored.
"""
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
raw = root / "artifacts/topology-0.3/raw"

def read(path):
    return json.loads(path.read_text())

def run_summary(name):
    d = read(raw / "final-run-clean" / f"{name}.json")
    r = d["route"]
    frames = []
    for m in d["measurements"]:
        render = m["render"]
        frames.append({
            "role": m["role"], "frames": m["frames"], "rooms": m["rooms"],
            "maxFields": m["maxFields"],
            "render": {k: render[k] for k in ["quality", "renderer", "viewport", "drawingBuffer", "geometries", "textures", "contextLost"]},
        })
    transport = []
    for t in d["transport"]:
        transport.append({k: t[k] for k in [
            "role", "protocol", "snapshotsSent", "snapshotsReceived", "snapshotIntervals",
            "snapshotApply", "hostTickPacing", "hostStep", "serialization", "wireBytes",
            "inputAcknowledgement", "peakScheduled", "droppedSnapshots",
        ]})
    return {
        "build": d["environment"]["build"], "browser": d["environment"]["browser"],
        "status": d["status"], "combatSeconds": d["combatSeconds"], "wallSeconds": d["wallSeconds"],
        "routeVersion": r["version"],
        "rooms": [next(n["room"] for n in r["nodes"] if n["id"] == id) for id in r["visited"]],
        "upgrades": d["upgrades"], "casts": d["casts"], "reactions": d["reactions"],
        "measurements": frames, "transport": transport,
    }

report = read(raw / "full-suite-final.json")
focused = max(raw.glob("focused-*/render.json"), key=lambda p: p.stat().st_mtime)
result = {
    "date": "2026-09-25",
    "units": {"passed": 131, "files": 18},
    "build": "passed; existing large Rapier/client bundle warning",
    "browserSweep": report["stats"],
    "checkpointFollowup": {
        "change": "After the clean browser sweep, a new unit assertion reproduced rejection of REWARD_PENDING before the fixed Warden destination. Restore now permits the single derived destination while still requiring personal choices before readiness. The offline module is not imported by the browser runtime, but its source change updates the exact-build fingerprint.",
        "unitBuild": "131 units and production build pass after correction",
        "browser": read(raw / "checkpoint-followup.json")["stats"],
    },
    "conditions": "Installed headless Chrome 153, Windows Intel UHD ANGLE D3D11. Local WebRTC, no remote TURN claim. No recording, encoding or simulation batch overlapped these performance samples.",
    "earlierExceptions": [
        "One initial focused browser failed at Chrome launch before page navigation; unchanged rerun passed.",
        "First broad sweep: 65 passed, one opt-in live TURN skipped, one greybox movement failure. The harness clicked the Pause button over a projected enemy. It now selects an unobstructed canvas aim; unchanged movement/cast assertions pass in all ten diagnostic rooms.",
    ],
    "runs": {name: run_summary(name) for name in ["solo", "solo-retry", "coop"]},
    "focusedNewRooms": read(focused),
    "limitations": [
        "Fast scripted inputs are not human run-duration or comfort estimates.",
        "Down/revive and fresh-click edge cases use labelled lifecycle fixtures; complete run journeys retain active enemies and normal health.",
        "Hardware data covers this laptop only. Remote laptops, current TURN and physical trackpad behavior were not exercised.",
    ],
}
(root / "artifacts/topology-0.3/browser-validation.json").write_text(json.dumps(result, indent=2))
print(json.dumps({"sweep": result["browserSweep"], "runs": {
    k: {"seconds": v["combatSeconds"], "rooms": v["rooms"], "frames": [m["frames"] for m in v["measurements"]]}
    for k, v in result["runs"].items()
}}, indent=2))
