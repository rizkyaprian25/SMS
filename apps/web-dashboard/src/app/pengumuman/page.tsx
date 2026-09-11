'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { pesanError } from '@/components/import-siswa';

const ROLES = ['SUPER_ADMIN', 'KEPALA_SEKOLAH', 'GURU_MAPEL', 'WALI_KELAS', 'GURU_BK'];

interface Info {
  id: string;
  judul: string;
  isi: string;
  targetRole: string[];
}

/** Broadcast sekolah (tulis admin, baca sesuai target). */
export default function PengumumanPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: qk.pengumuman,
    queryFn: async () => (await api.get('/pengumuman')).data,
    retry: false,
  });
  const buat = useMutation({
    mutationFn: async (v: Record<string, unknown>) => (await api.post('/pengumuman', v)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.pengumuman });
      buat.reset();
    },
  });
  const hapus = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/pengumuman/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.pengumuman }),
  });

  return (
    <main style={{ padding: 24 }}>
      <h1>Pengumuman</h1>
      {q.isPending ? <p>Memuat…</p> : q.isError ? <p>Gagal memuat.</p> : (
        (q.data?.data?.length ?? 0) === 0 ? <p>Belum ada pengumuman.</p> : (
          <ul>
            {(q.data.data as Info[]).map((p) => (
              <li key={p.id}>
                <b>{p.judul}</b> <small>({p.targetRole.join(', ')})</small>
                <p>{p.isi}</p>
                <button onClick={() => hapus.mutate(p.id)}>Hapus</button>
              </li>
            ))}
          </ul>
        )
      )}
      <h3>Tulis Baru</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const targetRole = ROLES.filter((r) => fd.get(`r-${r}`));
          buat.mutate({ judul: String(fd.get('judul')), isi: String(fd.get('isi')), targetRole });
          e.currentTarget.reset();
        }}
        style={{ display: 'grid', gap: 8, maxWidth: 420 }}
      >
        <input name="judul" placeholder="Judul" required />
        <textarea name="isi" placeholder="Isi" required />
        <div>{ROLES.map((r) => <label key={r} style={{ marginRight: 8 }}><input type="checkbox" name={`r-${r}`} defaultChecked /> {r}</label>)}</div>
        <button type="submit" disabled={buat.isPending}>Terbitkan</button>
        {buat.isError && <p>{pesanError(buat.error)}</p>}
        {buat.isSuccess && <p>Terbit.</p>}
      </form>
    </main>
  );
}
