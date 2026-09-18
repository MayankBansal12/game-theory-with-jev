import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB = ROOT / "data" / "tournament.sqlite"


def now():
    return datetime.now(timezone.utc).isoformat()


class Store:
    def __init__(self, path=DEFAULT_DB):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connection() as db:
            db.executescript("""
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS runs (
                    id TEXT PRIMARY KEY, name TEXT NOT NULL, config TEXT NOT NULL,
                    status TEXT NOT NULL, created_at TEXT NOT NULL, completed_at TEXT,
                    verification TEXT
                );
                CREATE TABLE IF NOT EXISTS matches (
                    id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id),
                    number INTEGER NOT NULL, opponent TEXT NOT NULL, repetition INTEGER NOT NULL,
                    seed INTEGER NOT NULL, status TEXT NOT NULL, error TEXT,
                    UNIQUE(run_id, opponent, repetition)
                );
                CREATE TABLE IF NOT EXISTS rounds (
                    match_id TEXT NOT NULL REFERENCES matches(id), number INTEGER NOT NULL,
                    a TEXT NOT NULL, b TEXT NOT NULL, reward_a INTEGER NOT NULL, reward_b INTEGER NOT NULL,
                    score_a INTEGER NOT NULL, score_b INTEGER NOT NULL, created_at TEXT NOT NULL,
                    PRIMARY KEY(match_id, number)
                );
                CREATE TABLE IF NOT EXISTS decisions (
                    match_id TEXT NOT NULL REFERENCES matches(id), number INTEGER NOT NULL,
                    seat INTEGER NOT NULL, payload TEXT NOT NULL, response TEXT NOT NULL,
                    action TEXT NOT NULL, latency_ms REAL NOT NULL,
                    input_tokens INTEGER NOT NULL, output_tokens INTEGER NOT NULL, created_at TEXT NOT NULL,
                    PRIMARY KEY(match_id, number, seat)
                );
                CREATE TABLE IF NOT EXISTS attempts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL,
                    match_id TEXT NOT NULL, number INTEGER NOT NULL, seat INTEGER NOT NULL,
                    status TEXT NOT NULL, error TEXT, created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS matches_run ON matches(run_id);
            """)

    def connection(self):
        db = sqlite3.connect(self.path, timeout=15)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        return db

    def rows(self, query, args=()):
        with self.connection() as db:
            return [dict(row) for row in db.execute(query, args)]

    def one(self, query, args=()):
        rows = self.rows(query, args)
        return rows[0] if rows else None

    def execute(self, query, args=()):
        with self.connection() as db:
            cur = db.execute(query, args)
            return cur.lastrowid

    def create_run(self, config, name):
        from .game import seed_for
        run_id = uuid.uuid4().hex[:12]
        with self.connection() as db:
            db.execute("INSERT INTO runs VALUES(?,?,?,?,?,?,?)",
                       (run_id, name, json.dumps(config), "queued", now(), None, None))
            number = 0
            for repetition in range(1, config["repetitions"] + 1):
                for opponent in config["opponents"]:
                    number += 1
                    match_id = uuid.uuid4().hex[:12]
                    db.execute("INSERT INTO matches VALUES(?,?,?,?,?,?,?,?)",
                               (match_id, run_id, number, opponent, repetition,
                                seed_for(config["seed"], opponent, repetition) % (2**62),
                                "queued", None))
        return run_id

    def get_run(self, run_id):
        row = self.one("SELECT * FROM runs WHERE id=?", (run_id,))
        if row:
            row["config"] = json.loads(row["config"])
            row["verification"] = json.loads(row["verification"]) if row["verification"] else None
        return row

    def matches(self, run_id):
        return self.rows("""
            SELECT m.*, COUNT(r.number) AS rounds_played,
                   COALESCE(SUM(r.reward_a),0) AS score_a, COALESCE(SUM(r.reward_b),0) AS score_b,
                   COALESCE(SUM(r.a='C'),0) AS cooperations_a,
                   COALESCE(SUM(r.b='C'),0) AS cooperations_b,
                   COALESCE(SUM(r.a='C' AND r.b='C'),0) AS mutual_cooperations
            FROM matches m LEFT JOIN rounds r ON r.match_id=m.id
            WHERE m.run_id=? GROUP BY m.id ORDER BY m.number
        """, (run_id,))

    def history(self, match_id):
        return self.rows("SELECT * FROM rounds WHERE match_id=? ORDER BY number", (match_id,))

    def decision(self, match_id, number, seat):
        row = self.one("SELECT * FROM decisions WHERE match_id=? AND number=? AND seat=?",
                       (match_id, number, seat))
        return self.decode_decision(row) if row else None

    @staticmethod
    def decode_decision(row):
        row["payload"] = json.loads(row["payload"])
        row["response"] = json.loads(row["response"])
        return row

    def save_decision(self, match_id, number, seat, payload, response, action, latency_ms):
        usage = response.get("usage", {})
        self.execute("INSERT INTO decisions VALUES(?,?,?,?,?,?,?,?,?,?)",
                     (match_id, number, seat, json.dumps(payload), json.dumps(response), action,
                      latency_ms, usage.get("input_tokens", 0), usage.get("output_tokens", 0), now()))
        return self.decision(match_id, number, seat)

    def append_round(self, match_id, number, a, b):
        from .game import reward
        points = reward(a, b)
        with self.connection() as db:
            last = db.execute("SELECT number,score_a,score_b FROM rounds WHERE match_id=? ORDER BY number DESC LIMIT 1",
                              (match_id,)).fetchone()
            expected = last["number"] + 1 if last else 1
            if number != expected:
                raise ValueError("Nonconsecutive round")
            db.execute("INSERT INTO rounds VALUES(?,?,?,?,?,?,?,?,?)",
                       (match_id, number, a, b, *points,
                        (last["score_a"] if last else 0) + points[0],
                        (last["score_b"] if last else 0) + points[1], now()))

    def match_detail(self, match_id):
        match = self.one("SELECT * FROM matches WHERE id=?", (match_id,))
        if not match:
            return None
        run = self.get_run(match["run_id"])
        rounds = self.history(match_id)
        decisions = self.rows("SELECT * FROM decisions WHERE match_id=? ORDER BY number,seat", (match_id,))
        indexed = {(d["number"], d["seat"]): self.decode_decision(d) for d in decisions}
        for row in rounds:
            row["decisions"] = {"a": indexed.get((row["number"], 0)),
                                "b": indexed.get((row["number"], 1))}
        return {**match, "config": run["config"], "run_name": run["name"], "rounds": rounds}

    def export(self, run_id):
        run = self.get_run(run_id)
        return {"schema_version": 1, "run": run,
                "matches": [self.match_detail(m["id"]) for m in self.matches(run_id)],
                "attempts": self.rows("SELECT * FROM attempts WHERE run_id=? ORDER BY id", (run_id,))}
