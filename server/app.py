import asyncio
import csv
import io
import json

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, Response, StreamingResponse

from .game import OPPONENTS
from .report import summary
from .store import ROOT, Store

store = Store()
app = FastAPI(title="Jev tournament")


def require_run(run_id):
    run = store.get_run(run_id)
    if not run:
        raise HTTPException(404, "Run not found")
    return run


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/opponents")
def opponents():
    return OPPONENTS


@app.get("/api/runs")
def runs():
    return [summary(store, row["id"]) for row in store.rows("SELECT id FROM runs ORDER BY created_at DESC")]


@app.get("/api/runs/{run_id}")
def run(run_id: str):
    require_run(run_id)
    return summary(store, run_id)


@app.get("/api/runs/{run_id}/events")
async def events(run_id: str, request: Request):
    require_run(run_id)
    async def stream():
        previous = None
        while not await request.is_disconnected():
            value = summary(store, run_id)
            payload = json.dumps(value)
            if payload != previous:
                yield "data: " + payload + "\n\n"
                previous = payload
            if value["status"] in ("complete", "invalid", "incomplete", "paused"):
                break
            await asyncio.sleep(1)
    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/api/matches/{match_id}")
def match(match_id: str):
    detail = store.match_detail(match_id)
    if not detail:
        raise HTTPException(404, "Match not found")
    return detail


@app.get("/api/runs/{run_id}/export.json")
def export_json(run_id: str):
    require_run(run_id)
    return Response(json.dumps(store.export(run_id), indent=2), media_type="application/json",
                    headers={"Content-Disposition": f'attachment; filename="jev-{run_id}.json"'})


@app.get("/api/runs/{run_id}/rounds.csv")
def export_csv(run_id: str):
    require_run(run_id)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["match", "opponent", "repetition", "round", "jev_action", "opponent_action",
                     "jev_points", "opponent_points", "jev_total", "opponent_total",
                     "initial_move", "jev_action_source", "opponent_action_source"])
    config = store.get_run(run_id)["config"]
    initial_move = config.get("initial_move", "free")
    for match in store.matches(run_id):
        for row in store.history(match["id"]):
            writer.writerow([match["number"], match["opponent"], match["repetition"], row["number"],
                             row["a"], row["b"], row["reward_a"], row["reward_b"], row["score_a"], row["score_b"], initial_move,
                             "forced" if row["number"] == 1 and initial_move != "free" else "model",
                             "model" if match["opponent"] == "another_jev" else "scripted"])
    return Response(output.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="jev-{run_id}-rounds.csv"'})


@app.get("/{path:path}")
def frontend(path: str):
    dist = ROOT / "web" / "dist"
    target = (dist / path).resolve()
    if target.is_relative_to(dist.resolve()) and target.is_file():
        return FileResponse(target)
    index = dist / "index.html"
    if index.exists():
        return FileResponse(index)
    raise HTTPException(404, "Frontend has not been built")
