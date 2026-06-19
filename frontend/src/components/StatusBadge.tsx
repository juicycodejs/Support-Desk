import { type TicketStatus } from '../types';

const config: Record<TicketStatus, { label: string; className: string }> = {
  PENDING:  { label: 'Pending',  className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  ASSIGNED: { label: 'Assigned', className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  RESOLVED: { label: 'Resolved', className: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const c = config[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${c.className}`}>
      {c.label}
    </span>
  );
}
