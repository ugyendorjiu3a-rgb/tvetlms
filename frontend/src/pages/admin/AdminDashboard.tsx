import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { institutionsApi, modulesApi, usersApi } from '../../lib/api';
import { LoadingSpinner } from '../../components/Feedback';

// ui-ux-flow.md §4.2 Admin dashboard — System Health / Pending Actions / Institutional KPIs,
// condensed to what the current API actually exposes (no dedicated capacity-metrics endpoint yet).
export function AdminDashboard() {
  const users = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() });
  const institutions = useQuery({ queryKey: ['institutions'], queryFn: institutionsApi.list });
  const modules = useQuery({ queryKey: ['modules'], queryFn: () => modulesApi.list() });

  const trainees = users.data?.filter((u) => u.traineeProfile).length ?? 0;
  const trainers = users.data?.filter((u) => u.trainerProfile).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-slate-900">Welcome back</h1>

      {(users.isLoading || institutions.isLoading || modules.isLoading) && <LoadingSpinner />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/admin/users" className="rounded-lg border border-slate-200 bg-white p-4 hover:border-admin">
          <div className="text-2xl font-bold text-admin">{users.data?.length ?? '—'}</div>
          <div className="text-sm text-slate-600">Total users</div>
        </Link>
        <Link to="/admin/trainees" className="rounded-lg border border-slate-200 bg-white p-4 hover:border-admin">
          <div className="text-2xl font-bold text-admin">{trainees}</div>
          <div className="text-sm text-slate-600">Trainees</div>
        </Link>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-2xl font-bold text-admin">{trainers}</div>
          <div className="text-sm text-slate-600">Trainers</div>
        </div>
        <Link to="/admin/institutions" className="rounded-lg border border-slate-200 bg-white p-4 hover:border-admin">
          <div className="text-2xl font-bold text-admin">{institutions.data?.length ?? '—'}</div>
          <div className="text-sm text-slate-600">Institutions</div>
        </Link>
      </div>

      <Link to="/admin/modules" className="w-fit rounded-lg border border-slate-200 bg-white p-4 hover:border-admin">
        <div className="text-2xl font-bold text-admin">{modules.data?.length ?? '—'}</div>
        <div className="text-sm text-slate-600">Modules configured</div>
      </Link>
    </div>
  );
}
