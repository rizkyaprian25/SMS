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
  tingkat?: { id: string; nama: string };
  waliKelas?: { id: string; nama: string } | null;
  _count?: { siswa: number };
}

export default function RombelPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedTingkat, setSelectedTingkat] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editRombel, setEditRombel] = useState<RombelItem | null>(null);
  const [arsipTarget, setArsipTarget] = useState<RombelItem | null>(null);

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
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {rombelList.map((r) => (
            <div key={r.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>
                    {r.nama}
                  </span>
                  <Badge variant="info">Kelas {r.tingkat?.nama ?? '-'}</Badge>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Kapasitas: {r.kapasitas}
                </span>
              </div>
              <div className="card-body" style={{ padding: '14px 18px', flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Wali Kelas:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'var(--bg-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                    }}
                  >
                    👤
                  </div>
                  <span>{r.waliKelas?.nama ?? 'Belum Ditentukan'}</span>
                </div>
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
    </div>
  );
}
