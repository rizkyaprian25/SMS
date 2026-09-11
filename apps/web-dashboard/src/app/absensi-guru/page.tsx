'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { pesanError } from '@/components/import-siswa';

interface Baris {
  id: string;
  tanggal: string;
  jamMasuk: string | null;
  jamPulang: string | null;
  metode: string;
  statusVerifikasi: string;
  diLuarArea: boolean;
  terlambatMenit: number | null;
  guru: { nama: string };
}

/** Rekap presensi guru + verifikasi fallback manual (docs/04). */
export default function AbsensiGuruPage() {
  const qc = useQueryClient();
  const [dari, setDari] = useState(new Date().toISOString().slice(0, 10));
  const [sampai, setSampai] = useState(new Date().toISOString().slice(0, 10));

  const q = useQuery({
    queryKey: qk.absensiGuru(dari, sampai),
    queryFn: async () => (await api.get('/absensi-guru/rekap', { params: { dari, sampai } })).data,
    retry: false,
  });
  const verif = useMutation({
    mutationFn: async (v: { id: string; putusan: string }) =>
      (await api.post(`/absensi-guru/${v.id}/verifikasi`, { putusan: v.putusan })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['absensi-guru'] }),
  });

  const jam = (iso: string | null) => (iso ? new Date(iso).toLocaleString('id-ID') : '-');

  return (
    <main style={{ padding: 24 }}>
      <h1>Absensi Guru</h1>
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="date" value={dari} onChange={(e) => setDari(e.target.value)} />
        <input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} />
      </div>
      {q.isPending ? <p>Memuat…</p> : q.isError ? <p>Gagal memuat.</p> : (
        (q.data?.data?.length ?? 0) === 0 ? <p>Belum ada presensi di rentang ini.</p> : (
          <table>
            <thead><tr><th>Guru</th><th>Tanggal</th><th>Masuk</th><th>Pulang</th><th>Terlambat</th><th>Metode</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {(q.data.data as Baris[]).map((b) => (
                <tr key={b.id}>
                  <td>{b.guru.nama}{b.diLuarArea ? ' (luar area)' : ''}</td>
                  <td>{b.tanggal.slice(0, 10)}</td>
                  <td>{jam(b.jamMasuk)}</td>
                  <td>{jam(b.jamPulang)}</td>
                  <td>{b.terlambatMenit === null ? '-' : `${b.terlambatMenit} mnt`}</td>
                  <td>{b.metode}</td>
                  <td>{b.statusVerifikasi}</td>
                  <td>
                    {b.statusVerifikasi === 'PENDING' && (
                      <>
                        <button onClick={() => verif.mutate({ id: b.id, putusan: 'SETUJU' })}>Setujui</button>{' '}
                        <button onClick={() => verif.mutate({ id: b.id, putusan: 'TOLAK' })}>Tolak</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
      {verif.isError && <p>{pesanError(verif.error)}</p>}
    </main>
  );
}
