import csv
import json
import sqlite3

import pytest

from server.config import RunConfig
from server.game import observation
from server.publish import ReadOnlyStore, publish
from server.store import Store


def complete_run(store):
    config = RunConfig(rounds=2, repetitions=1, opponents=["cooperator"]).model_dump()
    run_id = store.create_run(config, "Published test")
    match_id = store.matches(run_id)[0]["id"]
    for number in (1, 2):
        payload = {"model": config["model"], "state": observation(store.history(match_id), 2, 0),
                   "questions": config["questions"]}
        response = {"model": config["model"], "answers": {"next_move": {
            "choice": "cooperate", "type": "choice", "confidence": 0.8,
            "probabilities": {"cooperate": 0.9, "defect": 0.1}}},
            "usage": {"input_tokens": 100, "output_tokens": 10}}
        store.save_decision(match_id, number, 0, payload, response, "C", 1)
        store.append_round(match_id, number, "C", "C")
    store.execute("UPDATE matches SET status='complete' WHERE id=?", (match_id,))
    store.execute("UPDATE runs SET status='complete' WHERE id=?", (run_id,))
    return run_id, match_id


def test_publication_preserves_replays_and_excludes_unselected_runs(tmp_path):
    store = Store(tmp_path / "source.sqlite")
    selected, match_id = complete_run(store)
    hidden, hidden_match = complete_run(store)
    output = tmp_path / "site"
    result = publish([selected], store.path, output)
    assert result["rounds"] == 2
    assert [r["id"] for r in json.loads((output / "runs.json").read_text())] == [selected]
    assert json.loads((output / f"matches/{match_id}.json").read_text()) == store.match_detail(match_id)
    assert json.loads((output / f"runs/{selected}/export.json").read_text()) == store.export(selected)
    with (output / f"runs/{selected}/rounds.csv").open(newline="") as f:
        rows = list(csv.DictReader(f))
    assert len(rows) == 2 and rows[-1]["jev_total"] == "6"
    assert not (output / f"runs/{hidden}.json").exists()
    assert not (output / f"matches/{hidden_match}.json").exists()
    # Regeneration also removes artifacts for a previously selected run.
    publish([selected, hidden], store.path, output)
    publish([selected], store.path, output)
    assert not (output / f"matches/{hidden_match}.json").exists()
    assert not (output / f"runs/{hidden}/export.json").exists()


@pytest.mark.parametrize("damage", ["incomplete", "bad_score"])
def test_publication_refuses_unverified_data_before_writing(tmp_path, damage):
    store = Store(tmp_path / "source.sqlite")
    run_id, match_id = complete_run(store)
    if damage == "incomplete":
        store.execute("UPDATE runs SET status='running' WHERE id=?", (run_id,))
    else:
        store.execute("UPDATE rounds SET score_a=99 WHERE match_id=? AND number=1", (match_id,))
    output = tmp_path / "site"
    with pytest.raises(ValueError):
        publish([run_id], store.path, output)
    assert not output.exists()


def test_publication_connection_cannot_write_to_source(tmp_path):
    store = Store(tmp_path / "source.sqlite")
    complete_run(store)
    readonly = ReadOnlyStore(store.path)
    with pytest.raises(sqlite3.OperationalError):
        readonly.execute("DELETE FROM runs")
    assert len(store.rows("SELECT id FROM runs")) == 1


def test_forced_openings_are_explicit_in_exports_and_comparison(tmp_path):
    import asyncio
    from server.compare import compare
    from server.runner import Runner
    from test_runner import FakeClient

    store = Store(tmp_path / 'source.sqlite')
    run_ids = []
    for opening in ('free', 'cooperate', 'defect'):
        config = RunConfig(rounds=2, repetitions=1, opponents=['cooperator'], initial_move=opening)
        run_id = store.create_run(config.model_dump(), opening)
        asyncio.run(Runner(store, run_id, client=FakeClient()).play())
        run_ids.append(run_id)
    report = compare(store, run_ids)
    defect = report['scenarios'][2]
    assert defect['allRounds']['pointsPerRound'] == 4
    assert defect['allRounds']['cooperation'] == 0.5
    assert defect['afterOpening']['pointsPerRound'] == 3
    assert defect['afterOpening']['cooperation'] == 1
    assert defect['returnsToCooperation'] == 1
    assert defect['cooperationByRound'] == [0, 1]
    output = tmp_path / 'site'
    publish(run_ids, store.path, output)
    match_id = store.matches(run_ids[2])[0]['id']
    detail = json.loads((output / f'matches/{match_id}.json').read_text())
    assert detail['rounds'][0]['decisions']['a'] is None
    assert detail['rounds'][0]['action_sources']['a'] == 'forced'
    with (output / f'runs/{run_ids[2]}/rounds.csv').open() as f:
        rows = list(csv.DictReader(f))
    assert rows[0]['jev_action_source'] == 'forced'
    assert rows[0]['initial_move'] == 'defect'
    assert rows[1]['jev_action_source'] == 'model'
    with pytest.raises(ValueError, match='only one run'):
        compare(store, [run_ids[0], run_ids[0]])
    config = store.get_run(run_ids[2])['config']
    config['seed'] = 43
    store.execute('UPDATE runs SET config=? WHERE id=?', (json.dumps(config), run_ids[2]))
    with pytest.raises(ValueError, match='same schedule'):
        compare(store, run_ids)
