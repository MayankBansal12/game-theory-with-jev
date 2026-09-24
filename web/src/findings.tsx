import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { Experiment, RecordedMatch } from "./experiments";

const tooltipStyle = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--text)",
};
const tick = { fill: "var(--muted)", fontSize: 10 };
const mean = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
const confidenceAfterOpening = (matches: RecordedMatch[]) =>
  mean(matches.flatMap((m) => m.confidence.slice(1)));
const meanAt = (matches: RecordedMatch[], index: number) =>
  matches.length
    ? matches.reduce((sum, m) => sum + m.scores[index], 0) / matches.length
    : 0;

export function ExperimentFindings({ experiment }: { experiment: Experiment }) {
  const data = experiment.analysis;
  if (!data || !data.matches.length || !experiment.findings) return null;
  const { matches, rounds } = data;
  const openingC = matches.filter((m) => m.moves[0] === "C").length;
  const returns = matches.reduce(
    (n, m) =>
      n +
      [...m.moves].filter(
        (a, i) => i > 0 && a === "C" && m.moves[i - 1] === "D",
      ).length,
    0,
  );
  const byRound = Array.from({ length: rounds }, (_, i) => ({
    round: i + 1,
    cooperation:
      (matches.filter((m) => m.moves[i] === "C").length / matches.length) * 100,
  }));
  const groups = Object.values(
    matches.reduce<Record<string, RecordedMatch[]>>((acc, m) => {
      (acc[m.moves] ??= []).push(m);
      return acc;
    }, {}),
  ).sort((a, b) => b.length - a.length);
  const titForTat = matches.filter((m) => m.opponent === "tit_for_tat");
  const cooperative = titForTat.filter((m) =>
    [...m.moves].every((a) => a === "C"),
  );
  const defective = titForTat.filter((m) =>
    [...m.moves].every((a) => a === "D"),
  );
  const scores = [
    { round: 0, cooperative: 0, defective: 0 },
    ...Array.from({ length: rounds }, (_, i) => ({
      round: i + 1,
      cooperative: meanAt(cooperative, i),
      defective: meanAt(defective, i),
    })),
  ];
  const self = matches.filter((m) => m.opponent === "another_jev");
  const selfRounds = self.reduce((n, m) => n + m.moves.length, 0);
  const mutualC = self.reduce(
    (n, m) =>
      n +
      [...m.moves].filter((a, i) => a === "C" && m.opponentMoves[i] === "C")
        .length,
    0,
  );
  const mutualD = self.reduce(
    (n, m) =>
      n +
      [...m.moves].filter((a, i) => a === "D" && m.opponentMoves[i] === "D")
        .length,
    0,
  );
  const mixed = selfRounds - mutualC - mutualD;
  const cooperatingBeforeEnd = matches.filter(
    (m) => m.moves[rounds - 2] === "C",
  );
  const endingC = cooperatingBeforeEnd.filter(
    (m) => m.moves[rounds - 1] === "C",
  ).length;
  const coopScore = meanAt(cooperative, rounds - 1);
  const defectScore = meanAt(defective, rounds - 1);
  const fullyCooperative = matches.filter(
    (m) =>
      [...m.moves].every((a) => a === "C") &&
      [...m.opponentMoves].every((a) => a === "C"),
  );
  const preferenceByRound = Array.from({ length: rounds }, (_, i) => ({
    round: i + 1,
    preference:
      mean(fullyCooperative.map((m) => m.cooperationProbabilities[i])) * 100,
  }));
  const peakPreference = preferenceByRound.reduce((peak, point) =>
    point.preference > peak.preference ? point : peak,
  );
  const finalPreference = preferenceByRound[rounds - 1].preference;
  const findings = experiment.findings;
  return (
    <section className="research-findings" aria-labelledby="behavior-title">
      <article className="finding-story">
        <div className="finding-copy">
          <div className="eyebrow">01 / BEHAVIOR</div>
          <h2 id="behavior-title">{findings.behavior.title}</h2>
          <p>{findings.behavior.text}</p>
          <dl className="finding-numbers">
            <div>
              <dd>
                {((openingC / matches.length) * 100).toFixed(1)}
                <small>%</small>
              </dd>
              <dt>cooperative openings</dt>
            </div>
            <div>
              <dd>{returns}</dd>
              <dt>returns to cooperation</dt>
            </div>
          </dl>
        </div>
        <figure className="panel behavior-figure">
          <div className="panel-head">
            <div>
              <h3>Cooperation by round</h3>
              <p>Share of {matches.length} matches where Jev cooperated.</p>
            </div>
          </div>
          <div
            className="finding-chart"
            role="img"
            aria-label={`Jev cooperated in ${openingC} of ${matches.length} opening rounds. ${byRound.slice(1).every((r) => r.cooperation === byRound[1].cooperation) ? `Cooperation stayed at ${byRound[1].cooperation}% from round 2 to ${rounds}.` : "The chart shows cooperation in each later round."}`}
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
                  domain={[1, rounds]}
                  ticks={[1, 5, 10, 15, rounds]}
                  tickLine={false}
                  axisLine={false}
                  tick={tick}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(n) => `${n}%`}
                  tickLine={false}
                  axisLine={false}
                  tick={tick}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(n) => `Round ${n}`}
                  formatter={(v) => [
                    `${Number(v).toFixed(1)}%`,
                    "Jev cooperated",
                  ]}
                />
                <Line
                  dataKey="cooperation"
                  stroke="var(--green)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="pattern-summary">
            <div className="pattern-heading">
              <span>The {groups.length} observed patterns</span>
              <div className="legend">
                <span>
                  <i className="green-dot" />
                  Cooperate
                </span>
                <span>
                  <i className="amber-dot" />
                  Defect
                </span>
              </div>
            </div>
            {groups.map((group) => {
              const moves = group[0].moves;
              const label = !moves.includes("C")
                ? "Defect throughout"
                : !moves.includes("D")
                  ? "Cooperate throughout"
                  : `Switch in round ${[...moves].findIndex((a, i) => i > 0 && a !== moves[i - 1]) + 1}`;
              return (
                <div
                  className="pattern-row"
                  role="img"
                  key={moves}
                  title={label}
                  aria-label={`${group.length} matches: ${label}.`}
                >
                  <span className="pattern-count">
                    <b>{group.length}</b> matches
                  </span>
                  <span className="pattern-moves" aria-hidden="true">
                    {[...moves].map((move, i) => (
                      <i
                        key={i}
                        className={move === "C" ? "cooperate" : "defect"}
                        title={`Round ${i + 1}: ${move === "C" ? "cooperate" : "defect"}`}
                      />
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
          <figcaption>
            Each strip shows one observed pattern across {rounds} rounds.
          </figcaption>
        </figure>
      </article>
      {cooperative.length > 0 && defective.length > 0 && (
        <article className="finding-story">
          <div className="finding-copy">
            <div className="eyebrow">02 / REWARD</div>
            <h2>{findings.reward.title}</h2>
            <p>{findings.reward.text}</p>
            <dl className="finding-numbers">
              <div>
                <dd>
                  {coopScore}
                  <small>pts</small>
                </dd>
                <dt>in a cooperative draw</dt>
              </div>
              <div>
                <dd>
                  {defectScore}
                  <small>pts</small>
                </dd>
                <dt>in a win by defection</dt>
              </div>
            </dl>
            <div className="confidence-comparison">
              <p>
                Jev reported higher confidence in the lower-scoring games:{" "}
                <strong>{confidenceAfterOpening(defective).toFixed(3)}</strong>{" "}
                for defection, compared with{" "}
                <strong>
                  {confidenceAfterOpening(cooperative).toFixed(3)}
                </strong>{" "}
                for cooperation.
              </p>
              <small>
                Average confidence in rounds 2–{rounds}, across{" "}
                {defective.length} defecting matches and {cooperative.length}{" "}
                cooperative matches.
              </small>
            </div>
          </div>
          <figure className="panel reward-figure">
            <div className="panel-head">
              <div>
                <h3>Against Tit for Tat</h3>
                <p>Jev’s cumulative points over the match.</p>
              </div>
            </div>
            <div className="legend">
              <span>
                <i className="green-dot" />
                Cooperative draws ({cooperative.length})
              </span>
              <span>
                <i className="amber-dot" />
                Defecting wins ({defective.length})
              </span>
            </div>
            <div
              className="finding-chart reward-chart"
              role="img"
              aria-label={`${cooperative.length} cooperative draws earned Jev ${coopScore} points each. ${defective.length} wins by defection earned ${defectScore} points each.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={scores}
                  margin={{ top: 22, right: 28, left: -12, bottom: 2 }}
                >
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis
                    dataKey="round"
                    type="number"
                    domain={[0, rounds]}
                    ticks={[0, 5, 10, 15, rounds]}
                    tickLine={false}
                    axisLine={false}
                    tick={tick}
                  />
                  <YAxis tickLine={false} axisLine={false} tick={tick} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(n) => `Round ${n}`}
                    formatter={(v) => `${Number(v).toFixed(0)} pts`}
                  />
                  <Line
                    dataKey="cooperative"
                    name="Cooperative draws"
                    stroke="var(--green)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                  <Line
                    dataKey="defective"
                    name="Defecting wins"
                    stroke="var(--amber)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <figcaption>
              Average within each group. All matches in a group had the same
              scores.
            </figcaption>
          </figure>
        </article>
      )}
      {selfRounds > 0 && (
        <article className="finding-story">
          <div className="finding-copy">
            <div className="eyebrow">03 / SELF-PLAY</div>
            <h2>{findings.selfPlay.title}</h2>
            <p>{findings.selfPlay.text}</p>
          </div>
          <figure className="panel self-play-figure">
            <div className="panel-head">
              <div>
                <h3>Outcomes in self-play</h3>
                <p>
                  {selfRounds} rounds across {self.length} matches.
                </p>
              </div>
            </div>
            <div className="self-play-distribution">
              <div
                className="self-play-bar"
                role="img"
                aria-label={`${mutualD} rounds of mutual defection, ${mixed} mixed rounds, and ${mutualC} rounds of mutual cooperation, out of ${selfRounds} self-play rounds.`}
              >
                <span
                  className="defect"
                  style={{ width: `${(mutualD / selfRounds) * 100}%` }}
                />
                <span
                  className="mixed"
                  style={{ width: `${(mixed / selfRounds) * 100}%` }}
                />
                {mutualC > 0 && (
                  <span
                    className="cooperate"
                    style={{ width: `${(mutualC / selfRounds) * 100}%` }}
                  />
                )}
              </div>
              <div className="self-play-key">
                <span>
                  <b>{mutualD}</b> mutual defection
                </span>
                <span>
                  <b>{mixed}</b> mixed
                </span>
                <span>
                  <b>{mutualC}</b> mutual cooperation
                </span>
              </div>
            </div>
          </figure>
        </article>
      )}
      <article className="finding-story">
        <div className="finding-copy">
          <div className="eyebrow">04 / THE LAST ROUND</div>
          <h2>{findings.ending.title}</h2>
          <p>{findings.ending.text}</p>
          <div className="ending-stat">
            <strong>
              {endingC}
              <span> / {cooperatingBeforeEnd.length}</span>
            </strong>
            <span>
              matches cooperating in round {rounds - 1} also cooperated in round{" "}
              {rounds}
            </span>
          </div>
        </div>
        {fullyCooperative.length > 0 && (
          <figure className="panel preference-figure">
            <div className="panel-head">
              <div>
                <h3>Preference for cooperation</h3>
                <p>
                  Average choice probability in {fullyCooperative.length} fully
                  cooperative matches.
                </p>
              </div>
            </div>
            <div
              className="finding-chart"
              role="img"
              aria-label={`Average cooperation probability in ${fullyCooperative.length} fully cooperative matches peaked at ${peakPreference.preference.toFixed(1)}% in round ${peakPreference.round} and ended at ${finalPreference.toFixed(1)}% in round ${rounds}. All still chose cooperation.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={preferenceByRound}
                  margin={{ top: 12, right: 28, left: -12, bottom: 2 }}
                >
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis
                    dataKey="round"
                    type="number"
                    domain={[1, rounds]}
                    ticks={[1, 5, 10, 15, rounds]}
                    tickLine={false}
                    axisLine={false}
                    tick={tick}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(n) => `${n}%`}
                    tickLine={false}
                    axisLine={false}
                    tick={tick}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(n) => `Round ${n}`}
                    formatter={(v) => [
                      `${Number(v).toFixed(1)}%`,
                      "Cooperation probability",
                    ]}
                  />
                  <Line
                    dataKey="preference"
                    stroke="var(--green)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <figcaption>
              The preference weakened from{" "}
              <strong>{peakPreference.preference.toFixed(1)}%</strong> in round{" "}
              {peakPreference.round} to{" "}
              <strong>{finalPreference.toFixed(1)}%</strong> in round {rounds},
              while the moves stayed the same.
            </figcaption>
          </figure>
        )}
      </article>
    </section>
  );
}
