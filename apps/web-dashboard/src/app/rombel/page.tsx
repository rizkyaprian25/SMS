'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { pesanError } from '@/components/import-siswa';
import { useToast } from '@/components/ui/toast';

interface RombelItem {
  id: string;
  nama: string;
  kapasitas: number;
  tingkatId: string;
  tahunAjaranId?: string;
  tingkat?: { id: string; nama: string };
  waliKelas?: { id: string; nama: string; nip?: string } | null;
  _count?: { siswa: number; jadwal: number };
}

export default function RombelPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedTingkat, setSelectedTingkat] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editRombel, setEditRombel] = useState<RombelItem | null>(null);
  const [arsipTarget, setArsipTarget] = useState<RombelItem | null>(null);
  const [pengampuRombel, setPengampuRombel] = useState<RombelItem | null>(null);

  // Modal Wizard Kenaikan Kelas
  const [showKenaikanModal, setShowKenaikanModal] = useState(false);
  const [kenaikanStep, setKenaikanStep] = useState<1 | 2 | 3>(1);
  const [rombelAsalId, setRombelAsalId] = useState('');
  const [rombelTujuanId, setRombelTujuanId] = useState('');
  const [isKelulusanMode, setIsKelulusanMode] = useState(false);
  const [selectedSiswaIds, setSelectedSiswaIds] = useState<string[]>([]);
  const [previewResult, setPreviewResult] = useState<{ total: number; perRombel: Array<{ rombelId: string; nama: string; jumlah: number }> } | null>(null);
  const [kenaikanLoading, setKenaikanLoading] = useState(false);
  const [kenaikanError, setKenaikanError] = useState('');

  // Fetch daftar guru pengampu rombel terpilih
  const { data: pengampuData, isPending: isPengampuPending } = useQuery<{
    data: {
      rombel: { id: string; nama: string; kapasitas: number; waliKelas?: { id: string; nama: string; nip?: string; fotoUrl?: string } | null };
      pengampu: Array<{
        mapel: { id: string; kode: string; nama: string; kelompok?: string };
        guru: { id: string; nama: string; nip: string; fotoUrl?: string };
        slotCount: number;
      }>;
    };
  }>({
    queryKey: ['rombel-pengampu', pengampuRombel?.id],
    queryFn: async () => (await api.get(`/rombel/${pengampuRombel?.id}/pengampu`)).data,
    enabled: !!pengampuRombel?.id,
  });

  // Form states Add
  const [namaRombel, setNamaRombel] = useState('');
  const [tingkatId, setTingkatId] = useState('');
  const [tahunAjaranId, setTahunAjaranId] = useState('');
  const [waliKelasId, setWaliKelasId] = useState('');
  const [kapasitas, setKapasitas] = useState(32);
  const [formError, setFormError] = useState('');

  // Form states Edit
  const [editNama, setEditNama] = useState('');
  const [editWaliKelasId, setEditWaliKelasId] = useState('');
  const [editKapasitas, setEditKapasitas] = useState(32);
  const [editFormError, setEditFormError] = useState('');

  // Fetch rombel list
  const { data, isPending, isError, refetch } = useQuery<{ data: RombelItem[] }>({
    queryKey: qk.rombel('', selectedTingkat),
    queryFn: async () =>
      (await api.get('/rombel', { params: { tingkatId: selectedTingkat || undefined, limit: 100 } })).data,
    retry: false,
  });

  // Fetch master data for modal
  const { data: tingkatData } = useQuery({
    queryKey: ['tingkat'],
    queryFn: async () => (await api.get('/tingkat')).data,
    retry: false,
  });

  const { data: tahunData } = useQuery({
    queryKey: ['tahun-ajaran'],
    queryFn: async () => (await api.get('/tahun-ajaran')).data,
    retry: false,
  });

  const { data: guruData } = useQuery({
    queryKey: qk.guru(''),
    queryFn: async () => (await api.get('/guru', { params: { limit: 100 } })).data,
    retry: false,
  });

  // Query siswa rombel asal untuk wizard kenaikan kelas
  const { data: siswaAsalData, isPending: isSiswaAsalPending } = useQuery<{
    data: {
      rombel: { id: string; nama: string };
      siswa: Array<{ id: string; nisn: string; nama: string; jenisKelamin?: string }>;
    };
  }>({
    queryKey: ['rombel-siswa-kenaikan', rombelAsalId],
    queryFn: async () => (await api.get(`/rombel/${rombelAsalId}/siswa`)).data,
    enabled: !!rombelAsalId && showKenaikanModal,
  });

  const siswaAsalList = siswaAsalData?.data?.siswa ?? [];

  function handleLanjutKeStep2() {
    setKenaikanError('');
    if (!rombelAsalId) {
      setKenaikanError('Silakan pilih Rombel Asal terlebih dahulu.');
      return;
    }
    if (!isKelulusanMode && !rombelTujuanId) {
      setKenaikanError('Silakan tentukan Rombel Tujuan.');
      return;
    }
    if (rombelAsalId === rombelTujuanId) {
      setKenaikanError('Rombel Asal dan Rombel Tujuan tidak boleh sama.');
      return;
    }
    // Default select all students
    setSelectedSiswaIds(siswaAsalList.map((s) => s.id));
    setKenaikanStep(2);
  }

  async function handlePratinjauKenaikan() {
    setKenaikanError('');
    if (selectedSiswaIds.length === 0) {
      setKenaikanError('Pilih minimal 1 siswa yang akan dinaikkan kelas.');
      return;
    }

    const rombelAsalObj = rombelList.find((r) => r.id === rombelAsalId);
    const rombelTujuanObj = rombelList.find((r) => r.id === rombelTujuanId);

    const dariTahunId = rombelAsalObj?.tahunAjaranId || tahunData?.data?.[0]?.id;
    const keTahunId = rombelTujuanObj?.tahunAjaranId || dariTahunId;

    if (!dariTahunId || !keTahunId) {
      setKenaikanError('Data tahun ajaran tidak valid.');
      return;
    }

    setKenaikanLoading(true);
    try {
      const res = await api.post(
        '/rombel/naik-kelas',
        {
          dariTahunId,
          keTahunId,
          mapping: selectedSiswaIds.map((sId) => ({
            siswaId: sId,
            rombelBaruId: rombelTujuanId,
          })),
        },
        { params: { preview: 'true' } }
      );
      setPreviewResult(res.data.data);
      setKenaikanStep(3);
    } catch (err) {
      setKenaikanError(pesanError(err));
    } finally {
      setKenaikanLoading(false);
    }
  }

  async function handleEksekusiKenaikan() {
    setKenaikanError('');
    const rombelAsalObj = rombelList.find((r) => r.id === rombelAsalId);
    const rombelTujuanObj = rombelList.find((r) => r.id === rombelTujuanId);

    const dariTahunId = rombelAsalObj?.tahunAjaranId || tahunData?.data?.[0]?.id;
    const keTahunId = rombelTujuanObj?.tahunAjaranId || dariTahunId;

    setKenaikanLoading(true);
    try {
      await api.post(
        '/rombel/naik-kelas',
        {
          dariTahunId,
          keTahunId,
          mapping: selectedSiswaIds.map((sId) => ({
            siswaId: sId,
            rombelBaruId: rombelTujuanId,
          })),
        }
      );
      toast(`Kenaikan kelas massal berhasil! ${selectedSiswaIds.length} siswa berhasil dimutasi ke rombel baru.`, 'success');
      qc.invalidateQueries({ queryKey: ['rombel'] });
      qc.invalidateQueries({ queryKey: ['siswa'] });
      setShowKenaikanModal(false);
    } catch (err) {
      setKenaikanError(pesanError(err));
    } finally {
      setKenaikanLoading(false);
    }
  }

  const tambahRombel = useMutation({
    mutationFn: async (payload: {
      nama: string;
      tingkatId: string;
      tahunAjaranId: string;
      waliKelasId?: string;
      kapasitas: number;
    }) => (await api.post('/rombel', payload)).data,
    onSuccess: () => {
      toast('Rombongan belajar baru berhasil dibuat!', 'success');
      qc.invalidateQueries({ queryKey: ['rombel'] });
      setShowAddModal(false);
      setNamaRombel('');
      setFormError('');
    },
    onError: (err) => {
      setFormError(pesanError(err));
      toast(pesanError(err), 'danger');
    },
  });

  const updateRombelMutasi = useMutation({
    mutationFn: async (payload: { id: string; nama: string; waliKelasId?: string; kapasitas: number }) =>
      (
        await api.patch(`/rombel/${payload.id}`, {
          nama: payload.nama.toUpperCase(),
          waliKelasId: payload.waliKelasId || null,
          kapasitas: Number(payload.kapasitas),
        })
      ).data,
    onSuccess: () => {
      toast('Data rombel berhasil diperbarui!', 'success');
      qc.invalidateQueries({ queryKey: ['rombel'] });
      setEditRombel(null);
      setEditFormError('');
    },
    onError: (err) => {
      setEditFormError(pesanError(err));
      toast(pesanError(err), 'danger');
    },
  });

  const arsipRombelMutasi = useMutation({
    mutationFn: async (id: string) => (await api.post(`/rombel/${id}/arsip`)).data,
    onSuccess: () => {
      toast('Rombel berhasil diarsipkan!', 'success');
      qc.invalidateQueries({ queryKey: ['rombel'] });
      setArsipTarget(null);
    },
    onError: (err) => {
      toast(pesanError(err), 'danger');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    const targetTahun = tahunAjaranId || (tahunData?.data?.[0]?.id ?? '');
    const targetTingkat = tingkatId || (tingkatData?.data?.[0]?.id ?? '');

    if (!targetTahun || !targetTingkat || !namaRombel) {
      setFormError('Mohon lengkapi nama rombel, tingkat, dan tahun ajaran.');
      return;
    }

    tambahRombel.mutate({
      nama: namaRombel.toUpperCase(),
      tingkatId: targetTingkat,
      tahunAjaranId: targetTahun,
      waliKelasId: waliKelasId || undefined,
      kapasitas: Number(kapasitas),
    });
  }

  function bukaModalEdit(r: RombelItem) {
    setEditRombel(r);
    setEditNama(r.nama);
    setEditWaliKelasId(r.waliKelas?.id ?? '');
    setEditKapasitas(r.kapasitas);
    setEditFormError('');
  }

  const rombelList: RombelItem[] = data?.data ?? [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Rombongan Belajar (Rombel)</h1>
          <p>Kelola kelas fleksibel per tingkat &amp; tahun ajaran ({rombelList.length} rombel aktif).</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
              border: 'none',
              fontWeight: 600,
              gap: 6,
            }}
            onClick={() => {
              setKenaikanError('');
              setKenaikanStep(1);
              setRombelAsalId(rombelList[0]?.id ?? '');
              setRombelTujuanId('');
              setIsKelulusanMode(false);
              setSelectedSiswaIds([]);
              setPreviewResult(null);
              setShowKenaikanModal(true);
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
            🎓 Kenaikan Kelas &amp; Kelulusan
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setFormError('');
              if (tingkatData?.data?.[0]) setTingkatId(tingkatData.data[0].id);
              if (tahunData?.data?.[0]) setTahunAjaranId(tahunData.data[0].id);
              setShowAddModal(true);
            }}
          >
            + Tambah Rombel
          </button>
        </div>
      </div>

      {/* Filter by Tingkat Tabs */}
      <div className="filter-bar" style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        <button
          type="button"
          className={`btn btn-sm ${selectedTingkat === '' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setSelectedTingkat('')}
        >
          Semua Tingkat
        </button>
        {(tingkatData?.data ?? []).map((t: { id: string; nama: string }) => (
          <button
            key={t.id}
            type="button"
            className={`btn btn-sm ${selectedTingkat === t.id ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSelectedTingkat(t.id)}
          >
            Kelas {t.nama}
          </button>
        ))}
      </div>

      {/* Content State */}
      {isError && (
        <div className="alert alert-danger" style={{ marginBottom: 20 }}>
          <span>Gagal memuat data rombel. Pastikan server backend sedang aktif.</span>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => refetch()}>
            Coba Lagi
          </button>
        </div>
      )}

      {isPending ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>Memuat daftar rombongan belajar…</p>
        </div>
      ) : rombelList.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>Belum ada rombel pada kategori ini.</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Klik tombol &quot;+ Tambah Rombel&quot; di atas untuk membuat kelas baru.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {rombelList.map((r) => (
            <div key={r.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>
                    {r.nama}
                  </span>
                  <Badge variant="info">Kelas {r.tingkat?.nama ?? '-'}</Badge>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                  {r._count?.siswa ?? 0} / {r.kapasitas} Siswa
                </span>
              </div>
              <div className="card-body" style={{ padding: '14px 18px', flex: 1 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700 }}>
                  Wali Kelas:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {r.waliKelas?.nama ? r.waliKelas.nama[0].toUpperCase() : 'W'}
                  </div>
                  <div>
                    <div>{r.waliKelas?.nama ?? 'Belum Ditentukan'}</div>
                    {r.waliKelas?.nip && (
                      <div style={{ fontSize: 11, color: 'var(--text-subtle)', fontWeight: 400 }}>
                        NIP. {r.waliKelas.nip}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ width: '100%', fontSize: 12, gap: 6 }}
                  onClick={() => setPengampuRombel(r)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Lihat Guru Pengampu Mapel
                </button>
              </div>
              <div
                style={{
                  padding: '10px 18px',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--bg-subtle)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 12, padding: '4px 10px' }}
                  onClick={() => bukaModalEdit(r)}
                >
                  Edit Rombel
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: 12, padding: '4px 10px', color: 'var(--danger)' }}
                  onClick={() => setArsipTarget(r)}
                >
                  Arsipkan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah Rombel */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Tambah Rombongan Belajar Baru"
      >
        {formError && <div className="alert alert-danger" style={{ marginBottom: 14 }}>{formError}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nama Rombel (Contoh: 7I, 8H, 9H)</label>
            <input
              className="input"
              required
              value={namaRombel}
              onChange={(e) => setNamaRombel(e.target.value)}
              placeholder="e.g. 7I"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tingkat</label>
            <select
              className="select"
              value={tingkatId}
              onChange={(e) => setTingkatId(e.target.value)}
            >
              {(tingkatData?.data ?? []).map((t: { id: string; nama: string }) => (
                <option key={t.id} value={t.id}>
                  Kelas {t.nama}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Tahun Ajaran</label>
            <select
              className="select"
              value={tahunAjaranId}
              onChange={(e) => setTahunAjaranId(e.target.value)}
            >
              {(tahunData?.data ?? []).map((ta: { id: string; nama: string; semesterAktif?: string }) => (
                <option key={ta.id} value={ta.id}>
                  {ta.nama} ({ta.semesterAktif ?? 'Aktif'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Wali Kelas (Opsional)</label>
            <select
              className="select"
              value={waliKelasId}
              onChange={(e) => setWaliKelasId(e.target.value)}
            >
              <option value="">-- Pilih Guru Wali Kelas --</option>
              {(guruData?.data ?? []).map((g: { id: string; nama: string; nip?: string }) => (
                <option key={g.id} value={g.id}>
                  {g.nama} {g.nip ? `(${g.nip})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Kapasitas Maksimal Siswa</label>
            <input
              type="number"
              className="input"
              min={1}
              max={50}
              value={kapasitas}
              onChange={(e) => setKapasitas(Number(e.target.value))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowAddModal(false)}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={tambahRombel.isPending}
            >
              {tambahRombel.isPending ? 'Menyimpan…' : 'Simpan Rombel'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Rombel */}
      <Modal
        isOpen={!!editRombel}
        onClose={() => setEditRombel(null)}
        title={`Edit Rombongan Belajar: ${editRombel?.nama}`}
      >
        {editFormError && <div className="alert alert-danger" style={{ marginBottom: 14 }}>{editFormError}</div>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!editNama.trim()) {
              setEditFormError('Nama rombel tidak boleh kosong');
              return;
            }
            updateRombelMutasi.mutate({
              id: editRombel!.id,
              nama: editNama.trim(),
              waliKelasId: editWaliKelasId || undefined,
              kapasitas: editKapasitas,
            });
          }}
        >
          <div className="form-group">
            <label className="form-label">Nama Rombel (Contoh: 7A, 8B, 9G)</label>
            <input
              className="input"
              required
              value={editNama}
              onChange={(e) => setEditNama(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Wali Kelas</label>
            <select
              className="select"
              value={editWaliKelasId}
              onChange={(e) => setEditWaliKelasId(e.target.value)}
            >
              <option value="">-- Belum Ditentukan --</option>
              {(guruData?.data ?? []).map((g: { id: string; nama: string; nip?: string }) => (
                <option key={g.id} value={g.id}>
                  {g.nama} {g.nip ? `(${g.nip})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Kapasitas Maksimal Siswa</label>
            <input
              type="number"
              className="input"
              min={1}
              max={50}
              value={editKapasitas}
              onChange={(e) => setEditKapasitas(Number(e.target.value))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setEditRombel(null)}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={updateRombelMutasi.isPending}
            >
              {updateRombelMutasi.isPending ? 'Menyimpan…' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Konfirmasi Arsip Rombel */}
      <Modal
        isOpen={!!arsipTarget}
        onClose={() => setArsipTarget(null)}
        title="Arsipkan Rombongan Belajar"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 14 }}>
            Apakah Anda yakin ingin mengarsipkan rombel <strong>{arsipTarget?.nama}</strong>?
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Rombel akan disembunyikan dari daftar kelas aktif tahun ajaran ini. Riwayat jadwal dan nilai siswa di kelas ini tetap utuh.
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
              disabled={arsipRombelMutasi.isPending}
              onClick={() => {
                if (arsipTarget) arsipRombelMutasi.mutate(arsipTarget.id);
              }}
            >
              {arsipRombelMutasi.isPending ? 'Mengarsipkan…' : 'Ya, Arsipkan Rombel'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Guru Pengampu Mata Pelajaran */}
      <Modal
        isOpen={!!pengampuRombel}
        onClose={() => setPengampuRombel(null)}
        title={`Guru Pengampu & Wali Kelas — ${pengampuRombel?.nama ?? ''}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Info Banner Rombel & Wali Kelas */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Wali Kelas Resmi
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                {pengampuData?.data?.rombel?.waliKelas?.nama ?? pengampuRombel?.waliKelas?.nama ?? 'Belum Ditentukan'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                NIP. {pengampuData?.data?.rombel?.waliKelas?.nip ?? pengampuRombel?.waliKelas?.nip ?? '-'}
              </div>
            </div>
            <Badge variant="success">Kelas {pengampuRombel?.tingkat?.nama ?? pengampuRombel?.nama[0] ?? ''}</Badge>
          </div>

          {/* Daftar Guru Pengampu Mapel */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text-main)' }}>
              Daftar Guru Pengampu Mata Pelajaran ({pengampuData?.data?.pengampu?.length ?? 0} Mapel)
            </div>

            {isPengampuPending ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Memuat data pengampu kelas…
              </div>
            ) : !pengampuData?.data?.pengampu?.length ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-subtle)', borderRadius: 6 }}>
                Belum ada jadwal atau SK pembagian tugas mengajar untuk rombel ini.
              </div>
            ) : (
              <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                <table className="table" style={{ margin: 0, fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>Mata Pelajaran</th>
                      <th>Guru Pengampu</th>
                      <th style={{ width: '15%', textAlign: 'center' }}>Pertemuan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pengampuData.data.pengampu.map((p) => (
                      <tr key={p.mapel.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.mapel.nama}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Kode: {p.mapel.kode}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{p.guru.nama}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>NIP: {p.guru.nip}</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-primary" style={{ fontSize: 11 }}>
                            {p.slotCount}x / mgg
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPengampuRombel(null)}
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Wizard Kenaikan Kelas Kolektif & Kelulusan */}
      <Modal
        isOpen={showKenaikanModal}
        onClose={() => {
          if (!kenaikanLoading) setShowKenaikanModal(false);
        }}
        title="🎓 Wizard Kenaikan Kelas Kolektif &amp; Kelulusan"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Step Indicator Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              padding: '8px 12px',
              background: 'var(--bg-subtle)',
              borderRadius: 8,
              border: '1px solid var(--border)',
              fontSize: 12,
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                color: kenaikanStep === 1 ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: kenaikanStep === 1 ? '2px solid var(--primary)' : 'none',
                paddingBottom: 4,
              }}
            >
              1. Pilih Rombel
            </div>
            <div
              style={{
                color: kenaikanStep === 2 ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: kenaikanStep === 2 ? '2px solid var(--primary)' : 'none',
                paddingBottom: 4,
              }}
            >
              2. Seleksi Siswa ({selectedSiswaIds.length})
            </div>
            <div
              style={{
                color: kenaikanStep === 3 ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: kenaikanStep === 3 ? '2px solid var(--primary)' : 'none',
                paddingBottom: 4,
              }}
            >
              3. Pratinjau &amp; Eksekusi
            </div>
          </div>

          {kenaikanError && (
            <div className="alert alert-danger" style={{ fontSize: 13, padding: '10px 14px' }}>
              {kenaikanError}
            </div>
          )}

          {/* LANGKAH 1: Pemilihan Rombel */}
          {kenaikanStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Rombel Asal (Kelas yang akan dinaikkan)
                </label>
                <select
                  className="input"
                  value={rombelAsalId}
                  onChange={(e) => {
                    const rId = e.target.value;
                    setRombelAsalId(rId);
                    const asal = rombelList.find((r) => r.id === rId);
                    if (asal?.tingkat?.nama === '9' || asal?.nama?.startsWith('9')) {
                      setIsKelulusanMode(true);
                      setRombelTujuanId('');
                    } else {
                      setIsKelulusanMode(false);
                      // Auto-suggest next level e.g. 7A -> 8A
                      const nextTingkatNum = (parseInt(asal?.tingkat?.nama || '7', 10) + 1).toString();
                      const suffix = asal?.nama?.replace(/^[0-9]+/, '') || '';
                      const suggested = rombelList.find(
                        (r) =>
                          (r.tingkat?.nama === nextTingkatNum || r.nama.startsWith(nextTingkatNum)) &&
                          r.nama.endsWith(suffix)
                      );
                      if (suggested) setRombelTujuanId(suggested.id);
                    }
                  }}
                >
                  <option value="">-- Pilih Rombel Asal --</option>
                  {rombelList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nama} (Kelas {r.tingkat?.nama ?? '-'}) — {r._count?.siswa ?? 0} Siswa
                    </option>
                  ))}
                </select>
              </div>

              {/* Info Rombel Asal Terpilih */}
              {rombelAsalId && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    Rombel Asal Terpilih: {rombelList.find((r) => r.id === rombelAsalId)?.nama}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                    Tercatat {siswaAsalList.length} siswa terdaftar di rombel ini.
                  </div>
                </div>
              )}

              {/* Opsi Rombel Tujuan */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Rombel Tujuan (Kelas Tingkat Berikutnya)
                </label>
                <select
                  className="input"
                  value={rombelTujuanId}
                  onChange={(e) => setRombelTujuanId(e.target.value)}
                >
                  <option value="">-- Pilih Rombel Tujuan --</option>
                  {rombelList
                    .filter((r) => r.id !== rombelAsalId)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nama} (Kelas {r.tingkat?.nama ?? '-'}) — Terisi: {r._count?.siswa ?? 0} / {r.kapasitas}
                      </option>
                    ))}
                </select>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Contoh: Siswa kelas 7A dinaikkan ke kelas 8A; Siswa kelas 8A dinaikkan ke kelas 9A.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowKenaikanModal(false)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!rombelAsalId || (!isKelulusanMode && !rombelTujuanId)}
                  onClick={handleLanjutKeStep2}
                >
                  Lanjut: Verifikasi Daftar Siswa →
                </button>
              </div>
            </div>
          )}

          {/* LANGKAH 2: Verifikasi & Seleksi Siswa */}
          {kenaikanStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  Daftar Siswa Rombel {rombelList.find((r) => r.id === rombelAsalId)?.nama}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: 11, padding: '3px 8px' }}
                    onClick={() => setSelectedSiswaIds(siswaAsalList.map((s) => s.id))}
                  >
                    Pilih Semua ({siswaAsalList.length})
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: 11, padding: '3px 8px' }}
                    onClick={() => setSelectedSiswaIds([])}
                  >
                    Kosongkan
                  </button>
                  <Badge variant="primary">
                    {selectedSiswaIds.length} / {siswaAsalList.length} Siswa Naik
                  </Badge>
                </div>
              </div>

              {isSiswaAsalPending ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Memuat daftar siswa rombel…
                </div>
              ) : (
                <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <table className="table" style={{ margin: 0, fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedSiswaIds.length === siswaAsalList.length && siswaAsalList.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedSiswaIds(siswaAsalList.map((s) => s.id));
                              else setSelectedSiswaIds([]);
                            }}
                          />
                        </th>
                        <th style={{ width: 40 }}>No</th>
                        <th>NISN</th>
                        <th>Nama Lengkap</th>
                        <th style={{ width: 80, textAlign: 'center' }}>JK</th>
                        <th style={{ textAlign: 'right' }}>Status Mutasi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {siswaAsalList.map((s, idx) => {
                        const isSelected = selectedSiswaIds.includes(s.id);
                        return (
                          <tr
                            key={s.id}
                            style={{
                              background: isSelected ? 'rgba(79, 70, 229, 0.04)' : undefined,
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              if (isSelected) setSelectedSiswaIds(selectedSiswaIds.filter((id) => id !== s.id));
                              else setSelectedSiswaIds([...selectedSiswaIds, s.id]);
                            }}
                          >
                            <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedSiswaIds([...selectedSiswaIds, s.id]);
                                  else setSelectedSiswaIds(selectedSiswaIds.filter((id) => id !== s.id));
                                }}
                              />
                            </td>
                            <td>{idx + 1}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{s.nisn}</td>
                            <td style={{ fontWeight: 600 }}>{s.nama}</td>
                            <td style={{ textAlign: 'center', fontSize: 12 }}>{s.jenisKelamin || '-'}</td>
                            <td style={{ textAlign: 'right' }}>
                              {isSelected ? (
                                <Badge variant="success">
                                  Naik ke {rombelList.find((r) => r.id === rombelTujuanId)?.nama ?? 'Rombel Baru'}
                                </Badge>
                              ) : (
                                <Badge variant="warning">Tinggal di {rombelList.find((r) => r.id === rombelAsalId)?.nama}</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setKenaikanStep(1)}
                >
                  ← Kembali ke Pilih Rombel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={selectedSiswaIds.length === 0 || kenaikanLoading}
                  onClick={handlePratinjauKenaikan}
                >
                  {kenaikanLoading ? 'Memeriksa Server…' : 'Cek Pratinjau Kenaikan →'}
                </button>
              </div>
            </div>
          )}

          {/* LANGKAH 3: Pratinjau & Konfirmasi Eksekusi */}
          {kenaikanStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  padding: '16px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
                  border: '1px solid rgba(79, 70, 229, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>
                  ✅ Pratinjau Validasi Sistem Berhasil
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-main)', lineHeight: 1.6 }}>
                  Total <strong>{previewResult?.total ?? selectedSiswaIds.length} siswa</strong> dari kelas{' '}
                  <strong>{rombelList.find((r) => r.id === rombelAsalId)?.nama}</strong> siap dipindahkan ke rombel{' '}
                  <strong>{rombelList.find((r) => r.id === rombelTujuanId)?.nama}</strong>.
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    paddingTop: 8,
                    borderTop: '1px solid var(--border)',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                  }}
                >
                  <div>
                    Rombel Asal: <strong>{rombelList.find((r) => r.id === rombelAsalId)?.nama}</strong>
                  </div>
                  <div>➔</div>
                  <div>
                    Rombel Baru: <strong>{rombelList.find((r) => r.id === rombelTujuanId)?.nama}</strong>
                  </div>
                  <div>|</div>
                  <div>
                    Jumlah Siswa: <strong>{selectedSiswaIds.length} Siswa</strong>
                  </div>
                </div>
              </div>

              {/* Jaminan Integritas Data */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 6,
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: 'var(--text-subtle)',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                  🔒 Catatan Integritas Riwayat Akademik:
                </div>
                Proses kenaikan kelas ini dieksekusi dalam satu transaksi atomik database. Sistem otomatis mencatat entri permanen di tabel <code>riwayat_kelas</code> untuk setiap siswa serta menyimpan rekam jejak di <code>audit_log</code>. Nilai, absensi, dan rapor semester terdahulu tetap terkunci dan tersimpan utuh.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={kenaikanLoading}
                  onClick={() => setKenaikanStep(2)}
                >
                  ← Kembali ke Seleksi Siswa
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: 'var(--success)', borderColor: 'var(--success)', fontWeight: 700 }}
                  disabled={kenaikanLoading}
                  onClick={handleEksekusiKenaikan}
                >
                  {kenaikanLoading ? 'Memproses Transaksi…' : '🚀 Eksekusi Kenaikan Kelas Sekarang'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
