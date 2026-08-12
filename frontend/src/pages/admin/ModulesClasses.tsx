import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { classesApi, institutionsApi, modulesApi, tradesApi, usersApi } from '../../lib/api';
import { LoadingSpinner, ErrorMessage, SuccessBanner } from '../../components/Feedback';
import { getApiErrorMessage } from '../../lib/apiClient';

// ui-ux-flow.md §4.4 Institution & Module Setup — module/class creation and trainee↔module
// enrollment (database-design.md module_trainees / class_enrollments junctions).
export function ModulesClasses() {
  const queryClient = useQueryClient();
  const institutions = useQuery({ queryKey: ['institutions'], queryFn: institutionsApi.list });
  const trades = useQuery({ queryKey: ['trades'], queryFn: tradesApi.list });
  const modules = useQuery({ queryKey: ['modules'], queryFn: () => modulesApi.list() });
  const classes = useQuery({ queryKey: ['classes'], queryFn: () => classesApi.list() });
  const users = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() });

  const trainers = users.data?.filter((u) => u.trainerProfile) ?? [];
  const trainees = users.data?.filter((u) => u.traineeProfile) ?? [];

  const [moduleForm, setModuleForm] = useState({
    code: '',
    nameEn: '',
    tradeId: '',
    durationWeeks: '12',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    moduleTutorId: '',
  });
  const createModule = useMutation({
    mutationFn: () =>
      modulesApi.create({
        ...moduleForm,
        durationWeeks: Number(moduleForm.durationWeeks),
        moduleTutorId: moduleForm.moduleTutorId || undefined,
      }),
    onSuccess: () => {
      setModuleForm((f) => ({ ...f, code: '', nameEn: '' }));
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
  });

  const [enrollForm, setEnrollForm] = useState({ moduleId: '', traineeId: '' });
  const enrollMutation = useMutation({
    mutationFn: () => modulesApi.enrollTrainee(enrollForm.moduleId, enrollForm.traineeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['modules'] }),
  });

  const [classForm, setClassForm] = useState({ institutionId: '', tradeId: '', name: '', intakeYear: '2026', startDate: new Date().toISOString().slice(0, 10) });
  const createClass = useMutation({
    mutationFn: () => classesApi.create({ ...classForm, intakeYear: Number(classForm.intakeYear) }),
    onSuccess: () => {
      setClassForm((f) => ({ ...f, name: '' }));
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });

  if (institutions.isLoading || trades.isLoading || users.isLoading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-3 text-lg font-semibold text-slate-900">Modules</h1>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            createModule.mutate();
          }}
          className="grid gap-2 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3"
        >
          <input required placeholder="Code" value={moduleForm.code} onChange={(e) => setModuleForm({ ...moduleForm, code: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <input required placeholder="Name" value={moduleForm.nameEn} onChange={(e) => setModuleForm({ ...moduleForm, nameEn: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm sm:col-span-2" />
          <select required value={moduleForm.tradeId} onChange={(e) => setModuleForm({ ...moduleForm, tradeId: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Trade…</option>
            {trades.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nameEn}
              </option>
            ))}
          </select>
          <select value={moduleForm.moduleTutorId} onChange={(e) => setModuleForm({ ...moduleForm, moduleTutorId: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Module tutor (optional)…</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.trainerProfile!.userId}>
                {t.trainerProfile?.fullName}
              </option>
            ))}
          </select>
          <input type="number" min="1" value={moduleForm.durationWeeks} onChange={(e) => setModuleForm({ ...moduleForm, durationWeeks: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <label className="flex flex-col text-xs text-slate-500">
            Start date
            <input type="date" value={moduleForm.startDate} onChange={(e) => setModuleForm({ ...moduleForm, startDate: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="flex flex-col text-xs text-slate-500">
            End date
            <input type="date" value={moduleForm.endDate} onChange={(e) => setModuleForm({ ...moduleForm, endDate: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          </label>
          {createModule.isError && <div className="sm:col-span-3"><ErrorMessage message={getApiErrorMessage(createModule.error)} /></div>}
          <button type="submit" disabled={createModule.isPending} className="w-fit rounded-md bg-admin px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 sm:col-span-3">
            {createModule.isPending ? 'Creating…' : 'Create module'}
          </button>
        </form>

        <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {modules.data?.map((m) => (
            <li key={m.id} className="px-4 py-2 text-sm">
              <span className="font-medium text-slate-800">{m.nameEn}</span>{' '}
              <span className="text-xs text-slate-400">({m.code} · {m.trade?.nameEn})</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-slate-800">Enroll a trainee in a module</h2>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            enrollMutation.mutate();
          }}
          className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-4"
        >
          <select required value={enrollForm.moduleId} onChange={(e) => setEnrollForm({ ...enrollForm, moduleId: e.target.value })} className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Module…</option>
            {modules.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nameEn}
              </option>
            ))}
          </select>
          <select required value={enrollForm.traineeId} onChange={(e) => setEnrollForm({ ...enrollForm, traineeId: e.target.value })} className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Trainee…</option>
            {trainees.map((t) => (
              <option key={t.id} value={t.traineeProfile!.userId}>
                {t.traineeProfile?.fullName}
              </option>
            ))}
          </select>
          <button type="submit" disabled={enrollMutation.isPending} className="rounded-md bg-admin px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
            Enroll
          </button>
        </form>
        {enrollMutation.isError && <ErrorMessage message={getApiErrorMessage(enrollMutation.error)} />}
        {enrollMutation.isSuccess && <SuccessBanner message="Trainee enrolled." />}
      </section>

      <section>
        <h2 className="mb-3 font-medium text-slate-800">Classes</h2>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            createClass.mutate();
          }}
          className="grid gap-2 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3"
        >
          <select required value={classForm.institutionId} onChange={(e) => setClassForm({ ...classForm, institutionId: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Institution…</option>
            {institutions.data?.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <select required value={classForm.tradeId} onChange={(e) => setClassForm({ ...classForm, tradeId: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Trade…</option>
            {trades.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nameEn}
              </option>
            ))}
          </select>
          <input required placeholder="Class name" value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <input type="number" value={classForm.intakeYear} onChange={(e) => setClassForm({ ...classForm, intakeYear: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <input type="date" value={classForm.startDate} onChange={(e) => setClassForm({ ...classForm, startDate: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          {createClass.isError && <div className="sm:col-span-3"><ErrorMessage message={getApiErrorMessage(createClass.error)} /></div>}
          <button type="submit" disabled={createClass.isPending} className="w-fit rounded-md bg-admin px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 sm:col-span-3">
            Create class
          </button>
        </form>
        <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {classes.data?.map((c) => (
            <li key={c.id} className="px-4 py-2 text-sm">
              <span className="font-medium text-slate-800">{c.name}</span> <span className="text-xs text-slate-400">({c.trade?.nameEn} · {c.intakeYear})</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
