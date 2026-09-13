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

interface MapelItem {
  id: string;
  kode: string;
  nama: string;
  kelompok?: string | null;
  _count?: { diampu: number; jadwal: number };
}

export default function GuruPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  // Tab State: 'guru' | 'mapel'
  const [activeTab, setActiveTab] = useState<'guru' | 'mapel'>('guru');

  // Search Guru
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Modals Guru
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMapel, setEditMapel] = useState<Guru | null>(null);
  const [editGuru, setEditGuru] = useState<Guru | null>(null);
  const [editGuruNama, setEditGuruNama] = useState('');
  const [editGuruNip, setEditGuruNip] = useState('');
  const [hapusGuruTarget, setHapusGuruTarget] = useState<Guru | null>(null);

  // Modals & Forms Mapel
  const [showAddMapelModal, setShowAddMapelModal] = useState(false);
  const [addMapelKode, setAddMapelKode] = useState('');
  const [addMapelNama, setAddMapelNama] = useState('');
  const [addMapelKelompok, setAddMapelKelompok] = useState('Kelompok A (Umum)');
  const [editMapelItem, setEditMapelItem] = useState<MapelItem | null>(null);
  const [editMapelKode, setEditMapelKode] = useState('');
  const [editMapelNama, setEditMapelNama] = useState('');
  const [editMapelKelompok, setEditMapelKelompok] = useState('');
  const [hapusMapelTarget, setHapusMapelTarget] = useState<MapelItem | null>(null);

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

  const mapel = useQuery<{ data: MapelItem[] }>({
    queryKey: qk.mapel,
    queryFn: async () => (await api.get('/mapel')).data,
    retry: false,
  });

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { nip: '', nama: '', email: '', password: '' },
  });

  // Mutasi Guru
  const tambah = useMutation({
    mutationFn: async (v: Form) => (await api.post('/guru', v)).data,
    onSuccess: () => {
      form.reset();
      setShowAddModal(false);
      qc.invalidateQueries({ queryKey: ['guru'] });
      toast('Guru baru berhasil ditambahkan!', 'success');
    },
    onError: (err) => {
      toast(pesanError(err), 'danger');
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

  const hapusGuruMutasi = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/guru/${id}`)).data,
    onSuccess: () => {
      toast('Guru berhasil dinonaktifkan / diarsipkan!', 'success');
      setHapusGuruTarget(null);
      qc.invalidateQueries({ queryKey: ['guru'] });
    },
    onError: (err) => {
      toast(pesanError(err), 'danger');
    },
  });

  // Mutasi Mapel
  const tambahMapelMutasi = useMutation({
    mutationFn: async (v: { kode: string; nama: string; kelompok?: string }) =>
      (await api.post('/mapel', v)).data,
    onSuccess: () => {
      toast('Mata pelajaran baru berhasil ditambahkan!', 'success');
      setShowAddMapelModal(false);
      setAddMapelKode('');
      setAddMapelNama('');
      setAddMapelKelompok('Kelompok A (Umum)');
      qc.invalidateQueries({ queryKey: qk.mapel });
    },
    onError: (err) => {
      toast(pesanError(err), 'danger');
    },
  });

  const updateMapelMutasi = useMutation({
    mutationFn: async (v: { id: string; kode: string; nama: string; kelompok?: string }) =>
      (await api.patch(`/mapel/${v.id}`, { kode: v.kode, nama: v.nama, kelompok: v.kelompok })).data,
    onSuccess: () => {
      toast('Data mata pelajaran berhasil diperbarui!', 'success');
      setEditMapelItem(null);
      qc.invalidateQueries({ queryKey: qk.mapel });
    },
    onError: (err) => {
      toast(pesanError(err), 'danger');
    },
  });

  const hapusMapelMutasi = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/mapel/${id}`)).data,
    onSuccess: () => {
      toast('Mata pelajaran berhasil dihapus!', 'success');
      setHapusMapelTarget(null);
      qc.invalidateQueries({ queryKey: qk.mapel });
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
  const mapelList = mapel.data?.data ?? [];

  return (
    <div>
      {/* Header Utama & Tombol Tambah */}
      <div className="page-header">
        <div>
          <h1>{activeTab === 'guru' ? 'Data Guru & Tenaga Pengajar' : 'Data Mata Pelajaran (Mapel)'}</h1>
          <p>
            {activeTab === 'guru'
              ? 'Kelola profil guru, penugasan mata pelajaran yang diampu, akun login, dan status keaktifan.'
              : 'Kelola kurikulum mata pelajaran sekolah, kode, kelompok mata pelajaran, dan jadwal terkait.'}
          </p>
        </div>
        <div className="page-header-actions">
          {activeTab === 'guru' ? (
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
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setAddMapelKode('');
                setAddMapelNama('');
                setAddMapelKelompok('Kelompok A (Umum)');
                setShowAddMapelModal(true);
              }}
            >
              + Tambah Mapel Baru
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher: Guru vs Mapel */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 20,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 12,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('guru')}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            border: activeTab === 'guru' ? 'none' : '1px solid var(--border)',
            background: activeTab === 'guru' ? 'var(--primary)' : 'var(--bg-surface)',
            color: activeTab === 'guru' ? '#ffffff' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s',
          }}
        >
          <span>👨‍🏫</span>
          <span>Data Guru &amp; Tendik ({guruList.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mapel')}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            border: activeTab === 'mapel' ? 'none' : '1px solid var(--border)',
            background: activeTab === 'mapel' ? 'var(--primary)' : 'var(--bg-surface)',
            color: activeTab === 'mapel' ? '#ffffff' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s',
          }}
        >
          <span>📚</span>
          <span>Mata Pelajaran (Mapel) ({mapelList.length})</span>
        </button>
      </div>

      {/* TAB KONTEN: GURU */}
      {activeTab === 'guru' && (
        <>
          {/* Filter / Search Bar Guru */}
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
                    style={{
                      position: 'absolute',
                      left: 11,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-subtle)',
                    }}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" x2="16.65" y1="21" y2="16.65" />
                  </svg>

                  {/* Spinner saat loading atau tombol clear X */}
                  <div
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
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
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: 12, padding: '4px 8px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                            onClick={() => setHapusGuruTarget(g)}
                            title="Hapus / Arsipkan Guru"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* TAB KONTEN: MAPEL */}
      {activeTab === 'mapel' && (
        <>
          {mapel.isError && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              <span>Gagal memuat daftar mata pelajaran. Pastikan server backend sedang aktif.</span>
            </div>
          )}

          {mapel.isPending ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <p>Memuat daftar mata pelajaran…</p>
            </div>
          ) : mapelList.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>Belum ada mata pelajaran terdaftar.</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                Klik tombol &quot;+ Tambah Mapel Baru&quot; untuk menambahkan mata pelajaran.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 120 }}>Kode Mapel</th>
                    <th>Nama Mata Pelajaran</th>
                    <th>Kelompok Kurikulum</th>
                    <th style={{ textAlign: 'center', width: 140 }}>Guru Pengampu</th>
                    <th style={{ textAlign: 'center', width: 140 }}>Jadwal Terkait</th>
                    <th style={{ textAlign: 'right', width: 160 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {mapelList.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <code
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: 'var(--primary)',
                            background: 'var(--primary-light)',
                            padding: '2px 8px',
                            borderRadius: 4,
                          }}
                        >
                          {m.kode}
                        </code>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{m.nama}</span>
                      </td>
                      <td>
                        <Badge variant="neutral">{m.kelompok || 'Umum'}</Badge>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          {m._count?.diampu ?? 0} Guru
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          {m._count?.jadwal ?? 0} Sesi
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 12, padding: '4px 10px' }}
                            onClick={() => {
                              setEditMapelItem(m);
                              setEditMapelKode(m.kode);
                              setEditMapelNama(m.nama);
                              setEditMapelKelompok(m.kelompok || '');
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: 12, padding: '4px 10px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                            onClick={() => setHapusMapelTarget(m)}
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
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

      {/* Modal Atur Mapel Guru */}
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

      {/* Modal Konfirmasi Hapus / Arsipkan Guru */}
      {hapusGuruTarget && (
        <Modal
          isOpen={true}
          onClose={() => setHapusGuruTarget(null)}
          title="Hapus / Arsipkan Guru"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 14 }}>
              Apakah Anda yakin ingin menghapus / mengarsipkan guru <strong>{hapusGuruTarget.nama}</strong> (NIP: {hapusGuruTarget.nip})?
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Data guru akan dinonaktifkan dari penugasan aktif. Seluruh rekam jejak jadwal mengajar, nilai, dan absensi yang pernah dibuat guru ini tetap tersimpan aman di sistem.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setHapusGuruTarget(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={hapusGuruMutasi.isPending}
                onClick={() => hapusGuruMutasi.mutate(hapusGuruTarget.id)}
              >
                {hapusGuruMutasi.isPending ? 'Menonaktifkan…' : 'Ya, Hapus Guru'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Tambah Mapel */}
      {showAddMapelModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowAddMapelModal(false)}
          title="Tambah Mata Pelajaran Baru"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!addMapelKode.trim() || !addMapelNama.trim()) {
                alert('Kode dan nama mata pelajaran wajib diisi');
                return;
              }
              tambahMapelMutasi.mutate({
                kode: addMapelKode.trim().toUpperCase(),
                nama: addMapelNama.trim(),
                kelompok: addMapelKelompok.trim() || undefined,
              });
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Kode Mapel (Singkat) *</label>
              <input
                className="input"
                value={addMapelKode}
                onChange={(e) => setAddMapelKode(e.target.value.toUpperCase())}
                placeholder="Contoh: MAT, IPA, BIN, PAI"
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Nama Mata Pelajaran *</label>
              <input
                className="input"
                value={addMapelNama}
                onChange={(e) => setAddMapelNama(e.target.value)}
                placeholder="Contoh: Matematika, Ilmu Pengetahuan Alam"
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Kelompok Kurikulum</label>
              <select
                className="input"
                value={addMapelKelompok}
                onChange={(e) => setAddMapelKelompok(e.target.value)}
              >
                <option value="Kelompok A (Umum)">Kelompok A (Umum)</option>
                <option value="Kelompok B (Muatan Khusus)">Kelompok B (Muatan Khusus)</option>
                <option value="Muatan Lokal">Muatan Lokal</option>
                <option value="Bimbingan Konseling">Bimbingan Konseling</option>
                <option value="Ekstrakurikuler">Ekstrakurikuler</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowAddMapelModal(false)}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={tambahMapelMutasi.isPending}
              >
                {tambahMapelMutasi.isPending ? 'Menyimpan…' : 'Simpan Mapel'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Edit Mapel */}
      {editMapelItem && (
        <Modal
          isOpen={true}
          onClose={() => setEditMapelItem(null)}
          title={`Edit Mata Pelajaran: ${editMapelItem.nama}`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editMapelKode.trim() || !editMapelNama.trim()) {
                alert('Kode dan nama mata pelajaran wajib diisi');
                return;
              }
              updateMapelMutasi.mutate({
                id: editMapelItem.id,
                kode: editMapelKode.trim().toUpperCase(),
                nama: editMapelNama.trim(),
                kelompok: editMapelKelompok.trim() || undefined,
              });
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Kode Mapel (Singkat) *</label>
              <input
                className="input"
                value={editMapelKode}
                onChange={(e) => setEditMapelKode(e.target.value.toUpperCase())}
                placeholder="Contoh: MAT, IPA, BIN"
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Nama Mata Pelajaran *</label>
              <input
                className="input"
                value={editMapelNama}
                onChange={(e) => setEditMapelNama(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Kelompok Kurikulum</label>
              <select
                className="input"
                value={editMapelKelompok}
                onChange={(e) => setEditMapelKelompok(e.target.value)}
              >
                <option value="Kelompok A (Umum)">Kelompok A (Umum)</option>
                <option value="Kelompok B (Muatan Khusus)">Kelompok B (Muatan Khusus)</option>
                <option value="Muatan Lokal">Muatan Lokal</option>
                <option value="Bimbingan Konseling">Bimbingan Konseling</option>
                <option value="Ekstrakurikuler">Ekstrakurikuler</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setEditMapelItem(null)}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={updateMapelMutasi.isPending}
              >
                {updateMapelMutasi.isPending ? 'Menyimpan…' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Konfirmasi Hapus Mapel */}
      {hapusMapelTarget && (
        <Modal
          isOpen={true}
          onClose={() => setHapusMapelTarget(null)}
          title="Hapus Mata Pelajaran"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 14 }}>
              Apakah Anda yakin ingin menghapus mata pelajaran <strong>{hapusMapelTarget.nama}</strong> ({hapusMapelTarget.kode})?
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Mata pelajaran hanya dapat dihapus jika belum memiliki riwayat jadwal atau nilai siswa di sistem demi menjaga integritas data akademik.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setHapusMapelTarget(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={hapusMapelMutasi.isPending}
                onClick={() => hapusMapelMutasi.mutate(hapusMapelTarget.id)}
              >
                {hapusMapelMutasi.isPending ? 'Menghapus…' : 'Ya, Hapus Mapel'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
