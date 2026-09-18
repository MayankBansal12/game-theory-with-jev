import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
  Routes,
  Route,
} from "react-router-dom";
import {
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Code2,
  CircleHelp,
  X,
  Copy,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  LineChart,
  Line,
} from "recharts";
import type { Run, MatchDetail, Decision } from "./types";
import { experiments } from "./experiments";
import type { Experiment } from "./experiments";
import { ExperimentFindings } from "./findings";
import "./style.css";

const fmt = (n: number | null | undefined, digits = 2) =>
  n == null ? "N/A" : n.toFixed(digits);
const pct = (n: number | null | undefined) =>
  n == null ? "N/A" : `${Math.round(n * 100)}%`;
const num = (n: number) => n.toLocaleString();
const names: Record<string, string> = {
  cooperator: "Always Cooperate",
  defector: "Always Defect",
  random: "Random",
  tit_for_tat: "Tit for Tat",
  tit_for_two_tats: "Tit for Two Tats",
  grim: "Grim Trigger",
  pavlov: "Win–Stay, Lose–Shift",
  another_jev: "Another Jev",
};
const icons: Record<string, string> = {
  cooperator: "+",
  defector: "−",
  random: "?",
  tit_for_tat: "↔",
  tit_for_two_tats: "↔²",
  grim: "!",
  pavlov: "⇄",
};
const opponentTitle = (id: string) =>
  id === "another_jev" ? "another Jev" : names[id];
