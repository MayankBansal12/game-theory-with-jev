import { Link } from "react-router-dom";
import study from "./recorded/opening-study.json";

// These findings describe the audited, fixed v1 archive (720 matches).
// Counts are primary-seat trajectories; the self-play example includes both seats.
const matchRecords = [
  { wins: 175, draws: 55, losses: 10 },
  { wins: 92, draws: 114, losses: 34 },
  { wins: 205, draws: 35, losses: 0 },
];

export function V1Findings() {
  return (
    <section className="v1-findings" aria-labelledby="v1-findings-title">
      <div className="section-title">
        <h2 id="v1-findings-title">Key findings</h2>
      </div>

      <article className="v1-finding" aria-labelledby="recovery-finding-title">
        <div className="v1-finding-copy">
          <div className="eyebrow">01 · RECOVERY</div>
          <h3 id="recovery-finding-title">
            Jev rarely went back to cooperating
          </h3>
          <p>
            <strong>Once Jev opened with defection, it never stopped.</strong>{" "}
            That held in all 412 of those matches, 172 where it chose to defect
            and 240 where it was forced to, even against opponents that kept
            cooperating.
          </p>
          <p>
            The only recoveries came against Delayed Betrayal. It cooperates for
            5 rounds, defects once in round 6, then goes back to cooperating.
            All 29 Jevs that were still cooperating defected in round 7. 12 went
            back to cooperating in round 8 and stayed there. 17 kept defecting.
          </p>
          <p className="finding-detail">
            Both players move at the same time, so round 7 is Jev’s first chance
            to react to the betrayal.
          </p>
          <Link
            className="finding-replay"
            to="/matches/1406858da4ed?run=bc6f79c6d8f0"
          >
            Replay a recovery →
          </Link>
        </div>
        <div className="v1-finding-evidence">
          <h4>Only cooperative matches could recover</h4>
          <div className="scenario-table-wrap">
            <table
              className="scenario-table recovery-table"
              aria-label="Delayed Betrayal recovery by opening"
            >
              <thead>
                <tr>
                  <th scope="col">Opening</th>
                  <th scope="col">Cooperated through round 6</th>
                  <th scope="col">Recovered</th>
                </tr>
              </thead>
              <tbody>
                {study.scenarios.map((s) => {
                  const prior = s.delayedBetrayal
                    .filter((p) => p.moves.startsWith("CCCCCC"))
                    .reduce((n, p) => n + p.count, 0);
                  const recovered = s.delayedBetrayal
                    .filter((p) => p.moves === "CCCCCCDCCCCCCCCCCCCC")
                    .reduce((n, p) => n + p.count, 0);
                  return (
                    <tr key={s.runId}>
                      <th scope="row">{s.label}</th>
                      <td>{prior} / 20</td>
                      <td>
                        {prior ? `${recovered} / ${prior}` : "Not applicable"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="finding-detail">
            Overall, 4, 8, and 0 of 20 matches recovered. Cooperate-first had
            more recoveries because more of its matches were still cooperative
            by round 6, not because Jev was more forgiving.
          </p>
          <aside className="finding-example">
            <h4>Adaptive went back to cooperating. Jev didn’t.</h4>
            <p>
              In all 20 cooperate-first matches against Adaptive, Jev defected
              from round 8 on. Adaptive started cooperating again in round 12,
              but Jev kept defecting to the end.
            </p>
            <Link
              className="finding-replay"
              to="/matches/49716c262c26?run=1a47c3b89898"
            >
              Replay the Adaptive match →
            </Link>
          </aside>
        </div>
      </article>

      <article className="v1-finding" aria-labelledby="score-finding-title">
        <div className="v1-finding-copy">
          <div className="eyebrow">02 · PERFORMANCE</div>
          <h3 id="score-finding-title">
            Winning more didn’t mean scoring more
          </h3>
          <p>
            <strong>
              Cooperate-first scored the most points. Defect-first won the most
              matches.
            </strong>{" "}
            Cooperating first earned 8.5% more points with less than half as
            many wins. Jev’s goal was to maximize its points, not its wins.
          </p>
          <p>
            Against Tit for Tat, cooperating first led to 60–60 draws. Defecting
            first led to 24–19 wins, which left Jev with far fewer points.
          </p>
          <p>
            This echoes{" "}
            <a
              href="https://www-ee.stanford.edu/~hellman/Breakthrough/book/chapters/axelrod.html"
              target="_blank"
              rel="noreferrer"
            >
              Axelrod’s tournaments
            </a>
            , where reciprocal cooperation earned the highest overall score.
            Winning matches and scoring points aren’t the same thing.
          </p>
        </div>
        <div className="v1-finding-evidence">
          <h4>Points and match outcomes</h4>
          <p className="comparison-scope">
            All 20 rounds · 240 matches per scenario
          </p>
          <div className="scenario-table-wrap">
            <table
              className="scenario-table score-findings-table"
              aria-label="Jev points and match outcomes by scenario"
            >
              <thead>
                <tr>
                  <th scope="col">Opening</th>
                  <th scope="col">Total points</th>
                  <th scope="col">Points / round</th>
                  <th scope="col">Wins / draws / losses</th>
                </tr>
              </thead>
              <tbody>
                {study.scenarios.map((s, i) => (
                  <tr key={s.runId}>
                    <th scope="row">{s.label}</th>
                    <td>
                      {Math.round(
                        s.allRounds.pointsPerRound * s.allRounds.rounds,
                      ).toLocaleString("en-US")}
                    </td>
                    <td>{s.allRounds.pointsPerRound.toFixed(2)}</td>
                    <td>
                      {matchRecords[i].wins} / {matchRecords[i].draws} /{" "}
                      {matchRecords[i].losses}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <aside className="finding-example">
            <h4>Top of the table, but not a tournament win</h4>
            <p>
              Jev had the highest average in every scenario and only lost
              matches to Always Defect and another Jev. But its average covers
              12 opponents, while each opponent’s covers only its games against
              Jev.
            </p>
            <p>
              This isn’t an all-against-all tournament like Axelrod’s, so it
              doesn’t show Jev would win one.
            </p>
          </aside>
        </div>
      </article>

      <article className="v1-finding" aria-labelledby="strategy-finding-title">
        <div className="v1-finding-copy">
          <div className="eyebrow">03 · PLAYING PATTERN</div>
          <h3 id="strategy-finding-title">Jev stuck with its opening</h3>
          <p>
            <strong>It retaliated right away and rarely forgave.</strong> If Jev
            opened with defection, it kept defecting. If it opened with
            cooperation, it cooperated until the opponent defected, then usually
            defected for the rest of the match.
          </p>
          <p>
            No Jev move changed after round 8 in any of the 720 matches. This
            describes its moves, not whether it was following a named strategy.
          </p>
          <p>
            Against Bully and Anti–Tit for Tat, Jev was defecting by round 3 in
            all 120 matches and never switched back, even though both opponents
            answer defection with cooperation.
          </p>
        </div>
        <div className="v1-finding-evidence">
          <h4>3 patterns cover all 720 matches</h4>
          <dl className="trajectory-counts">
            <div>
              <dt>Defected throughout</dt>
              <dd>412</dd>
            </div>
            <div>
              <dt>
                Cooperated until the opponent defected, then never went back
                <small>Includes 133 matches that stayed cooperative.</small>
              </dt>
              <dd>296</dd>
            </div>
            <div>
              <dt>Went back to cooperating after Delayed Betrayal</dt>
              <dd>12</dd>
            </div>
          </dl>
          <aside className="finding-example">
            <h4>In self-play, both openings mattered</h4>
            <p>
              When both Jevs opened with cooperation, all 7 matches stayed
              cooperative to the end. In the other 53, both were defecting from
              round 2 on. Forcing one Jev to cooperate first didn’t fix a
              mismatched opening.
            </p>
            <Link
              className="finding-replay"
              to="/matches/ca3ee8b7d0b9?run=1a47c3b89898"
            >
              Replay cooperative self-play →
            </Link>
          </aside>
        </div>
      </article>
    </section>
  );
}
