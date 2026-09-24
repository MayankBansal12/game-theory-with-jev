import asyncio
import json

import pytest
from pydantic import ValidationError
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


@pytest.mark.parametrize('opening, action', [('cooperate', 'C'), ('defect', 'D')])
def test_forced_opening_is_not_a_model_decision(tmp_path, opening, action):
    store, run_id = setup_run(tmp_path, opponents=['defector', 'another_jev'], initial_move=opening)
    client = FakeClient()
    asyncio.run(Runner(store, run_id, client=client).play())
    assert len(client.calls) == 4
    assert verify(store, run_id)['passed']
    for match in store.matches(run_id):
        detail = store.match_detail(match['id'])
        first, second = detail['rounds']
        assert first['a'] == action
        assert first['decisions']['a'] is None
        assert first['action_sources']['a'] == 'forced'
        assert second['a'] == 'C'  # The model is free to choose after the opening.
        assert second['action_sources']['a'] == 'model'
        assert second['decisions']['a']['payload']['state']['history'][0]['your_action'] == opening
        if match['opponent'] == 'another_jev':
            assert first['b'] == 'C'  # The other Jev's opening is unconstrained.
            assert first['decisions']['b']['payload']['state']['history'] == []
            assert first['action_sources']['b'] == 'model'
    assert summary(store, run_id)['totals']['api_attempts'] == 4
    assert store.export(run_id)['run']['config']['initial_move'] == opening


@pytest.mark.parametrize('opening', ['cooperate', 'defect'])
def test_forced_self_play_resumes_without_repeating_opening(tmp_path, opening):
    store, run_id = setup_run(tmp_path, opponents=['another_jev'], initial_move=opening)
    broken = FakeClient(fail_call=1)
    asyncio.run(Runner(store, run_id, client=broken).play())
    match_id = store.matches(run_id)[0]['id']
    assert store.history(match_id) == []
    recovered = FakeClient()
    asyncio.run(Runner(store, run_id, client=recovered).play())
    assert len(recovered.calls) == 3
    assert verify(store, run_id)['passed']
    asyncio.run(Runner(store, run_id, client=recovered).play())
    assert len(recovered.calls) == 3


def test_verifier_rejects_changed_intervention_and_fabricated_response(tmp_path):
    store, run_id = setup_run(tmp_path, opponents=['cooperator'], initial_move='cooperate')
    asyncio.run(Runner(store, run_id, client=FakeClient()).play())
    config = store.get_run(run_id)['config']
    config['initial_move'] = 'defect'
    store.execute('UPDATE runs SET config=? WHERE id=?', (json.dumps(config), run_id))
    assert any('forced opening mismatch' in e for e in verify(store, run_id)['errors'])
    config['initial_move'] = 'cooperate'
    store.execute('UPDATE runs SET config=? WHERE id=?', (json.dumps(config), run_id))
    match_id = store.matches(run_id)[0]['id']
    later = store.decision(match_id, 2, 0)
    store.save_decision(match_id, 1, 0, later['payload'], later['response'], 'C', 1)
    assert any('unexpected decision for forced opening' in e for e in verify(store, run_id)['errors'])


def test_twenty_match_budget_and_matched_seeds(tmp_path):
    free = RunConfig()
    forced = RunConfig(initial_move='defect', max_requests=4960)
    assert free.repetitions == 20
    assert free.scheduled_decisions == 5200
    assert forced.scheduled_decisions == 4960
    with pytest.raises(ValidationError):
        RunConfig(initial_move='defect', max_requests=4959)
    with pytest.raises(ValidationError):
        RunConfig(initial_move='invalid')
    store = Store(tmp_path / 'schedule.sqlite')
    schedules = [store.matches(store.create_run(c.model_dump(), c.initial_move)) for c in (free, forced)]
    assert all(len(matches) == 240 for matches in schedules)
    assert [(m['opponent'], m['repetition'], m['seed']) for m in schedules[0]] == [
        (m['opponent'], m['repetition'], m['seed']) for m in schedules[1]]


def test_legacy_run_without_opening_setting_still_verifies(tmp_path):
    store, run_id = setup_run(tmp_path, opponents=['cooperator'])
    config = store.get_run(run_id)['config']
    del config['initial_move']
    store.execute('UPDATE runs SET config=? WHERE id=?', (json.dumps(config), run_id))
    client = FakeClient()
    asyncio.run(Runner(store, run_id, client=client).play())
    assert len(client.calls) == 2
    assert verify(store, run_id)['passed']


