"""Pure game rules. No model calls or hidden opponent state."""
import hashlib
import random

MODEL = "jev-1.13.0"
PROMPT_VERSION = "1.0"
INSTRUCTIONS = (
    "Choose your action for the current round to maximize your expected total "
    "points over this entire match. Your opponent chooses simultaneously, so "
    "their current action is unknown. Use the supplied rules and previous "
    "rounds to inform your decision."
)
CRITERIA = {
    "cooperate": "Play cooperate under the supplied payoff rules.",
    "defect": "Play defect under the supplied payoff rules.",
}
QUESTIONS = {"next_move": {"type": "choice", "instructions": INSTRUCTIONS, "criteria": CRITERIA}}
PAYOFF = {("C", "C"): (3, 3), ("C", "D"): (0, 5), ("D", "C"): (5, 0), ("D", "D"): (1, 1)}
LABELS = {"C": "cooperate", "D": "defect"}
ACTIONS = {v: k for k, v in LABELS.items()}
OPPONENTS = [
    {"id": "cooperator", "name": "Always Cooperate", "short": "Cooperator", "description": "Cooperates every round."},
    {"id": "defector", "name": "Always Defect", "short": "Defector", "description": "Defects every round."},
    {"id": "random", "name": "Random", "short": "Random", "description": "A 50/50 choice each round."},
    {"id": "tit_for_tat", "name": "Tit for Tat", "short": "Tit for Tat", "description": "Starts with cooperation, then copies the last move."},
    {"id": "tit_for_two_tats", "name": "Tit for Two Tats", "short": "Two Tats", "description": "Defects only after two consecutive defections."},
    {"id": "grim", "name": "Grim Trigger", "short": "Grim Trigger", "description": "Cooperates until the first defection, then always defects."},
    {"id": "pavlov", "name": "Win–Stay, Lose–Shift", "short": "Win–Stay", "description": "Repeats its move after 3 or 5 points; switches after 0 or 1."},
    {"id": "another_jev", "name": "Another Jev", "short": "Another Jev", "description": "The same model and objective, making independent decisions."},
    {"id": "delayed_betrayal", "name": "Delayed Betrayal", "short": "Delayed Betrayal", "description": "Cooperates for five rounds, defects once in round 6, then cooperates again."},
    {"id": "bully", "name": "Bully", "short": "Bully", "description": "Starts by defecting, then plays the opposite of the opponent’s previous move."},
    {"id": "anti_tit_for_tat", "name": "Anti–Tit for Tat", "short": "Anti–Tit for Tat", "description": "Starts by cooperating, then plays the opposite of the opponent’s previous move."},
    {"id": "adaptive", "name": "Adaptive", "short": "Adaptive", "description": "Cooperates for six rounds, defects for five, then chooses the action that earned more total points. Ties favor defection."},
]
BY_ID = {item["id"]: item for item in OPPONENTS}
# Preserve verification of retired local recordings without listing Joss in the roster.
BY_ID["joss"] = {"id": "joss", "name": "Joss", "short": "Joss", "description": "Starts by cooperating. After cooperation, cooperates 90% of the time; after defection, always defects."}


def reward(a, b):
    return PAYOFF[a, b]


def seed_for(seed, *parts):
    value = ":".join(str(x) for x in (seed, *parts))
    return int(hashlib.sha256(value.encode()).hexdigest()[:16], 16)


def scripted_action(strategy, history, seed, seat=1):
    """history contains only completed public rounds, from fixed A/B seats."""
    if strategy == "cooperator":
        return "C"
    if strategy == "defector":
        return "D"
    if strategy == "delayed_betrayal":
        return "D" if len(history) == 5 else "C"
    if strategy == "adaptive":
        if len(history) < 6:
            return "C"
        if len(history) < 11:
            return "D"
        own_key = "a" if seat == 0 else "b"
        scores = {"C": 0, "D": 0}
        for row in history:
            scores[row[own_key]] += reward(row["a"], row["b"])[seat]
        # Axelrod Adaptive compares accumulated points, not action averages.
        return "C" if scores["C"] > scores["D"] else "D"
    if strategy == "random":
        # Randomness is addressable by round, so interruption changes nothing.
        return "C" if random.Random(seed_for(seed, len(history))).random() < 0.5 else "D"
    if not history:
        return "D" if strategy == "bully" else "C"
    other_key = "b" if seat == 0 else "a"
    own_key = "a" if seat == 0 else "b"
    opponent_moves = [r[other_key] for r in history]
    if strategy in ("bully", "anti_tit_for_tat"):
        return "D" if opponent_moves[-1] == "C" else "C"
    if strategy == "joss":
        if opponent_moves[-1] == "D":
            return "D"
        # Same 90% cooperation rule as Axelrod's FirstByJoss; addressable
        # randomness preserves each round's draw across resume and scenarios.
        return "C" if random.Random(seed_for(seed, len(history))).random() < 0.9 else "D"
    if strategy == "tit_for_tat":
        return opponent_moves[-1]
    if strategy == "tit_for_two_tats":
        return "D" if opponent_moves[-2:] == ["D", "D"] else "C"
    if strategy == "grim":
        return "D" if "D" in opponent_moves else "C"
    if strategy == "pavlov":
        last = history[-1]
        previous = last[own_key]
        points = reward(last["a"], last["b"])[seat]
        return previous if points in (3, 5) else ("D" if previous == "C" else "C")
    raise ValueError("Unknown scripted strategy")


def observation(history, total_rounds, seat):
    """Only public information. No opponent ID, random seed, run ID or predictions."""
    own, other = ("a", "b") if seat == 0 else ("b", "a")
    visible = []
    own_score = other_score = 0
    for index, row in enumerate(history, 1):
        points = reward(row["a"], row["b"])
        own_points, other_points = points[seat], points[1-seat]
        own_score += own_points
        other_score += other_points
        visible.append({
            "round": index,
            "your_action": LABELS[row[own]],
            "opponent_action": LABELS[row[other]],
            "your_points": own_points,
            "opponent_points": other_points,
        })
    return {
        "rules": {
            "total_rounds": total_rounds,
            "moves_are_simultaneous": True,
            "payoffs": [
                {"your_action": LABELS[a], "opponent_action": LABELS[b],
                 "your_points": points[0], "opponent_points": points[1]}
                for (a, b), points in PAYOFF.items()
            ],
        },
        "current_round": len(history) + 1,
        "cumulative_points": {"you": own_score, "opponent": other_score},
        "history": visible,
    }
