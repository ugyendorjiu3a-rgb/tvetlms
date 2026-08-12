import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../lib/api';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../../components/Feedback';
import { StatusPill } from '../../components/StatusPill';
import { getApiErrorMessage } from '../../lib/apiClient';
import type { SafeUser } from '../../lib/types';

// ui-ux-flow.md §4.4 Trainee Records + the Eradicate Trainee confirmation modal (§6). Two real
// API calls with a deliberate pause between them (PRD FR6: "notify Admin before the action").
function EradicateModal({ trainee, onClose }: { trainee: SafeUser; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const requestMutation = useMutation({
    mutationFn: () => usersApi.requestEradication(trainee.id, 'Course completed'),
    onSuccess: (res: { id: string }) => {
      setRequestId(res.id);
      setStep('confirm');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => usersApi.confirmEradication(requestId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h2 className="mb-2 text-base font-semibold text-red-700">⚠ Eradicate Trainee Record</h2>

        {step === 'request' && (
          <>
            <p className="text-sm text-slate-600">
              You are about to start removing the personal record for <strong>{trainee.traineeProfile?.fullName}</strong> (
              {trainee.loginId}).
            </p>
            <p className="mt-2 text-sm text-slate-600">
              This will remove: Citizenship ID, contact info, profile photo. This will <strong>not</strong> remove
              certificates or module results — they are kept for verification.
            </p>
            {requestMutation.isError && <div className="mt-2"><ErrorMessage message={getApiErrorMessage(requestMutation.error)} /></div>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => requestMutation.mutate()}
                disabled={requestMutation.isPending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {requestMutation.isPending ? 'Requesting…' : 'Request eradication'}
              </button>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <p className="text-sm text-slate-600">
              A confirmation notification has been sent to you. Type <strong>ERADICATE</strong> below to finalize —
              this cannot be undone.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Type ERADICATE"
            />
            {confirmMutation.isError && <div className="mt-2"><ErrorMessage message={getApiErrorMessage(confirmMutation.error)} /></div>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmMutation.mutate()}
                disabled={confirmText !== 'ERADICATE' || confirmMutation.isPending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {confirmMutation.isPending ? 'Confirming…' : 'Confirm'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function TraineeRecords() {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() });
  const [eradicateTarget, setEradicateTarget] = useState<SafeUser | null>(null);

  const trainees = data?.filter((u) => u.traineeProfile) ?? [];

  if (isLoading) return <LoadingSpinner label="Loading trainee records…" />;
  if (isError) return <ErrorMessage message={getApiErrorMessage(error)} onRetry={() => refetch()} />;
  if (trainees.length === 0) return <EmptyState title="No trainees yet" />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-slate-900">Trainee Records</h1>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Citizenship ID</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trainees.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2 font-medium text-slate-800">{t.traineeProfile?.fullName}</td>
                <td className="px-4 py-2 text-xs text-slate-500">{t.traineeProfile?.citizenshipId}</td>
                <td className="px-4 py-2">
                  <StatusPill status={t.traineeProfile?.status ?? 'active'} />
                </td>
                <td className="px-4 py-2">
                  {t.traineeProfile?.status === 'completed' && (
                    <button type="button" onClick={() => setEradicateTarget(t)} className="text-xs font-medium text-red-600 underline">
                      Eradicate
                    </button>
                  )}
                  {t.traineeProfile?.status !== 'completed' && <span className="text-xs text-slate-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {eradicateTarget && <EradicateModal trainee={eradicateTarget} onClose={() => setEradicateTarget(null)} />}
    </div>
  );
}
