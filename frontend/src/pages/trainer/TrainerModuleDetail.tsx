import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assessmentsApi, modulesApi } from '../../lib/api';
import { LoadingSpinner, ErrorMessage, EmptyState, SuccessBanner } from '../../components/Feedback';
import { StatusPill } from '../../components/StatusPill';
import { getApiErrorMessage } from '../../lib/apiClient';
import type { AssessmentSubtype, AssessmentTier } from '../../lib/types';

const TIERS: AssessmentTier[] = ['formative', 'diagnostic', 'summative'];
const SUBTYPES: AssessmentSubtype[] = [
  'continuous_assessment',
  'project_based',
  'class_test',
  'problem_based',
  'module_assessment',
  'institutional_assessment',
];

function NewAssignmentForm({ assessmentId, onCreated }: { assessmentId: string; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [allowedFileTypes, setAllowedFileTypes] = useState('pdf,docx,jpg');

  const mutation = useMutation({
    mutationFn: () =>
      assessmentsApi.createAssignment({
        assessmentId,
        title,
        dueDate: new Date(dueDate).toISOString(),
        allowedFileTypes: allowedFileTypes
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      setTitle('');
      setDueDate('');
      onCreated();
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 rounded-md bg-slate-50 p-3">
      <input
        type="text"
        placeholder="Assignment title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      />
      <div className="flex gap-2">
        <input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          required
          className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
        <input
          type="text"
          value={allowedFileTypes}
          onChange={(e) => setAllowedFileTypes(e.target.value)}
          placeholder="pdf,docx"
          className="w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      {mutation.isError && <ErrorMessage message={getApiErrorMessage(mutation.error)} />}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-fit rounded-md bg-trainer px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {mutation.isPending ? 'Creating…' : 'Add assignment'}
      </button>
    </form>
  );
}

function AssessmentRow({ assessmentId }: { assessmentId: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, refetch } = useQuery({ queryKey: ['assessments', assessmentId], queryFn: () => assessmentsApi.get(assessmentId) });

  if (isLoading || !data) return <LoadingSpinner />;

  return (
    <li className="rounded-md border border-slate-100 p-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-slate-800">{data.title}</span>
          <span className="ml-2 text-xs text-slate-400">
            {data.tier} · {data.subtype.replace(/_/g, ' ')} · max {data.maxScore}
          </span>
        </div>
        <StatusPill status={data.status} />
      </div>

      <ul className="mt-2 divide-y divide-slate-50 text-sm">
        {data.assignments?.map((a) => (
          <li key={a.id} className="flex items-center justify-between py-1">
            <span>{a.title}</span>
            <span className="text-xs text-slate-400">Due {new Date(a.dueDate).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
      {data.assignments?.length === 0 && <p className="mt-1 text-xs text-slate-400">No assignments yet.</p>}

      {data.status === 'approved' ? (
        <>
          <button type="button" onClick={() => setShowForm((v) => !v)} className="mt-2 text-xs text-trainer underline">
            {showForm ? 'Cancel' : '+ Add assignment'}
          </button>
          {showForm && (
            <NewAssignmentForm
              assessmentId={assessmentId}
              onCreated={() => {
                setShowForm(false);
                refetch();
                queryClient.invalidateQueries({ queryKey: ['assessments'] });
              }}
            />
          )}
        </>
      ) : (
        <p className="mt-2 text-xs text-amber-600">Awaiting Exam Controller approval before assignments can be added.</p>
      )}
    </li>
  );
}

// ui-ux-flow.md §2.4 — Trainer proposes an assessment, Exam Controller approves it, then the
// Trainer can post assignments under it (architecture.md's assessment-approval gate, enforced by
// the backend — see NewAssignmentForm's 400 error if attempted too early).
export function TrainerModuleDetail() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const queryClient = useQueryClient();
  const [showNewAssessment, setShowNewAssessment] = useState(false);
  const [title, setTitle] = useState('');
  const [tier, setTier] = useState<AssessmentTier>('formative');
  const [subtype, setSubtype] = useState<AssessmentSubtype>('continuous_assessment');
  const [maxScore, setMaxScore] = useState('100');

  const moduleQuery = useQuery({ queryKey: ['modules', moduleId], queryFn: () => modulesApi.get(moduleId!), enabled: !!moduleId });
  const assessmentsQuery = useQuery({
    queryKey: ['assessments', 'module', moduleId],
    queryFn: () => assessmentsApi.list(moduleId),
    enabled: !!moduleId,
  });

  const createAssessment = useMutation({
    mutationFn: () =>
      assessmentsApi.create({
        moduleId: moduleId!,
        tier,
        subtype,
        title,
        maxScore: Number(maxScore),
      }),
    onSuccess: () => {
      setTitle('');
      setShowNewAssessment(false);
      queryClient.invalidateQueries({ queryKey: ['assessments', 'module', moduleId] });
    },
  });

  if (moduleQuery.isLoading) return <LoadingSpinner label="Loading module…" />;
  if (moduleQuery.isError) return <ErrorMessage message={getApiErrorMessage(moduleQuery.error)} onRetry={() => moduleQuery.refetch()} />;
  const module = moduleQuery.data;
  if (!module) return null;

  function handleCreateAssessment(e: FormEvent) {
    e.preventDefault();
    createAssessment.mutate();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs font-medium text-trainer">{module.code}</div>
        <h1 className="text-lg font-semibold text-slate-900">{module.nameEn}</h1>
        <p className="mt-1 text-sm text-slate-600">{module.learningOutcome}</p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-slate-800">Assessments</h2>
          <button type="button" onClick={() => setShowNewAssessment((v) => !v)} className="text-xs text-trainer underline">
            {showNewAssessment ? 'Cancel' : '+ Propose assessment'}
          </button>
        </div>

        {showNewAssessment && (
          <form onSubmit={handleCreateAssessment} className="mb-4 flex flex-col gap-2 rounded-md bg-slate-50 p-3">
            <input
              type="text"
              placeholder="Assessment title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
            <div className="flex gap-2">
              <select value={tier} onChange={(e) => setTier(e.target.value as AssessmentTier)} className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select value={subtype} onChange={(e) => setSubtype(e.target.value as AssessmentSubtype)} className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                {SUBTYPES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            {createAssessment.isError && <ErrorMessage message={getApiErrorMessage(createAssessment.error)} />}
            {createAssessment.isSuccess && <SuccessBanner message="Assessment proposed — awaiting Exam Controller approval." />}
            <button
              type="submit"
              disabled={createAssessment.isPending}
              className="w-fit rounded-md bg-trainer px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {createAssessment.isPending ? 'Submitting…' : 'Propose'}
            </button>
          </form>
        )}

        {assessmentsQuery.isLoading && <LoadingSpinner />}
        {assessmentsQuery.data && assessmentsQuery.data.length === 0 && <EmptyState title="No assessments yet" />}
        <ul className="flex flex-col gap-2">
          {assessmentsQuery.data?.map((a) => (
            <AssessmentRow key={a.id} assessmentId={a.id} />
          ))}
        </ul>
      </section>
    </div>
  );
}
