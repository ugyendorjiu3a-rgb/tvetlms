import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { resultsApi, submissionsApi } from '../../lib/api';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../../components/Feedback';
import { StatusPill } from '../../components/StatusPill';
import { getApiErrorMessage } from '../../lib/apiClient';

// ui-ux-flow.md §1.2 Trainee dashboard — condensed to what's actually derivable from the current
// API (no dedicated "due soon" endpoint exists yet, see backend inspection notes): recent
// submissions + results summary, with links into the full Modules/Results pages.
export function TraineeDashboard() {
  const results = useQuery({ queryKey: ['results', 'mine'], queryFn: resultsApi.mine });
  const submissions = useQuery({ queryKey: ['submissions', 'mine'], queryFn: submissionsApi.mine });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-slate-900">Welcome back</h1>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-slate-800">Your Progress</h2>
          <Link to="/trainee/results" className="text-xs text-trainee underline">
            View all results
          </Link>
        </div>
        {results.isLoading && <LoadingSpinner />}
        {results.isError && <ErrorMessage message={getApiErrorMessage(results.error)} onRetry={() => results.refetch()} />}
        {results.data && results.data.length === 0 && (
          <EmptyState title="No results yet" hint="Results appear here once your modules have been graded and approved." />
        )}
        {results.data && results.data.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {results.data.slice(0, 4).map((r) => (
              <div key={r.id} className="rounded-md border border-slate-100 p-3 text-center">
                <div className="text-2xl font-bold text-trainee">{r.mark}</div>
                <div className="mt-1 truncate text-xs text-slate-500">{r.module?.nameEn ?? r.moduleId}</div>
                <div className="mt-1">
                  <StatusPill status={r.outcome} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-slate-800">Recent Submissions</h2>
          <Link to="/trainee/modules" className="text-xs text-trainee underline">
            Browse modules
          </Link>
        </div>
        {submissions.isLoading && <LoadingSpinner />}
        {submissions.isError && (
          <ErrorMessage message={getApiErrorMessage(submissions.error)} onRetry={() => submissions.refetch()} />
        )}
        {submissions.data && submissions.data.length === 0 && (
          <EmptyState title="No submissions yet" hint="Once you submit an assignment, it will show up here." />
        )}
        <ul className="divide-y divide-slate-100">
          {submissions.data?.slice(0, 5).map((s) => (
            <li key={s.id}>
              <Link to={`/trainee/submissions/${s.id}`} className="flex items-center justify-between py-2 text-sm hover:text-trainee">
                <span className="truncate">{s.assignment?.title ?? 'Assignment'}</span>
                <span className="flex items-center gap-2 shrink-0">
                  {s.grade && <span className="text-xs text-slate-500">{s.grade.score} pts</span>}
                  <StatusPill status={s.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
