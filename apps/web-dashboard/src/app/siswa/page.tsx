'use client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { api } from '@/lib/api';

function SiswaInner() {
  const sp = useSearchParams();
  const q = sp.get('q') ?? '';
  const page = Number(sp.get('page') ?? 1);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['siswa', q, page],
    queryFn: async () =>
      (await api.get('/siswa', { params: { q, page, limit: 30 } })).data,
    retry: false,
  });

  return (
    <main style={{ padding: 24 }}>
      <h1>Siswa</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const v = String(fd.get('q') ?? '');
          window.location.search = `?q=${encodeURIComponent(v)}&page=1`;
        }}
      >
        <input name="q" defaultValue={q} placeholder="Cari nama / NISN (debounce 300ms di versi penuh)" />
        <button type="submit">Cari</button>
      </form>
      {isPending && <p>Memuat…</p>}
      {isError && (
        <p>
          Gagal memuat. <button onClick={() => refetch()}>Coba lagi</button>
        </p>
      )}
      {data && data.data?.length === 0 && <p>Belum ada siswa. Tambah atau import Excel.</p>}
      {data && <pre>{JSON.stringify(data.meta ?? {}, null, 2)}</pre>}
    </main>
  );
}

export default function SiswaPage() {
  return (
    <Suspense>
      <SiswaInner />
    </Suspense>
  );
}
