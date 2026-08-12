import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { assessmentsApi, resultsApi, syncApi } from '../../lib/api';
import { LoadingSpinner, ErrorMessage } from '../../components/Feedback';
import { getApiErrorMessage } from '../../lib/apiClient';

// ui-ux-flow.md §3.2 Exam Controller dashboard.
export function ExamControllerDashboard() {
  const assessments = useQuery({ queryKey: ['assessments'], queryFn: () => assessmentsApi.list() });
  const pendingResults = useQuery({ queryKey: ['results', 'pending-approval'], queryFn: resultsApi.pendingApproval });
  const conflicts = useQuery({ queryKey: ['sync', 'conflicts'], queryFn: syncApi.conflicts });

  const awaitingApproval = assessments.data?.filter((a) => a.status === 'scheduled').length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-slate-900">Welcome back</h1>

      {assessments.isError && <ErrorMessage message={getApiErrorMessage(assessments.error)} />}

      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/exam-controller/assessments" className="rounded-lg border border-slate-200 bg-white p-4 hover:border-examctrl">
          <div className="text-2xl font-bold text-examctrl">{assessments.isLoading ? '…' : awaitingApproval}</div>
          <div className="text-sm text-slate-600">Assessments awaiting approval</div>
        </Link>
        <Link to="/exam-controller/certification" className="rounded-lg border border-slate-200 bg-white p-4 hover:border-examctrl">
          <div className="text-2xl font-bold text-examctrl">{pendingResults.isLoading ? '…' : pendingResults.data?.length ?? 0}</div>
          <div className="text-sm text-slate-600">Results pending certification</div>
        </Link>
        <Link to="/exam-controller/conflicts" className="rounded-lg border border-slate-200 bg-white p-4 hover:border-examctrl">
          <div className="text-2xl font-bold text-examctrl">{conflicts.isLoading ? '…' : conflicts.data?.length ?? 0}</div>
          <div className="text-sm text-slate-600">Open sync conflicts</div>
        </Link>
      </div>

      {(pendingResults.isLoading || conflicts.isLoading) && <LoadingSpinner />}
    </div>
  );
}
