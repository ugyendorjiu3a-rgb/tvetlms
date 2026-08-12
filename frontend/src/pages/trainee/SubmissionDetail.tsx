import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { submissionsApi } from '../../lib/api';
import { LoadingSpinner, ErrorMessage } from '../../components/Feedback';
import { StatusPill } from '../../components/StatusPill';
import { getApiErrorMessage } from '../../lib/apiClient';

// Submission Status & Feedback Thread — ui-ux-flow.md §1.4.
export function SubmissionDetail() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');

  const { data: submission, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['submissions', submissionId],
    queryFn: () => submissionsApi.get(submissionId!),
    enabled: !!submissionId,
  });

  const commentMutation = useMutation({
    mutationFn: () => submissionsApi.addComment(submissionId!, { commentText }),
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['submissions', submissionId] });
    },
  });

  if (isLoading) return <LoadingSpinner label="Loading submission…" />;
  if (isError) return <ErrorMessage message={getApiErrorMessage(error)} onRetry={() => refetch()} />;
  if (!submission) return null;

  function handleSubmitComment(e: FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    commentMutation.mutate();
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{submission.assignment?.title ?? 'Submission'}</h1>
        <div className="mt-1 flex items-center gap-2">
          <StatusPill status={submission.status} />
          {submission.submittedAt && (
            <span className="text-xs text-slate-400">Submitted {new Date(submission.submittedAt).toLocaleString()}</span>
          )}
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 font-medium text-slate-800">Files</h2>
        <ul className="text-sm text-slate-600">
          {submission.files.map((f) => (
            <li key={f.id} className="truncate">
              {f.filename} <span className="text-xs text-slate-400">({f.fileHash.slice(0, 10)}…)</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 font-medium text-slate-800">Grade</h2>
        {submission.grade ? (
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-trainee">{submission.grade.score}</span>
            <StatusPill status={submission.grade.gradingStatus} />
          </div>
        ) : (
          <p className="text-sm text-slate-400">Not graded yet.</p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-medium text-slate-800">Feedback</h2>
        <ul className="flex flex-col gap-2">
          {submission.comments && submission.comments.length > 0 ? (
            submission.comments.map((c) => (
              <li key={c.id} className="rounded-md bg-slate-50 p-2 text-sm">
                <p className="text-slate-700">{c.commentText}</p>
                <span className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleString()}</span>
              </li>
            ))
          ) : (
            <p className="text-sm text-slate-400">No feedback on this submission yet.</p>
          )}
        </ul>

        <form onSubmit={handleSubmitComment} className="mt-3 flex flex-col gap-2">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={2}
            placeholder="Reply to your trainer…"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {commentMutation.isError && <ErrorMessage message={getApiErrorMessage(commentMutation.error)} />}
          <button
            type="submit"
            disabled={commentMutation.isPending || !commentText.trim()}
            className="w-fit rounded-md bg-trainee px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {commentMutation.isPending ? 'Sending…' : 'Send'}
          </button>
        </form>
      </section>
    </div>
  );
}
