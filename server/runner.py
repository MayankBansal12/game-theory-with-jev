import asyncio
import json
import time
import sqlite3

from dotenv import load_dotenv
from typesafe_sdk import AsyncTypeSafeClient, Choice, RetryPolicy

from .game import ACTIONS, observation, scripted_action
from .store import ROOT, Store, now

load_dotenv(ROOT / ".env.local")


class Paused(Exception):
    pass


class Runner:
    def __init__(self, store, run_id, client=None, concurrency=4):
        self.store = store
        self.run_id = run_id
        self.run = store.get_run(run_id)
        self.config = self.run["config"]
        self.client = client
        self.owns_client = client is None
        self.match_slots = asyncio.Semaphore(concurrency)
        self.api_slots = asyncio.Semaphore(concurrency)
        self.budget_lock = asyncio.Lock()

    def ensure_active(self):
        if self.store.get_run(self.run_id)["status"] != "running":
            raise Paused()

    async def decide(self, match, history, seat):
        number = len(history) + 1
        payload = {"model": self.config["model"],
                   "state": observation(history, self.config["rounds"], seat),
                   "questions": self.config["questions"]}
        saved = self.store.decision(match["id"], number, seat)
        if saved:
            if saved["payload"] != payload:
                raise ValueError("Saved decision does not match the current observation")
            return saved["action"]
        question = self.config["questions"]["next_move"]
        for retry in range(3):
            self.ensure_active()
            async with self.api_slots:
                self.ensure_active()
                async with self.budget_lock:
                    count = self.store.one("SELECT COUNT(*) AS n FROM attempts WHERE run_id=?", (self.run_id,))["n"]
                    if count >= self.config["max_requests"]:
                        raise RuntimeError("Request limit reached")
                    attempt = self.store.execute(
                        "INSERT INTO attempts(run_id,match_id,number,seat,status,created_at) VALUES(?,?,?,?,?,?)",
                        (self.run_id, match["id"], number, seat, "started", now()))
                started = time.perf_counter()
                try:
                    response = await self.client.system_one(
                        state=payload["state"],
                        questions={"next_move": Choice(instructions=question["instructions"], criteria=question["criteria"])},
                        model=self.config["model"],
                        retry=RetryPolicy(max_retries=0), timeout=30,
                    )
                    raw = response.raw_http_response.json()
                    answer = raw["answers"]["next_move"]
                    action = ACTIONS[answer["choice"]]
                    probabilities = answer["probabilities"]
                    if set(probabilities) != set(ACTIONS) or any(not 0 <= p <= 1 for p in probabilities.values()):
                        raise ValueError("Invalid probability distribution")
                    if abs(sum(probabilities.values()) - 1) > 0.001:
                        raise ValueError("Probabilities do not sum to one")
                    if raw["model"] != self.config["model"]:
                        raise ValueError("Returned model does not match the pinned model")
                    self.store.save_decision(match["id"], number, seat, payload, raw,
                                             action, (time.perf_counter()-started)*1000)
                    self.store.execute("UPDATE attempts SET status='complete' WHERE id=?", (attempt,))
                    return action
                except Exception as error:
                    status = getattr(error, "status_code", None)
                    safe_error = type(error).__name__ + (f" (HTTP {status})" if status else "")
                    self.store.execute("UPDATE attempts SET status='failed',error=? WHERE id=?", (safe_error, attempt))
                    if retry == 2 or status in (400, 401, 403, 404, 422) or isinstance(error, (ValueError, KeyError, sqlite3.Error)):
                        raise RuntimeError(safe_error) from None
            await asyncio.sleep(0.7 * 2**retry)
        raise RuntimeError("Decision unavailable")

    async def play_match(self, match):
        async with self.match_slots:
            if match["status"] == "complete":
                return
            try:
                self.ensure_active()
                self.store.execute("UPDATE matches SET status='running',error=NULL WHERE id=?", (match["id"],))
                history = self.store.history(match["id"])
                while len(history) < self.config["rounds"]:
                    self.ensure_active()
                    # Both observations come from this same completed history.
                    if match["opponent"] == "another_jev":
                        decisions = await asyncio.gather(self.decide(match, history, 0),
                                                         self.decide(match, history, 1), return_exceptions=True)
                        for decision in decisions:
                            if isinstance(decision, BaseException):
                                raise decision
                        a, b = decisions
                    else:
                        b = scripted_action(match["opponent"], history, match["seed"])
                        a = await self.decide(match, history, 0)
                    self.store.append_round(match["id"], len(history)+1, a, b)
                    history = self.store.history(match["id"])
                self.store.execute("UPDATE matches SET status='complete' WHERE id=?", (match["id"],))
            except Paused:
                self.store.execute("UPDATE matches SET status='paused' WHERE id=?", (match["id"],))
            except Exception as error:
                # Never include request headers or credentials in logged errors.
                message = str(error) if isinstance(error, RuntimeError) else type(error).__name__
                self.store.execute("UPDATE matches SET status='failed',error=? WHERE id=?", (message, match["id"],))

    async def play(self):
        self.store.execute("UPDATE runs SET status='running',completed_at=NULL,verification=NULL WHERE id=?", (self.run_id,))
        if self.owns_client:
            self.client = AsyncTypeSafeClient(model=self.config["model"], retry=RetryPolicy(max_retries=0), timeout=30)
        try:
            await asyncio.gather(*(self.play_match(m) for m in self.store.matches(self.run_id)))
            matches = self.store.matches(self.run_id)
            if all(m["status"] == "complete" for m in matches):
                self.store.execute("UPDATE runs SET status='complete',completed_at=? WHERE id=?", (now(), self.run_id))
                from .verify import verify
                result = verify(self.store, self.run_id)
                self.store.execute("UPDATE runs SET verification=? WHERE id=?", (json.dumps(result), self.run_id))
                if not result["passed"]:
                    self.store.execute("UPDATE runs SET status='invalid' WHERE id=?", (self.run_id,))
            elif self.store.get_run(self.run_id)["status"] != "paused":
                self.store.execute("UPDATE runs SET status='incomplete' WHERE id=?", (self.run_id,))
        finally:
            if self.owns_client:
                await self.client.aclose()
