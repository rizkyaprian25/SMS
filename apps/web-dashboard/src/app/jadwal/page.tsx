'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { pesanError } from '@/components/import-siswa';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

const HARI = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

interface Jadwal {
  id: string;
  hari: string;
  jamKe: number;
  jamMulai?: string;
  jamSelesai?: string;
  rombel: { id: string; nama: string };
  mapel: { id: string; nama: string };
  guru: { id: string; nama: string };
}

export default function JadwalPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [hari, setHari] = useState('SENIN');
  const [rombelId, setRombelId] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [conflictError, setConflictError] = useState('');

  // State untuk Edit Jadwal
  const [editJadwal, setEditJadwal] = useState<Jadwal | null>(null);
  const [editConflictError, setEditConflictError] = useState('');
  const [hapusTarget, setHapusTarget] = useState<Jadwal | null>(null);

  const jadwal = useQuery<{ data: Jadwal[] }>({
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
    mutationFn: async (v: Record<string, any>) => (await api.post('/jadwal', v)).data,
    onSuccess: () => {
      toast('Slot jadwal berhasil ditambahkan!', 'success');
      qc.invalidateQueries({ queryKey: ['jadwal'] });
      setShowAddModal(false);
      setConflictError('');
    },
    onError: (err) => {
      setConflictError(pesanError(err));
      toast(pesanError(err), 'danger');
    },
  });

  const updateMutasi = useMutation({
    mutationFn: async (v: { id: string; payload: Record<string, any> }) =>
      (await api.patch(`/jadwal/${v.id}`, v.payload)).data,
    onSuccess: () => {
      toast('Jadwal pelajaran berhasil diperbarui!', 'success');
      qc.invalidateQueries({ queryKey: ['jadwal'] });
      setEditJadwal(null);
      setEditConflictError('');
    },
    onError: (err) => {
      setEditConflictError(pesanError(err));
      toast(pesanError(err), 'danger');
    },
  });

  const hapusMutasi = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/jadwal/${id}`)).data,
    onSuccess: () => {
      toast('Slot jadwal berhasil dihapus!', 'success');
      qc.invalidateQueries({ queryKey: ['jadwal'] });
      setHapusTarget(null);
    },
    onError: (err) => {
      toast(pesanError(err), 'danger');
    },
  });

  const jadwalList = jadwal.data?.data ?? [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Jadwal Pelajaran</h1>
          <p>Kelola jadwal belajar mengajar mingguan dan deteksi bentrok otomatis.</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setConflictError('');
              setShowAddModal(true);
            }}
          >
            + Tambah Slot Jadwal
          </button>
        </div>
      </div>

      {/* Filter by Hari Tabs */}
      <div className="filter-bar">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {HARI.map((h) => (
            <button
              key={h}
              type="button"
              className={`btn btn-sm ${hari === h ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setHari(h)}
            >
              {h}
            </button>
          ))}
        </div>

        {/* Filter Rombel Select */}
        <div style={{ minWidth: 200 }}>
          <select
            className="select"
            value={rombelId}
            onChange={(e) => setRombelId(e.target.value)}
          >
            <option value="">Semua Rombel (Kelas)</option>
            {(rombel.data?.data ?? []).map((r: { id: string; nama: string }) => (
              <option key={r.id} value={r.id}>
                Kelas {r.nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content State */}
      {jadwal.isError && (
        <div className="alert alert-danger" style={{ marginBottom: 20 }}>
          <span>Gagal memuat jadwal pelajaran. Pastikan server backend sedang aktif.</span>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => jadwal.refetch()}>
            Coba Lagi
          </button>
        </div>
      )}

      {jadwal.isPending ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>Memuat slot jadwal…</p>
        </div>
      ) : jadwalList.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>Belum ada jadwal untuk hari {hari}.</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Klik &quot;+ Tambah Slot Jadwal&quot; di atas untuk menjadwalkan pelajaran.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Jam Pelajaran</th>
                <th>Rombel</th>
                <th>Mata Pelajaran</th>
                <th>Guru Pengampu</th>
                <th>Hari</th>
                <th style={{ textAlign: 'center', width: 140 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {jadwalList.map((j) => (
                <tr key={j.id}>
                  <td>
                    <span className="badge badge-neutral" style={{ fontSize: 12, padding: '4px 10px' }}>
                      Jam ke-{j.jamKe}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{j.rombel.nama}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{j.mapel.nama}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>👤</span>
                      <span>{j.guru.nama}</span>
                    </div>
                  </td>
                  <td>
                    <Badge variant="info">{j.hari}</Badge>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 12, padding: '4px 8px' }}
                        onClick={() => {
                          setEditConflictError('');
                          setEditJadwal(j);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: 12, padding: '4px 8px', color: 'var(--danger)' }}
                        onClick={() => setHapusTarget(j)}
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

      {/* Modal Tambah Slot Jadwal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Tambah Slot Jadwal Pelajaran"
      >
        {conflictError && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            <div>
              <strong>Jadwal Bentrok Terdeteksi!</strong>
              <p style={{ fontSize: 12, marginTop: 2 }}>{conflictError}</p>
            </div>
          </div>
        )}

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
              jamKe: Number(fd.get('jamKe') || 1),
            });
          }}
        >
          <div className="form-group">
            <label className="form-label">Rombongan Belajar (Kelas)</label>
            <select name="rombelId" className="select" required>
              {(rombel.data?.data ?? []).map((r: { id: string; nama: string }) => (
                <option key={r.id} value={r.id}>
                  Kelas {r.nama}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Mata Pelajaran</label>
            <select name="mapelId" className="select" required>
              {(mapel.data?.data ?? []).map((m: { id: string; nama: string }) => (
                <option key={m.id} value={m.id}>
                  {m.nama}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Guru Pengampu</label>
            <select name="guruId" className="select" required>
              {(guru.data?.data ?? []).map((g: { id: string; nama: string }) => (
                <option key={g.id} value={g.id}>
                  {g.nama}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Hari</label>
              <select name="hari" className="select" defaultValue={hari}>
                {HARI.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Jam Ke-</label>
              <input name="jamKe" type="number" min={1} max={12} className="input" defaultValue={1} required />
            </div>

            <div className="form-group">
              <label className="form-label">Mulai</label>
              <input name="jamMulai" className="input" defaultValue="07:00" placeholder="07:00" required />
            </div>

            <div className="form-group">
              <label className="form-label">Selesai</label>
              <input name="jamSelesai" className="input" defaultValue="08:20" placeholder="08:20" required />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={tambah.isPending}>
              {tambah.isPending ? 'Memvalidasi…' : 'Simpan Jadwal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Slot Jadwal */}
      {editJadwal && (
        <Modal
          isOpen={true}
          onClose={() => setEditJadwal(null)}
          title={`Edit Slot Jadwal: Kelas ${editJadwal.rombel.nama} (${editJadwal.mapel.nama})`}
        >
          {editConflictError && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              <div>
                <strong>Jadwal Bentrok Terdeteksi!</strong>
                <p style={{ fontSize: 12, marginTop: 2 }}>{editConflictError}</p>
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              updateMutasi.mutate({
                id: editJadwal.id,
                payload: {
                  rombelId: String(fd.get('rombelId')),
                  mapelId: String(fd.get('mapelId')),
                  guruId: String(fd.get('guruId')),
                  hari: String(fd.get('hari')),
                  jamMulai: String(fd.get('jamMulai')),
                  jamSelesai: String(fd.get('jamSelesai')),
                  jamKe: Number(fd.get('jamKe') || 1),
                },
              });
            }}
          >
            <div className="form-group">
              <label className="form-label">Rombongan Belajar (Kelas)</label>
              <select name="rombelId" className="select" defaultValue={editJadwal.rombel.id} required>
                {(rombel.data?.data ?? []).map((r: { id: string; nama: string }) => (
                  <option key={r.id} value={r.id}>
                    Kelas {r.nama}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Mata Pelajaran</label>
              <select name="mapelId" className="select" defaultValue={editJadwal.mapel.id} required>
                {(mapel.data?.data ?? []).map((m: { id: string; nama: string }) => (
                  <option key={m.id} value={m.id}>
                    {m.nama}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Guru Pengampu</label>
              <select name="guruId" className="select" defaultValue={editJadwal.guru.id} required>
                {(guru.data?.data ?? []).map((g: { id: string; nama: string }) => (
                  <option key={g.id} value={g.id}>
                    {g.nama}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Hari</label>
                <select name="hari" className="select" defaultValue={editJadwal.hari}>
                  {HARI.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Jam Ke-</label>
                <input name="jamKe" type="number" min={1} max={12} className="input" defaultValue={editJadwal.jamKe} required />
              </div>

              <div className="form-group">
                <label className="form-label">Mulai</label>
                <input name="jamMulai" className="input" defaultValue="07:00" placeholder="07:00" required />
              </div>

              <div className="form-group">
                <label className="form-label">Selesai</label>
                <input name="jamSelesai" className="input" defaultValue="08:20" placeholder="08:20" required />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" className="btn btn-outline" onClick={() => setEditJadwal(null)}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary" disabled={updateMutasi.isPending}>
                {updateMutasi.isPending ? 'Memvalidasi…' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Konfirmasi Hapus Jadwal */}
      {hapusTarget && (
        <Modal
          isOpen={true}
          onClose={() => setHapusTarget(null)}
          title="Hapus Slot Jadwal"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 14 }}>
              Apakah Anda yakin ingin menghapus jadwal <strong>{hapusTarget.mapel.nama}</strong> di kelas{' '}
              <strong>{hapusTarget.rombel.nama}</strong> ({hapusTarget.hari}, Jam ke-{hapusTarget.jamKe})?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setHapusTarget(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={hapusMutasi.isPending}
                onClick={() => hapusMutasi.mutate(hapusTarget.id)}
              >
                {hapusMutasi.isPending ? 'Menghapus…' : 'Ya, Hapus Jadwal'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
