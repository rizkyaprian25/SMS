'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Export via endpoint server (docs/04) + unduh rapor PDF per siswa. */
export default function LaporanPage() {
  const [siswaQ, setSiswaQ] = useState('');
  const [semester, setSemester] = useState('GANJIL');

  const cari = useQuery({
    queryKey: ['siswa-cari', siswaQ],
    queryFn: async () => (await api.get('/siswa', { params: { q: siswaQ, limit: 10 } })).data,
    enabled: siswaQ.length >= 2,
    retry: false,
  });

  const unduh = (url: string) => window.open(`${api.defaults.baseURL}${url}`, '_blank');

  return (
    <main style={{ padding: 24 }}>
      <h1>Laporan &amp; Export</h1>
      <h3>Rekap Excel</h3>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => unduh('/reports/absensi.xlsx')}>Absensi (.xlsx)</button>
        <button onClick={() => unduh(`/reports/nilai.xlsx?semester=${semester}`)}>Nilai {semester} (.xlsx)</button>
        <select value={semester} onChange={(e) => setSemester(e.target.value)}>
          <option value="GANJIL">Ganjil</option>
          <option value="GENAP">Genap</option>
        </select>
      </div>
      <h3>Rapor PDF per Siswa</h3>
      <input value={siswaQ} onChange={(e) => setSiswaQ(e.target.value)} placeholder="Ketik min 2 huruf nama siswa" />
      {(cari.data?.data ?? []).map((s: { id: string; nama: string; rombel?: { nama: string } | null }) => (
        <div key={s.id}>
          {s.nama} ({s.rombel?.nama ?? '-'}){' '}
          <button onClick={() => unduh(`/rapor/${s.id}.pdf?semester=${semester}`)}>Unduh PDF</button>
        </div>
      ))}
    </main>
  );
}
