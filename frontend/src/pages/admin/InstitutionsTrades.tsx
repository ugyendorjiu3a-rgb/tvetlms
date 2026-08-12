import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { institutionsApi, tradesApi } from '../../lib/api';
import { LoadingSpinner, ErrorMessage } from '../../components/Feedback';
import { getApiErrorMessage } from '../../lib/apiClient';

export function InstitutionsTrades() {
  const queryClient = useQueryClient();
  const institutions = useQuery({ queryKey: ['institutions'], queryFn: institutionsApi.list });
  const trades = useQuery({ queryKey: ['trades'], queryFn: tradesApi.list });

  const [instForm, setInstForm] = useState({ name: '', type: 'TTI' as 'TTI' | 'IZC', code: '' });
  const createInstitution = useMutation({
    mutationFn: () => institutionsApi.create(instForm),
    onSuccess: () => {
      setInstForm({ name: '', type: 'TTI', code: '' });
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
  });

  const [tradeForm, setTradeForm] = useState({ code: '', nameEn: '' });
  const createTrade = useMutation({
    mutationFn: () => tradesApi.create(tradeForm),
    onSuccess: () => {
      setTradeForm({ code: '', nameEn: '' });
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold text-slate-900">Institutions</h1>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            createInstitution.mutate();
          }}
          className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4"
        >
          <input required placeholder="Name" value={instForm.name} onChange={(e) => setInstForm({ ...instForm, name: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <div className="flex gap-2">
            <select value={instForm.type} onChange={(e) => setInstForm({ ...instForm, type: e.target.value as 'TTI' | 'IZC' })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="TTI">TTI</option>
              <option value="IZC">IZC</option>
            </select>
            <input required placeholder="Code" value={instForm.code} onChange={(e) => setInstForm({ ...instForm, code: e.target.value })} className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          </div>
          {createInstitution.isError && <ErrorMessage message={getApiErrorMessage(createInstitution.error)} />}
          <button type="submit" disabled={createInstitution.isPending} className="w-fit rounded-md bg-admin px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
            Add institution
          </button>
        </form>

        {institutions.isLoading && <LoadingSpinner />}
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {institutions.data?.map((i) => (
            <li key={i.id} className="px-4 py-2 text-sm">
              <span className="font-medium text-slate-800">{i.name}</span>{' '}
              <span className="text-xs text-slate-400">
                ({i.type} · {i.code})
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold text-slate-900">Trades</h1>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            createTrade.mutate();
          }}
          className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4"
        >
          <input required placeholder="Name (English)" value={tradeForm.nameEn} onChange={(e) => setTradeForm({ ...tradeForm, nameEn: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <input required placeholder="Code" value={tradeForm.code} onChange={(e) => setTradeForm({ ...tradeForm, code: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          {createTrade.isError && <ErrorMessage message={getApiErrorMessage(createTrade.error)} />}
          <button type="submit" disabled={createTrade.isPending} className="w-fit rounded-md bg-admin px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
            Add trade
          </button>
        </form>

        {trades.isLoading && <LoadingSpinner />}
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {trades.data?.map((t) => (
            <li key={t.id} className="px-4 py-2 text-sm">
              <span className="font-medium text-slate-800">{t.nameEn}</span> <span className="text-xs text-slate-400">({t.code})</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
