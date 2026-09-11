'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { pesanError } from '@/components/import-siswa';

interface Izin {
  id: string;
  tglMulai: string;
  tglSelesai: string;
  jenis: string;
  alasan: string;
  status: string;
  siswa: { nama: string };
}

/** Antre approval izin. Setuju -> absensi IZIN/SAKIT otomatis (backend). */
export default function PerizinanPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('DIAJUKAN');

  const q = useQuery({
    queryKey: qk.perizinan(status),
    queryFn: async () => (await api.get('/perizinan', { params: { status: status || undefined } })).data,
    retry: false,
  });
  const putus = useMutation({
    mutationFn: async (v: { id: string; putusan: string }) =>
      (await api.post(`/perizinan/${v.id}/putuskan`, { putusan: v.putusan })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['perizinan'] }),
  });

  return (
    <main style={{ padding: 24 }}>
      <h1>Perizinan</h1>
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">Semua</option>
        {['DIAJUKAN', 'DISETUJUI', 'DITOLAK'].map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {q.isPending ? <p>Memuat…</p> : q.isError ? <p>Gagal memuat.</p> : (
        (q.data?.data?.length ?? 0) === 0 ? <p>Tidak ada pengajuan {status}.</p> : (
          <table>
            <thead><tr><th>Siswa</th><th>Tanggal</th><th>Jenis</th><th>Alasan</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {(q.data.data as Izin[]).map((z) => (
                <tr key={z.id}>
                  <td>{z.siswa.nama}</td>
                  <td>{z.tglMulai.slice(0, 10)} s/d {z.tglSelesai.slice(0, 10)}</td>
                  <td>{z.jenis}</td><td>{z.alasan}</td><td>{z.status}</td>
                  <td>
                    {z.status === 'DIAJUKAN' && (
                      <>
                        <button onClick={() => putus.mutate({ id: z.id, putusan: 'SETUJU' })}>Setujui</button>{' '}
                        <button onClick={() => putus.mutate({ id: z.id, putusan: 'TOLAK' })}>Tolak</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
      {putus.isError && <p>{pesanError(putus.error)} (wali hanya untuk kelas binaannya)</p>}
    </main>
  );
}
