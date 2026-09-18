export type Move = "C" | "D";
export interface Opponent {
  id: string;
  name: string;
  short: string;
  description: string;
}
export interface Match {
  id: string;
  run_id: string;
  number: number;
  opponent: string;
  repetition: number;
  seed: number;
  status: string;
  error: string | null;
  rounds_played: number;
  score_a: number;
  score_b: number;
  cooperations_a: number;
  cooperations_b: number;
}
export interface Standing extends Opponent {
  played: number;
  scheduled: number;
  wins: number;
  draws: number;
  losses: number;
  score_a: number;
  score_b: number;
  avg_a: number | null;
  avg_b: number | null;
  cooperation_a: number | null;
  cooperation_b: number | null;
  mutual_cooperation: number | null;
  repetitions: {
    match_id: string;
    repetition: number;
    score_a: number;
    score_b: number;
    avg_a: number;
    avg_b: number;
  }[];
}
export interface Config {
  rounds: number;
  repetitions: number;
  opponents: string[];
  seed: number;
  model: string;
  prompt_version: string;
  questions: Record<
    string,
    { type: string; instructions: string; criteria: Record<string, string> }
  >;
  max_requests: number;
}
export interface Run {
  id: string;
  name: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  config: Config;
  verification: {
    passed: boolean;
    rounds_checked: number;
    decisions_checked: number;
    matches_checked: number;
    errors: string[];
  } | null;
  standings: Standing[];
  matches: Match[];
  totals: {
    scheduled_matches: number;
    completed_matches: number;
    rounds_played: number;
    scheduled_rounds: number;
    score_a: number;
    avg_a: number | null;
    cooperation_a: number | null;
    wins: number;
    draws: number;
    losses: number;
    api_attempts: number;
    failed_attempts: number;
    decisions: number;
    input_tokens: number;
    output_tokens: number;
    avg_latency_ms: number;
  };
}
export interface Decision {
  action: Move;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  payload: { model: string; state: unknown; questions: Config["questions"] };
  response: {
    model: string;
    answers: {
      next_move: {
        choice: string;
        probabilities: { cooperate: number; defect: number };
        confidence: number;
      };
    };
  };
}
export interface Round {
  number: number;
  a: Move;
  b: Move;
  reward_a: number;
  reward_b: number;
  score_a: number;
  score_b: number;
  decisions: { a: Decision | null; b: Decision | null };
}
export interface MatchDetail extends Match {
  config: Config;
  run_name: string;
  rounds: Round[];
}
