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


def test_delayed_betrayal_schedule_is_independent_of_opponent_and_seed():
    for seat in (0, 1):
        for seed in (0, 42):
            for other_move in ("C", "D"):
                history = []
                actions = []
                for _ in range(20):
                    action = scripted_action("delayed_betrayal", history, seed, seat)
                    actions.append(action)
                    history.append({"a": action if seat == 0 else other_move,
                                    "b": action if seat == 1 else other_move})
                assert "".join(actions) == "CCCCCD" + "C" * 14
    assert simulate("cooperator", "delayed_betrayal", turns=20) == (57, 62)
    assert simulate("tit_for_tat", "delayed_betrayal", turns=20) == (59, 59)


def test_bully_and_anti_tit_for_tat_reference_scores_and_both_seats():
    assert simulate("cooperator", "bully", turns=20) == (0, 100)
    assert simulate("cooperator", "anti_tit_for_tat", turns=20) == (3, 98)
    assert simulate("defector", "bully", turns=20) == (96, 1)
    assert simulate("defector", "anti_tit_for_tat", turns=20) == (100, 0)
    for seat in (0, 1):
        for strategy, first in (("bully", "D"), ("anti_tit_for_tat", "C")):
            assert scripted_action(strategy, [], 42, seat) == first
            for own in ("C", "D"):
                for other in ("C", "D"):
                    row = {"a": own if seat == 0 else other, "b": own if seat == 1 else other}
                    assert scripted_action(strategy, [row], 42, seat) == ("D" if other == "C" else "C")


def test_joss_opens_cooperatively_and_always_retaliates():
    assert simulate("defector", "joss", turns=20) == (24, 19)
    for seat in (0, 1):
        assert scripted_action("joss", [], 42, seat) == "C"
        for own in ("C", "D"):
            row = {"a": own if seat == 0 else "D", "b": own if seat == 1 else "D"}
            assert scripted_action("joss", [row], 42, seat) == "D"


def test_joss_probability_boundary_and_reproducible_probes():
    from unittest.mock import patch
    for seat in (0, 1):
        for draw, expected in ((0, "C"), (0.899999, "C"), (0.9, "D"), (0.999999, "D")):
            with patch("server.game.random.Random") as rng:
                rng.return_value.random.return_value = draw
                assert scripted_action("joss", [{"a": "C", "b": "C"}], 42, seat) == expected
    actions = []
    for seed in range(20):
        for index in range(1, 20):
            history = [{"a": "C", "b": "C"}] * index
            action = scripted_action("joss", history, seed)
            assert action == scripted_action("joss", list(history), seed)
            actions.append(action)
    assert "C" in actions and "D" in actions


def test_adaptive_opening_and_reference_scores():
    for seat in (0, 1):
        for number in range(11):
            history = [{"a": "D", "b": "D"}] * number
            assert scripted_action("adaptive", history, 42, seat) == ("C" if number < 6 else "D")
    assert simulate("cooperator", "adaptive", turns=20) == (18, 88)
    assert simulate("defector", "adaptive", turns=20) == (44, 14)
    assert simulate("tit_for_tat", "adaptive", turns=20) == (51, 51)


def test_adaptive_uses_own_total_points_and_defects_on_ties():
    # Cooperation earned 18 across six rounds; defection earned 17 across five.
    # Average rewards favor D, but Axelrod's implementation compares totals.
    wins_c = [("C", "C")] * 6 + [("D", "C")] * 3 + [("D", "D")] * 2
    # Both actions earned 9 points; the tie goes to D.
    tie = [("C", "C")] * 3 + [("C", "D")] * 3 + [("D", "C")] + [("D", "D")] * 4
    for seat in (0, 1):
        for trace, expected in ((wins_c, "C"), (tie, "D")):
            history = [{"a": own if seat == 0 else other, "b": other if seat == 0 else own} for own, other in trace]
            assert scripted_action("adaptive", history, 42, seat) == expected
            assert scripted_action("adaptive", list(history), 0, seat) == expected
