'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { pesanError } from '@/components/import-siswa';

interface Kasus {
  id: string;
  tanggal: string;
  kategori: string;
  poin: number;
  keterangan: string | null;
  siswa: { id: string; nama: string };
}

/** Buku kasus/BK — akses terbatas (BK + wali binaan + admin, ditolak di server bila di luar). */
export default function PelanggaranPage() {
  const qc = useQueryClient();
  const [siswaId, setSiswaId] = useState('');

  const q = useQuery({
    queryKey: qk.pelanggaran(siswaId),
    queryFn: async () =>
      (await api.get('/pelanggaran', { params: { siswaId: siswaId || undefined } })).data,
    retry: false,
  });
  const total = useQuery({
    queryKey: ['pelanggaran-total', siswaId],
    queryFn: async () => (await api.get('/pelanggaran/total', { params: { siswaId } })).data,
    enabled: siswaId.length > 0,
    retry: false,
  });
  const catat = useMutation({
    mutationFn: async (v: Record<string, unknown>) => (await api.post('/pelanggaran', v)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pelanggaran'] });
      catat.reset();
    },
  });

  return (
    <main style={{ padding: 24 }}>
      <h1>Pelanggaran / BK</h1>
      <input value={siswaId} onChange={(e) => setSiswaId(e.target.value)} placeholder="Filter siswaId (UUID, kosongkan = semua)" style={{ width: 360 }} />
      {total.data && <p>Total poin: {total.data.data.totalPoin} dari {total.data.data.jumlahKasus} kasus.</p>}
      {q.isPending ? <p>Memuat…</p> : q.isError ? <p>Gagal memuat (di luar akses Anda?).</p> : (
        (q.data?.data?.length ?? 0) === 0 ? <p>Belum ada catatan.</p> : (
          <table>
            <thead><tr><th>Tanggal</th><th>Siswa</th><th>Kategori</th><th>Poin</th><th>Keterangan</th></tr></thead>
            <tbody>
              {(q.data.data as Kasus[]).map((k) => (
                <tr key={k.id}><td>{k.tanggal.slice(0, 10)}</td><td>{k.siswa.nama}</td><td>{k.kategori}</td><td>{k.poin}</td><td>{k.keterangan ?? '-'}</td></tr>
              ))}
            </tbody>
          </table>
        )
      )}
      <h3>Catat Baru</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          catat.mutate({
            siswaId: String(fd.get('siswaId')),
            tanggal: String(fd.get('tanggal')),
            kategori: String(fd.get('kategori')),
            poin: Number(fd.get('poin')),
            keterangan: String(fd.get('keterangan') || ''),
          });
        }}
        style={{ display: 'grid', gap: 8, maxWidth: 360 }}
      >
        <input name="siswaId" placeholder="siswaId (UUID)" required />
        <input name="tanggal" type="date" required />
        <input name="kategori" placeholder="Kategori" required />
        <input name="poin" type="number" min={0} defaultValue={0} required />
        <input name="keterangan" placeholder="Keterangan" />
        <button type="submit" disabled={catat.isPending}>Simpan</button>
        {catat.isError && <p>{pesanError(catat.error)}</p>}
        {catat.isSuccess && <p>Tersimpan.</p>}
      </form>
    </main>
  );
}
