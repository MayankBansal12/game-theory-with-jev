import baseline from "./recorded/experiment-0.json";

export interface RecordedMatch {
  id: string;
  opponent: string;
  repetition: number;
  moves: string;
  opponentMoves: string;
  scores: number[];
  opponentScores: number[];
  // Primary Jev seat, indexed by round, as returned by the API.
  cooperationProbabilities: number[];
  confidence: number[];
}
export interface AnalysisData {
  runId: string;
  rounds: number;
  matches: RecordedMatch[];
}
interface Finding {
  title: string;
  text: string;
}
export interface Experiment {
  number: number;
  runId: string;
  title: string;
  analysis?: AnalysisData;
  findings: {
    behavior: Finding;
    reward: Finding;
    selfPlay: Finding;
    ending: Finding;
  };
  constraints: Finding[];
}

// Only published experiments appear here. The snapshot contains recorded moves
// and scores, plus Jev’s choice probabilities and confidence. No requests or
// credentials are included. Add each future run with its own
// snapshot and observations; the connection check stays out of the page.
export const experiments: Experiment[] = [
  {
    number: 0,
    runId: "33654f59990b",
    title: "Baseline",
    analysis: baseline,
    findings: {
      behavior: {
        title: "Jev settled on its move by round two",
        text: "Every opening call received the same input, yet Jev chose to cooperate 11 times and defect 29 times. By round two, every match had settled into a pattern that lasted to the end. All three switches followed an opponent’s defection. Jev never switched from defection back to cooperation.",
      },
      reward: {
        title: "A cooperative draw was worth more than a win",
        text: "Tit for Tat starts by cooperating, then copies the opponent’s last move. When Jev cooperated, both earned 60 points. When Jev kept defecting, it won 24 to 19. The cooperative draws earned Jev 2.5 times as many points as its wins, even though its objective was to maximize points.",
      },
      selfPlay: {
        title: "Two Jevs never built cooperation",
        text: "Across five self-play matches, both players defected in 98 of 100 rounds. The other two rounds had one player cooperate. They averaged 1.03 points each per round, far below the 3 points that mutual cooperation would earn.",
      },
      ending: {
        title: "Cooperation lasted through the known ending",
        text: "All eight fully cooperative matches ended with cooperation. Jev was told that round 20 was the last round. Defecting there would have earned 5 points instead of 3, with no later round for retaliation.",
      },
    },
    constraints: [
      {
        title: "A small, fixed sample",
        text: "One model, one prompt, and five matches against each of eight opponents. The 800 rounds come from 40 matches, so the findings describe this run.",
      },
      {
        title: "Fixed rules and a known ending",
        text: "Jev had two choices and one objective: maximize its own total points. Payoffs stayed fixed, and it knew each match would end after 20 rounds.",
      },
      {
        title: "Full history, fresh matches",
        text: "Jev saw every earlier move and score in the current match. The opponent’s identity and current choice were hidden. No memory carried between matches.",
      },
    ],
  },
];
