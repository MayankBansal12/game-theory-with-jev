from .game import BY_ID


def summary(store, run_id):
    run = store.get_run(run_id)
    if not run:
        return None
    matches = store.matches(run_id)
    complete = [m for m in matches if m["status"] == "complete"]
    standings = []
    for opponent in run["config"]["opponents"]:
        group = [m for m in complete if m["opponent"] == opponent]
        n = len(group)
        rounds = sum(m["rounds_played"] for m in group)
        score_a = sum(m["score_a"] for m in group)
        score_b = sum(m["score_b"] for m in group)
        standings.append({
            **BY_ID[opponent], "played": n, "scheduled": run["config"]["repetitions"],
            "wins": sum(m["score_a"] > m["score_b"] for m in group),
            "draws": sum(m["score_a"] == m["score_b"] for m in group),
            "losses": sum(m["score_a"] < m["score_b"] for m in group),
            "score_a": score_a, "score_b": score_b,
            "avg_a": score_a/rounds if rounds else None, "avg_b": score_b/rounds if rounds else None,
            "cooperation_a": sum(m["cooperations_a"] for m in group)/rounds if rounds else None,
            "cooperation_b": sum(m["cooperations_b"] for m in group)/rounds if rounds else None,
            "mutual_cooperation": sum(m["mutual_cooperations"] for m in group)/rounds if rounds else None,
            "repetitions": [{"match_id": m["id"], "repetition": m["repetition"],
                             "score_a": m["score_a"], "score_b": m["score_b"],
                             "avg_a": m["score_a"]/m["rounds_played"], "avg_b": m["score_b"]/m["rounds_played"]}
                            for m in group],
        })
    standings.sort(key=lambda s: -(s["avg_a"] if s["avg_a"] is not None else -1))
    usage = store.one("""
        SELECT COUNT(*) AS decisions,COALESCE(SUM(input_tokens),0) AS input_tokens,
               COALESCE(SUM(output_tokens),0) AS output_tokens,COALESCE(AVG(latency_ms),0) AS avg_latency_ms
        FROM decisions d JOIN matches m ON d.match_id=m.id WHERE m.run_id=?
    """, (run_id,))
    attempts = store.one("SELECT COUNT(*) AS n,SUM(status='failed') AS failed FROM attempts WHERE run_id=?", (run_id,))
    played_rounds = sum(m["rounds_played"] for m in complete)
    points = sum(m["score_a"] for m in complete)
    cooperation = sum(m["cooperations_a"] for m in complete)
    return {
        **run, "standings": standings, "matches": matches,
        "totals": {
            "scheduled_matches": len(matches), "completed_matches": len(complete),
            "rounds_played": sum(m["rounds_played"] for m in matches),
            "scheduled_rounds": len(matches)*run["config"]["rounds"],
            "score_a": points, "avg_a": points/played_rounds if played_rounds else None,
            "cooperation_a": cooperation/played_rounds if played_rounds else None,
            "wins": sum(m["score_a"] > m["score_b"] for m in complete),
            "draws": sum(m["score_a"] == m["score_b"] for m in complete),
            "losses": sum(m["score_a"] < m["score_b"] for m in complete),
            "api_attempts": attempts["n"], "failed_attempts": attempts["failed"] or 0,
            **usage,
        },
    }
