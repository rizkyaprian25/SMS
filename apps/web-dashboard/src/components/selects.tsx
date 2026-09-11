'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';

/** Dropdown rombel (tidak hard-code, dari API). */
export function RombelSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const q = useQuery({
    queryKey: qk.rombel(),
    queryFn: async () => (await api.get('/rombel', { params: { limit: 100 } })).data,
    retry: false,
  });
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Semua rombel</option>
      {(q.data?.data ?? []).map((r: { id: string; nama: string }) => (
        <option key={r.id} value={r.id}>{r.nama}</option>
      ))}
    </select>
  );
}

/** Dropdown mapel (dari API). */
export function MapelSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const q = useQuery({
    queryKey: qk.mapel,
    queryFn: async () => (await api.get('/mapel')).data,
    retry: false,
  });
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Semua mapel</option>
      {(q.data?.data ?? []).map((m: { id: string; nama: string }) => (
        <option key={m.id} value={m.id}>{m.nama}</option>
      ))}
    </select>
  );
}
