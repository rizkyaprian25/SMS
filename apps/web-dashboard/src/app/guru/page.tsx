'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { pesanError } from '@/components/import-siswa';

const schema = z.object({
  nip: z.string().min(3),
  nama: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
});
type Form = z.infer<typeof schema>;

interface Guru {
  id: string;
  nip: string;
  nama: string;
  pengguna: { email: string; role: string } | null;
  mapelDiampu: { mapel: { id: string; nama: string } }[];
}

/** Halaman guru: list + tambah (akun dibuat bersamaan) + atur mapel. */
export default function GuruPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [editMapel, setEditMapel] = useState<Guru | null>(null);

  const guru = useQuery({
    queryKey: qk.guru(q),
    queryFn: async () => (await api.get('/guru', { params: { q } })).data,
    retry: false,
  });
  const mapel = useQuery({
    queryKey: qk.mapel,
    queryFn: async () => (await api.get('/mapel')).data as { data: { id: string; nama: string }[] },
    retry: false,
  });

  const form = useForm<Form>({ resolver: zodResolver(schema) });
  const tambah = useMutation({
    mutationFn: async (v: Form) => (await api.post('/guru', v)).data,
    onSuccess: () => {
      form.reset();
      qc.invalidateQueries({ queryKey: ['guru'] });
    },
  });
  const simpanMapel = useMutation({
    mutationFn: async (v: { id: string; mapelIds: string[] }) =>
      (await api.put(`/guru/${v.id}/mapel`, { mapelIds: v.mapelIds })).data,
    onSuccess: () => {
      setEditMapel(null);
      qc.invalidateQueries({ queryKey: ['guru'] });
    },
  });

  return (
    <main style={{ padding: 24 }}>
      <h1>Guru &amp; Staff</h1>
      <form onSubmit={(e) => { e.preventDefault(); setQ(new FormData(e.currentTarget).get('q') as string); }}>
        <input name="q" defaultValue={q} placeholder="Cari nama / NIP" />
        <button type="submit">Cari</button>
      </form>

      {guru.isPending ? <p>Memuat…</p> : (
        <table>
          <thead><tr><th>Nama</th><th>NIP</th><th>Email</th><th>Mapel</th><th></th></tr></thead>
          <tbody>
            {(guru.data?.data as Guru[] | undefined)?.map((g) => (
              <tr key={g.id}>
                <td>{g.nama}</td>
                <td>{g.nip}</td>
                <td>{g.pengguna?.email}</td>
                <td>{g.mapelDiampu.map((m) => m.mapel.nama).join(', ') || '-'}</td>
                <td><button onClick={() => setEditMapel(g)}>Atur mapel</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Tambah Guru (akun login dibuat otomatis)</h3>
      <form onSubmit={form.handleSubmit((v) => tambah.mutate(v))} style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
        <input {...form.register('nip')} placeholder="NIP" />
        <input {...form.register('nama')} placeholder="Nama" />
        <input {...form.register('email')} placeholder="Email" />
        <input {...form.register('password')} type="password" placeholder="Password (min 8)" />
        <button type="submit" disabled={tambah.isPending}>Simpan</button>
        {tambah.isError && <p>{pesanError(tambah.error)}</p>}
        {tambah.isSuccess && <p>Tersimpan.</p>}
      </form>

      {editMapel && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const ids = (mapel.data?.data ?? [])
              .filter((m) => fd.get(`m-${m.id}`))
              .map((m) => m.id);
            simpanMapel.mutate({ id: editMapel.id, mapelIds: ids });
          }}
          style={{ border: '1px solid #ccc', padding: 12, marginTop: 12 }}
        >
          <h3>Mapel untuk {editMapel.nama}</h3>
          {(mapel.data?.data ?? []).map((m) => (
            <label key={m.id} style={{ display: 'block' }}>
              <input
                type="checkbox"
                name={`m-${m.id}`}
                defaultChecked={editMapel.mapelDiampu.some((x) => x.mapel.id === m.id)}
              />{' '}{m.nama}
            </label>
          ))}
          <button type="submit">Simpan mapel</button>{' '}
          <button type="button" onClick={() => setEditMapel(null)}>Batal</button>
          {simpanMapel.isError && <p>{pesanError(simpanMapel.error)}</p>}
        </form>
      )}
    </main>
  );
}
