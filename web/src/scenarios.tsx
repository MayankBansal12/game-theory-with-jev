import { Link, useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import study from "./recorded/opening-study.json";
import type { Experiment } from "./experiments";
import type { Run } from "./types";

export function VersionOverview({
  experiment,
  run,
}: {
  experiment: Experiment;
  run: Run;
}) {
  if (!experiment.scenarios) return null;
  return (
    <dl className="version-schedule" aria-label="Version 1 experiment size">
      <div>
        <dt>Opening scenarios</dt>
        <dd>
          {experiment.scenarios.length}
          <small>Free · cooperate · defect</small>
        </dd>
      </div>
      <div>
        <dt>Opponents</dt>
        <dd>
          {run.config.opponents.length}
          <small>{run.config.opponents.length - 8} added since v0</small>
        </dd>
      </div>
      <div>
        <dt>Matches per opponent</dt>
        <dd>
          {run.config.repetitions}
          <small>Up from 5 in v0</small>
        </dd>
      </div>
      <div>
        <dt>Total matches</dt>
        <dd>
          {experiment.scenarios.length * run.totals.scheduled_matches}
          <small>{run.totals.scheduled_matches} per scenario</small>
        </dd>
      </div>
    </dl>
  );
}

export function ScenarioSelector({
  experiment,
  run,
}: {
  experiment: Experiment;
  run: Run;
}) {
  if (!experiment.scenarios) return null;
  const selected = experiment.scenarios.find(
    (scenario) => scenario.runId === run.id,
  );
  return (
    <div className="scenario-picker">
      <nav className="scenario-tabs" aria-label="Opening scenario">
        {experiment.scenarios.map((scenario) => (
          <Link
            key={scenario.runId}
            to={`/?run=${scenario.runId}#results`}
            aria-current={scenario.runId === run.id ? "page" : undefined}
          >
            {scenario.label}
          </Link>
        ))}
      </nav>
      <p>{selected?.description}</p>
    </div>
  );
}

const colors = ["var(--text)", "var(--green)", "var(--amber)"];
const percentage = (value: number) => `${(value * 100).toFixed(1)}%`;

export function OpeningComparison({ runId }: { runId: string }) {
  const navigate = useNavigate();
  const { scenarios, config } = study;
  const selected = scenarios.find((scenario) => scenario.runId === runId);
  if (!selected) return null;
  const byRound = Array.from({ length: config.rounds }, (_, i) => ({
    round: i + 1,
    ...Object.fromEntries(
      scenarios.map((s) => [s.opening, s.cooperationByRound[i] * 100]),
    ),
  }));
  return (
    <section
      id="opening-comparison"
      className="opening-comparison"
      aria-labelledby="opening-comparison-title"
    >
      <div className="section-title">
        <h2 id="opening-comparison-title">
          The first move shapes what follows
        </h2>
      </div>
      <p className="comparison-intro">
        All 3 scenarios use the same model, instructions, payoffs, and{" "}
        {config.opponents.length} opponents. Only Jev’s first move changes.
      </p>
      <div className="opening-comparison-grid">
        <div className="comparison-overview">
          <h3 className="scenario-subtitle">After the opening</h3>
          <p className="comparison-scope">
            Rounds 2–20 · Pick a scenario to see each opponent.
          </p>
          <div className="scenario-table-wrap">
            <table
              className="scenario-table"
              aria-label="Opening scenario comparison"
            >
              <thead>
                <tr>
                  <th scope="col">Scenario</th>
                  <th scope="col">Points / round</th>
                  <th scope="col">Jev cooperates</th>
                  <th scope="col">Both cooperate</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr
                    key={s.runId}
                    className={`scenario-choice ${s.runId === runId ? "selected" : ""}`}
                    onClick={(event) => {
                      if (
                        !(event.target instanceof Element) ||
                        !event.target.closest("a")
                      )
                        navigate(`/?run=${s.runId}#opening-comparison`);
                    }}
                  >
                    <th scope="row">
                      <Link
                        to={`/?run=${s.runId}#opening-comparison`}
                        aria-current={s.runId === runId ? "page" : undefined}
                      >
                        {s.label}
                      </Link>
                    </th>
                    <td>{s.afterOpening.pointsPerRound.toFixed(2)}</td>
                    <td>{percentage(s.afterOpening.cooperation)}</td>
                    <td>{percentage(s.afterOpening.mutualCooperation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="comparison-takeaway">
            When Jev is forced to cooperate first, it cooperates in{" "}
            <strong>
              {percentage(
                scenarios.find((s) => s.opening === "cooperate")!.afterOpening
                  .cooperation,
              )}
            </strong>{" "}
            of later rounds, compared with{" "}
            <strong>
              {percentage(
                scenarios.find((s) => s.opening === "free")!.afterOpening
                  .cooperation,
              )}
            </strong>{" "}
            when it picks its own opening. When forced to defect first, it never
            cooperates again.
          </p>
          <figure className="panel behavior-figure">
            <div className="panel-head">
              <div>
                <h3>Cooperation after each opening</h3>
                <p>Share of matches where Jev cooperated.</p>
              </div>
            </div>
            <div
              className="finding-chart"
              role="img"
              aria-label="Cooperation by round for the free, cooperate-first, and defect-first scenarios. Round 1 is set in the two forced scenarios."
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={byRound}
                  margin={{ top: 16, right: 28, left: -12, bottom: 2 }}
                >
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis
                    dataKey="round"
                    type="number"
                    domain={[1, config.rounds]}
                    ticks={[1, 5, 10, 15, config.rounds]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted)", fontSize: 10 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(n) => `${n}%`}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted)", fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--panel)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelFormatter={(n) =>
                      `Round ${n}${Number(n) === 1 ? " · opening" : ""}`
                    }
                    formatter={(value) => `${Number(value).toFixed(1)}%`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {scenarios.map((s, i) => (
                    <Line
                      key={s.opening}
                      dataKey={s.opening}
                      name={s.label}
                      stroke={colors[i]}
                      strokeWidth={2}
                      strokeDasharray={i === 0 ? "5 4" : undefined}
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <figcaption>
              Round 1 is set in the two forced scenarios. Every later move is
              Jev’s choice.
            </figcaption>
          </figure>
        </div>
        <div className="comparison-opponents">
          <h3 className="scenario-subtitle" aria-live="polite">
            {selected.label} · by opponent
          </h3>
          <p className="comparison-scope">
            Rounds 2–20 · {config.repetitions} matches per opponent
          </p>
          <div className="scenario-table-wrap">
            <table
              className="scenario-table"
              aria-label={`${selected.label}: results by opponent`}
            >
              <thead>
                <tr>
                  <th scope="col">Opponent</th>
                  <th scope="col">Jev’s points / round</th>
                  <th scope="col">Jev cooperates</th>
                  <th scope="col">Both cooperate</th>
                </tr>
              </thead>
              <tbody>
                {selected.opponents.map((opponent) => (
                  <tr key={opponent.id}>
                    <th scope="row">{opponent.name}</th>
                    <td>{opponent.afterOpening.pointsPerRound.toFixed(2)}</td>
                    <td>{percentage(opponent.afterOpening.cooperation)}</td>
                    <td>
                      {percentage(opponent.afterOpening.mutualCooperation)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="results-caption">
            In self-play, only one Jev’s opening is set. The other chooses
            freely.
          </p>
        </div>
      </div>
      <p className="comparison-method">
        Both tables leave out round 1. Each scenario has{" "}
        {config.repetitions * config.opponents.length} matches. The full results
        below include all {config.rounds} rounds.
      </p>
    </section>
  );
}
