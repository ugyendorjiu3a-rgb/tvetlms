import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assessmentsApi, submissionsApi, gradingApi, resultsApi } from '../../lib/api';
import { LoadingSpinner, ErrorMessage, SuccessBanner } from '../../components/Feedback';
import { StatusPill } from '../../components/StatusPill';
import { getApiErrorMessage, getConflictId } from '../../lib/apiClient';

// ui-ux-flow.md §2.4 Submission Review / §5.2 Trainer Grading Journey.
export function SubmissionReview() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const queryClient = useQueryClient();
  const [score, setScore] = useState('');
  const [commentText, setCommentText] = useState('');
  const [conflict, setConflict] = useState<string | null>(null);

  const { data: submission, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['submissions', submissionId],
    queryFn: () => submissionsApi.get(submissionId!),
    enabled: !!submissionId,
  });

  const gradeMutation = useMutation({
    mutationFn: () =>
      gradingApi.manualGrade(submissionId!, {
        score: Number(score),
        expectedVersion: submission?.grade?.version,
      }),
    onSuccess: () => {
      setConflict(null);
      queryClient.invalidateQueries({ queryKey: ['submissions', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['submissions', 'queue'] });
    },
    onError: (err) => {
      const conflictId = getConflictId(err);
      if (conflictId) setConflict(conflictId);
    },
  });

  const commentMutation = useMutation({
    mutationFn: () => submissionsApi.addComment(submissionId!, { commentText }),
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['submissions', submissionId] });
    },
  });

  // Needed to compute a module result (POST /results/compute takes moduleId, not assessmentId) —
  // the submission only carries assignment.assessmentId directly, so this one extra lookup
  // resolves it to a moduleId once grading is done.
  const assessmentQuery = useQuery({
    queryKey: ['assessments', submission?.assignment?.assessmentId],
    queryFn: () => assessmentsApi.get(submission!.assignment!.assessmentId),
    enabled: !!submission?.assignment?.assessmentId && submission.status === 'graded',
  });

  const computeResultMutation = useMutation({
    mutationFn: () => resultsApi.compute(submission!.traineeId, assessmentQuery.data!.moduleId),
  });

  if (isLoading) return <LoadingSpinner label="Loading submission…" />;
  if (isError) return <ErrorMessage message={getApiErrorMessage(error)} onRetry={() => refetch()} />;
  if (!submission) return null;

  function handleGradeSubmit(e: FormEvent) {
    e.preventDefault();
    if (score === '') return;
    gradeMutation.mutate();
  }

  function handleCommentSubmit(e: FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    commentMutation.mutate();
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{submission.assignment?.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <StatusPill status={submission.status} />
            {submission.submittedAt && (
              <span className="text-xs text-slate-400">Submitted {new Date(submission.submittedAt).toLocaleString()}</span>
            )}
          </div>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 font-medium text-slate-800">Submitted Files</h2>
          <ul className="text-sm text-slate-600">
            {submission.files.map((f) => (
              <li key={f.id}>{f.filename}</li>
            ))}
          </ul>
        </section>

        {submission.grade?.autoGradeLog && (
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-2 font-medium text-slate-800">Auto-grade (MCQ)</h2>
            <pre className="overflow-x-auto rounded bg-slate-50 p-2 text-xs text-slate-600">
              {JSON.stringify(submission.grade.autoGradeLog.rawResult, null, 2)}
            </pre>
          </section>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 font-medium text-slate-800">Grade</h2>
          {submission.grade && (
            <p className="mb-2 text-sm text-slate-500">
              Current: <span className="font-semibold text-slate-800">{submission.grade.score}</span> (
              <StatusPill status={submission.grade.gradingStatus} />)
            </p>
          )}
          <form onSubmit={handleGradeSubmit} className="flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-700">Score</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={gradeMutation.isPending}
              className="rounded-md bg-trainer px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {gradeMutation.isPending ? 'Saving…' : 'Save grade'}
            </button>
          </form>

          {gradeMutation.isSuccess && !conflict && <div className="mt-2"><SuccessBanner message="Grade saved." /></div>}

          {conflict && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <p className="font-medium">⚠ Grading conflict</p>
              <p className="mt-1">
                This grade was changed elsewhere since you last saw it. Resolve it in the Sync Conflict Queue before
                grading again.
              </p>
              <Link to="/trainer/queue" className="mt-1 inline-block underline">
                (Ask an Admin/Exam Controller to resolve conflict {conflict.slice(0, 8)}… in the Sync Conflict Queue)
              </Link>
            </div>
          )}
          {gradeMutation.isError && !conflict && <div className="mt-2"><ErrorMessage message={getApiErrorMessage(gradeMutation.error)} /></div>}
        </section>

        {submission.status === 'graded' && (
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-1 font-medium text-slate-800">Module Result</h2>
            <p className="mb-2 text-xs text-slate-500">
              Once every assignment in this trainee's module is graded, compute their result so it can be reviewed
              in the Exam Controller's Certification Queue.
            </p>
            <button
              type="button"
              onClick={() => computeResultMutation.mutate()}
              disabled={!assessmentQuery.data || computeResultMutation.isPending}
              className="rounded-md border border-trainer px-3 py-1.5 text-xs font-semibold text-trainer disabled:opacity-50"
            >
              {computeResultMutation.isPending ? 'Computing…' : 'Compute module result'}
            </button>
            {computeResultMutation.isSuccess && (
              <div className="mt-2">
                <SuccessBanner
                  message={`Result computed: ${computeResultMutation.data.mark} (${computeResultMutation.data.performanceDescription}) — sent to the Exam Controller for approval.`}
                />
              </div>
            )}
            {computeResultMutation.isError && <div className="mt-2"><ErrorMessage message={getApiErrorMessage(computeResultMutation.error)} /></div>}
          </section>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 font-medium text-slate-800">Feedback</h2>
          <ul className="mb-3 flex flex-col gap-2">
            {submission.comments && submission.comments.length > 0 ? (
              submission.comments.map((c) => (
                <li key={c.id} className="rounded-md bg-slate-50 p-2 text-sm">
                  {c.commentText}
                </li>
              ))
            ) : (
              <p className="text-sm text-slate-400">No feedback yet.</p>
            )}
          </ul>
          <form onSubmit={handleCommentSubmit} className="flex flex-col gap-2">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={2}
              placeholder="Give feedback to the trainee…"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={commentMutation.isPending || !commentText.trim()}
              className="w-fit rounded-md bg-trainer px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {commentMutation.isPending ? 'Sending…' : 'Send'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
