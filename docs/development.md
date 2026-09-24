# Development guide

Commands below run from the repository root. For the experiment setup and findings, see the [README](../README.md).

The app uses Python, FastAPI, and SQLite for recording matches, with React, TypeScript, Vite, and Recharts for the analysis page.

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
# v1 free-opening scenario: 240 matches, 4,800 rounds, 5,200 model decisions.
.venv/bin/python -m server.cli run --name 'Twenty repetitions — free opening'

# v1 forced-opening scenarios: 240 matches and 4,960 model decisions each.
.venv/bin/python -m server.cli run --initial-move cooperate --name 'Cooperate first'
.venv/bin/python -m server.cli run --initial-move defect --name 'Defect first'

# Inspect the schedule without creating records or calling the API.
.venv/bin/python -m server.cli run --initial-move cooperate --dry-run

# Reproduce the original schedule (new model calls, not the original results).
.venv/bin/python -m server.cli run --repetitions 5 --name 'Pilot replication' \
  --opponents cooperator defector random tit_for_tat tit_for_two_tats grim pavlov another_jev

# Small run: 2 matches, 6 joint rounds, 9 Jev decisions.
.venv/bin/python -m server.cli run --rounds 3 --repetitions 1 \
  --opponents tit_for_tat another_jev --name 'Quick check'

# Append only Delayed Betrayal to a completed eight-opponent run.
# Existing decisions, match IDs, and scores are preserved. Resume runs the new matches.
.venv/bin/python -m server.cli extend RUN_ID --opponent delayed_betrayal

# Add a new opponent with a larger explicit cap, then resume.
.venv/bin/python -m server.cli extend RUN_ID --opponent bully --max-requests 6400

# Replace a completed opponent, preserving its recordings in an unpublished local archive.
.venv/bin/python -m server.cli replace RUN_ID --old-opponent joss --new-opponent adaptive

# Resume the same run after an interruption, reusing saved decisions.
.venv/bin/python -m server.cli resume RUN_ID

.venv/bin/python -m server.cli verify RUN_ID
.venv/bin/python -m server.cli summary RUN_ID
.venv/bin/python -m server.cli export RUN_ID data/export.json
```

Run only one runner for a given run at a time. The two versions are listed in `web/src/experiments.ts`. v0 has one run; v1 groups three saved runs in its `scenarios` list. The header selects a version, and v1’s scenario tabs select the run. Existing `?run=` links and direct match URLs still work. The default page opens v1. Keep a version’s findings and constraints tied to its own records. The Experiment 0 snapshot in `web/src/recorded/experiment-0.json` contains the 40 matches’ recorded moves, both players’ cumulative scores, and the primary Jev seat’s choice probabilities and confidence. The cooperation-by-round, move-pattern, reward, self-play, and preference figures are calculated from this snapshot; new model calls are not needed to render them. The connection-check run remains stored but is excluded from the page. Published active runs update live. The default request cap is 6,400 attempts per run, configurable with `--max-requests`. Forced openings consume no requests. Historical runs retain their saved request caps. Calls have 30-second timeouts, at most three attempts, and at most four concurrent requests. Authentication and invalid-response errors stop that match without retries. An interrupted request whose response was never saved may need another API call on resume.

## Deploy to Vercel

Vercel serves the built page and a static copy of the published results. It needs no Python server, database, API key, or Jev calls. The checked-in files under `web/public/recorded/` contain v0 and all three v1 scenario summaries, 760 replays with exact inputs and responses, and the CSV and JSON downloads. Only explicitly selected runs are exported.

To refresh the public data after recording a new experiment:

```bash
.venv/bin/python -m server.publish --run-id 33654f59990b
```

Repeat `--run-id` for every scenario run that should remain published, and group its metadata under the appropriate version in `web/src/experiments.ts`. To regenerate the current opening comparison and all published archives:

```bash
.venv/bin/python -m server.compare \
  --run-id bc6f79c6d8f0 --run-id 1a47c3b89898 --run-id 2fbbe57b0d35 \
  --output web/src/recorded/opening-study.json
.venv/bin/python -m server.publish \
  --run-id 33654f59990b --run-id bc6f79c6d8f0 \
  --run-id 1a47c3b89898 --run-id 2fbbe57b0d35
```

See [the study design and results](v1.md) for intervention semantics, request counts, comparison measures, and the Delayed Betrayal rule. The exporter opens SQLite read-only, verifies each completed run, and removes previously generated files for runs no longer selected.

```bash
vercel link --project game-theory-with-jev --scope mayank12 --yes
vercel --prod --yes
```

The root `vercel.json` installs and builds `web`, maps the existing read APIs to static JSON, preserves direct match URLs, and marks exports as downloads. `.vercelignore` excludes local credentials, the database, and the experiment runner. Starting or resuming experiments remains a local CLI operation.

## Data and checks

`data/tournament.sqlite` stores runs, matches, rounds, individual responses, and attempts. Each saved response includes the normalized input, raw response body, probabilities, token usage, and latency. Keys and HTTP authorization headers are not stored in results. Failed requests are counted separately. Completed-match averages exclude partial matches.

```bash
.venv/bin/python -m pytest -q
.venv/bin/python -m server.cli verify 33654f59990b
npm run build --prefix web
```

The verifier checks the schedule, 20 rounds per match, payoff arithmetic, cumulative scores, baseline moves, response choices, model version, probabilities, and exact pre-round observations. Tests include independent payoff examples, player perspectives, interrupted two-player recovery, tamper detection, and replay/export without model calls.

Browser validation used `agent-browser` at desktop and mobile widths. See [verification notes](verification.md).

The visual treatment follows [chess.mayank.fyi/tournament](https://chess.mayank.fyi/tournament). Learn about the model at [TypeSafe](https://typesafe.ai/blog/introducing-system-one-models-and-jev). Jev avatars use the [official TypeSafe icon](https://framerusercontent.com/images/kcuF2BEp5XaVfkmFB634IPRKQH0.png) linked by [typesafe.ai](https://typesafe.ai).
