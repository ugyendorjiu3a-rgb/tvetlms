// Generic status colors — deliberately semantic (red/amber/green/slate), never a role color, per
// ui-ux-flow.md §0.4 ("status color and role color are never confused").
const STATUS_STYLES: Record<string, string> = {
  // submission / grade / result statuses
  draft: 'bg-slate-100 text-slate-700',
  queued: 'bg-slate-100 text-slate-700',
  submitted: 'bg-blue-100 text-blue-800',
  late: 'bg-amber-100 text-amber-800',
  graded: 'bg-green-100 text-green-800',
  pending: 'bg-slate-100 text-slate-700',
  pending_approval: 'bg-amber-100 text-amber-800',
  pending_confirmation: 'bg-amber-100 text-amber-800',
  auto_graded: 'bg-blue-100 text-blue-800',
  manually_graded: 'bg-blue-100 text-blue-800',
  reviewed: 'bg-green-100 text-green-800',
  disputed: 'bg-red-100 text-red-800',
  approved: 'bg-green-100 text-green-800',
  confirmed: 'bg-green-100 text-green-800',
  certified: 'bg-green-100 text-green-800',
  repeat_module: 'bg-red-100 text-red-800',
  scheduled: 'bg-slate-100 text-slate-700',
  cancelled: 'bg-red-100 text-red-800',
  open: 'bg-red-100 text-red-800',
  resolved: 'bg-green-100 text-green-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-slate-100 text-slate-700',
  eradicated: 'bg-slate-200 text-slate-600',
  withdrawn: 'bg-slate-100 text-slate-600',
};

export function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
