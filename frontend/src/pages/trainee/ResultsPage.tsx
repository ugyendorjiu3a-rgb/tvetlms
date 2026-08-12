import { useQuery } from '@tanstack/react-query';
import { resultsApi } from '../../lib/api';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../../components/Feedback';
import { StatusPill } from '../../components/StatusPill';
import { getApiErrorMessage } from '../../lib/apiClient';

// ui-ux-flow.md §1.4 "My Results" — module-by-module list with mark/GPA, plus certificates.
export function ResultsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['results', 'mine'], queryFn: resultsApi.mine });

  if (isLoading) return <LoadingSpinner label="Loading results…" />;
  if (isError) return <ErrorMessage message={getApiErrorMessage(error)} onRetry={() => refetch()} />;
  if (!data || data.length === 0) return <EmptyState title="No results yet" hint="Results appear once a module has been graded and approved." />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-slate-900">My Results</h1>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Module</th>
              <th className="px-4 py-2">Score</th>
              <th className="px-4 py-2">Mark</th>
              <th className="px-4 py-2">GPA</th>
              <th className="px-4 py-2">Outcome</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Certificate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 font-medium text-slate-800">{r.module?.nameEn ?? r.moduleId}</td>
                <td className="px-4 py-2">{r.totalScore}</td>
                <td className="px-4 py-2">{r.mark}</td>
                <td className="px-4 py-2">{r.gpa}</td>
                <td className="px-4 py-2">
                  <StatusPill status={r.outcome} />
                </td>
                <td className="px-4 py-2">
                  <StatusPill status={r.status} />
                </td>
                <td className="px-4 py-2 text-xs text-slate-500">
                  {r.certificate ? r.certificate.certificateNumber : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
