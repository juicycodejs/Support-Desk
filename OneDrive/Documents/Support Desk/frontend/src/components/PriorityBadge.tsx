import { type PriorityLevel } from '../types';

const config: Record<PriorityLevel, { label: string; className: string; dot: string }> = {
  URGENT: { label: 'URGENT', className: 'bg-red-500/20 text-red-400 border border-red-500/30', dot: 'bg-red-400' },
  HIGH:   { label: 'HIGH',   className: 'bg-orange-500/20 text-orange-400 border border-orange-500/30', dot: 'bg-orange-400' },
  MEDIUM: { label: 'MEDIUM', className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', dot: 'bg-amber-400' },
  LOW:    { label: 'LOW',    className: 'bg-slate-500/20 text-slate-400 border border-slate-500/30', dot: 'bg-slate-400' },
};

export function PriorityBadge({ priority }: { priority: PriorityLevel }) {
  const c = config[priority];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-semibold ${c.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${priority === 'URGENT' ? 'animate-pulse' : ''}`} />
      {c.label}
    </span>
  );
}
