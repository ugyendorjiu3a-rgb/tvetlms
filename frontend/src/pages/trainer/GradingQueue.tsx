import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { submissionsApi } from '../../lib/api';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../../components/Feedback';
import { StatusPill } from '../../components/StatusPill';
import { getApiErrorMessage } from '../../lib/apiClient';

// ui-ux-flow.md §2.4 Grading Queue.
export function GradingQueue() {
  const [status, setStatus] = useState('');
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['submissions', 'queue', status],
    queryFn: () => submissionsApi.queue(status || undefined),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Grading Queue</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
          <option value="">Submitted &amp; late (default)</option>
          <option value="graded">Graded</option>
        </select>
      </div>

      {isLoading && <LoadingSpinner label="Loading queue…" />}
      {isError && <ErrorMessage message={getApiErrorMessage(error)} onRetry={() => refetch()} />}
      {data && data.length === 0 && <EmptyState title="You're all caught up" hint="No pending submissions." />}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Trainee</th>
              <th className="px-4 py-2">Assignment</th>
              <th className="px-4 py-2">Submitted</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link to={`/trainer/submissions/${s.id}`} className="font-medium text-trainer">
                    {s.trainee?.fullName ?? s.traineeId}
                  </Link>
                </td>
                <td className="px-4 py-2">{s.assignment?.title}</td>
                <td className="px-4 py-2 text-xs text-slate-500">
                  {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-2">
                  <StatusPill status={s.status} />
                </td>
                <td className="px-4 py-2">{s.grade ? `${s.grade.score} pts` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
