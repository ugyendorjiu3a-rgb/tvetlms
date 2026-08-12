import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assessmentsApi } from '../../lib/api';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../../components/Feedback';
import { StatusPill } from '../../components/StatusPill';
import { getApiErrorMessage } from '../../lib/apiClient';

// ui-ux-flow.md §3.4 Assessment Schedule Review.
export function AssessmentApprovals() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['assessments'], queryFn: () => assessmentsApi.list() });

  const approveMutation = useMutation({
    mutationFn: (id: string) => assessmentsApi.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assessments'] }),
  });

  const pending = data?.filter((a) => a.status === 'scheduled') ?? [];
  const approved = data?.filter((a) => a.status === 'approved') ?? [];

  if (isLoading) return <LoadingSpinner label="Loading assessments…" />;
  if (isError) return <ErrorMessage message={getApiErrorMessage(error)} onRetry={() => refetch()} />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-slate-900">Assessment Approvals</h1>

      <section>
        <h2 className="mb-2 font-medium text-slate-800">Awaiting approval</h2>
        {pending.length === 0 && <EmptyState title="Nothing awaiting approval" />}
        <ul className="flex flex-col gap-2">
          {pending.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3">
              <div>
                <div className="font-medium text-slate-800">{a.title}</div>
                <div className="text-xs text-slate-400">
                  {a.module?.nameEn} · {a.tier} · {a.subtype.replace(/_/g, ' ')} · max {a.maxScore}
                </div>
              </div>
              <button
                type="button"
                onClick={() => approveMutation.mutate(a.id)}
                disabled={approveMutation.isPending}
                className="rounded-md bg-examctrl px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                Approve
              </button>
            </li>
          ))}
        </ul>
        {approveMutation.isError && <div className="mt-2"><ErrorMessage message={getApiErrorMessage(approveMutation.error)} /></div>}
      </section>

      <section>
        <h2 className="mb-2 font-medium text-slate-800">Already approved</h2>
        <ul className="flex flex-col gap-2">
          {approved.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-md border border-slate-100 bg-white p-3 text-sm">
              <span>
                {a.title} <span className="text-xs text-slate-400">— {a.module?.nameEn}</span>
              </span>
              <StatusPill status={a.status} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
