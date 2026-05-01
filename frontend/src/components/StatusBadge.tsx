import type { Repository } from '../types';

const COLORS: Record<Repository['status'], string> = {
  pending: 'bg-slate-200 text-slate-700',
  cloning: 'bg-blue-100 text-blue-700',
  analyzing: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700'
};

export function StatusBadge({ status }: { status: Repository['status'] }) {
  return (
    <span role="status" className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${COLORS[status]}`}>
      {status}
    </span>
  );
}
