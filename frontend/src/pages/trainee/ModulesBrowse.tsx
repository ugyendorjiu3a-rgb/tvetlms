import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { modulesApi, tradesApi } from '../../lib/api';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../../components/Feedback';
import { getApiErrorMessage } from '../../lib/apiClient';

// Note: the backend has no per-trainee "my modules" filter today (GET /modules returns every
// module institution-wide) — reasonable for a single-pilot-department deployment, but this page
// deliberately doesn't claim personalized enrollment it can't actually show.
export function ModulesBrowse() {
  const [tradeId, setTradeId] = useState<string>('');
  const trades = useQuery({ queryKey: ['trades'], queryFn: tradesApi.list });
  const modules = useQuery({
    queryKey: ['modules', tradeId],
    queryFn: () => modulesApi.list(tradeId || undefined),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Modules</h1>
        <select
          value={tradeId}
          onChange={(e) => setTradeId(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">All trades</option>
          {trades.data?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nameEn}
            </option>
          ))}
        </select>
      </div>

      {modules.isLoading && <LoadingSpinner label="Loading modules…" />}
      {modules.isError && <ErrorMessage message={getApiErrorMessage(modules.error)} onRetry={() => modules.refetch()} />}
      {modules.data && modules.data.length === 0 && <EmptyState title="No modules found" />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.data?.map((m) => (
          <Link
            key={m.id}
            to={`/trainee/modules/${m.id}`}
            className="rounded-lg border border-slate-200 bg-white p-4 hover:border-trainee hover:shadow-sm"
          >
            <div className="text-xs font-medium text-trainee">{m.code}</div>
            <div className="mt-1 font-semibold text-slate-800">{m.nameEn}</div>
            <div className="mt-1 text-xs text-slate-500">{m.trade?.nameEn}</div>
            <div className="mt-2 text-xs text-slate-400">
              Tutor: {m.moduleTutor?.fullName ?? 'Unassigned'} · {m.durationWeeks} weeks
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
