import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { submissionsApi, syncApi } from '../../lib/api';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../../components/Feedback';
import { StatusPill } from '../../components/StatusPill';
import { getApiErrorMessage } from '../../lib/apiClient';

// ui-ux-flow.md §2.2 Trainer dashboard.
export function TrainerDashboard() {
  const queue = useQuery({ queryKey: ['submissions', 'queue'], queryFn: () => submissionsApi.queue() });
  const sync = useQuery({ queryKey: ['sync', 'status'], queryFn: syncApi.status });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-slate-900">Welcome back</h1>

      {sync.data && sync.data.openConflicts > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          ⚠ You have {sync.data.openConflicts} open grading conflict{sync.data.openConflicts > 1 ? 's' : ''} to resolve.
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-slate-800">Grading Queue ({queue.data?.length ?? 0} pending)</h2>
          <Link to="/trainer/queue" className="text-xs text-trainer underline">
            Open full queue
          </Link>
        </div>
        {queue.isLoading && <LoadingSpinner />}
        {queue.isError && <ErrorMessage message={getApiErrorMessage(queue.error)} onRetry={() => queue.refetch()} />}
        {queue.data && queue.data.length === 0 && <EmptyState title="You're all caught up" hint="No pending submissions." />}
        <ul className="divide-y divide-slate-100">
          {queue.data?.slice(0, 5).map((s) => (
            <li key={s.id}>
              <Link to={`/trainer/submissions/${s.id}`} className="flex items-center justify-between py-2 text-sm hover:text-trainer">
                <span className="truncate">
                  {s.trainee?.fullName ?? s.traineeId} — {s.assignment?.title}
                </span>
                <StatusPill status={s.status} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
