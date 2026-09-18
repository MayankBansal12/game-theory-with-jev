# Verification

## Game and persistence

`python -m pytest -q`: **10 passed**.

Coverage includes independent payoff examples, Tit for Two Tats, Win–Stay Lose–Shift, repeatable random moves, both player perspectives, fresh match histories, simultaneous observations, interrupted Jev vs another Jev recovery, score tamper detection, and replay/CSV endpoints without inference.

## Real tournament

Run `33654f59990b`: **40 matches, 800 rounds, 900 saved Jev decisions, 900 API attempts, zero failures**. The main verifier passed every scheduled match and decision. A separate audit reconstructed scores and pre-round totals directly from HTTP-exported JSON, using an independent literal payoff table. Its CSV contained exactly 800 data rows. Browser use left the run at 900 API attempts.

- Full data: `data/exports/first-encounters.json`
- Round data: `data/exports/first-encounters.csv`
- Independent audit: `data/exports/export-audit.json`

## Browser

Validated with agent-browser through Chromium CDP at **1440 × 1050** and **390 × 844**.

- The 40-match archive filters to exactly five Jev vs another Jev games.
- Score/cooperation charts switch correctly.
- Experiment details open and dismiss with Escape.
- Match links work with keyboard navigation and open at the top of the replay.
- Replay advances, pauses, jumps to the final round, and scrubs with the keyboard.
- Game 8 finishes at 19:24; its round-20 input has 19 historical rounds and pre-round scores 18:23.
- Another Jev’s inspector reverses those scores to 23:18 and reverses the action perspective.
- Exact state, criteria, and raw response tabs work.
- The mobile page has no document-wide horizontal overflow; the move strip scrolls to the selected round.
- CSV returns an attachment with 800 rows, verified both through browser fetch and HTTP export. Agent-browser’s file-download helper could not locate its saved browser file; this was a tooling limitation, so that helper is not counted as a passing check.
- No browser page errors were reported.

The final production build passed TypeScript and Vite compilation. The web server is read-only: starting runs through its HTTP API returns 405, and private environment paths do not expose their contents.

Screenshots: [tournament](screenshots/tournament.png), [mobile replay](screenshots/replay-mobile.png).

The local server runs on port 8931; its PID and log are in `data/server.pid` and `data/server.log`. The user approved the preview on September 18, 2026. The site is shared at https://mayank--8931.getbb.app through BB Connect.

## Player leaderboard update

The leaderboard now includes Jev across all matches and each opponent against Jev, ranked by each player’s own average points per round. Rows show total points and wins/losses/draws from that player’s perspective.

The production build passed. Browser checks independently recomputed and verified all nine displayed rows from the completed match scores. Selecting Always Defect showed its five matches; selecting Jev restored all forty. The mobile layout was checked at 390 × 844 with no document or table overflow. The recorded API attempt count remained 900.
