'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { MapelSelect, RombelSelect } from '@/components/selects';

const hariIni = () => new Date().toISOString().slice(0, 10);

interface Baris {
  id: string;
  tanggal: string;
  jamKe: number;
  status: string;
  siswa: { nama: string };
  mapel: { nama: string };
}

/** Rekap + monitoring absensi siswa (docs/04). Agregasi dari server. */
export default function AbsensiSiswaPage() {
  const [rombelId, setRombelId] = useState('');
  const [mapelId, setMapelId] = useState('');
  const [tanggal, setTanggal] = useState(hariIni());
  const [status, setStatus] = useState('');

  const rekap = useQuery({
    queryKey: qk.absensiRekap({ rombelId, mapelId, tanggal }),
    queryFn: async () =>
      (await api.get('/absensi/rekap', { params: { rombelId: rombelId || undefined, mapelId: mapelId || undefined, dari: tanggal, sampai: tanggal } })).data,
    retry: false,
  });
  const list = useQuery({
    queryKey: qk.absensi(rombelId, mapelId, tanggal, status, 1),
    queryFn: async () =>
      (await api.get('/absensi', {
        params: { rombelId: rombelId || undefined, mapelId: mapelId || undefined, tanggal, status: status || undefined, limit: 100 },
      })).data,
    retry: false,
  });

  return (
    <main style={{ padding: 24 }}>
      <h1>Absensi Siswa</h1>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <RombelSelect value={rombelId} onChange={setRombelId} />
        <MapelSelect value={mapelId} onChange={setMapelId} />
        <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Semua status</option>
          {['HADIR', 'IZIN', 'SAKIT', 'ALPA'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <h3>Rekap {tanggal}</h3>
      {rekap.isPending ? <p>Memuat…</p> : (
        <p>{(rekap.data?.data ?? []).map((r: { status: string; jumlah: number }) => `${r.status}: ${r.jumlah}`).join('  •  ') || 'Belum ada data.'}</p>
      )}

      {list.isPending ? <p>Memuat…</p> : list.isError ? <p>Gagal memuat.</p> : (
        (list.data?.data?.length ?? 0) === 0 ? <p>Belum ada absensi untuk filter ini.</p> : (
          <table>
            <thead><tr><th>Siswa</th><th>Mapel</th><th>Jam</th><th>Status</th></tr></thead>
            <tbody>
              {(list.data.data as Baris[]).map((b) => (
                <tr key={b.id}><td>{b.siswa.nama}</td><td>{b.mapel.nama}</td><td>{b.jamKe}</td><td>{b.status}</td></tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </main>
  );
}
