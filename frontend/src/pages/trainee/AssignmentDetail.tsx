import { useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assessmentsApi, submissionsApi } from '../../lib/api';
import { LoadingSpinner, ErrorMessage, SuccessBanner } from '../../components/Feedback';
import { StatusPill } from '../../components/StatusPill';
import { getApiErrorMessage } from '../../lib/apiClient';

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Submission upload — ui-ux-flow.md §5.1. The backend tracks submission metadata (filename, hash,
// size) but has no wired object-storage endpoint yet (see backend/README.md "What's stubbed"), so
// this hashes the file for real client-side (matches architecture.md §6 — hash computed on-device)
// and submits that metadata; there is no actual byte upload target today.
export function AssignmentDetail() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);

  const assignmentQuery = useQuery({
    queryKey: ['assignments', assignmentId],
    queryFn: () => assessmentsApi.getAssignment(assignmentId!),
    enabled: !!assignmentId,
  });

  const mySubmissions = useQuery({ queryKey: ['submissions', 'mine'], queryFn: submissionsApi.mine });
  const existing = mySubmissions.data?.find((s) => s.assignmentId === assignmentId);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!file || !assignmentId) throw new Error('Choose a file first');
      const fileHash = await sha256Hex(file);
      return submissionsApi.submit({
        assignmentId,
        files: [{ filename: file.name, fileHash, fileSizeBytes: file.size }],
      });
    },
    onSuccess: (submission) => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      navigate(`/trainee/submissions/${submission.id}`);
    },
  });

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
  }

  if (assignmentQuery.isLoading) return <LoadingSpinner label="Loading assignment…" />;
  if (assignmentQuery.isError) {
    return <ErrorMessage message={getApiErrorMessage(assignmentQuery.error)} onRetry={() => assignmentQuery.refetch()} />;
  }
  const assignment = assignmentQuery.data;
  if (!assignment) return null;

  const dueDate = new Date(assignment.dueDate);
  const isPastDue = dueDate.getTime() < Date.now();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{assignment.title}</h1>
        {assignment.description && <p className="mt-1 text-sm text-slate-600">{assignment.description}</p>}
        <div className={`mt-2 text-sm ${isPastDue ? 'text-amber-700' : 'text-slate-500'}`}>
          Due {dueDate.toLocaleString()} {isPastDue && '— past due, a new submission will be marked late'}
        </div>
        <div className="mt-1 text-xs text-slate-400">
          Allowed file types: {assignment.allowedFileTypes.length > 0 ? assignment.allowedFileTypes.join(', ') : 'any'}
        </div>
      </div>

      {existing && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span>You already have a submission for this assignment.</span>
            <StatusPill status={existing.status} />
          </div>
          <Link to={`/trainee/submissions/${existing.id}`} className="mt-1 inline-block text-xs text-trainee underline">
            View submission &amp; feedback
          </Link>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 font-medium text-slate-800">{existing ? 'Resubmit' : 'Submit'}</h2>
        <input type="file" onChange={handleFileChange} className="mb-3 block w-full text-sm" />
        {submitMutation.isError && <ErrorMessage message={getApiErrorMessage(submitMutation.error)} />}
        <button
          type="button"
          disabled={!file || submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
          className="rounded-md bg-trainee px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitMutation.isPending ? 'Submitting…' : 'Submit assignment'}
        </button>
        <p className="mt-2 text-xs text-slate-400">
          Your file is hashed on this device before submitting, so its integrity can be verified later.
        </p>
      </div>
    </div>
  );
}
