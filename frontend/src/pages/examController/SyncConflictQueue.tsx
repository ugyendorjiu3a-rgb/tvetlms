import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { syncApi } from '../../lib/api';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../../components/Feedback';
import { getApiErrorMessage } from '../../lib/apiClient';

// Sync Conflict Queue — ui-ux-flow.md §2.7/§3.4, architecture.md §7 tiered conflict strategy.
// Grades never silently auto-merge; a human picks which version to keep.
export function SyncConflictQueue() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['sync', 'conflicts'], queryFn: syncApi.conflicts });

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: 'keep_server' | 'keep_client' }) =>
      syncApi.resolveConflict(id, resolution),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sync', 'conflicts'] }),
  });

  if (isLoading) return <LoadingSpinner label="Loading conflicts…" />;
  if (isError) return <ErrorMessage message={getApiErrorMessage(error)} onRetry={() => refetch()} />;
  if (!data || data.length === 0) {
    return <EmptyState title="No open conflicts" hint="Grading data is fully synced and consistent." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-slate-900">Sync Conflict Queue</h1>
      {resolveMutation.isError && <ErrorMessage message={getApiErrorMessage(resolveMutation.error)} />}

      <ul className="flex flex-col gap-3">
        {data.map((c) => (
          <li key={c.id} className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="mb-2 text-sm font-medium text-red-900">
              Conflict on {c.entityType} {c.entityId.slice(0, 8)}…
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <div className="mb-1 text-xs font-semibold text-slate-500">Server version</div>
                <pre className="overflow-x-auto text-xs text-slate-700">{JSON.stringify(c.serverVersionSnapshot, null, 2)}</pre>
                <button
                  type="button"
                  onClick={() => resolveMutation.mutate({ id: c.id, resolution: 'keep_server' })}
                  disabled={resolveMutation.isPending}
                  className="mt-2 rounded-md bg-examctrl px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Keep server version
                </button>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <div className="mb-1 text-xs font-semibold text-slate-500">Client version</div>
                <pre className="overflow-x-auto text-xs text-slate-700">{JSON.stringify(c.clientVersionSnapshot, null, 2)}</pre>
                <button
                  type="button"
                  onClick={() => resolveMutation.mutate({ id: c.id, resolution: 'keep_client' })}
                  disabled={resolveMutation.isPending}
                  className="mt-2 rounded-md bg-examctrl px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Keep client version
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
