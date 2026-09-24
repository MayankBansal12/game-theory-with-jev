import experiment0 from "./recorded/experiment-0.json";

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
export interface Scenario {
  runId: string;
  label: string;
  description: string;
}
export interface Experiment {
  number: number;
  runId: string;
  analysis?: AnalysisData;
  scenarios?: Scenario[];
  title?: string;
  description?: string;
  findings?: {
    behavior: Finding;
    reward: Finding;
    selfPlay: Finding;
    ending: Finding;
  };
  constraints: Finding[];
}

// Versions group their scenario runs. Existing run and replay URLs remain valid.
// The v0 snapshot and findings stay tied to the original eight-opponent pilot.
export const experiments: Experiment[] = [
  {
    number: 0,
    runId: "33654f59990b",
    analysis: experiment0,
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
  {
    number: 1,
    runId: "bc6f79c6d8f0",
    title: "Can cooperation recover?",
    description:
      "In v0, Jev never went back to cooperating once it defected. So for v1, I wanted to see if the first move changes what follows. I added 4 opponents, for 12 in total, and ran 3 scenarios: Jev picks its own opening, cooperate first, or defect first. After round 1, every move is Jev’s.",
    scenarios: [
      {
        runId: "bc6f79c6d8f0",
        label: "Free opening",
        description: "Jev picks every move, including the first.",
      },
      {
        runId: "1a47c3b89898",
        label: "Cooperate first",
        description:
          "Jev’s first move is set to cooperate. It picks every move after that.",
      },
      {
        runId: "2fbbe57b0d35",
        label: "Defect first",
        description:
          "Jev’s first move is set to defect. It picks every move after that.",
      },
    ],
    constraints: [
      {
        title: "An exploratory run",
        text: "Joss was replaced and its matches are excluded. The scenarios ran one after another on September 18–19, 2026. The model name stayed the same, but changes on the API side can’t be ruled out. The findings describe this run, not Jev in general.",
      },
      {
        title: "20 matches per opponent",
        text: "Each scenario has 240 matches: 20 against each of 12 opponents, for 720 in total. History resets between matches, but moves within a match depend on earlier rounds. v0 is a separate run with 5 matches per opponent.",
      },
      {
        title: "Only the opening changes",
        text: "The model, prompt, payoffs, opponents, and known 20-round ending are the same in every scenario. In self-play, only one Jev’s opening is set; the other chooses freely. Neither Jev knows the scenario, its opponent, or future moves.",
      },
      {
        title: "Same seeds across scenarios",
        text: "Each opponent and repetition uses the same seed in every scenario. The seed only affects the scripted opponents, not Jev.",
      },
    ],
  },
];
