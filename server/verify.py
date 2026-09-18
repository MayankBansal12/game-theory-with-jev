"""Independent audit of stored actions, scores, observations, and decision coverage."""
import math
from .game import ACTIONS, observation, reward, scripted_action


def verify(store, run_id):
    run = store.get_run(run_id)
    config = run["config"]
    matches = store.matches(run_id)
    errors = []
    rounds_checked = decisions_checked = 0
    expected = {(o, rep) for o in config["opponents"] for rep in range(1, config["repetitions"]+1)}
    if {(m["opponent"], m["repetition"]) for m in matches} != expected:
        errors.append("Scheduled matches do not match configuration")
    for match in matches:
        history = store.history(match["id"])
        if len(history) != config["rounds"] or match["status"] != "complete":
            errors.append(f'{match["id"]}: incomplete match')
        score_a = score_b = 0
        for index, row in enumerate(history, 1):
            rounds_checked += 1
            if row["number"] != index:
                errors.append(f'{match["id"]}: nonconsecutive round')
            pa, pb = reward(row["a"], row["b"])
            score_a += pa
            score_b += pb
            if (pa, pb, score_a, score_b) != (row["reward_a"], row["reward_b"], row["score_a"], row["score_b"]):
                errors.append(f'{match["id"]}/{index}: score mismatch')
            if match["opponent"] != "another_jev":
                if row["b"] != scripted_action(match["opponent"], history[:index-1], match["seed"]):
                    errors.append(f'{match["id"]}/{index}: scripted opponent mismatch')
            seats = (0, 1) if match["opponent"] == "another_jev" else (0,)
            for seat in seats:
                decision = store.decision(match["id"], index, seat)
                if not decision:
                    errors.append(f'{match["id"]}/{index}/{seat}: missing decision')
                    continue
                decisions_checked += 1
                payload = decision["payload"]
                response = decision["response"]
                answer = response["answers"]["next_move"]
                if payload != {"model": config["model"], "state": observation(history[:index-1], config["rounds"], seat),
                               "questions": config["questions"]}:
                    errors.append(f'{match["id"]}/{index}/{seat}: observation mismatch')
                if response["model"] != config["model"]:
                    errors.append(f'{match["id"]}/{index}/{seat}: model mismatch')
                if decision["action"] != row["a" if seat == 0 else "b"] or ACTIONS.get(answer["choice"]) != decision["action"]:
                    errors.append(f'{match["id"]}/{index}/{seat}: action mismatch')
                ps = answer["probabilities"]
                if set(ps) != set(ACTIONS) or any(not math.isfinite(p) or not 0 <= p <= 1 for p in ps.values()) or abs(sum(ps.values())-1)>0.001:
                    errors.append(f'{match["id"]}/{index}/{seat}: invalid probabilities')
        if (score_a, score_b) != (match["score_a"], match["score_b"]):
            errors.append(f'{match["id"]}: aggregate mismatch')
    total_decisions = store.one("SELECT COUNT(*) AS n FROM decisions d JOIN matches m ON m.id=d.match_id WHERE m.run_id=?", (run_id,))["n"]
    if total_decisions != decisions_checked:
        errors.append("Uncommitted or unexpected decisions remain")
    return {"passed": not errors, "matches_checked": len(matches), "rounds_checked": rounds_checked,
            "decisions_checked": decisions_checked, "errors": errors}
