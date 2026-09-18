import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  useLocation,
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
  Trophy,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Code2,
  ShieldCheck,
  CircleHelp,
  X,
  Copy,
  Grid2X2,
  Activity,
  CheckCheck,
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
import "./style.css";

const fmt = (n: number | null | undefined, digits = 2) =>
  n == null ? "—" : n.toFixed(digits);
const pct = (n: number | null | undefined) =>
  n == null ? "—" : `${Math.round(n * 100)}%`;
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
  another_jev: "J",
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
  return (
    <span
      className={`avatar ${id === "jev" || id === "another_jev" ? "jev" : ""} ${small ? "small" : ""}`}
      aria-hidden="true"
    >
      {id === "jev" ? "J" : icons[id] || "J"}
    </span>
  );
}
function Tag({ children }: { children: React.ReactNode }) {
  return <span className="tag">{children}</span>;
}
function Status({ run }: { run: Run }) {
  return (
    <span className={`status ${run.status === "complete" ? "complete" : ""}`}>
      <span />
      {run.status === "complete"
        ? "Completed"
        : run.status === "running"
          ? "In progress"
          : run.status.charAt(0).toUpperCase() + run.status.slice(1)}
    </span>
  );
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
function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="brand">
          <span className="brand-icon">
            <Grid2X2 size={19} />
          </span>
          Jev plays
        </Link>
        <Link className="nav-pill" to="/">
          <Trophy size={14} /> Tournament
        </Link>
        <span className="header-note">An experiment in cooperation</span>
      </div>
    </header>
  );
}
function Footer() {
  return (
    <footer>
      <span>
        Jev plays <span className="footer-dot">·</span> Iterated prisoner’s
        dilemma
      </span>
      <a
        href="https://typesafe.ai/blog/introducing-system-one-models-and-jev"
        target="_blank"
        rel="noreferrer"
      >
        Meet the model <ArrowUpRight size={13} />
      </a>
    </footer>
  );
}
function ErrorView({ message }: { message: string }) {
  return (
    <div className="empty">
      <CircleHelp size={25} />
      <h2>{message}</h2>
      <Link className="button" to="/">
        Back to tournament
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
        No opponent name or strategy. Each match starts with an empty history.
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
        Players are ranked by their own average points per round. Jev’s row
        covers all opponents; every other row covers only matches against Jev.
        Wins, losses, and draws are from each player’s perspective. Only
        completed matches count. These results describe this model, prompt, and
        schedule.
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
      description: "All opponents.",
      points: run.totals.score_a,
      average: run.totals.avg_a,
      wins: run.totals.wins,
      losses: run.totals.losses,
      draws: run.totals.draws,
    },
    ...run.standings.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      points: s.score_b,
      average: s.avg_b,
      wins: s.losses,
      losses: s.wins,
      draws: s.draws,
    })),
  ].sort((a, b) => (b.average ?? -1) - (a.average ?? -1));

  return (
    <div className="panel standings-panel">
      <div className="panel-head">
        <div>
          <h3>Jev vs other players</h3>
          <p>
            Ranked by each player’s points per round. Opponents play only Jev.
          </p>
        </div>
        <Trophy size={17} className="muted" />
      </div>
      <div className="table-scroll">
        <table aria-label="Jev vs other players">
          <thead>
            <tr>
              <th scope="col" className="rank-col">
                #
              </th>
              <th scope="col">Player</th>
              <th scope="col" className="number">
                Total pts
              </th>
              <th scope="col" title="Player wins, losses, draws">
                W / L / D
              </th>
              <th
                scope="col"
                className="number"
                aria-sort="descending"
                title="Average points per round"
              >
                Pts / rd
              </th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => {
              const rank =
                player.average == null
                  ? null
                  : players.findIndex((p) => p.average === player.average) + 1;
              return (
                <tr
                  key={player.id}
                  className={player.id === "jev" ? "jev-row" : undefined}
                >
                  <td>
                    <span className={`rank ${rank === 1 ? "first" : ""}`}>
                      {rank ?? "—"}
                    </span>
                  </td>
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
                  <td className="number">{num(player.points)}</td>
                  <td className="record">
                    <span>{player.wins}</span>
                    <i>/</i>
                    <span>{player.losses}</span>
                    <i>/</i>
                    <span>{player.draws}</span>
                  </td>
                  <td className="number">
                    <strong className={rank === 1 ? "green" : ""}>
                      {fmt(player.average)}
                    </strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="table-foot">
        <ShieldCheck size={14} />
        {run.verification?.passed
          ? `${num(run.verification.rounds_checked)} rounds verified`
          : "Completed matches only"}
        <span>
          Jev: {run.totals.completed_matches} matches · Others:{" "}
          {run.config.repetitions} each
        </span>
      </div>
    </div>
  );
}
function SummaryInsight({ run }: { run: Run }) {
  const best = run.standings.find((s) => s.played > 0),
    worst = [...run.standings].reverse().find((s) => s.played > 0);
  if (!best || !worst) return null;
  const self = run.standings.find(
    (s) => s.id === "another_jev" && s.played > 0,
  );
  return (
    <div className="insights">
      <div>
        <span className="insight-icon">
          <ArrowUpRight size={17} />
        </span>
        <div>
          <span className="eyebrow">HIGHEST SCORE</span>
          <p>
            Against <strong>{best.name}</strong>
            <br />
            <span>{fmt(best.avg_a)} points per round</span>
          </p>
        </div>
      </div>
      <div>
        <span className="insight-icon">
          <Activity size={17} />
        </span>
        <div>
          <span className="eyebrow">LOWEST SCORE</span>
          <p>
            Against <strong>{worst.name}</strong>
            <br />
            <span>{fmt(worst.avg_a)} points per round</span>
          </p>
        </div>
      </div>
      {self && (
        <div>
          <span className="insight-icon">
            <CheckCheck size={17} />
          </span>
          <div>
            <span className="eyebrow">JEV VS ANOTHER JEV</span>
            <p>
              <strong>{pct(self.mutual_cooperation)}</strong> mutual cooperation
              <br />
              <span>Across {self.played * run.config.rounds} rounds</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
function Tournament() {
  const [runs, setRuns] = useState<Run[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [params, setParams] = useSearchParams(),
    [filter, setFilter] = useState("all"),
    [method, setMethod] = useState(false);
  const gamesRef = useRef<HTMLElement>(null);
  useEffect(() => {
    api<Run[]>("/api/runs")
      .then(setRuns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const run = runs.find((r) => r.id === params.get("run")) || runs[0];
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
  useEffect(() => {
    document.title = "Jev tournament";
  }, []);
  if (error) return <ErrorView message={error} />;
  if (!run)
    return loading ? <Loading /> : <ErrorView message="No tournaments yet." />;
  const t = run.totals,
    matches = run.matches.filter(
      (m) => filter === "all" || m.opponent === filter,
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
      <div className="hero">
        <div>
          <div className="eyebrow">
            <Trophy size={14} /> FIRST ENCOUNTERS
          </div>
          <h1>
            The cooperation game<span>.</span>
          </h1>
          <p>
            One model. {run.config.opponents.length} opponents. A choice every
            round.
          </p>
          <div className="hero-tags">
            <Tag>{run.config.model}</Tag>
            <span>
              {run.config.rounds} rounds × {run.config.repetitions} matches per
              opponent
            </span>
            <button className="text-button" onClick={() => setMethod(true)}>
              How it works <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
        <div className="hero-right">
          <Status run={run} />
          <span>
            {new Date(run.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
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
              ? "—"
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
      <section>
        <SectionTitle
          eyebrow="THE RESULTS"
          title="A different game with everyone"
        >
          <div className="section-actions">
            <a className="text-button" href={`/api/runs/${run.id}/rounds.csv`}>
              <Download size={14} /> CSV
            </a>
            <a className="text-button" href={`/api/runs/${run.id}/export.json`}>
              <Code2 size={14} /> Full data
            </a>
          </div>
        </SectionTitle>
        <div className="results-grid">
          <Leaderboard run={run} onSelect={selectOpponent} />
          <ScoreChart run={run} />
        </div>
        <SummaryInsight run={run} />
      </section>
      <section ref={gamesRef} className="archive">
        <SectionTitle eyebrow="ROUND BY ROUND" title="Match archive">
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
          <div className="select-wrap quiet">
            <select
              aria-label="Tournament run"
              value={run.id}
              onChange={(e) => {
                setParams({ run: e.target.value });
                setFilter("all");
              }}
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <ChevronDown size={12} />
          </div>
        </div>
        <div className="match-grid">
          {matches.map((m) => (
            <Link className="match-card" to={`/matches/${m.id}`} key={m.id}>
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
        if (active) setMatch(value);
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
      document.title = `Jev vs ${opponentTitle(match.opponent)} · Jev plays`;
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
        <ArrowLeft size={14} /> Tournament
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
              <h3>The score so far</h3>
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
              Jev {final.score_a} <span>—</span> {final.score_b}{" "}
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
        <SectionTitle eyebrow={`ROUND ${round}`} title="Inside the decision">
          <div className="section-note">The exact model input and output.</div>
        </SectionTitle>
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
function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Tournament />} />
          <Route path="/matches/:id" element={<Replay />} />
          <Route
            path="*"
            element={<ErrorView message="This page could not be found." />}
          />
        </Routes>
        <Footer />
      </main>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
