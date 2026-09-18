from server.game import observation, reward, scripted_action


def simulate(a, b, turns=200):
    history = []
    for _ in range(turns):
        ca = scripted_action(a, history, 17, 0)
        cb = scripted_action(b, history, 23, 1)
        history.append({"a": ca, "b": cb})
    return tuple(sum(reward(r["a"], r["b"])[seat] for r in history) for seat in (0, 1))


def test_reference_scores():
    assert simulate("cooperator", "cooperator") == (600, 600)
    assert simulate("defector", "defector") == (200, 200)
    assert simulate("defector", "cooperator") == (1000, 0)
    assert simulate("tit_for_tat", "tit_for_tat") == (600, 600)
    assert simulate("tit_for_tat", "defector") == (199, 204)
    assert simulate("tit_for_two_tats", "defector") == (198, 208)


def test_two_tats_requires_consecutive_defections():
    assert scripted_action("tit_for_two_tats", [{"a": "D", "b": "C"}], 0) == "C"
    assert scripted_action("tit_for_two_tats", [{"a": "D", "b": "C"}, {"a": "C", "b": "C"}, {"a": "D", "b": "C"}], 0) == "C"
    assert scripted_action("tit_for_two_tats", [{"a": "D", "b": "C"}, {"a": "D", "b": "C"}], 0) == "D"
    assert scripted_action("tit_for_two_tats", [{"a": "D", "b": "C"}, {"a": "D", "b": "C"}, {"a": "C", "b": "D"}], 0) == "C"


def test_pavlov_uses_own_reward():
    for a, b, expected in [("C", "C", "C"), ("D", "C", "D"), ("C", "D", "D"), ("D", "D", "C")]:
        assert scripted_action("pavlov", [{"a": a, "b": b}], 0, 0) == expected


def test_perspective_and_initial_state():
    first = observation([], 20, 0)
    assert first["history"] == []
    assert first["current_round"] == 1
    assert first["cumulative_points"] == {"you": 0, "opponent": 0}
    state = observation([{"a": "C", "b": "D"}, {"a": "D", "b": "D"}], 20, 1)
    assert state["current_round"] == 3
    assert state["cumulative_points"] == {"you": 6, "opponent": 1}
    assert state["history"][0] == {"round": 1, "your_action": "defect", "opponent_action": "cooperate", "your_points": 5, "opponent_points": 0}
    assert set(state) == {"rules", "current_round", "cumulative_points", "history"}


def test_random_resumes_without_changing_future_actions():
    history = [{"a": "C", "b": "C"} for _ in range(10)]
    assert scripted_action("random", history, 12) == scripted_action("random", list(history), 12)
