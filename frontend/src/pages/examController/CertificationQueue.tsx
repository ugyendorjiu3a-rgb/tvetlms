import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { resultsApi } from '../../lib/api';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../../components/Feedback';
import { StatusPill } from '../../components/StatusPill';
import { getApiErrorMessage } from '../../lib/apiClient';
import axios from 'axios';

// ui-ux-flow.md §3.4 Certification Queue / §5.3 Exam Controller Result Management Journey.
export function CertificationQueue() {
  const queryClient = useQueryClient();
  const [disputeReason, setDisputeReason] = useState<Record<string, string>>({});
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['results', 'pending-approval'],
    queryFn: resultsApi.pendingApproval,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => resultsApi.approve(id),
    onSuccess: () => {
      setConflictNotice(null);
      queryClient.invalidateQueries({ queryKey: ['results'] });
    },
    onError: (err) => {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setConflictNotice(getApiErrorMessage(err));
      }
    },
  });

  const disputeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => resultsApi.dispute(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['results'] }),
  });

  if (isLoading) return <LoadingSpinner label="Loading certification queue…" />;
  if (isError) return <ErrorMessage message={getApiErrorMessage(error)} onRetry={() => refetch()} />;
  if (!data || data.length === 0) return <EmptyState title="No results awaiting approval right now" />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-slate-900">Certification Queue</h1>

      {conflictNotice && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p>{conflictNotice}</p>
          <Link to="/exam-controller/conflicts" className="mt-1 inline-block underline">
            Go to Sync Conflict Queue
          </Link>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Trainee</th>
              <th className="px-4 py-2">Module</th>
              <th className="px-4 py-2">Score</th>
              <th className="px-4 py-2">Mark</th>
              <th className="px-4 py-2">Outcome</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 font-medium text-slate-800">{r.trainee?.fullName ?? r.traineeId}</td>
                <td className="px-4 py-2">{r.module?.nameEn ?? r.moduleId}</td>
                <td className="px-4 py-2">{r.totalScore}</td>
                <td className="px-4 py-2">{r.mark}</td>
                <td className="px-4 py-2">
                  <StatusPill status={r.outcome} />
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => approveMutation.mutate(r.id)}
                      disabled={approveMutation.isPending}
                      className="rounded-md bg-examctrl px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <input
                      type="text"
                      placeholder="Dispute reason"
                      value={disputeReason[r.id] ?? ''}
                      onChange={(e) => setDisputeReason((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      className="w-32 rounded-md border border-slate-300 px-2 py-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => disputeMutation.mutate({ id: r.id, reason: disputeReason[r.id] ?? '' })}
                      disabled={disputeMutation.isPending || !disputeReason[r.id]}
                      className="rounded-md border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-50"
                    >
                      Dispute
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
