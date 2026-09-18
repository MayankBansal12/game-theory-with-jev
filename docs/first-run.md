# First encounters

Run `33654f59990b` · model `jev-1.13.0` · prompt `1.0` · seed `42`

40 matches · 800 rounds · 900 Jev decisions · zero failed attempts. All recorded rounds and decisions verified.

Jev earned **1,821 points**, averaging **2.27625 points per round**. It cooperated in **163 / 800 rounds (20.375%)** and finished with **23 wins, 14 draws, and 3 losses**.

| Opponent | Jev pts / round | Opponent pts / round | Jev cooperation | W / D / L | Five match scores (Jev : opponent) |
| --- | ---: | ---: | ---: | --- | --- |
| Always Cooperate | 4.60 | 0.60 | 20% | 4 / 1 / 0 | 60:60, 100:0, 100:0, 100:0, 100:0 |
| Random | 3.08 | 0.48 | 0% | 5 / 0 / 0 | 88:3, 56:11, 48:13, 56:11, 60:10 |
| Win–Stay, Lose–Shift | 3.00 | 1.50 | 40% | 3 / 2 / 0 | 60:10, 60:60, 60:10, 60:60, 60:10 |
| Tit for Two Tats | 2.04 | 1.74 | 40% | 3 / 2 / 0 | 28:18, 60:60, 28:18, 28:18, 60:60 |
| Tit for Tat | 1.92 | 1.77 | 40% | 3 / 2 / 0 | 24:19, 24:19, 24:19, 60:60, 60:60 |
| Grim Trigger | 1.56 | 1.36 | 20% | 4 / 1 / 0 | 24:19, 24:19, 60:60, 24:19, 24:19 |
| Another Jev | 1.03 | 1.03 | 1% | 1 / 3 / 1 | 19:24, 20:20, 20:20, 24:19, 20:20 |
| Always Defect | 0.98 | 1.08 | 2% | 0 / 3 / 2 | 20:20, 20:20, 19:24, 19:24, 20:20 |

The strongest contrast is between matches: Jev fully cooperated in some games and repeatedly defected in others. Against Always Cooperate, one game ended 60:60 and four ended 100:0. The five Jev vs another Jev matches contained zero mutually cooperative rounds; the primary seat cooperated once and the other seat once.

These are observations of one fixed prompt and a small schedule. They do not establish that Jev learned a particular named strategy. The opponent label is hidden, and all matches start from the same empty observation. API responses can vary between identical inputs.

Recorded input tokens: 935,096. Output tokens: 32,564. Mean successful call latency: 219.3 ms.

Exports are saved in `data/exports/first-encounters.json` and `data/exports/first-encounters.csv`; the export audit is `data/exports/export-audit.json`. The preliminary connection check is a separate three-match run and is excluded from these totals.
