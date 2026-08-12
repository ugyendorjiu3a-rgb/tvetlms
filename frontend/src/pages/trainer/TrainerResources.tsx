import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { modulesApi, resourcesApi } from '../../lib/api';
import { LoadingSpinner, ErrorMessage, EmptyState, SuccessBanner } from '../../components/Feedback';
import { getApiErrorMessage } from '../../lib/apiClient';

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ui-ux-flow.md §2.4 Resource Management. Object storage isn't wired up yet (backend/README.md
// "What's stubbed"), so — same pattern as AssignmentDetail's submission flow — this hashes the
// picked file for real and registers it with a placeholder `local://` reference rather than
// pretending to upload bytes somewhere that doesn't exist.
export function TrainerResources() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const modules = useQuery({ queryKey: ['modules'], queryFn: () => modulesApi.list() });
  const resources = useQuery({ queryKey: ['resources', query], queryFn: () => resourcesApi.search(query || undefined) });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choose a file first');
      const fileHash = await sha256Hex(file);
      return resourcesApi.create({
        titleEn,
        moduleId: moduleId || undefined,
        format: file.name.split('.').pop() ?? 'file',
        fileUrl: `local://${file.name}`,
        fileHash,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
    },
    onSuccess: () => {
      setTitleEn('');
      setTags('');
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    uploadMutation.mutate();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-slate-900">Resources</h1>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 font-medium text-slate-800">Upload a resource</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Title"
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            required
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <select value={moduleId} onChange={(e) => setModuleId(e.target.value)} className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">No specific module</option>
              {modules.data?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nameEn}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="tags, comma separated"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <input type="file" onChange={handleFile} required className="text-sm" />
          {uploadMutation.isError && <ErrorMessage message={getApiErrorMessage(uploadMutation.error)} />}
          {uploadMutation.isSuccess && <SuccessBanner message="Resource uploaded." />}
          <button
            type="submit"
            disabled={uploadMutation.isPending || !file}
            className="w-fit rounded-md bg-trainer px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-medium text-slate-800">Search</h2>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources…"
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        {resources.isLoading && <LoadingSpinner />}
        {resources.isError && <ErrorMessage message={getApiErrorMessage(resources.error)} />}
        {resources.data && resources.data.length === 0 && <EmptyState title="No resources found" />}
        <ul className="divide-y divide-slate-100">
          {resources.data?.map((r) => (
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
