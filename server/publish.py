"""Export explicitly selected, verified runs for the static results site."""
import argparse
import csv
import io
import json
import re
import sqlite3
from pathlib import Path

from .game import OPPONENTS
from .report import summary
from .store import DEFAULT_DB, ROOT, Store
from .verify import verify


class ReadOnlyStore(Store):
    def __init__(self, path=DEFAULT_DB):
        self.path = Path(path).resolve(strict=True)

    def connection(self):
        db = sqlite3.connect(self.path.as_uri() + "?mode=ro", uri=True)
        db.row_factory = sqlite3.Row
        return db


def publish(run_ids, database=DEFAULT_DB, output=ROOT / "web/public/recorded"):
    if not run_ids or any(not re.fullmatch(r"[a-f0-9]{12}", value) for value in run_ids):
        raise ValueError("Provide at least one valid saved run ID")
    store = ReadOnlyStore(database)
    files = {"health.json": {"ok": True}, "opponents.json": OPPONENTS}
    runs = []
    for run_id in dict.fromkeys(run_ids):
        run = store.get_run(run_id)
        if not run or run["status"] != "complete":
            raise ValueError(f"Run {run_id} must be complete before publication")
        audit = verify(store, run_id)
        if not audit["passed"]:
            raise ValueError(f"Run {run_id} failed verification: {audit['errors']}")
        overview = summary(store, run_id)
        overview["verification"] = audit
        runs.append(overview)
        files[f"runs/{run_id}.json"] = overview
        exported = store.export(run_id)
        files[f"runs/{run_id}/export.json"] = exported
        csv_output = io.StringIO(newline="")
        writer = csv.writer(csv_output, lineterminator="\n")
        writer.writerow(["match", "opponent", "repetition", "round", "jev_action", "opponent_action",
                         "jev_points", "opponent_points", "jev_total", "opponent_total",
                         "initial_move", "jev_action_source", "opponent_action_source"])
        for match in exported["matches"]:
            files[f"matches/{match['id']}.json"] = match
            for row in match["rounds"]:
                writer.writerow([match["number"], match["opponent"], match["repetition"], row["number"],
                                 row["a"], row["b"], row["reward_a"], row["reward_b"],
                                 row["score_a"], row["score_b"], run["config"].get("initial_move", "free"),
                                 row["action_sources"]["a"], row["action_sources"]["b"]])
        files[f"runs/{run_id}/rounds.csv"] = csv_output.getvalue()
    files["runs.json"] = runs
    # Validate every run before writing. Remove only previously generated files
    # listed in our manifest, so an unpublished run cannot linger in the output.
    output = Path(output)
    manifest_path = output / "manifest.json"
    previous = json.loads(manifest_path.read_text())["files"] if manifest_path.exists() else []
    for name in set(previous) - set(files):
        target = (output / name).resolve()
        if not target.is_relative_to(output.resolve()):
            raise ValueError("Invalid publication manifest path")
        target.unlink(missing_ok=True)
    for name, value in files.items():
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(value if isinstance(value, str) else json.dumps(value, separators=(",", ":")) + "\n")
    manifest_path.write_text(json.dumps({"runIds": [r["id"] for r in runs], "files": sorted(files)}, indent=2) + "\n")
    return {"runs": len(runs), "matches": sum(len(r["matches"]) for r in runs),
            "rounds": sum(r["totals"]["rounds_played"] for r in runs), "files": len(files)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-id", action="append", required=True, help="Repeat for every published experiment")
    parser.add_argument("--database", type=Path, default=DEFAULT_DB)
    parser.add_argument("--output", type=Path, default=ROOT / "web/public/recorded")
    args = parser.parse_args()
    print(json.dumps(publish(args.run_id, args.database, args.output), indent=2))


if __name__ == "__main__":
    main()