async function api<T>(path: string): Promise<T> {
  const r = await fetch(path);
  if (!r.ok)
    throw new Error(
      r.status === 404
        ? "This result could not be found."
        : "The results could not be loaded.",
    );
  return r.json();
}
function Avatar({
  id = "jev",
  small = false,
}: {
  id?: string;
  small?: boolean;
}) {
  const isJev = id === "jev" || id === "another_jev";
  return (
    <span
      className={`avatar ${isJev ? "jev" : ""} ${small ? "small" : ""}`}
      aria-hidden="true"
    >
      {isJev ? <img src="/typesafe-logo.png" alt="" /> : icons[id] || "?"}
    </span>
  );
}
function Tag({ children }: { children: React.ReactNode }) {
  return <span className="tag">{children}</span>;
}
function Legend({ opponent = "Opponent" }: { opponent?: string }) {
  return (
    <div className="legend">
      <span>
        <i className="green-dot" />
        Jev
      </span>
      <span>
        <i className="gray-dot" />
        {opponent}
      </span>
    </div>
  );
}
function SectionTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
function Header({ experiment }: { experiment: Experiment }) {
  const navigate = useNavigate();
  return (
    <header className="header">
      <div className="header-inner">
        <Link to={`/?run=${experiment.runId}`} className="brand">
          Jev plays game theory
        </Link>
        <div className="select-wrap experiment-select">
          <select
            aria-label="Experiment"
            value={experiment.runId}
            onChange={(e) => navigate(`/?run=${e.target.value}`)}
          >
            {experiments.map((item) => (
              <option key={item.runId} value={item.runId}>
                Experiment {item.number}
              </option>
            ))}
          </select>
          <ChevronDown size={13} />
        </div>
      </div>
    </header>
  );
}
function Footer() {
  return (
    <footer>
      <span>
        created just for fun by <a href="https://mayank.fyi">mayank</a>
      </span>
    </footer>
  );
}
function ErrorView({ message }: { message: string }) {
  return (
    <div className="empty">
      <CircleHelp size={25} />
      <h2>{message}</h2>
      <Link className="button" to="/">
        Back to analysis
      </Link>
    </div>
  );
}
function Loading() {
  return (
    <div className="loading" role="status">
      <span className="pulse" />
      Loading results…
    </div>
  );
}
function Methods({ run, close }: { run: Run; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-head">
        <div className="eyebrow">THE EXPERIMENT</div>
        <button
          className="icon-button"
          aria-label="Close experiment details"
          onClick={close}
        >
          <X size={19} />
        </button>
      </div>
      <h2>Same rules. Different opponents.</h2>
      <p>
        Jev takes a description of a situation and returns a choice with
        probabilities, rather than a written response. Here its only choices
        were <strong>cooperate</strong> and <strong>defect</strong>. I recorded
        every move to see what strategy its decisions resembled.
      </p>
      <p>
        Jev plays {run.config.repetitions} fresh matches against each of{" "}
        {run.config.opponents.length} opponents. Each match lasts{" "}
        {run.config.rounds} rounds. Both players choose before either sees the
        other’s move.
      </p>
      <div className="payoff">
        <span>You / opponent</span>
        <b>Cooperate</b>
        <b>Defect</b>
        <b>Cooperate</b>
        <span>3 / 3</span>
        <span>0 / 5</span>
        <b>Defect</b>
        <span>5 / 0</span>
        <span>1 / 1</span>
      </div>
      <h3>What Jev sees</h3>
      <p>
        The rules, round number, total rounds, scores, and every previous move.
        No opponent name or strategy.
      </p>
      <h3>The objective</h3>
      <blockquote>{run.config.questions.next_move.instructions}</blockquote>
      <h3>The two criteria</h3>
      <dl className="criteria">
        {Object.entries(run.config.questions.next_move.criteria).map(
          ([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ),
        )}
      </dl>
      <h3>Jev vs another Jev</h3>
      <p>
        Two independent calls to the same model, with the same objective. Each
        sees the history from its own side. All Jev summaries use the first
        seat; the second is the opponent.
      </p>
      <h3>Reading the results</h3>
      <p>
        Players are ranked by their own average points per round. Wins, draws,
        and losses are from each player’s perspective. Jev’s row includes all
        40 matches; the other rows cover five matches each against Jev. Only
        completed matches count. These results describe this model, prompt,
        and schedule.
      </p>
      <div className="method-meta">
        <span>
          Model <code>{run.config.model}</code>
        </span>
        <span>
          Prompt <code>v{run.config.prompt_version}</code>
        </span>
        <span>
          Seed <code>{run.config.seed}</code>
        </span>
        <span>
          Noise <code>None</code>
        </span>
      </div>
    </dialog>
  );
}
function ScoreChart({ run }: { run: Run }) {
  const [metric, setMetric] = useState<"score" | "cooperation">("score");
  const data = run.standings.map((s) => ({
    ...s,
    a: metric === "score" ? s.avg_a : (s.cooperation_a ?? 0) * 100,
    b: metric === "score" ? s.avg_b : (s.cooperation_b ?? 0) * 100,
  }));
  return (
    <div className="panel chart-panel">
      <div className="panel-head">
        <div>
          <h3>
            {metric === "score" ? "Points per round" : "Cooperation rate"}
          </h3>
          <p>
            {metric === "score"
              ? `Average across ${run.config.repetitions} matches.`
              : "How often each player cooperated."}
          </p>
        </div>
        <div className="segmented" aria-label="Chart metric">
          <button
            className={metric === "score" ? "active" : ""}
            onClick={() => setMetric("score")}
          >
            Score
          </button>
          <button
            className={metric === "cooperation" ? "active" : ""}
            onClick={() => setMetric("cooperation")}
          >
            Cooperation
          </button>
        </div>
      </div>
      <Legend />
      <div
        className="bar-chart"
        role="img"
        aria-label={
          metric === "score"
            ? "Jev and opponent average points by opponent."
            : "Jev and opponent cooperation rates by opponent."
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 0, right: 25, top: 12, bottom: 0 }}
            barGap={3}
            barCategoryGap="24%"
          >
            <CartesianGrid stroke="var(--line)" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, metric === "score" ? 5 : 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              ticks={
                metric === "score" ? [0, 1, 2, 3, 4, 5] : [0, 25, 50, 75, 100]
              }
              tickFormatter={(n) =>
                `${n}${metric === "cooperation" ? "%" : ""}`
              }
            />
            <YAxis
              type="category"
              dataKey="short"
              width={99}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--secondary)", fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: "var(--hover)" }}
              contentStyle={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--text)", marginBottom: 6 }}
              formatter={(value) =>
                metric === "score"
                  ? Number(value).toFixed(2)
                  : `${Number(value).toFixed(0)}%`
              }
            />
            {metric === "score" && (
              <ReferenceLine
                x={3}
                stroke="var(--muted)"
                strokeDasharray="3 5"
              />
            )}
            <Bar
              dataKey="a"
              name="Jev"
              fill="var(--green)"
              radius={[0, 3, 3, 0]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="b"
              name="Opponent"
              fill="var(--opponent)"
              radius={[0, 3, 3, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-note">
        {metric === "score" ? (
          <>
            <span className="dash" />3 points = mutual cooperation
          </>
        ) : (
          <>Every round is one opportunity to cooperate.</>
        )}
      </div>
    </div>
  );
}
function Leaderboard({
  run,
  onSelect,
}: {
  run: Run;
  onSelect: (id: string) => void;
}) {
  const players = [
    {
      id: "jev",
      name: "Jev",
      average: run.totals.avg_a,
      wins: run.totals.wins,
      draws: run.totals.draws,
      losses: run.totals.losses,
      description: "Jev across all opponents.",
    },
    ...run.standings
      .filter((s) => s.id !== "another_jev")
      .map((s) => ({
        id: s.id,
        name: s.name,
        average: s.avg_b,
        wins: s.losses,
        draws: s.draws,
        losses: s.wins,
        description: s.description,
      })),
  ].sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
  return (
    <div className="panel standings-panel">
      <div className="panel-head">
        <div>
          <h3>Leaderboard</h3>
          <p>Ranked by each player’s average points per round.</p>
        </div>
      </div>
      <div className="table-scroll">
        <table className="player-table" aria-label="Player leaderboard">
          <thead>
            <tr>
              <th scope="col">Player</th>
              <th scope="col" className="number" aria-sort="descending">
                Avg pts / round
              </th>
              <th
                scope="col"
                className="record"
                title="Player wins, draws, losses"
              >
                W / D / L
              </th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr
                key={player.id}
                className={player.id === "jev" ? "jev-row" : undefined}
              >
                <td>
                  <button
                    className="opponent-link"
                    onClick={() =>
                      onSelect(player.id === "jev" ? "all" : player.id)
                    }
                    title={`${player.description} View matches.`}
                  >
                    <Avatar id={player.id} small />
                    <span>{player.name}</span>
                  </button>
                </td>
                <td className="number">
                  <strong className={player.id === "jev" ? "green" : ""}>
                    {fmt(player.average)}
                  </strong>
                </td>
                <td className="record">
                  <span>{player.wins}</span>
                  <i>/</i>
                  <span>{player.draws}</span>
                  <i>/</i>
                  <span>{player.losses}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function ExperimentSetup({
  run,
  showMethods,
}: {
  run: Run;
  showMethods: () => void;
}) {
  return (
    <section className="experiment-setup" aria-labelledby="setup-title">
      <div className="setup-copy">
        <h2 id="setup-title">How the experiment works</h2>
        <div className="setup-rows">
          <div className="setup-row">
            <h3>The game</h3>
            <p>
              The iterated Prisoner’s Dilemma is a game about trust over
              repeated encounters. Each round, both players choose to cooperate
              or defect without seeing the other’s choice. Mutual cooperation
              earns 3 points each. A lone defector takes 5 while the cooperator
              gets 0. If both defect, they earn just 1 each.
            </p>
            <a
              className="research-link"
              href="https://doi.org/10.1126/science.7466396"
              target="_blank"
              rel="noreferrer"
            >
              Inspired by Axelrod &amp; Hamilton’s research on cooperation{" "}
              <ArrowUpRight size={13} />
            </a>
          </div>
          <div className="setup-row">
            <h3>Jev’s objective</h3>
            <p>
              I gave Jev one objective:{" "}
              <strong>maximize its total points over the match.</strong> It
              received the rules, scores, full history, and the current round
              and total match length. It knew when the game would end, but not
              which strategy it was facing.
            </p>
          </div>
          <div className="setup-row">
            <h3>The opponents</h3>
            <p>
              The opponents covered always cooperate, always defect, random
              play, and strategies that respond to previous moves. There’s also
              Jev versus another Jev, each following its own independent
              strategy.
            </p>
          </div>
        </div>
      </div>
      <aside className="setup-details" aria-label="Experiment details">
        <dl>
          <div>
            <dt>Model</dt>
            <dd>{run.config.model}</dd>
          </div>
          <div>
            <dt>Matches</dt>
            <dd>{run.config.repetitions} per opponent</dd>
          </div>
          <div>
            <dt>Rounds</dt>
            <dd>{run.config.rounds} per match</dd>
          </div>
        </dl>
        <details className="opponent-details" open>
          <summary>
            Meet the opponents <ChevronDown size={13} />
          </summary>
          <dl>
            {run.config.opponents.map((id) => {
              const opponent = run.standings.find((s) => s.id === id);
              return (
                opponent && (
                  <div key={id}>
                    <dt>{opponent.name}</dt>
                    <dd>{opponent.description}</dd>
                  </div>
                )
              );
            })}
          </dl>
        </details>
        <button className="text-button" onClick={showMethods}>
          Exact instructions &amp; full setup <ArrowUpRight size={13} />
        </button>
      </aside>
    </section>
  );
}
function ExperimentConstraints({ experiment }: { experiment: Experiment }) {
  const matches = experiment.analysis?.matches ?? [];
  const alwaysDefect = matches.filter((m) =>
    [...m.moves].every((a) => a === "D"),
  );
  // Compare complete recorded paths, not just whether a match started with C.
  // Matching these histories does not identify a unique underlying strategy.
  const grimLike = matches.filter((m) =>
    [...m.moves].every(
      (action, i) =>
        action === (m.opponentMoves.slice(0, i).includes("D") ? "D" : "C"),
    ),
  );
  const untestedCooperation = grimLike.filter(
    (m) => !m.opponentMoves.includes("D"),
  ).length;
  const switched = grimLike.filter((m) => m.moves.includes("D")).length;
  return (
    <section
      className="experiment-constraints"
      aria-labelledby="constraints-title"
    >
      <h2 id="constraints-title">Environment constraints</h2>
      <div className="constraint-rows">
        {experiment.constraints.map((constraint) => (
          <article className="constraint-row" key={constraint.title}>
            <h3>{constraint.title}</h3>
            <p>{constraint.text}</p>
          </article>
        ))}
        {matches.length > 0 && (
          <article className="constraint-row strategy-observation">
            <h3>What Jev showed</h3>
            <div>
              <p>
                Jev matched Always Defect in{" "}
                <strong>
                  {((alwaysDefect.length / matches.length) * 100).toFixed(1)}%
                </strong>{" "}
                of matches ({alwaysDefect.length}/{matches.length}). Its moves
                were consistent with Grim Trigger in{" "}
                <strong>
                  {((grimLike.length / matches.length) * 100).toFixed(1)}%
                </strong>{" "}
                ({grimLike.length}/{matches.length}): {untestedCooperation}{" "}
                stayed cooperative without facing a defection, and {switched}{" "}
                switched permanently after the opponent defected.
              </p>
              <p className="strategy-note">
                These patterns can fit more than one strategy. This run did not
                test whether Jev would return to cooperation after an opponent
                did.
              </p>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
function Analysis({
  run,
  experiment,
  error,
  loading,
}: {
  run: Run | undefined;
  experiment: Experiment;
  error: string;
  loading: boolean;
}) {
  const [filter, setFilter] = useState("all"),
    [method, setMethod] = useState(false);
  const gamesRef = useRef<HTMLElement>(null);
  useEffect(() => {
    document.title = `Experiment ${experiment.number} | Jev plays game theory`;
  }, [experiment.number]);
  if (error) return <ErrorView message={error} />;
  if (!run)
    return loading ? <Loading /> : <ErrorView message="No experiments yet." />;
  const t = run.totals,
    matches = run.matches.filter(
      (m) => filter === "all" || m.opponent === filter,
    );
  const completed = run.matches.filter((m) => m.status === "complete");
  const completedRounds = completed.reduce((n, m) => n + m.rounds_played, 0);
  const defections = completed.reduce(
    (n, m) => n + m.rounds_played - m.cooperations_a,
    0,
  );
  const selectOpponent = (id: string) => {
    setFilter(id);
    gamesRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  };
  return (
    <>
      <div className="hero analysis-hero">
        <div>
          <div className="eyebrow">
            EXPERIMENT {experiment.number}
          </div>
          <h1>
            The cooperation game<span>.</span>
          </h1>
          <p className="hero-intro">
            So I put{" "}
            <a
              href="https://typesafe.ai/blog/introducing-system-one-models-and-jev"
              target="_blank"
              rel="noreferrer"
            >
              Jev
            </a>{" "}
            (TypeSafe’s System One model) into the Prisoner’s Dilemma to see if
            it would choose to cooperate or defect. Across{" "}
            {run.totals.scheduled_matches} matches of a setup inspired by game
            theory, I tested how it responds to an opponent and how it performs
            against other strategies.
          </p>
        </div>
        <time dateTime={run.created_at}>
          {new Date(run.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </time>
      </div>
      <ExperimentSetup run={run} showMethods={() => setMethod(true)} />
      <section className="findings-section" aria-labelledby="findings-title">
        <div className="section-title">
          <h2 id="findings-title">The results</h2>
        </div>
        <div className="stats">
          <div>
            <span>Jev’s average score</span>
            <strong>
              {fmt(t.avg_a)}
              <small>/ 5</small>
            </strong>
            <span>points per round</span>
          </div>
          <div>
            <span>Jev cooperated</span>
            <strong>
              {t.cooperation_a == null
                ? "N/A"
                : `${(t.cooperation_a * 100).toFixed(1)}%`}
            </strong>
            <span>of completed rounds</span>
          </div>
          <div>
            <span>
              Match record <small>W / D / L</small>
            </span>
            <strong className="stat-record">
              {t.wins}
              <i>/</i>
              {t.draws}
              <i>/</i>
              {t.losses}
            </strong>
            <span>by total points</span>
          </div>
          <div>
            <span>Matches played</span>
            <strong>
              {t.completed_matches}
              <small>/ {t.scheduled_matches}</small>
            </strong>
            <span>
              {num(t.rounds_played)} rounds · {num(t.decisions)} Jev decisions
            </span>
          </div>
        </div>
        {run.status !== "complete" && (
          <div className="progress-panel">
            <span>
              {run.status === "running"
                ? "Playing matches…"
                : `Run ${run.status}.`}
            </span>
            <progress max={t.scheduled_rounds} value={t.rounds_played} />
            <span>
              {t.rounds_played} / {t.scheduled_rounds} rounds
            </span>
          </div>
        )}
        <p className="results-summary">
          Jev earned <strong>{num(t.score_a)} points</strong> in total. It
          defected in{" "}
          <strong>
            {num(defections)} of {num(completedRounds)} moves
          </strong>
          {completedRounds > 0 &&
            ` (${((defections / completedRounds) * 100).toFixed(1)}%)`}
          . Its score depended strongly on the opponent: cooperative matches
          could earn more than matches it won.
        </p>
        <div className="results-heading">
          <div className="section-actions">
            <a
              className="text-button"
              aria-label="Download rounds CSV"
              href={`/api/runs/${run.id}/rounds.csv`}
            >
              <Download size={14} /> CSV
            </a>
            <a
              className="text-button"
              aria-label="Download full experiment data"
              href={`/api/runs/${run.id}/export.json`}
            >
              <Code2 size={14} /> Full data
            </a>
          </div>
        </div>
        <div className="results-grid">
          <Leaderboard run={run} onSelect={selectOpponent} />
          <ScoreChart run={run} />
        </div>
        <p className="results-caption">
          Jev’s row combines all {run.totals.completed_matches} matches. Every
          other player is scored only against Jev, so the rows cover different
          opponents.
        </p>
      </section>
      <ExperimentFindings experiment={experiment} />
      <ExperimentConstraints experiment={experiment} />
      <section ref={gamesRef} className="archive">
        <SectionTitle title="Match archive">
          <div className="select-wrap">
            <select
              aria-label="Filter matches by opponent"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All opponents</option>
              {run.standings.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown size={13} />
          </div>
        </SectionTitle>
        <div className="archive-meta">
          <span>
            {matches.length} matches <span className="footer-dot">·</span>{" "}
            Select a game to replay
          </span>
        </div>
        <div className="match-grid">
          {matches.map((m) => (
            <Link
              className="match-card"
              to={`/matches/${m.id}?run=${run.id}`}
              key={m.id}
            >
              <div className="match-card-top">
                <span>
                  GAME {String(m.number).padStart(2, "0")} <i>·</i> MATCH{" "}
                  {m.repetition}
                </span>
                <span className={m.status === "complete" ? "match-result" : ""}>
                  {m.status === "complete"
                    ? m.score_a === m.score_b
                      ? "Draw"
                      : m.score_a > m.score_b
                        ? "Jev wins"
                        : "Jev loses"
                    : m.status}
                </span>
              </div>
              <div className="match-player">
                <span>
                  <Avatar small />
                  Jev
                </span>
                <strong className={m.score_a > m.score_b ? "green" : ""}>
                  {m.score_a}
                </strong>
              </div>
              <div className="match-player">
                <span>
                  <Avatar small id={m.opponent} />
                  {names[m.opponent]}
                </span>
                <strong>{m.score_b}</strong>
              </div>
              <div className="match-card-bottom">
                <span>
                  {m.rounds_played} rounds <i>·</i> Jev cooperated{" "}
                  {pct(
                    m.rounds_played ? m.cooperations_a / m.rounds_played : null,
                  )}
                </span>
                <ArrowUpRight size={15} />
              </div>
            </Link>
          ))}
        </div>
      </section>
      <p className="archive-closing">
        This was just a fun experiment to see how a System One decision model
        would play in a game theory setup.{" "}
        <a
          href="https://github.com/MayankBansal12/game-theory-with-jev"
          target="_blank"
          rel="noreferrer"
        >
          View the repo on GitHub
        </a>{" "}
        and feel free to share feedback or ideas for other experiments.
      </p>
      {method && <Methods run={run} close={() => setMethod(false)} />}
    </>
  );
}
function DecisionInspector({
  decision,
  name,
}: {
  decision: Decision | null;
  name: string;
}) {
  const [tab, setTab] = useState("state"),
    [copied, setCopied] = useState(false);
  if (!decision)
    return (
      <div className="empty compact">
        This opponent follows a fixed strategy.
      </div>
    );
  const value =
    tab === "state"
      ? decision.payload.state
      : tab === "criteria"
        ? decision.payload.questions
        : decision.response;
  const answer = decision.response.answers.next_move;
  return (
    <>
      <div className="decision-top">
        <div>
          <span className="eyebrow">{name.toUpperCase()} CHOSE</span>
          <h3 className={decision.action === "C" ? "green" : "amber"}>
            {decision.action === "C" ? "Cooperate" : "Defect"}
          </h3>
        </div>
        <div className="probabilities">
          <div>
            <span>
              Cooperate <b>{pct(answer.probabilities.cooperate)}</b>
            </span>
            <span>
              Defect <b>{pct(answer.probabilities.defect)}</b>
            </span>
          </div>
          <div className="probability-track">
            <i style={{ width: `${answer.probabilities.cooperate * 100}%` }} />
          </div>
          <p>Returned choice probabilities</p>
        </div>
        <div className="latency">
          {fmt(decision.latency_ms / 1000, 2)}s
          <span>{num(decision.input_tokens)} input tokens</span>
        </div>
      </div>
      <div className="code-head">
        <div className="tabs">
          {["state", "criteria", "response"].map((t) => (
            <button
              className={tab === t ? "active" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {t === "state"
                ? "State sent"
                : t === "criteria"
                  ? "Question & criteria"
                  : "Raw response"}
            </button>
          ))}
        </div>
        <button
          className="icon-button"
          aria-label="Copy decision JSON"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                JSON.stringify(value, null, 2),
              );
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
      <pre
        tabIndex={0}
        aria-label={
          tab === "state"
            ? "State sent to Jev"
            : tab === "criteria"
              ? "Question and criteria sent to Jev"
              : "Raw Jev response"
        }
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    </>
  );
}
function Replay() {
  const { id } = useParams(),
    [match, setMatch] = useState<MatchDetail | null>(null),
    [error, setError] = useState(""),
    [round, setRound] = useState(1),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(900),
    [seat, setSeat] = useState<"a" | "b">("a");
  const timelineRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    setError("");
    setMatch(null);
    setRound(1);
    setPlaying(false);
    setSeat("a");
    api<MatchDetail>(`/api/matches/${id}`)
      .then((value) => {
        if (active) {
          setRound(Math.max(1, value.rounds.length));
          setMatch(value);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id]);
  useEffect(() => {
    if (match)
      document.title = `Jev vs ${opponentTitle(match.opponent)} | Jev plays game theory`;
  }, [match?.id]);
  useEffect(() => {
    if (!playing || !match) return;
    if (round >= match.rounds.length) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setRound(round + 1), speed);
    return () => clearTimeout(timer);
  }, [playing, speed, round, match?.id]);
  useEffect(() => {
    const container = timelineRef.current;
    const selected = container?.querySelector<HTMLElement>(
      ".round-column.selected",
    );
    if (!container || !selected) return;
    const box = container.getBoundingClientRect();
    const target = selected.getBoundingClientRect();
    const labels = container
      .querySelector(".timeline-labels")!
      .getBoundingClientRect().width;
    if (target.left < box.left + labels || target.right > box.right) {
      container.scrollLeft +=
        target.left - box.left - (box.width + labels) / 2 + target.width / 2;
    }
  }, [round, match?.id]);
  if (error) return <ErrorView message={error} />;
  if (!match) return <Loading />;
  if (!match.rounds.length)
    return (
      <ErrorView
        message={`This match has no completed rounds yet (${match.status}).`}
      />
    );
  const current = match.rounds[round - 1],
    final = match.rounds[match.rounds.length - 1],
    self = match.opponent === "another_jev";
  const move = (n: number) => {
    setRound(Math.max(1, Math.min(match.rounds.length, n)));
    setPlaying(false);
  };
  const chartData = [
    { round: 0, jev: 0, opponent: 0 },
    ...match.rounds
      .slice(0, round)
      .map((r) => ({ round: r.number, jev: r.score_a, opponent: r.score_b })),
  ];
  const outcome =
    current.a === current.b
      ? current.a === "C"
        ? "Mutual cooperation"
        : "Mutual defection"
      : current.a === "D"
        ? "Jev defects. The opponent cooperates."
        : "Jev cooperates. The opponent defects.";
  return (
    <>
      <Link className="back-link" to={`/?run=${match.run_id}`}>
        <ArrowLeft size={14} /> Back to analysis
      </Link>
      <div className="replay-hero">
        <div className="eyebrow">
          GAME {String(match.number).padStart(2, "0")} <span> / </span> MATCH{" "}
          {match.repetition} OF {match.config.repetitions}
        </div>
        <h1>
          Jev <span className="versus">vs</span> {opponentTitle(match.opponent)}
        </h1>
        <p>
          {self
            ? "Two independent Jev players. The same objective."
            : `A fresh ${match.config.rounds}-round match. No memory of previous games.`}
        </p>
      </div>
      <div className="replay-grid">
        <div className="panel arena">
          <div className="arena-top">
            <span className="live-round">
              <span />
              Round {round}{" "}
              <span className="muted">/ {match.rounds.length}</span>
            </span>
            <Tag>
              {round === match.config.rounds ? "Final round" : "Replay"}
            </Tag>
          </div>
          <div className="arena-players">
            <div>
              <Avatar />
              <h3>Jev</h3>
              <strong className="arena-score">{current.score_a}</strong>
              <span
                className={`move-chip ${current.a === "C" ? "cooperate" : "defect"}`}
              >
                {current.a === "C" ? "Cooperate" : "Defect"}{" "}
                <b>+{current.reward_a}</b>
              </span>
            </div>
            <div className="arena-vs">vs</div>
            <div>
              <Avatar id={match.opponent} />
              <h3>{names[match.opponent]}</h3>
              <strong className="arena-score opponent-score">
                {current.score_b}
              </strong>
              <span
                className={`move-chip ${current.b === "C" ? "cooperate" : "defect"}`}
              >
                {current.b === "C" ? "Cooperate" : "Defect"}{" "}
                <b>+{current.reward_b}</b>
              </span>
            </div>
          </div>
          <p className="round-outcome" aria-live="polite">
            {outcome}
          </p>
          <div className="play-controls">
            <button
              className="icon-button"
              aria-label="First round"
              disabled={round === 1}
              onClick={() => move(1)}
            >
              <SkipBack size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="Previous round"
              disabled={round === 1}
              onClick={() => move(round - 1)}
            >
              <ArrowLeft size={17} />
            </button>
            <button
              className="play-button"
              aria-label={playing ? "Pause replay" : "Play replay"}
              onClick={() => {
                if (!playing && round === match.rounds.length) setRound(1);
                setPlaying(!playing);
              }}
            >
              {playing ? (
                <Pause size={17} fill="currentColor" />
              ) : (
                <Play size={17} fill="currentColor" />
              )}
            </button>
            <button
              className="icon-button"
              aria-label="Next round"
              disabled={round === match.rounds.length}
              onClick={() => move(round + 1)}
            >
              <ArrowRight size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="Last round"
              disabled={round === match.rounds.length}
              onClick={() => move(match.rounds.length)}
            >
              <SkipForward size={17} />
            </button>
            <select
              className="speed"
              aria-label="Replay speed"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              <option value={1500}>0.5×</option>
              <option value={900}>1×</option>
              <option value={400}>2×</option>
            </select>
          </div>
        </div>
        <div className="panel score-progress">
          <div className="panel-head">
            <div>
              <h3>Points over the match</h3>
              <p>Cumulative points after each round.</p>
            </div>
          </div>
          <Legend opponent={names[match.opponent]} />
          <div
            className="line-chart"
            role="img"
            aria-label={`Round ${round}: Jev ${current.score_a} points, ${names[match.opponent]} ${current.score_b} points.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 15, right: 24, left: -17, bottom: 0 }}
              >
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis
                  type="number"
                  dataKey="round"
                  domain={[0, match.config.rounds]}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                />
                <YAxis
                  domain={[
                    0,
                    Math.ceil(Math.max(final.score_a, final.score_b) / 10) *
                      10 || 10,
                  ]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--panel)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  labelFormatter={(v) => `Round ${v}`}
                />
                <Line
                  type="linear"
                  dataKey="opponent"
                  name={names[match.opponent]}
                  stroke="var(--opponent)"
                  strokeWidth={3}
                  strokeDasharray="5 4"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="linear"
                  dataKey="jev"
                  name="Jev"
                  stroke="var(--green)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-note">
            Final score{" "}
            <strong>
              Jev {final.score_a} <span>:</span> {final.score_b}{" "}
              {names[match.opponent]}
            </strong>
          </div>
        </div>
      </div>
      <section className="timeline-section">
        <SectionTitle title="Every move">
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
        </SectionTitle>
        <div className="panel timeline-panel">
          <div className="timeline-scroll" ref={timelineRef}>
            <div className="timeline-labels">
              <span>Round</span>
              <strong>Jev</strong>
              <strong>{names[match.opponent]}</strong>
            </div>
            <div className="timeline-columns">
              {match.rounds.map((r) => (
                <button
                  key={r.number}
                  onClick={() => move(r.number)}
                  className={`round-column ${round === r.number ? "selected" : ""}`}
                  aria-label={`Round ${r.number}: Jev ${r.a === "C" ? "cooperated" : "defected"}, ${names[match.opponent]} ${r.b === "C" ? "cooperated" : "defected"}`}
                  aria-pressed={round === r.number}
                >
                  <span>{r.number}</span>
                  <b className={r.a === "C" ? "cooperate" : "defect"}>{r.a}</b>
                  <b className={r.b === "C" ? "cooperate" : "defect"}>{r.b}</b>
                </button>
              ))}
            </div>
          </div>
          <input
            type="range"
            aria-label="Selected round"
            min={1}
            max={match.rounds.length}
            value={round}
            onChange={(e) => move(Number(e.target.value))}
          />
        </div>
      </section>
      <section>
        <SectionTitle eyebrow={`ROUND ${round}`} title="Inside the decision" />
        <div className="panel inspector">
          {self && (
            <div className="inspector-seats segmented">
              <button
                className={seat === "a" ? "active" : ""}
                onClick={() => setSeat("a")}
              >
                Jev
              </button>
              <button
                className={seat === "b" ? "active" : ""}
                onClick={() => setSeat("b")}
              >
                Another Jev
              </button>
            </div>
          )}
          <DecisionInspector
            decision={current.decisions[seat]}
            name={seat === "a" ? "Jev" : "Another Jev"}
          />
        </div>
      </section>
    </>
  );
}
function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
function ExperimentApp() {
  const [runs, setRuns] = useState<Run[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  useEffect(() => {
    let active = true;
    Promise.all(experiments.map((item) => api<Run>(`/api/runs/${item.runId}`)))
      .then((data) => {
        if (active) setRuns(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const matchRun = runs.find((r) =>
    r.matches.some((m) => pathname === `/matches/${m.id}`),
  );
  const experiment =
    experiments.find(
      (item) => item.runId === (matchRun?.id ?? params.get("run")),
    ) ?? experiments[0];
  const run = runs.find((r) => r.id === experiment.runId);
  useEffect(() => {
    if (!run || !["running", "queued"].includes(run.status)) return;
    const source = new EventSource(`/api/runs/${run.id}/events`);
    source.onmessage = (e) => {
      const next: Run = JSON.parse(e.data);
      setRuns((old) => old.map((r) => (r.id === next.id ? next : r)));
      if (!["running", "queued"].includes(next.status)) source.close();
    };
    return () => source.close();
  }, [run?.id, run?.status]);
  return (
    <>
      <ScrollToTop />
      <Header experiment={experiment} />
      <main>
        <Routes>
          <Route
            path="/"
            element={
              <Analysis
                key={experiment.runId}
                run={run}
                experiment={experiment}
                error={error}
                loading={loading}
              />
            }
          />
          <Route path="/matches/:id" element={<Replay />} />
          <Route
            path="*"
            element={<ErrorView message="This page could not be found." />}
          />
        </Routes>
        <Footer />
      </main>
    </>
  );
}
function App() {
  return (
    <BrowserRouter>
      <ExperimentApp />
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
