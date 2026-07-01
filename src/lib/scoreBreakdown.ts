export interface ScoreProfile {
  score: number;
  max_score?: number;
  groups_count?: number;
  cycles_completed?: number;
}

export interface ScoreDimension {
  label: string;
  value: number;
  color: "green" | "blue" | "purple" | "amber";
  weight: number;
}

/** Décomposition du score à partir des données profil (DB). */
export function computeScoreBreakdown(profile: ScoreProfile): ScoreDimension[] {
  const max = profile.max_score ?? 1000;
  const score = profile.score ?? 500;
  const ratio = Math.min(1, score / max);

  return [
    {
      label: "Ponctualité",
      value: Math.round(Math.min(100, ratio * 100 + (profile.cycles_completed ?? 0) * 2)),
      color: "green",
      weight: 40,
    },
    {
      label: "Participation",
      value: Math.round(Math.min(100, (profile.groups_count ?? 0) * 25)),
      color: "blue",
      weight: 25,
    },
    {
      label: "Ancienneté",
      value: Math.round(Math.min(100, (profile.cycles_completed ?? 0) * 12)),
      color: "purple",
      weight: 20,
    },
    {
      label: "Fiabilité",
      value: Math.round(ratio * 100),
      color: "amber",
      weight: 15,
    },
  ];
}
