import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiClient';
import { LoadingSpinner, ErrorMessage, SuccessBanner } from '../../components/Feedback';
import { useAuth } from '../../context/AuthContext';
import { ROLE_THEME } from '../../lib/roleTheme';

// Self-service profile edit — PRD §5.1: a Trainee/Trainer may only touch their own contact
// fields, never Citizenship ID, name, or academic data (that's Admin-only, see admin/TraineeRecords).
export function ProfilePage() {
  const { activeRole } = useAuth();
  const { data: me, isLoading, isError, error, refetch } = useQuery({ queryKey: ['users', 'me'], queryFn: usersApi.me });
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => usersApi.updateMe({ contactNumber: contactNumber || undefined, email: email || undefined }),
    onSuccess: () => {
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
  });

  if (isLoading) return <LoadingSpinner label="Loading profile…" />;
  if (isError) return <ErrorMessage message={getApiErrorMessage(error)} onRetry={() => refetch()} />;
  if (!me) return null;

  const profile = me.traineeProfile ?? me.trainerProfile;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSuccess(false);
    mutation.mutate();
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-lg font-semibold text-slate-900">My Profile</h1>

      <div className="mb-6 rounded-md border border-slate-200 bg-white p-4 text-sm">
        <div className="mb-2 flex justify-between">
          <span className="text-slate-500">Login ID</span>
          <span className="font-medium text-slate-800">{me.loginId}</span>
        </div>
        {profile && 'fullName' in profile && (
          <div className="mb-2 flex justify-between">
            <span className="text-slate-500">Name</span>
            <span className="font-medium text-slate-800">{profile.fullName}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500">Role</span>
          <span className={`font-medium ${activeRole ? ROLE_THEME[activeRole].text : ''}`}>
            {me.userRoles?.map((r) => r.role?.name).join(', ')}
          </span>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Name and Citizenship ID can only be changed by an Admin.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-md border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={me.email ?? 'you@example.com'}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Contact Number</label>
          <input
            type="text"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            placeholder={profile?.contactNumber ?? ''}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {mutation.isError && <ErrorMessage message={getApiErrorMessage(mutation.error)} />}
        {success && <SuccessBanner message="Profile updated." />}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
