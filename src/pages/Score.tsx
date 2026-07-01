import TopBar from "@/components/layout/TopBar";
import ProgressBar from "@/components/ui/ProgressBar";
import { useAuth } from "@/hooks/useAuth";
import { computeScoreBreakdown } from "@/lib/scoreBreakdown";

function getLabel(score: number) {
  if (score >= 800) return "Excellent";
  if (score >= 600) return "Bien";
  if (score >= 400) return "Moyen";
  return "À améliorer";
}

export default function Score() {
  const { profile } = useAuth();
  const score = profile?.score ?? 0;
  const maxScore = profile?.max_score ?? 1000;
  const scorePercent = (score / maxScore) * 100;
  const scoreBreakdown = computeScoreBreakdown({
    score,
    max_score: maxScore,
    groups_count: profile?.groups_count,
    cycles_completed: profile?.cycles_completed,
  });

  return (
    <div className="animate-fade-in">
      <TopBar title="Score de confiance" backTo="/profil" backLabel="Profil" />
      <div className="px-4 pb-6">
        {/* Score circle */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-32 h-32 mb-3">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="50" fill="none"
                stroke="hsl(160, 84%, 39%)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${scorePercent * 3.14} ${(100 - scorePercent) * 3.14}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{score}</span>
              <span className="text-[10px] text-muted-foreground">/ {maxScore}</span>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[hsla(160,84%,39%,0.12)] text-[hsl(var(--tc-green))]">
            {getLabel(score)}
          </span>
        </div>

        {/* Breakdown */}
        <div className="flex flex-col gap-3 mb-6">
          {scoreBreakdown.map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold">{s.label}</span>
                <span className="text-muted-foreground">poids {s.weight}%</span>
              </div>
              <ProgressBar value={s.value} color={s.color} />
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="p-3 rounded-xl bg-[hsla(217,91%,60%,0.08)] border border-[hsla(217,91%,60%,0.15)]">
          <p className="text-[11px] font-semibold text-[hsl(var(--tc-blue))] mb-1">💡 Comment améliorer votre score ?</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Cotisez à temps (+5 pts/cotisation), rejoignez des groupes et évitez les pénalités (-20 pts). Un score ≥ 700 débloque les groupes Premium.
          </p>
        </div>
      </div>
    </div>
  );
}