@pytest.mark.parametrize("opening", ["free", "cooperate", "defect"])
def test_add_delayed_betrayal_preserves_results_and_resumes_only_new_matches(tmp_path, opening):
    store = Store(tmp_path / "test.sqlite")
    config = RunConfig(rounds=20, repetitions=2, opponents=["cooperator"], initial_move=opening)
    run_id = store.create_run(config.model_dump(), "Extension")
    asyncio.run(Runner(store, run_id, client=FakeClient()).play())
    originals = store.matches(run_id)
    original_rounds = [store.history(m["id"]) for m in originals]
    original_decisions = store.rows("SELECT * FROM decisions ORDER BY match_id,number")
    store.add_opponent(run_id, "delayed_betrayal")
    assert store.get_run(run_id)["verification"] is None
    assert store.get_run(run_id)["status"] == "queued"
    client = FakeClient()
    asyncio.run(Runner(store, run_id, client=client).play())
    assert len(client.calls) == 2 * (20 - (opening != "free"))
    assert store.matches(run_id)[:2] == originals
    assert [store.history(m["id"]) for m in originals] == original_rounds
    for decision in original_decisions:
        assert store.one("SELECT * FROM decisions WHERE match_id=? AND number=? AND seat=?",
                         (decision["match_id"], decision["number"], decision["seat"])) == decision
    assert verify(store, run_id)["passed"]
    from server.compare import compare
    patterns = compare(store, [run_id])["scenarios"][0]["delayedBetrayal"]
    assert len(patterns) == 1 and patterns[0]["count"] == 2
    assert patterns[0]["matchId"] in {m["id"] for m in store.matches(run_id)[2:]}
    assert patterns[0]["moves"] == ("D" if opening == "defect" else "C") + "C" * 19
    for match in store.matches(run_id)[2:]:
        detail = store.match_detail(match["id"])
        assert "".join(r["b"] for r in detail["rounds"]) == "CCCCCD" + "C" * 14
        # Betrayal first enters the model's observation in round 7; repair in round 8.
        assert detail["rounds"][5]["decisions"]["a"]["payload"]["state"]["history"][-1]["opponent_action"] == "cooperate"
        assert detail["rounds"][6]["decisions"]["a"]["payload"]["state"]["history"][-1]["opponent_action"] == "defect"
        assert detail["rounds"][7]["decisions"]["a"]["payload"]["state"]["history"][-1]["opponent_action"] == "cooperate"
    with pytest.raises(ValueError, match="already scheduled"):
        store.add_opponent(run_id, "delayed_betrayal")
    with pytest.raises(ValueError):
        store.add_opponent(run_id, "unknown")
    assert verify(store, run_id)["passed"]


def test_extension_refuses_active_runs_and_request_limit_overflow(tmp_path):
    store, run_id = setup_run(tmp_path, opponents=["cooperator"], max_requests=2)
    with pytest.raises(ValueError, match="completed run"):
        store.add_opponent(run_id, "delayed_betrayal")
    asyncio.run(Runner(store, run_id, client=FakeClient()).play())
    with pytest.raises(ValueError, match="request limit"):
        store.add_opponent(run_id, "delayed_betrayal")
    assert len(store.matches(run_id)) == 1
    assert store.get_run(run_id)["status"] == "complete"


@pytest.mark.parametrize("opponent", ["bully", "anti_tit_for_tat", "adaptive"])
@pytest.mark.parametrize("opening", ["free", "cooperate", "defect"])
def test_new_strategies_run_and_verify(tmp_path, opponent, opening):
    store = Store(tmp_path / "new-opponents.sqlite")
    config = RunConfig(rounds=20, repetitions=2, opponents=[opponent], initial_move=opening)
    run_id = store.create_run(config.model_dump(), opponent)
    asyncio.run(Runner(store, run_id, client=FakeClient()).play())
    assert verify(store, run_id)["passed"]
    for match in store.matches(run_id):
        rows = store.history(match["id"])
        assert rows[0]["b"] == ("D" if opponent == "bully" else "C")
        if opponent in ("bully", "anti_tit_for_tat"):
            assert all(row["b"] != previous["a"] for previous, row in zip(rows, rows[1:]))
        else:
            assert "".join(row["b"] for row in rows[:11]) == "CCCCCCDDDDD"


def test_extension_can_explicitly_raise_request_cap(tmp_path):
    store, run_id = setup_run(tmp_path, opponents=["cooperator"], max_requests=2)
    asyncio.run(Runner(store, run_id, client=FakeClient()).play())
    store.add_opponent(run_id, "bully", max_requests=4)
    assert store.get_run(run_id)["config"]["max_requests"] == 4
    client = FakeClient()
    asyncio.run(Runner(store, run_id, client=client).play())
    assert len(client.calls) == 2
    assert verify(store, run_id)["passed"]


@pytest.mark.parametrize("opening", ["free", "cooperate", "defect"])
def test_replace_opponent_archives_recordings_and_runs_only_replacement(tmp_path, opening):
    store = Store(tmp_path / "replacement.sqlite")
    config = RunConfig(rounds=20, repetitions=2, opponents=["cooperator", "joss"], initial_move=opening)
    run_id = store.create_run(config.model_dump(), "Replace Joss")
    asyncio.run(Runner(store, run_id, client=FakeClient()).play())
    before = store.matches(run_id)
    originals = {m["id"]: store.history(m["id"]) for m in before}
    attempts = store.rows("SELECT * FROM attempts WHERE run_id=?", (run_id,))
    for invalid_old, invalid_new in (("missing", "adaptive"), ("joss", "cooperator"), ("joss", "unknown")):
        with pytest.raises(ValueError):
            store.replace_opponent(run_id, invalid_old, invalid_new)
        assert store.matches(run_id) == before
    archived = store.replace_opponent(run_id, "joss", "adaptive")
    assert verify(store, archived)["passed"]
    assert store.get_run(run_id)["config"]["opponents"] == ["cooperator", "adaptive"]
    assert store.get_run(run_id)["verification"] is None
    assert store.get_run(run_id)["status"] == "queued"
    assert [m["number"] for m in store.matches(run_id)] == [1, 2, 3, 4]
    client = FakeClient()
    asyncio.run(Runner(store, run_id, client=client).play())
    assert len(client.calls) == 2 * (20 - (opening != "free"))
    assert verify(store, run_id)["passed"]
    for match_id, history in originals.items():
        assert store.history(match_id) == history
    for attempt in attempts:
        actual = store.one("SELECT * FROM attempts WHERE id=?", (attempt["id"],))
        expected_run = archived if any(m["id"] == attempt["match_id"] and m["opponent"] == "joss" for m in before) else run_id
        assert actual == {**attempt, "run_id": expected_run}
    from server.publish import publish
    output = tmp_path / "public"
    publish([run_id], store.path, output)
    assert all("joss" not in p.read_text() for p in output.rglob("*.json"))
    assert not any((output / f"matches/{m['id']}.json").exists() for m in before if m["opponent"] == "joss")
