import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { modulesApi } from '../../lib/api';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../../components/Feedback';
import { getApiErrorMessage } from '../../lib/apiClient';

export function TrainerModules() {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['modules'], queryFn: () => modulesApi.list() });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-slate-900">Modules</h1>
      {isLoading && <LoadingSpinner label="Loading modules…" />}
      {isError && <ErrorMessage message={getApiErrorMessage(error)} onRetry={() => refetch()} />}
      {data && data.length === 0 && <EmptyState title="No modules yet" hint="Ask your Admin to set one up." />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((m) => (
          <Link
            key={m.id}
            to={`/trainer/modules/${m.id}`}
            className="rounded-lg border border-slate-200 bg-white p-4 hover:border-trainer hover:shadow-sm"
          >
            <div className="text-xs font-medium text-trainer">{m.code}</div>
            <div className="mt-1 font-semibold text-slate-800">{m.nameEn}</div>
            <div className="mt-1 text-xs text-slate-500">{m.trade?.nameEn}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
