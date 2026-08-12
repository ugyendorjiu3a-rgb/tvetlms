import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { institutionsApi, tradesApi, usersApi } from '../../lib/api';
import { LoadingSpinner, ErrorMessage } from '../../components/Feedback';
import { getApiErrorMessage } from '../../lib/apiClient';

type Tab = 'trainee' | 'trainer' | 'staff';

// ui-ux-flow.md §4.4 User Management. Shows the Admin-generated temporary password once, right
// after creation (PRD FR1: Admin hands credentials to the trainee/trainer via the credential
// portal) — it is never retrievable again after this screen.
export function UserManagement() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('trainee');
  const [lastCreated, setLastCreated] = useState<{ loginId: string; tempPassword: string } | null>(null);

  const institutions = useQuery({ queryKey: ['institutions'], queryFn: institutionsApi.list });
  const trades = useQuery({ queryKey: ['trades'], queryFn: tradesApi.list });
  const users = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() });

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-slate-900">User Management</h1>

      <div className="flex gap-2 border-b border-slate-200">
        {(['trainee', 'trainer', 'staff'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium capitalize ${
              tab === t ? 'border-b-2 border-admin text-admin' : 'text-slate-500'
            }`}
          >
            New {t}
          </button>
        ))}
      </div>

      {lastCreated && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          Created <strong>{lastCreated.loginId}</strong> — temporary password:{' '}
          <code className="rounded bg-white px-1.5 py-0.5">{lastCreated.tempPassword}</code>
          <div className="mt-1 text-xs text-green-700">Hand this to the user now — it won't be shown again.</div>
        </div>
      )}

      {institutions.isLoading || trades.isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {tab === 'trainee' && (
            <CreateTraineeForm
              institutionIds={institutions.data ?? []}
              tradeIds={trades.data ?? []}
              onCreated={(r) => {
                setLastCreated(r);
                invalidateUsers();
              }}
            />
          )}
          {tab === 'trainer' && (
            <CreateTrainerForm
              institutionIds={institutions.data ?? []}
              onCreated={(r) => {
                setLastCreated(r);
                invalidateUsers();
              }}
            />
          )}
          {tab === 'staff' && (
            <CreateStaffForm
              institutionIds={institutions.data ?? []}
              onCreated={(r) => {
                setLastCreated(r);
                invalidateUsers();
              }}
            />
          )}
        </>
      )}

      <section>
        <h2 className="mb-2 font-medium text-slate-800">All users</h2>
        {users.isLoading && <LoadingSpinner />}
        {users.isError && <ErrorMessage message={getApiErrorMessage(users.error)} />}
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Login ID</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.data?.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 font-medium text-slate-800">{u.loginId}</td>
                  <td className="px-4 py-2">{u.traineeProfile?.fullName ?? u.trainerProfile?.fullName ?? '—'}</td>
                  <td className="px-4 py-2">{u.userRoles?.map((r) => r.role?.name).join(', ')}</td>
                  <td className="px-4 py-2">{u.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CreateTraineeForm({
  institutionIds,
  tradeIds,
  onCreated,
}: {
  institutionIds: { id: string; name: string }[];
  tradeIds: { id: string; nameEn: string }[];
  onCreated: (r: { loginId: string; tempPassword: string }) => void;
}) {
  const [form, setForm] = useState({
    institutionId: '',
    loginId: '',
    fullName: '',
    citizenshipId: '',
    tradeId: '',
    enrollmentDate: new Date().toISOString().slice(0, 10),
  });
  const mutation = useMutation({
    mutationFn: () => usersApi.createTrainee({ ...form, tradeId: form.tradeId || undefined }),
    onSuccess: (res) => {
      onCreated({ loginId: res.user.loginId, tempPassword: res.tempPassword });
      setForm((f) => ({ ...f, loginId: '', fullName: '', citizenshipId: '' }));
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
      <select required value={form.institutionId} onChange={(e) => setForm({ ...form, institutionId: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
        <option value="">Institution…</option>
        {institutionIds.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name}
          </option>
        ))}
      </select>
      <select value={form.tradeId} onChange={(e) => setForm({ ...form, tradeId: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
        <option value="">Trade (optional)…</option>
        {tradeIds.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nameEn}
          </option>
        ))}
      </select>
      <input required placeholder="Student ID (login)" value={form.loginId} onChange={(e) => setForm({ ...form, loginId: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
      <input required placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
      <input required placeholder="Citizenship ID" value={form.citizenshipId} onChange={(e) => setForm({ ...form, citizenshipId: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
      <input required type="date" value={form.enrollmentDate} onChange={(e) => setForm({ ...form, enrollmentDate: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
      {mutation.isError && <div className="sm:col-span-2"><ErrorMessage message={getApiErrorMessage(mutation.error)} /></div>}
      <button type="submit" disabled={mutation.isPending} className="w-fit rounded-md bg-admin px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">
        {mutation.isPending ? 'Creating…' : 'Create trainee'}
      </button>
    </form>
  );
}

function CreateTrainerForm({
  institutionIds,
  onCreated,
}: {
  institutionIds: { id: string; name: string }[];
  onCreated: (r: { loginId: string; tempPassword: string }) => void;
}) {
  const [form, setForm] = useState({ institutionId: '', loginId: '', fullName: '', staffId: '', specialization: '' });
  const mutation = useMutation({
    mutationFn: () => usersApi.createTrainer(form),
    onSuccess: (res) => {
      onCreated({ loginId: res.user.loginId, tempPassword: res.tempPassword });
      setForm((f) => ({ ...f, loginId: '', fullName: '', staffId: '', specialization: '' }));
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
      <select required value={form.institutionId} onChange={(e) => setForm({ ...form, institutionId: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
        <option value="">Institution…</option>
        {institutionIds.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name}
          </option>
        ))}
      </select>
      <input required placeholder="Staff ID (login)" value={form.loginId} onChange={(e) => setForm({ ...form, loginId: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
      <input required placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
      <input required placeholder="Staff ID" value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
      <input placeholder="Specialization" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
      {mutation.isError && <div className="sm:col-span-2"><ErrorMessage message={getApiErrorMessage(mutation.error)} /></div>}
      <button type="submit" disabled={mutation.isPending} className="w-fit rounded-md bg-admin px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">
        {mutation.isPending ? 'Creating…' : 'Create trainer'}
      </button>
    </form>
  );
}

function CreateStaffForm({
  institutionIds,
  onCreated,
}: {
  institutionIds: { id: string; name: string }[];
  onCreated: (r: { loginId: string; tempPassword: string }) => void;
}) {
  const [form, setForm] = useState<{ institutionId: string; loginId: string; role: 'admin' | 'exam_controller' }>({
    institutionId: '',
    loginId: '',
    role: 'exam_controller',
  });
  const mutation = useMutation({
    mutationFn: () => usersApi.createStaff(form),
    onSuccess: (res) => {
      onCreated({ loginId: res.user.loginId, tempPassword: res.tempPassword });
      setForm((f) => ({ ...f, loginId: '' }));
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
      <select required value={form.institutionId} onChange={(e) => setForm({ ...form, institutionId: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
        <option value="">Institution…</option>
        {institutionIds.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name}
          </option>
        ))}
      </select>
      <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'exam_controller' })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
        <option value="exam_controller">Exam Controller</option>
        <option value="admin">Admin</option>
      </select>
      <input required placeholder="Staff ID (login)" value={form.loginId} onChange={(e) => setForm({ ...form, loginId: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm sm:col-span-2" />
      {mutation.isError && <div className="sm:col-span-2"><ErrorMessage message={getApiErrorMessage(mutation.error)} /></div>}
      <button type="submit" disabled={mutation.isPending} className="w-fit rounded-md bg-admin px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">
        {mutation.isPending ? 'Creating…' : 'Create staff account'}
      </button>
    </form>
  );
}
