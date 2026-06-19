interface Props { score: number }

export function SentimentMeter({ score }: Props) {
  const pct = ((score - 1) / 9) * 100;
  const color = score <= 3 ? 'bg-red-500' : score <= 6 ? 'bg-amber-500' : 'bg-emerald-500';
  const label = score <= 3 ? 'Distressed' : score <= 6 ? 'Frustrated' : 'Calm';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>Customer Sentiment</span>
        <span className="font-mono">{label} ({score}/10)</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
