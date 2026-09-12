'use client';
import { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ImportSiswa } from '@/components/import-siswa';
import { Pagination } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

interface SiswaItem {
  id: string;
  nama: string;
  nisn: string;
  jenisKelamin?: string | null;
  isAktif?: boolean;
  rombel?: { id: string; nama: string } | null;
}

interface RombelOption {
  id: string;
  nama: string;
}

function SiswaInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const q = sp.get('q') ?? '';
  const rombelFilter = sp.get('rombelId') ?? '';
  const page = Number(sp.get('page') ?? 1);
  const qc = useQueryClient();
  const { toast } = useToast();

  const [searchInput, setSearchInput] = useState(q);
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editSiswa, setEditSiswa] = useState<SiswaItem | null>(null);
  const [arsipTarget, setArsipTarget] = useState<SiswaItem | null>(null);
  const [detailSiswaId, setDetailSiswaId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'biodata' | 'guru'>('biodata');

  // Fetch detail lengkap siswa (termasuk Wali Kelas & Guru Pengajar per Mapel)
  const { data: detailData, isPending: isDetailPending } = useQuery<{
    data: {
      id: string;
      nama: string;
      nisn: string;
      jenisKelamin?: string | null;
      isAktif?: boolean;
      rombel?: {
        id: string;
        nama: string;
        kapasitas?: number;
        waliKelas?: { id: string; nama: string; nip?: string } | null;
        guruPengajar?: Array<{
          mapel: { id: string; kode: string; nama: string; kelompok?: string };
          guru: { id: string; nama: string; nip: string; fotoUrl?: string };
          slotCount?: number;
        }>;
      } | null;
    };
  }>({
    queryKey: ['siswa-detail', detailSiswaId],
    queryFn: async () => (await api.get(`/siswa/${detailSiswaId}`)).data,
    enabled: !!detailSiswaId,
  });

  // Form states for Add
  const [addNisn, setAddNisn] = useState('');
  const [addNama, setAddNama] = useState('');
  const [addRombelId, setAddRombelId] = useState('');
  const [addJenisKelamin, setAddJenisKelamin] = useState('L');
  const [formError, setFormError] = useState('');

  // Form states for Edit
  const [editNama, setEditNama] = useState('');
  const [editRombelId, setEditRombelId] = useState('');
  const [editJenisKelamin, setEditJenisKelamin] = useState('L');
  const [editIsAktif, setEditIsAktif] = useState(true);

  // Debounce input pencarian 300ms (angka NISN / nama langsung auto-search)
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      setDebouncedQ(trimmed);

      // Sinkronkan URL agar bisa di-bookmark/refresh tanpa reload
      const params = new URLSearchParams();
      if (trimmed) params.set('q', trimmed);
      if (rombelFilter) params.set('rombelId', rombelFilter);
      params.set('page', '1');
      router.replace(`/siswa?${params.toString()}`, { scroll: false });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, rombelFilter, router]);

  // Sinkronkan jika query URL berubah dari luar
  useEffect(() => {
    if (q !== debouncedQ) {
      setSearchInput(q);
      setDebouncedQ(q);
    }
  }, [q]);

  // Fetch daftar rombel untuk dropdown
  const { data: rombelData } = useQuery<{ data: RombelOption[] }>({
    queryKey: ['rombel-options'],
    queryFn: async () => (await api.get('/rombel', { params: { limit: 100 } })).data,
    retry: false,
  });
  const rombelOptions = rombelData?.data ?? [];

  // Fetch data siswa dengan live debounced query
  const { data, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: ['siswa', rombelFilter, debouncedQ, page],
    queryFn: async () =>
      (
        await api.get('/siswa', {
          params: {
            q: debouncedQ || undefined,
            rombelId: rombelFilter || undefined,
            page,
            limit: 30,
          },
        })
      ).data,
    placeholderData: (prev) => prev,
    retry: false,
  });

  const siswaList: SiswaItem[] = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, limit: 30, totalPages: 1 };

  // Mutations
  const tambahMutasi = useMutation({
    mutationFn: async (payload: { nisn: string; nama: string; rombelId?: string; jenisKelamin: string }) =>
      (await api.post('/siswa', payload)).data,
    onSuccess: () => {
      toast('Siswa baru berhasil ditambahkan!', 'success');
      qc.invalidateQueries({ queryKey: ['siswa'] });
      setShowAddModal(false);
      setAddNisn('');
      setAddNama('');
      setAddRombelId('');
      setFormError('');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Gagal menambah siswa';
      setFormError(Array.isArray(msg) ? msg.join(', ') : msg);
      toast(Array.isArray(msg) ? msg.join(', ') : msg, 'danger');
    },
  });

  const updateMutasi = useMutation({
    mutationFn: async (payload: { id: string; nama: string; rombelId?: string; jenisKelamin: string; isAktif: boolean }) =>
      (await api.patch(`/siswa/${payload.id}`, {
        nama: payload.nama,
        rombelId: payload.rombelId || undefined,
        jenisKelamin: payload.jenisKelamin,
      })).data,
    onSuccess: () => {
      toast('Data siswa berhasil diperbarui!', 'success');
      qc.invalidateQueries({ queryKey: ['siswa'] });
      setEditSiswa(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Gagal memperbarui siswa';
      toast(Array.isArray(msg) ? msg.join(', ') : msg, 'danger');
    },
  });

  const arsipMutasi = useMutation({
    mutationFn: async (id: string) => (await api.post(`/siswa/${id}/arsip`)).data,
    onSuccess: () => {
      toast('Siswa berhasil diarsipkan!', 'success');
      qc.invalidateQueries({ queryKey: ['siswa'] });
      setArsipTarget(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Gagal mengarsipkan siswa';
      toast(Array.isArray(msg) ? msg.join(', ') : msg, 'danger');
    },
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = searchInput.trim();
    setDebouncedQ(trimmed);
    const params = new URLSearchParams();
    if (trimmed) params.set('q', trimmed);
    if (rombelFilter) params.set('rombelId', rombelFilter);
    params.set('page', '1');
    router.replace(`/siswa?${params.toString()}`, { scroll: false });
  }

  function handleFilterRombel(rId: string) {
    const params = new URLSearchParams();
    if (debouncedQ) params.set('q', debouncedQ);
    if (rId) params.set('rombelId', rId);
    params.set('page', '1');
    router.push(`/siswa?${params.toString()}`);
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams();
    if (debouncedQ) params.set('q', debouncedQ);
    if (rombelFilter) params.set('rombelId', rombelFilter);
    params.set('page', String(newPage));
    router.push(`/siswa?${params.toString()}`);
  }

  function handleClearSearch() {
    setSearchInput('');
    setDebouncedQ('');
    const params = new URLSearchParams();
    if (rombelFilter) params.set('rombelId', rombelFilter);
    params.set('page', '1');
    router.replace(`/siswa?${params.toString()}`, { scroll: false });
  }

  function bukaModalEdit(s: SiswaItem) {
    setEditSiswa(s);
    setEditNama(s.nama);
    setEditRombelId(s.rombel?.id ?? '');
    setEditJenisKelamin(s.jenisKelamin === 'P' || s.jenisKelamin === 'PEREMPUAN' ? 'P' : 'L');
    setEditIsAktif(s.isAktif !== false);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Data Siswa &amp; Induk</h1>
          <p>Kelola data induk peserta didik SMP Negeri ({meta.total} siswa terdaftar).</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setShowImportModal(true)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Import Excel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setFormError('');
              setShowAddModal(true);
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" x2="12" y1="5" y2="19" />
              <line x1="5" x2="19" y1="12" y2="12" />
            </svg>
            Tambah Siswa Baru
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Filter Rombel */}
            <div style={{ minWidth: 170 }}>
              <select
                className="input"
                value={rombelFilter}
                onChange={(e) => handleFilterRombel(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="">Semua Rombel / Kelas</option>
                {rombelOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    Kelas {r.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Pencarian Teks dengan Live Auto-Search Saat Ketik Angka NISN / Nama */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flex: 1, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  className="input"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Ketik angka NISN atau nama siswa (otomatis mencari)..."
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
                  {isFetching && (
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
                      onClick={handleClearSearch}
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
              {(debouncedQ || rombelFilter) && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    handleClearSearch();
                    if (rombelFilter) handleFilterRombel('');
                  }}
                >
                  Reset
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Content State */}
      {isError && (
        <div className="alert alert-danger" style={{ marginBottom: 20 }}>
          <span>Gagal memuat data siswa. Pastikan server backend sedang aktif.</span>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => refetch()}>
            Coba Lagi
          </button>
        </div>
      )}

      {isPending ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>Memuat daftar siswa…</p>
        </div>
      ) : siswaList.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-main)', marginBottom: 6 }}>
            Tidak ada data siswa ditemukan.
          </p>
          <p style={{ fontSize: 13 }}>
            {debouncedQ || rombelFilter
              ? 'Tidak ada siswa yang cocok dengan filter atau kata kunci pencarian.'
              : 'Belum ada data siswa. Silakan klik "Tambah Siswa Baru" atau import berkas Excel.'}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 50, textAlign: 'center' }}>No</th>
                <th>Nama Siswa</th>
                <th>NISN</th>
                <th>L/P</th>
                <th>Rombongan Belajar</th>
                <th>Status</th>
                <th style={{ textAlign: 'center', width: 140 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {siswaList.map((s, idx) => {
                const no = (meta.page - 1) * meta.limit + idx + 1;
                const inisial = s.nama
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <tr key={s.id}>
                    <td style={{ textAlign: 'center', color: 'var(--text-subtle)' }}>{no}</td>
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
                            fontSize: 12,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {inisial}
                        </div>
                        <span style={{ fontWeight: 600 }}>{s.nama}</span>
                      </div>
                    </td>
                    <td>
                      <code style={{ fontSize: 12, background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: 4 }}>
                        {s.nisn || '-'}
                      </code>
                    </td>
                    <td>{s.jenisKelamin ? (s.jenisKelamin === 'L' || s.jenisKelamin === 'LAKI_LAKI' ? 'L' : 'P') : '-'}</td>
                    <td>
                      {s.rombel ? (
                        <span className="badge badge-info">{s.rombel.nama}</span>
                      ) : (
                        <span style={{ color: 'var(--text-subtle)' }}>Belum ditempatkan</span>
                      )}
                    </td>
                    <td>
                      <Badge variant={s.isAktif !== false ? 'success' : 'neutral'}>
                        {s.isAktif !== false ? 'Aktif' : 'Non-Aktif'}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 8px', fontSize: 12 }}
                          onClick={() => {
                            setDetailSiswaId(s.id);
                            setActiveDetailTab('biodata');
                          }}
                          title="Lihat Profil & Guru Pengajar"
                        >
                          Detail
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', fontSize: 12 }}
                          onClick={() => bukaModalEdit(s)}
                          title="Ubah Data Siswa"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '4px 8px', fontSize: 12, color: 'var(--danger)' }}
                          onClick={() => setArsipTarget(s)}
                          title="Arsipkan Siswa"
                        >
                          Arsip
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            limit={meta.limit}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Modal Tambah Siswa */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Tambah Data Siswa Baru"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^\d{10}$/.test(addNisn)) {
              setFormError('NISN harus tepat 10 digit angka');
              return;
            }
            if (!addNama.trim()) {
              setFormError('Nama lengkap siswa wajib diisi');
              return;
            }
            tambahMutasi.mutate({
              nisn: addNisn.trim(),
              nama: addNama.trim(),
              rombelId: addRombelId || undefined,
              jenisKelamin: addJenisKelamin,
            });
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {formError && <div className="alert alert-danger">{formError}</div>}

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
              NOMOR INDUK SISWA NASIONAL (NISN) *
            </label>
            <input
              className="input"
              value={addNisn}
              onChange={(e) => setAddNisn(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="Contoh: 0081234567 (10 digit)"
              required
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
              NAMA LENGKAP SISWA *
            </label>
            <input
              className="input"
              value={addNama}
              onChange={(e) => setAddNama(e.target.value)}
              placeholder="Nama sesuai akta / kartu keluarga"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
                JENIS KELAMIN *
              </label>
              <select
                className="input"
                value={addJenisKelamin}
                onChange={(e) => setAddJenisKelamin(e.target.value)}
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
                ROMBEL / KELAS
              </label>
              <select
                className="input"
                value={addRombelId}
                onChange={(e) => setAddRombelId(e.target.value)}
              >
                <option value="">Belum Ditempatkan</option>
                {rombelOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    Kelas {r.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowAddModal(false)}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={tambahMutasi.isPending}
            >
              {tambahMutasi.isPending ? 'Menyimpan…' : 'Simpan Siswa'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Siswa */}
      <Modal
        isOpen={!!editSiswa}
        onClose={() => setEditSiswa(null)}
        title={`Edit Data Siswa: ${editSiswa?.nama}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!editNama.trim()) {
              alert('Nama lengkap tidak boleh kosong');
              return;
            }
            updateMutasi.mutate({
              id: editSiswa!.id,
              nama: editNama.trim(),
              rombelId: editRombelId || undefined,
              jenisKelamin: editJenisKelamin,
              isAktif: editIsAktif,
            });
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
              NOMOR INDUK SISWA NASIONAL (NISN)
            </label>
            <input
              className="input"
              value={editSiswa?.nisn ?? '-'}
              disabled
              style={{ backgroundColor: 'var(--bg-subtle)' }}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
              NAMA LENGKAP SISWA *
            </label>
            <input
              className="input"
              value={editNama}
              onChange={(e) => setEditNama(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
                JENIS KELAMIN
              </label>
              <select
                className="input"
                value={editJenisKelamin}
                onChange={(e) => setEditJenisKelamin(e.target.value)}
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
                ROMBEL / KELAS
              </label>
              <select
                className="input"
                value={editRombelId}
                onChange={(e) => setEditRombelId(e.target.value)}
              >
                <option value="">Belum Ditempatkan</option>
                {rombelOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    Kelas {r.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setEditSiswa(null)}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={updateMutasi.isPending}
            >
              {updateMutasi.isPending ? 'Menyimpan…' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Konfirmasi Arsip Siswa */}
      <Modal
        isOpen={!!arsipTarget}
        onClose={() => setArsipTarget(null)}
        title="Arsipkan Data Siswa"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 14 }}>
            Apakah Anda yakin ingin mengarsipkan siswa <strong>{arsipTarget?.nama}</strong> (NISN: {arsipTarget?.nisn})?
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Status siswa akan diubah menjadi Non-Aktif. Riwayat nilai dan absensi historis akan tetap tersimpan utuh di sistem.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setArsipTarget(null)}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={arsipMutasi.isPending}
              onClick={() => {
                if (arsipTarget) arsipMutasi.mutate(arsipTarget.id);
              }}
            >
              {arsipMutasi.isPending ? 'Mengarsipkan…' : 'Ya, Arsipkan Siswa'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Import Siswa */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Data Siswa dari Excel"
      >
        <ImportSiswa />
      </Modal>

      {/* Modal Detail Siswa & Guru Pengajar */}
      <Modal
        isOpen={!!detailSiswaId}
        onClose={() => setDetailSiswaId(null)}
        title={detailData?.data ? `Profil Siswa: ${detailData.data.nama}` : 'Detail Profil Siswa'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isDetailPending ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              Memuat profil lengkap siswa…
            </div>
          ) : !detailData?.data ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
              Data siswa tidak ditemukan atau terjadi kendala.
            </div>
          ) : (
            <>
              {/* Header Kartu Profil Singkat */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {detailData.data.nama.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
                      {detailData.data.nama}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      NISN: <code>{detailData.data.nisn}</code> • Gender: {detailData.data.jenisKelamin === 'L' || detailData.data.jenisKelamin === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan'}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)' }}>
                    Kelas {detailData.data.rombel?.nama ?? 'Belum Ditempatkan'}
                  </div>
                  <Badge variant={detailData.data.isAktif !== false ? 'success' : 'neutral'} style={{ marginTop: 4 }}>
                    {detailData.data.isAktif !== false ? 'Siswa Aktif' : 'Non-Aktif'}
                  </Badge>
                </div>
              </div>

              {/* Tab Switcher */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setActiveDetailTab('biodata')}
                  style={{
                    padding: '8px 14px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: activeDetailTab === 'biodata' ? 700 : 500,
                    color: activeDetailTab === 'biodata' ? 'var(--primary)' : 'var(--text-muted)',
                    borderBottom: activeDetailTab === 'biodata' ? '2px solid var(--primary)' : '2px solid transparent',
                  }}
                >
                  Informasi Kelas &amp; Wali
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDetailTab('guru')}
                  style={{
                    padding: '8px 14px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: activeDetailTab === 'guru' ? 700 : 500,
                    color: activeDetailTab === 'guru' ? 'var(--primary)' : 'var(--text-muted)',
                    borderBottom: activeDetailTab === 'guru' ? '2px solid var(--primary)' : '2px solid transparent',
                  }}
                >
                  Guru Pengajar ({detailData.data.rombel?.guruPengajar?.length ?? 0} Mapel)
                </button>
              </div>

              {/* Tab 1: Info Kelas & Wali */}
              {activeDetailTab === 'biodata' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ padding: '12px 14px', borderRadius: 6, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Rombongan Belajar
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
                      {detailData.data.rombel ? `Kelas ${detailData.data.rombel.nama} (Kapasitas: ${detailData.data.rombel.kapasitas} siswa)` : 'Belum dimasukkan ke rombel'}
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: 6, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Wali Kelas
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginTop: 2 }}>
                      {detailData.data.rombel?.waliKelas?.nama ?? 'Belum ditentukan'}
                    </div>
                    {detailData.data.rombel?.waliKelas?.nip && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        NIP: {detailData.data.rombel.waliKelas.nip}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Guru Pengajar Mapel di Kelas Siswa Ini */}
              {activeDetailTab === 'guru' && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                    Daftar guru yang mengajar mata pelajaran di kelas <strong>{detailData.data.rombel?.nama}</strong>:
                  </div>

                  {!detailData.data.rombel?.guruPengajar?.length ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-subtle)', borderRadius: 6 }}>
                      Belum ada penugasan guru pengajar untuk rombel ini.
                    </div>
                  ) : (
                    <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
                      <table className="table" style={{ margin: 0, fontSize: 13 }}>
                        <thead>
                          <tr>
                            <th>Mata Pelajaran</th>
                            <th>Guru Pengampu</th>
                            <th style={{ textAlign: 'center' }}>Beban</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailData.data.rombel.guruPengajar.map((gp) => (
                            <tr key={`${gp.mapel.id}-${gp.guru.id}`}>
                              <td>
                                <div style={{ fontWeight: 600 }}>{gp.mapel.nama}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Kode: {gp.mapel.kode}</div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{gp.guru.nama}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>NIP: {gp.guru.nip}</div>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className="badge badge-primary" style={{ fontSize: 11 }}>
                                  {gp.slotCount ?? 1}x/mgg
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDetailSiswaId(null)}
                >
                  Tutup
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default function SiswaPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Memuat halaman siswa…</div>}>
      <SiswaInner />
    </Suspense>
  );
}
