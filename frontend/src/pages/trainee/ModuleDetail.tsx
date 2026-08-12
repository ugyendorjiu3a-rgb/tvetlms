import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { assessmentsApi, modulesApi, resourcesApi } from '../../lib/api';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../../components/Feedback';
import { getApiErrorMessage } from '../../lib/apiClient';

function AssessmentAssignments({ assessmentId }: { assessmentId: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['assessments', assessmentId],
    queryFn: () => assessmentsApi.get(assessmentId),
  });

  if (isLoading) return <LoadingSpinner label="Loading assignments…" />;
  if (isError) return <ErrorMessage message={getApiErrorMessage(error)} />;
  if (!data?.assignments || data.assignments.length === 0) {
    return <p className="py-2 text-xs text-slate-400">No assignments posted for this assessment yet.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100 border-t border-slate-100">
      {data.assignments.map((a) => (
        <li key={a.id}>
          <Link to={`/trainee/assignments/${a.id}`} className="flex items-center justify-between py-2 text-sm hover:text-trainee">
            <span>{a.title}</span>
            <span className="text-xs text-slate-400">Due {new Date(a.dueDate).toLocaleDateString()}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ModuleDetail() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [expanded, setExpanded] = useState<string | null>(null);

  const moduleQuery = useQuery({ queryKey: ['modules', moduleId], queryFn: () => modulesApi.get(moduleId!), enabled: !!moduleId });
  // Client-side filter: GET /assessments?moduleId returns every assessment regardless of
  // approval status; assignments only become visible to trainees once an Exam Controller has
  // approved the parent assessment (ui-ux-flow.md §3.4 / architecture.md), so unapproved ones are
  // hidden here even though the API itself doesn't enforce that restriction.
  const assessmentsQuery = useQuery({
    queryKey: ['assessments', 'module', moduleId],
    queryFn: () => assessmentsApi.list(moduleId),
    enabled: !!moduleId,
    select: (data) => data.filter((a) => a.status === 'approved'),
  });
  const resourcesQuery = useQuery({
    queryKey: ['resources', 'module', moduleId],
    queryFn: () => resourcesApi.search(undefined, moduleId),
    enabled: !!moduleId,
  });

  if (moduleQuery.isLoading) return <LoadingSpinner label="Loading module…" />;
  if (moduleQuery.isError) return <ErrorMessage message={getApiErrorMessage(moduleQuery.error)} onRetry={() => moduleQuery.refetch()} />;
  const module = moduleQuery.data;
  if (!module) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs font-medium text-trainee">{module.code}</div>
        <h1 className="text-lg font-semibold text-slate-900">{module.nameEn}</h1>
        <p className="mt-1 text-sm text-slate-600">{module.learningOutcome}</p>
        <div className="mt-2 text-xs text-slate-400">
          Tutor: {module.moduleTutor?.fullName ?? 'Unassigned'} · {new Date(module.startDate).toLocaleDateString()} –{' '}
          {new Date(module.endDate).toLocaleDateString()}
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 font-medium text-slate-800">Assessments &amp; Assignments</h2>
        {assessmentsQuery.isLoading && <LoadingSpinner />}
        {assessmentsQuery.isError && <ErrorMessage message={getApiErrorMessage(assessmentsQuery.error)} />}
        {assessmentsQuery.data && assessmentsQuery.data.length === 0 && (
          <EmptyState title="No assessments available yet" hint="Your trainer hasn't published any approved assessments for this module yet." />
        )}
        <ul className="flex flex-col gap-2">
          {assessmentsQuery.data?.map((a) => (
            <li key={a.id} className="rounded-md border border-slate-100">
              <button
                type="button"
                onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm"
              >
                <span>
                  <span className="font-medium text-slate-800">{a.title}</span>
                  <span className="ml-2 text-xs text-slate-400">
                    {a.tier} · {a.subtype.replace(/_/g, ' ')}
                  </span>
                </span>
                <span className="text-xs text-slate-400">{expanded === a.id ? '▲' : '▼'}</span>
              </button>
              {expanded === a.id && (
                <div className="px-3 pb-2">
                  <AssessmentAssignments assessmentId={a.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 font-medium text-slate-800">Resources</h2>
        {resourcesQuery.isLoading && <LoadingSpinner />}
        {resourcesQuery.data && resourcesQuery.data.length === 0 && <EmptyState title="No resources uploaded yet" />}
        <ul className="divide-y divide-slate-100">
          {resourcesQuery.data?.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2 text-sm">
              <span>{r.titleEn}</span>
              <span className="text-xs uppercase text-slate-400">{r.format}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
