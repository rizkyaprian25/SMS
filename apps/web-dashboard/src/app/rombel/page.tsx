'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function RombelPage() {
  const { data, isPending } = useQuery({
    queryKey: ['rombel'],
    queryFn: async () => (await api.get('/rombel')).data,
    retry: false,
  });
  return (
    <main style={{ padding: 24 }}>
      <h1>Rombel</h1>
      <p>Filter tahun ajaran + tingkat. Jangan hard-code 7A–9G (ambil dari API).</p>
      {isPending ? <p>Memuat…</p> : <pre>{JSON.stringify(data ?? { info: 'backend belum jalan' }, null, 2)}</pre>}
    </main>
  );
}
