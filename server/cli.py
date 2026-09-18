import argparse
import asyncio
import json

from .config import RunConfig
from .report import summary
from .runner import Runner
from .store import Store
from .verify import verify


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    run = sub.add_parser("run")
    run.add_argument("--rounds", type=int, default=20)
    run.add_argument("--repetitions", type=int, default=5)
    run.add_argument("--opponents", nargs="+")
    run.add_argument("--name", default="First encounters")
    run.add_argument("--seed", type=int, default=42)
    for action in ("resume", "verify", "summary", "export"):
        p = sub.add_parser(action)
        p.add_argument("run_id")
        if action == "export":
            p.add_argument("path")
    args = parser.parse_args()
    store = Store()
    if args.command in ("run", "resume"):
        if args.command == "run":
            options = {"rounds": args.rounds, "repetitions": args.repetitions, "seed": args.seed}
            if args.opponents:
                options["opponents"] = args.opponents
            config = RunConfig(**options)
            run_id = store.create_run(config.model_dump(), args.name)
        else:
            run_id = args.run_id
        print(json.dumps({"run_id": run_id, "status": "starting"}), flush=True)

        async def execute():
            task = asyncio.create_task(Runner(store, run_id).play())
            while not task.done():
                await asyncio.wait({task}, timeout=5)
                info = summary(store, run_id)
                print(json.dumps({"status": info["status"], **{k: info["totals"][k] for k in
                                 ("completed_matches", "scheduled_matches", "rounds_played", "decisions", "failed_attempts")}}), flush=True)
            await task
        try:
            asyncio.run(execute())
        except KeyboardInterrupt:
            store.execute("UPDATE runs SET status='paused' WHERE id=?", (run_id,))
            store.execute("UPDATE matches SET status='paused' WHERE run_id=? AND status='running'", (run_id,))
            print(json.dumps({"run_id": run_id, "status": "paused"}), flush=True)
            raise SystemExit(130) from None
        result = summary(store, run_id)
        print(json.dumps({"run_id": run_id, "status": result["status"], "verification": result["verification"]}), flush=True)
        if result["status"] != "complete":
            raise SystemExit(1)
    elif args.command == "verify":
        result = verify(store, args.run_id)
        print(json.dumps(result, indent=2))
        if not result["passed"]:
            raise SystemExit(1)
    elif args.command == "summary":
        info = summary(store, args.run_id)
        print(json.dumps({k: v for k, v in info.items() if k != "matches"}, indent=2))
    else:
        from pathlib import Path
        Path(args.path).write_text(json.dumps(store.export(args.run_id), indent=2))
        print("Export saved")


if __name__ == "__main__":
    main()
