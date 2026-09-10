'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const q = useQuery({
    queryKey: ['ringkasan'],
    queryFn: async () => (await api.get('/dashboard/ringkasan')).data,
    retry: false,
  });

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h1>Ringkasan Sekolah</h1>
      <p>Web Dashboard MVP — Admin &amp; Kepala Sekolah. Desain: docs/04.</p>
      {q.isPending && <p>Memuat…</p>}
      {q.isError && (
        <p>
          Backend belum jalan di {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}.
          Jalankan <code>npm run start:dev</code> di services/api-server.
        </p>
      )}
      {q.data && <pre>{JSON.stringify(q.data, null, 2)}</pre>}
      <nav style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <a href="/siswa">Siswa</a>
        <a href="/rombel">Rombel</a>
        <a href="/login">Login</a>
      </nav>
    </main>
  );
}
