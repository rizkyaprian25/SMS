'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { MapelSelect, RombelSelect } from '@/components/selects';

interface Baris {
  id: string;
  jenis: string;
  semester: string;
  nilai: number | string;
  siswa: { nama: string };
  mapel: { nama: string };
}

/** Monitoring nilai per kelas & mapel (inputnya dari mobile guru). */
export default function NilaiPage() {
  const [rombelId, setRombelId] = useState('');
  const [mapelId, setMapelId] = useState('');
  const [semester, setSemester] = useState('GANJIL');
  const [jenis, setJenis] = useState('');

  const q = useQuery({
    queryKey: qk.nilai(rombelId, mapelId, semester, jenis),
    queryFn: async () =>
      (await api.get('/nilai', {
        params: { rombelId: rombelId || undefined, mapelId: mapelId || undefined, semester, jenis: jenis || undefined, limit: 100 },
      })).data,
    retry: false,
  });

  return (
    <main style={{ padding: 24 }}>
      <h1>Nilai</h1>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <RombelSelect value={rombelId} onChange={setRombelId} />
        <MapelSelect value={mapelId} onChange={setMapelId} />
        <select value={semester} onChange={(e) => setSemester(e.target.value)}>
          <option value="GANJIL">Ganjil</option>
          <option value="GENAP">Genap</option>
        </select>
        <select value={jenis} onChange={(e) => setJenis(e.target.value)}>
          <option value="">Semua jenis</option>
          {['TUGAS', 'HARIAN', 'UTS', 'UAS', 'SUMATIF'].map((j) => <option key={j} value={j}>{j}</option>)}
        </select>
      </div>
      {q.isPending ? <p>Memuat…</p> : q.isError ? <p>Gagal memuat.</p> : (
        (q.data?.data?.length ?? 0) === 0 ? <p>Belum ada nilai untuk filter ini.</p> : (
          <table>
            <thead><tr><th>Siswa</th><th>Mapel</th><th>Jenis</th><th>Nilai</th></tr></thead>
            <tbody>
              {(q.data.data as Baris[]).map((b) => (
                <tr key={b.id}><td>{b.siswa.nama}</td><td>{b.mapel.nama}</td><td>{b.jenis}</td><td>{String(b.nilai)}</td></tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </main>
  );
}
