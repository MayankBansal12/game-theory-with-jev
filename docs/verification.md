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

## Previous player leaderboard update

The earlier leaderboard included Jev across all matches and each opponent against Jev, ranked by each player’s own average points per round. Rows show total points and wins/losses/draws from that player’s perspective.

The production build passed. Browser checks independently recomputed and verified all nine displayed rows from the completed match scores. Selecting Always Defect showed its five matches; selecting Jev restored all forty. The mobile layout was checked at 390 × 844 with no document or table overflow. The recorded API attempt count remained 900.


## Experiment 0 analysis page

The page now presents the game and payoff table, Jev’s setup, three findings with charts and a matchup results table, follow-up experiments, and the 40-match archive. The header shows “Jev plays game theory” and the Experiment 0 selector. The connection check is excluded by the published experiment catalog; its records are retained.

Validation:

- Production TypeScript and Vite build passed. Existing regression suite: **10 passed**.
- The 29 all-defect, 8 all-cooperate, and 3 round-two-switch patterns were independently checked against saved SQLite rounds. Opening choices were 29 defections and 11 cooperations.
- All eight table rows matched the saved Jev/opponent averages and Jev W/D/L records. Filtering to another Jev showed exactly five matches.
- The full setup dialog opened and dismissed with Escape. The score/cooperation chart toggle worked.
- A match opened at round 20 with the correct 19:24 final score and full chart. Replay restarted at round 1. First, intermediate, and last-round navigation worked.
- The selected move has a real border inside its column. Both first and last borders were visually checked at desktop and mobile widths.
- Layouts were checked at 1440 × 1050 and 390 × 844. Mobile had no document or results-table overflow, and the move strip scrolled to show the final selection.
- The browser tool initially cropped the desktop viewport instead of applying mobile layout. Chromium device metrics were set directly over CDP and `innerWidth` plus the mobile media query were verified before accepting the mobile checks.
- No browser page errors. The saved run remained at **900 API attempts**; viewing and testing made no new Jev calls.

The current results table ranks matchups by Jev’s points per round, replacing the earlier mixed player leaderboard. The three test games remain in storage and are absent from experiment navigation and the archive.


## Revised context, player leaderboard, and expanded findings

The player leaderboard has been restored with exactly three columns: Player, Avg pts / round, and W/D/L. Jev is first at 2.28 points, followed by opponents ranked by their own average. Opponent wins and losses are from their own perspective. The page states that Jev’s 40-match schedule differs from each opponent’s five games against Jev.

The opening now explains Jev as TypeSafe’s decision model, the experiment’s question, the repeated-game payoffs, the objective and available information, and the opponent roster. The completion badge and standalone payoff card were removed. The Andon Labs reference informed the progression from setup and results to specific findings with charts.

Added findings and figures:

- Cooperation by round: 11/40 openings (27.5%), then 8/40 (20%) in every later round.
- Three move patterns: 29 all-defect, 8 all-cooperate, 3 switching in round 2. Each pattern links to a recorded example.
- Tit for Tat: two cooperative draws at 60 points versus three wins at 24 points. The cumulative score curves use saved per-round scores, and links open examples of each group.
- Self-play: 98 mutual-defection rounds, 2 mixed rounds, 0 mutual-cooperation rounds.
- Known ending: all 8 matches cooperating in round 19 also cooperated in round 20.

The new snapshot was checked directly against SQLite for all 800 rounds, both action sequences, and both cumulative score sequences. Total points (1,821), defections (637/800), and the final-round counts also matched. The nine leaderboard rows were independently checked against the API summary.

The production build passed. Desktop (1440 × 1050) and mobile (390 × 844) layouts were inspected. The opponent disclosure contained all eight strategies, and the cooperative replay link opened at round 20 with a 60:60 score. No page/table overflow or browser page errors were found. The experiment remained at 900 API attempts.


## Setup rows and simplified findings

The setup is now three stacked rows: The game, Jev’s objective, and The opponents. Model, opponent count, matches, and rounds appear underneath. The research link, full setup dialog, and opponent disclosure remain available.

Removed the findings’ replay links, including draw/win examples, self-play, and the final decision. Move-pattern strips are static; the 40-match archive remains the place to open replays. This supersedes the findings-link behavior described above.

The production TypeScript and Vite build passed. Browser checks at 1440 × 1050 and 390 × 844 confirmed three stacked setup rows, no links within findings, all 40 archive matches, no document overflow, and no page errors.


## Preference and confidence findings

