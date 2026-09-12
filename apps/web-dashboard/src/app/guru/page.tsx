'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { pesanError } from '@/components/import-siswa';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

const schema = z.object({
  nip: z.string().min(3, 'NIP minimal 3 karakter'),
  nama: z.string().min(3, 'Nama minimal 3 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
});
type Form = z.infer<typeof schema>;

interface Guru {
  id: string;
  nip: string;
  nama: string;
  pengguna: { email: string; role: string } | null;
  mapelDiampu: { mapel: { id: string; nama: string } }[];
  rombelDiampu?: Array<{ id: string; nama: string; mapels: string[] }>;
  waliUntuk?: Array<{ id: string; nama: string }>;
}

export default function GuruPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMapel, setEditMapel] = useState<Guru | null>(null);
  const [editGuru, setEditGuru] = useState<Guru | null>(null);
  const [editGuruNama, setEditGuruNama] = useState('');
  const [editGuruNip, setEditGuruNip] = useState('');

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const guru = useQuery<{ data: Guru[] }>({
    queryKey: qk.guru(q),
    queryFn: async () => (await api.get('/guru', { params: { q } })).data,
    placeholderData: (prev) => prev,
    retry: false,
  });

  const mapel = useQuery({
    queryKey: qk.mapel,
    queryFn: async () => (await api.get('/mapel')).data as { data: { id: string; nama: string }[] },
    retry: false,
  });

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { nip: '', nama: '', email: '', password: '' },
  });

  const tambah = useMutation({
    mutationFn: async (v: Form) => (await api.post('/guru', v)).data,
    onSuccess: () => {
      form.reset();
      setShowAddModal(false);
      qc.invalidateQueries({ queryKey: ['guru'] });
    },
  });

  const simpanMapel = useMutation({
    mutationFn: async (v: { id: string; mapelIds: string[] }) =>
      (await api.put(`/guru/${v.id}/mapel`, { mapelIds: v.mapelIds })).data,
    onSuccess: () => {
      toast('Penugasan mapel berhasil diperbarui!', 'success');
      setEditMapel(null);
      qc.invalidateQueries({ queryKey: ['guru'] });
    },
    onError: (err) => {
      toast(pesanError(err), 'danger');
    },
  });

  const updateGuruMutasi = useMutation({
    mutationFn: async (v: { id: string; nama: string; nip: string }) =>
      (await api.patch(`/guru/${v.id}`, { nama: v.nama, nip: v.nip })).data,
    onSuccess: () => {
      toast('Profil guru berhasil diperbarui!', 'success');
      setEditGuru(null);
      qc.invalidateQueries({ queryKey: ['guru'] });
    },
    onError: (err) => {
      toast(pesanError(err), 'danger');
    },
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(searchInput);
  }

  const guruList = guru.data?.data ?? [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Data Guru &amp; Tenaga Pengajar</h1>
          <p>Kelola profil guru, penugasan mata pelajaran yang diampu, dan akun login.</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              form.reset();
              setShowAddModal(true);
            }}
          >
            + Tambah Guru Baru
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: '14px 18px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                className="input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ketik NIP (angka) atau nama guru (otomatis mencari)..."
                style={{ paddingLeft: 36, paddingRight: searchInput ? 64 : 34 }}
              />
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" x2="16.65" y1="21" y2="16.65" />
              </svg>

              {/* Spinner saat loading atau tombol clear X */}
              <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {guru.isFetching && (
                  <svg
                    style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }}
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                )}
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setQ('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 2,
                      color: 'var(--text-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Hapus pencarian"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <button type="submit" className="btn btn-secondary">
              Cari
            </button>
            {q && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setSearchInput('');
                  setQ('');
                }}
              >
                Reset
              </button>
            )}
          </form>
        </div>
      </div>

      {guru.isError && (
        <div className="alert alert-danger">
          <span>Gagal memuat daftar guru. Pastikan server backend sedang aktif.</span>
        </div>
      )}

      {guru.isPending ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>Memuat daftar guru…</p>
        </div>
      ) : guruList.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>Belum ada data guru ditemukan.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nama Guru</th>
                <th>NIP</th>
                <th>Email Akun</th>
                <th>Mapel yang Diampu</th>
                <th>Kelas yang Diajar (SK)</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {guruList.map((g) => (
                <tr key={g.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        {g.nama.slice(0, 1).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600 }}>{g.nama}</span>
                    </div>
                  </td>
                  <td>
                    <code style={{ fontSize: 12, background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: 4 }}>
                      {g.nip}
                    </code>
                  </td>
                  <td>{g.pengguna?.email ?? '-'}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {g.mapelDiampu.length > 0 ? (
                        g.mapelDiampu.map((m) => (
                          <Badge key={m.mapel.id} variant="info">
                            {m.mapel.nama}
                          </Badge>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>Belum diatur</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 280 }}>
                      {g.waliUntuk && g.waliUntuk.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {g.waliUntuk.map((w) => (
                            <Badge key={w.id} variant="success" style={{ fontSize: 11 }}>
                              ★ Wali {w.nama}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {g.rombelDiampu && g.rombelDiampu.length > 0 ? (
                          g.rombelDiampu.map((r) => (
                            <span
                              key={r.id}
                              title={`Mengajar ${r.mapels.join(', ')} di kelas ${r.nama}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                background: 'var(--bg-subtle)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-main)',
                              }}
                            >
                              {r.nama}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>-</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 12, padding: '4px 8px' }}
                        onClick={() => {
                          setEditGuru(g);
                          setEditGuruNama(g.nama);
                          setEditGuruNip(g.nip);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: 12, padding: '4px 8px' }}
                        onClick={() => setEditMapel(g)}
                      >
                        Atur Mapel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah Guru */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Tambah Guru & Akun Login"
      >
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          Data guru dan akun pengguna (role GURU_MAPEL) akan dibuat secara otomatis dalam satu transaksi.
        </p>

        {tambah.isError && (
          <div className="alert alert-danger" style={{ marginBottom: 14 }}>
            {pesanError(tambah.error)}
          </div>
        )}

        <form onSubmit={form.handleSubmit((v) => tambah.mutate(v))}>
          <div className="form-group">
            <label className="form-label">Nomor Induk Pegawai (NIP)</label>
            <input className="input" placeholder="e.g. 198501012010011001" {...form.register('nip')} />
            {form.formState.errors.nip && (
              <span style={{ color: 'var(--danger)', fontSize: 11 }}>{form.formState.errors.nip.message}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Nama Lengkap &amp; Gelar</label>
            <input className="input" placeholder="e.g. Dra. Siti Nurhaliza, M.Pd" {...form.register('nama')} />
            {form.formState.errors.nama && (
              <span style={{ color: 'var(--danger)', fontSize: 11 }}>{form.formState.errors.nama.message}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Email Sekolah</label>
            <input className="input" type="email" placeholder="guru@sekolah.sch.id" {...form.register('email')} />
            {form.formState.errors.email && (
              <span style={{ color: 'var(--danger)', fontSize: 11 }}>{form.formState.errors.email.message}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Kata Sandi Awal</label>
            <input className="input" type="password" placeholder="Minimal 8 karakter" {...form.register('password')} />
            {form.formState.errors.password && (
              <span style={{ color: 'var(--danger)', fontSize: 11 }}>{form.formState.errors.password.message}</span>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={tambah.isPending}>
              {tambah.isPending ? 'Menyimpan…' : 'Simpan Data Guru'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Atur Mapel */}
      {editMapel && (
        <Modal
          isOpen={true}
          onClose={() => setEditMapel(null)}
          title={`Atur Mapel untuk ${editMapel.nama}`}
        >
          {simpanMapel.isError && (
            <div className="alert alert-danger" style={{ marginBottom: 14 }}>
              {pesanError(simpanMapel.error)}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const ids = (mapel.data?.data ?? [])
                .filter((m) => fd.get(`m-${m.id}`))
                .map((m) => m.id);
              simpanMapel.mutate({ id: editMapel.id, mapelIds: ids });
            }}
          >
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
              Centang mata pelajaran yang diampu oleh guru ini:
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                maxHeight: 280,
                overflowY: 'auto',
                padding: '10px 4px',
              }}
            >
              {(mapel.data?.data ?? []).map((m) => {
                const isChecked = editMapel.mapelDiampu.some((x) => x.mapel.id === m.id);
                return (
                  <label
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-subtle)',
                      cursor: 'pointer',
                    }}
                  >
                    <input type="checkbox" name={`m-${m.id}`} defaultChecked={isChecked} />
                    <span>{m.nama}</span>
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" className="btn btn-outline" onClick={() => setEditMapel(null)}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary" disabled={simpanMapel.isPending}>
                {simpanMapel.isPending ? 'Menyimpan…' : 'Simpan Penugasan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Edit Guru */}
      {editGuru && (
        <Modal
          isOpen={true}
          onClose={() => setEditGuru(null)}
          title={`Edit Profil Guru: ${editGuru.nama}`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editGuruNama.trim()) {
                alert('Nama lengkap wajib diisi');
                return;
              }
              updateGuruMutasi.mutate({
                id: editGuru.id,
                nama: editGuruNama.trim(),
                nip: editGuruNip.trim(),
              });
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Nomor Induk Pegawai (NIP)</label>
              <input
                className="input"
                value={editGuruNip}
                onChange={(e) => setEditGuruNip(e.target.value)}
                placeholder="e.g. 198501012010011001"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Nama Lengkap &amp; Gelar *</label>
              <input
                className="input"
                value={editGuruNama}
                onChange={(e) => setEditGuruNama(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setEditGuru(null)}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={updateGuruMutasi.isPending}
              >
                {updateGuruMutasi.isPending ? 'Menyimpan…' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
