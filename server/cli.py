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
    run.add_argument("--repetitions", type=int, default=20)
    run.add_argument("--initial-move", choices=("free", "cooperate", "defect"), default="free",
                     help="Force only the primary Jev's first move; later moves are chosen by Jev")
    run.add_argument("--max-requests", type=int, default=6400)
    run.add_argument("--dry-run", action="store_true", help="Print the schedule without saving a run or calling Jev")
    run.add_argument("--opponents", nargs="+")
    run.add_argument("--name", default="First encounters")
    run.add_argument("--seed", type=int, default=42)
    for action in ("resume", "verify", "summary", "export"):
        p = sub.add_parser(action)
        p.add_argument("run_id")
        if action == "export":
            p.add_argument("path")
    extend = sub.add_parser("extend", help="Append one opponent to a completed run, preserving its results")
    extend.add_argument("run_id")
    extend.add_argument("--opponent", required=True)
    extend.add_argument("--max-requests", type=int, help="Set the request cap for the expanded run")
    replace = sub.add_parser("replace", help="Archive a completed opponent locally and schedule its replacement")
    replace.add_argument("run_id")
    replace.add_argument("--old-opponent", required=True)
    replace.add_argument("--new-opponent", required=True)
    args = parser.parse_args()
    store = None
    if args.command == "replace":
        store = Store()
        archive_id = store.replace_opponent(args.run_id, args.old_opponent, args.new_opponent)
        audit = verify(store, archive_id)
        store.execute("UPDATE runs SET verification=? WHERE id=?", (json.dumps(audit), archive_id))
        if not audit["passed"]:
            raise RuntimeError("Archived opponent failed verification")
        print(json.dumps({"run_id": args.run_id, "archive_id": archive_id, "status": "queued"}))
        return
    if args.command == "extend":
        store = Store()
        store.add_opponent(args.run_id, args.opponent, args.max_requests)
        print(json.dumps({"run_id": args.run_id, "status": "queued", "opponent": args.opponent}))
        return
    if args.command in ("run", "resume"):
        if args.command == "run":
            options = {"rounds": args.rounds, "repetitions": args.repetitions, "seed": args.seed,
                       "initial_move": args.initial_move, "max_requests": args.max_requests}
            if args.opponents:
                options["opponents"] = args.opponents
            config = RunConfig(**options)
            if args.dry_run:
                matches = config.repetitions * len(config.opponents)
                print(json.dumps({"name": args.name, "config": config.model_dump(),
                                  "scheduled_matches": matches, "scheduled_rounds": matches * config.rounds,
                                  "scheduled_decisions": config.scheduled_decisions}, indent=2))
                return
            store = Store()
            run_id = store.create_run(config.model_dump(), args.name)
        else:
            store = Store()
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
        store = Store()
        result = verify(store, args.run_id)
        print(json.dumps(result, indent=2))
        if not result["passed"]:
            raise SystemExit(1)
    elif args.command == "summary":
        store = Store()
        info = summary(store, args.run_id)
        print(json.dumps({k: v for k, v in info.items() if k != "matches"}, indent=2))
    else:
        store = Store()
        from pathlib import Path
        Path(args.path).write_text(json.dumps(store.export(args.run_id), indent=2))
        print("Export saved")


if __name__ == "__main__":
    main()