Added a probability chart within the ending finding and a confidence comparison within the Tit for Tat finding. The chart uses all eight matches where both players cooperated throughout. Mean cooperation probability peaks at 89.5% in round 5 and ends at 77.6% in round 20. The Tit for Tat comparison excludes opening rounds: mean reported confidence is 0.769 across three defecting matches and 0.686 across two cooperative matches. The page explains the distinction between choice preference, confidence, and move quality. Confidence is derived from the choice distribution, as described in [TypeSafe’s documentation](https://docs.typesafe.ai/confidence).

The snapshot now includes the recorded primary-seat cooperation probability and confidence for every round. All 800 rounds’ actions, scores, probabilities, and confidence were checked against SQLite; the extra 100 self-play opponent decisions are excluded from these measures. The saved run remained at 900 API attempts.

The production build passed. Browser checks at 1440 × 1050 and 390 × 844 verified the displayed values, the new 20-point chart, no document overflow, all 40 archive entries, and no findings replay links. Desktop and mobile screenshots were visually inspected. No browser page errors were reported.


## Environment constraints and strategy patterns

Replaced the future-experiments section with four stacked rows: a small fixed sample, fixed rules and known ending, full history with fresh matches, and observed Jev behavior. Experiment metadata now stores constraints instead of next steps.

The strategy summary is calculated from complete recorded action sequences. Always Defect matches 29/40 games (72.5%). A Grim Trigger comparison, using only opponent actions before each decision, matches 11/40 (27.5%). Those 11 include eight cooperative matches with no opponent defection and three switches after opening defection. The page explains that matching these histories does not identify a unique strategy. Counts were independently verified against SQLite.

Production TypeScript and Vite build passed. Browser checks and screenshots at 1440 × 1050 and 390 × 844 confirmed four distinct stacked rows, correct percentages, no old next-steps heading, all 40 archive matches, no horizontal overflow, and no page errors.


## Consistent reading and supporting columns

The introduction, setup, results commentary, four findings, confidence explanation, and environment constraints now use one shared reading width. At a 1440-pixel viewport all narrative blocks are 460 pixels wide and start at the same left edge. Setup details and all figures align in the right column. Self-play and the ending now each have a complete row, with text on the left and a figure on the right. Setup and constraint points remain stacked. The header bottom border was removed.

The production build passed. Browser geometry verified identical reading widths and supporting-column positions on desktop. Checks at 1440, 900, and 390 pixels found no document overflow; the tablet leaderboard also had no internal overflow. Mobile stacks text above supporting content. The opponent disclosure still exposes all eight strategies, and the relocated setup button opens its native dialog and dismisses with Escape. All 40 archive matches remain. Desktop and mobile screenshots were inspected, and no browser page errors were reported.


## Rebalanced page and leaderboard

Replaced the rigid shared reading width with content-aware proportions. The page and header use a centered 1120-pixel frame with 40-pixel desktop padding. Standalone prose can use up to 640 pixels. Paired narrative sections give slightly more room to the text than the figure. The leaderboard uses its own grid with a 24-pixel gap, so it no longer inherits the narrower prose width.

At a 1440-pixel viewport, paired text/figure widths are approximately 528/472 pixels and leaderboard/chart widths are approximately 528/488 pixels. Player names fit on one line. The leaderboard and chart stack below 1000 pixels; narrative pairs stack below 800 pixels. The header remains borderless.

The production build and diff checks passed. Desktop screenshots were visually compared with the preceding layout. At 1440, 900, and 390 pixels there was no document or table overflow. Mobile retained all nine leaderboard rows and 40 archive entries. No browser page errors were reported.


## Static Vercel publication

Added an explicit publication command that opens SQLite read-only, verifies every selected completed run, and exports the existing read API shapes to static files. Vercel rewrites preserve the analysis, direct match URLs, exact decision inspector, and CSV/JSON downloads. Only Experiment 0 is published. Credentials, the private database, and the runner are excluded from deployment.

Validation: **14 tests passed**, including publication refusal for incomplete or corrupt runs, read-only database enforcement, exact replay/export preservation, and removal of unselected generated data. The production build passed. The generated run summary, all 40 match payloads, and the full export were compared directly with the database; the CSV has 800 rows. The connection-check run and credential fields are absent. The recorded run still has 900 attempts.


Production deployment: [game-theory-with-jev.vercel.app](https://game-theory-with-jev.vercel.app), Vercel deployment `dpl_Gi5gQEg5G1UxWmSC4qFsy1wodVmS`. Public HTTP checks verified the homepage, run summary, all 40 replay APIs against the saved payloads, the 800-row CSV and complete JSON download, and direct match routing. The excluded test run, local environment file, and SQLite path return 404. Browser checks confirmed all nine leaderboard players, four findings, 40 archive entries, and a direct replay opening at round 20 with the correct 60:60 score and saved decision input. Desktop and mobile checks reported no page errors or document overflow.


## Official TypeSafe avatars and leaderboard cleanup

Replaced the shared Jev letter avatar with TypeSafe's official icon, preserving the original image and colors. This covers the leaderboard, archive, and both seats in self-play replays. Removed the second Jev seat from the leaderboard only; all 40 archive matches, eight opponent comparisons, self-play findings, and recorded totals remain available.

The production TypeScript and Vite build passed. Desktop (1440 × 1050) and mobile (390 × 844) checks confirmed eight leaderboard rows, Jev first, loaded logo images, no document or table overflow, and no browser errors. All five self-play archive entries retain two logo avatars. A self-play replay opens at round 20 with both logos loaded. Desktop and mobile leaderboard screenshots were visually inspected.
