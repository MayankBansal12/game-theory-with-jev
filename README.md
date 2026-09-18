# Jev plays game theory

An analysis page and match archive for Jev playing the iterated prisoner’s dilemma.

**Stack:** Python / FastAPI / SQLite; React / TypeScript / Vite / Recharts.

## Open the results

[Open the live analysis](https://game-theory-with-jev.vercel.app). The local preview also runs on port **8931**. See [the first run](docs/first-run.md) for the recorded findings.

The page introduces the game and experiment, presents concise findings alongside score and cooperation charts, and explains the environment constraints and observed strategy patterns. The player leaderboard includes Jev and all opponents, ranked by each player’s average points per round, with a W/D/L record from that player’s perspective. The match archive opens at the final round and supports replay from the beginning, with each call’s exact state, criteria, probabilities, and raw response. JSON and CSV exports are available from the page. Browsing is read-only and makes no Jev calls.

## Run locally

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.lock
npm ci --prefix web
npm run build --prefix web
.venv/bin/python -m uvicorn server.app:app --host 0.0.0.0 --port 8931
```

To run new matches, put `TYPESAFE_API_KEY` in `.env.local`. It stays on the server. Viewing saved results does not need a key.

```bash
# Full run: 40 matches, 800 rounds, 900 Jev decisions.
.venv/bin/python -m server.cli run --name 'First encounters'

# Small run: 2 matches, 6 joint rounds, 9 Jev decisions.
.venv/bin/python -m server.cli run --rounds 3 --repetitions 1 \
  --opponents tit_for_tat another_jev --name 'Quick check'

# Resume the same run after an interruption, reusing saved decisions.
.venv/bin/python -m server.cli resume RUN_ID

.venv/bin/python -m server.cli verify RUN_ID
.venv/bin/python -m server.cli summary RUN_ID
.venv/bin/python -m server.cli export RUN_ID data/export.json
```

Run only one runner for a given run at a time. Published experiments are listed in `web/src/experiments.ts`. Add a saved run ID, experiment number, recorded analysis snapshot, and its own findings and constraints there, then rebuild to include it in the header selector. The Experiment 0 snapshot in `web/src/recorded/experiment-0.json` contains the 40 matches’ recorded moves, both players’ cumulative scores, and the primary Jev seat’s choice probabilities and confidence. The cooperation-by-round, move-pattern, reward, self-play, and preference figures are calculated from this snapshot; new model calls are not needed to render them. The connection-check run remains stored but is excluded from the page. Published active runs update live. The default request cap is 1,100 attempts. Calls have 30-second timeouts, at most three attempts, and at most four concurrent requests. Authentication and invalid-response errors stop that match without retries. An interrupted request whose response was never saved may need another API call on resume.

## Deploy to Vercel

Vercel serves the built page and a static copy of the published results. It needs no Python server, database, API key, or Jev calls. The checked-in files under `web/public/recorded/` contain Experiment 0’s run summary, all 40 replays with exact inputs and responses, and the CSV and JSON downloads. Only explicitly selected runs are exported.

To refresh the public data after recording a new experiment:

```bash
.venv/bin/python -m server.publish --run-id 33654f59990b
```

Repeat `--run-id` for every experiment that should remain published, and add its analysis snapshot and metadata to `web/src/experiments.ts`. The exporter opens SQLite read-only, verifies each completed run, and removes previously generated files for runs no longer selected.

```bash
vercel link --project game-theory-with-jev --scope mayank12 --yes
vercel --prod --yes
```

The root `vercel.json` installs and builds `web`, maps the existing read APIs to static JSON, preserves direct match URLs, and marks exports as downloads. `.vercelignore` excludes local credentials, the database, and the experiment runner. Starting or resuming experiments remains a local CLI operation.

## Experiment

Jev plays five independent, 20-round matches against each of:

- Always Cooperate
- Always Defect
- Random (seeded 50/50)
- Tit for Tat
- Tit for Two Tats
- Grim Trigger
- Win–Stay, Lose–Shift
- Another Jev

Only matches involving Jev are scheduled. This is a matchup experiment, not a reproduction of Axelrod’s full round robin. The leaderboard ranks players by their own average points per round. Jev’s row combines its 40 matches; each other row covers five matches against Jev. Wins, draws, and losses use the row’s player perspective. The different schedules are stated beneath the table. Jev’s objective was total match points.

| You / opponent | Cooperate | Defect |
| --- | --- | --- |
| Cooperate | 3 / 3 | 0 / 5 |
| Defect | 5 / 0 | 1 / 1 |

Every decision receives the payoff rules, known horizon, current round, cumulative scores, and full completed history from that player’s perspective. The opponent’s identity, current choice, seeds, and previous predictions are hidden. No memory carries between matches. There is no action noise. We execute the API’s returned choice; we do not sample its probabilities ourselves.

For **Jev vs another Jev**, two separate calls receive the same completed history from opposite perspectives. Neither receives the other’s current decision. Both decisions are saved before a joint round is committed. Aggregate Jev results consistently use the first seat; the second seat is the opponent.

Model and prompt are pinned to `jev-1.13.0` and prompt `1.0`. The objective and criteria are in `server/game.py` and saved with every decision. To investigate new criteria, introduce a new prompt version and configuration explicitly; existing runs remain immutable records. Model responses can differ for identical states; seeded reference strategies do not make the API deterministic.

## Data and checks

`data/tournament.sqlite` stores runs, matches, rounds, individual responses, and attempts. Each saved response includes the normalized input, raw response body, probabilities, token usage, and latency. Keys and HTTP authorization headers are not stored in results. Failed requests are counted separately. Completed-match averages exclude partial matches.

```bash
.venv/bin/python -m pytest -q
.venv/bin/python -m server.cli verify 33654f59990b
npm run build --prefix web
```

The verifier checks the schedule, 20 rounds per match, payoff arithmetic, cumulative scores, baseline moves, response choices, model version, probabilities, and exact pre-round observations. Tests include independent payoff examples, player perspectives, interrupted two-player recovery, tamper detection, and replay/export without model calls.

Browser validation used `agent-browser` at desktop and mobile widths. See [verification notes](docs/verification.md).

The visual treatment follows [chess.mayank.fyi/tournament](https://chess.mayank.fyi/tournament). Learn about the model at [TypeSafe](https://typesafe.ai/blog/introducing-system-one-models-and-jev). Jev avatars use the [official TypeSafe icon](https://framerusercontent.com/images/kcuF2BEp5XaVfkmFB634IPRKQH0.png) linked by [typesafe.ai](https://typesafe.ai).
