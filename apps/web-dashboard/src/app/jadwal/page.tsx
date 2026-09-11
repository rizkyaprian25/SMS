'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { pesanError } from '@/components/import-siswa';

const HARI = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

interface Jadwal {
  id: string;
  hari: string;
  jamKe: number;
  rombel: { id: string; nama: string };
  mapel: { id: string; nama: string };
  guru: { id: string; nama: string };
}

/** Scheduler sederhana: filter + tambah. 409 bentrok tampil ramah (docs/04). */
export default function JadwalPage() {
  const qc = useQueryClient();
  const [hari, setHari] = useState('SENIN');
  const [rombelId, setRombelId] = useState('');

  const jadwal = useQuery({
    queryKey: qk.jadwal(rombelId, '', hari),
    queryFn: async () =>
      (await api.get('/jadwal', { params: { rombelId: rombelId || undefined, hari } })).data,
    retry: false,
  });
  const rombel = useQuery({
    queryKey: qk.rombel(),
    queryFn: async () => (await api.get('/rombel', { params: { limit: 100 } })).data,
    retry: false,
  });
  const guru = useQuery({
    queryKey: qk.guru(''),
    queryFn: async () => (await api.get('/guru', { params: { limit: 100 } })).data,
    retry: false,
  });
  const mapel = useQuery({
    queryKey: qk.mapel,
    queryFn: async () => (await api.get('/mapel')).data,
    retry: false,
  });

  const tambah = useMutation({
    mutationFn: async (v: Record<string, string>) => (await api.post('/jadwal', v)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jadwal'] });
      tambah.reset();
    },
  });

  return (
    <main style={{ padding: 24 }}>
      <h1>Jadwal Pelajaran</h1>
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={hari} onChange={(e) => setHari(e.target.value)}>
          {HARI.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <select value={rombelId} onChange={(e) => setRombelId(e.target.value)}>
          <option value="">Semua rombel</option>
          {(rombel.data?.data ?? []).map((r: { id: string; nama: string }) => (
            <option key={r.id} value={r.id}>{r.nama}</option>
          ))}
        </select>
      </div>

      {jadwal.isPending ? <p>Memuat…</p> : (
        <table>
          <thead><tr><th>Hari</th><th>Jam</th><th>Rombel</th><th>Mapel</th><th>Guru</th></tr></thead>
          <tbody>
            {(jadwal.data?.data as Jadwal[] | undefined)?.map((j) => (
              <tr key={j.id}>
                <td>{j.hari}</td><td>{j.jamKe}</td><td>{j.rombel.nama}</td>
                <td>{j.mapel.nama}</td><td>{j.guru.nama}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Tambah Jadwal</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          tambah.mutate({
            rombelId: String(fd.get('rombelId')),
            mapelId: String(fd.get('mapelId')),
            guruId: String(fd.get('guruId')),
            hari: String(fd.get('hari')),
            jamMulai: String(fd.get('jamMulai')),
            jamSelesai: String(fd.get('jamSelesai')),
          });
        }}
        style={{ display: 'grid', gap: 8, maxWidth: 360 }}
      >
        <select name="rombelId" required>
          {(rombel.data?.data ?? []).map((r: { id: string; nama: string }) => (
            <option key={r.id} value={r.id}>{r.nama}</option>
          ))}
        </select>
        <select name="mapelId" required>
          {(mapel.data?.data ?? []).map((m: { id: string; nama: string }) => (
            <option key={m.id} value={m.id}>{m.nama}</option>
          ))}
        </select>
        <select name="guruId" required>
          {(guru.data?.data ?? []).map((g: { id: string; nama: string }) => (
            <option key={g.id} value={g.id}>{g.nama}</option>
          ))}
        </select>
        <select name="hari">{HARI.map((h) => <option key={h} value={h}>{h}</option>)}</select>
        <input name="jamMulai" placeholder="Jam mulai JJ:MM" defaultValue="07:00" required />
        <input name="jamSelesai" placeholder="Jam selesai JJ:MM" defaultValue="08:00" required />
        <button type="submit" disabled={tambah.isPending}>Simpan</button>
        {tambah.isError && <p>Bentrok/gagal: {pesanError(tambah.error)} — pilih slot lain.</p>}
        {tambah.isSuccess && <p>Tersimpan.</p>}
      </form>
    </main>
  );
}
