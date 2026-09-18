import asyncio
from types import SimpleNamespace

from server.config import RunConfig
from server.report import summary
from server.runner import Runner
from server.store import Store
from server.verify import verify


class AuthenticationFailure(Exception):
    status_code = 401


class FakeClient:
    def __init__(self, fail_call=None):
        self.calls = []
        self.fail_call = fail_call

    async def system_one(self, **request):
        self.calls.append(request)
        if len(self.calls) == self.fail_call:
            raise AuthenticationFailure()
        await asyncio.sleep(0)
        raw = {"model": request["model"], "answers": {"next_move": {
            "type": "choice", "choice": "cooperate", "probabilities": {"cooperate": 0.9, "defect": 0.1}, "confidence": 0.7}},
            "usage": {"input_tokens": 100, "output_tokens": 12}}
        return SimpleNamespace(raw_http_response=SimpleNamespace(json=lambda: raw))


def setup_run(tmp_path, **kwargs):
    store = Store(tmp_path / "test.sqlite")
    config = RunConfig(rounds=2, repetitions=1, **kwargs)
    run_id = store.create_run(config.model_dump(), "Test")
    return store, run_id


def test_simultaneous_self_play_and_exact_decision_count(tmp_path):
    store, run_id = setup_run(tmp_path, opponents=["cooperator", "another_jev"])
    client = FakeClient()
    asyncio.run(Runner(store, run_id, client=client).play())
    assert len(client.calls) == 6
    assert verify(store, run_id)["passed"]
    self_match = [m for m in store.matches(run_id) if m["opponent"] == "another_jev"][0]
    for number in (1, 2):
        for seat in (0, 1):
            d = store.decision(self_match["id"], number, seat)
            assert len(d["payload"]["state"]["history"]) == number-1
    assert summary(store, run_id)["totals"]["avg_a"] == 3


def test_partial_round_resumes_saved_decision(tmp_path):
    store, run_id = setup_run(tmp_path, opponents=["another_jev"])
    broken = FakeClient(fail_call=2)
    asyncio.run(Runner(store, run_id, client=broken).play())
    match = store.matches(run_id)[0]
    assert match["status"] == "failed"
    assert store.history(match["id"]) == []
    assert store.decision(match["id"], 1, 0) is not None
    recovered = FakeClient()
    asyncio.run(Runner(store, run_id, client=recovered).play())
    assert len(recovered.calls) == 3
    assert len(store.history(match["id"])) == 2
    assert verify(store, run_id)["passed"]
    calls_before = len(recovered.calls)
    asyncio.run(Runner(store, run_id, client=recovered).play())
    assert len(recovered.calls) == calls_before


def test_verifier_catches_corrupt_score_and_observation(tmp_path):
    store, run_id = setup_run(tmp_path, opponents=["defector"])
    asyncio.run(Runner(store, run_id, client=FakeClient()).play())
    match = store.matches(run_id)[0]
    store.execute("UPDATE rounds SET score_a=99 WHERE match_id=? AND number=1", (match["id"],))
    result = verify(store, run_id)
    assert not result["passed"]
    assert any("score mismatch" in x for x in result["errors"])


def test_repetitions_start_fresh(tmp_path):
    store = Store(tmp_path / "test.sqlite")
    config = RunConfig(rounds=2, repetitions=2, opponents=["defector"])
    run_id = store.create_run(config.model_dump(), "Fresh")
    client = FakeClient()
    asyncio.run(Runner(store, run_id, client=client).play())
    starts = [call for call in client.calls if call["state"]["current_round"] == 1]
    assert len(starts) == 2
    assert all(call["state"]["history"] == [] for call in starts)
    assert all(call["state"]["cumulative_points"] == {"you": 0, "opponent": 0} for call in starts)


def test_csv_and_replay_do_not_call_model(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient
    from server import app as module
    store, run_id = setup_run(tmp_path, opponents=["defector"])
    asyncio.run(Runner(store, run_id, client=FakeClient()).play())
    monkeypatch.setattr(module, "store", store)
    with TestClient(module.app) as client:
        overview = client.get("/api/runs/" + run_id)
        assert overview.status_code == 200
        match_id = overview.json()["matches"][0]["id"]
        detail = client.get("/api/matches/" + match_id).json()
        assert len(detail["rounds"]) == 2
        assert detail["rounds"][0]["decisions"]["a"]["payload"]["state"]["history"] == []
        csv = client.get("/api/runs/" + run_id + "/rounds.csv")
        assert len(csv.text.splitlines()) == 3
        export = client.get("/api/runs/" + run_id + "/export.json").json()
        assert export["run"]["id"] == run_id
        assert len(export["matches"]) == 1
        assert "TYPESAFE_API_KEY" not in str(export)
