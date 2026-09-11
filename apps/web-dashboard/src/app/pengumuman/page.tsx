'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

const ROLES = [
  { id: 'SUPER_ADMIN', label: 'Admin Sekolah' },
  { id: 'KEPALA_SEKOLAH', label: 'Kepala Sekolah' },
  { id: 'GURU_MAPEL', label: 'Guru Mata Pelajaran' },
  { id: 'WALI_KELAS', label: 'Wali Kelas' },
  { id: 'GURU_BK', label: 'Guru BK' },
];

interface Info {
  id: string;
  judul: string;
  isi: string;
  targetRole: string[];
  createdAt?: string;
}

export default function PengumumanPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(ROLES.map((r) => r.id));
  const [deleteTarget, setDeleteTarget] = useState<Info | null>(null);

  // State Edit Pengumuman
  const [editTarget, setEditTarget] = useState<Info | null>(null);
  const [editJudul, setEditJudul] = useState('');
  const [editIsi, setEditIsi] = useState('');
  const [editRoles, setEditRoles] = useState<string[]>([]);

  const q = useQuery<{ data: Info[] }>({
    queryKey: qk.pengumuman,
    queryFn: async () => (await api.get('/pengumuman')).data,
    retry: false,
  });

  const buat = useMutation({
    mutationFn: async (v: Record<string, unknown>) => (await api.post('/pengumuman', v)).data,
    onSuccess: () => {
      toast('Pengumuman baru berhasil disiarkan!', 'success');
      qc.invalidateQueries({ queryKey: qk.pengumuman });
      setShowAddModal(false);
      buat.reset();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Gagal membuat pengumuman';
      toast(Array.isArray(msg) ? msg.join(', ') : msg, 'danger');
    },
  });

  const updateMutasi = useMutation({
    mutationFn: async (payload: { id: string; judul: string; isi: string; targetRole: string[] }) =>
      (
        await api.patch(`/pengumuman/${payload.id}`, {
          judul: payload.judul,
          isi: payload.isi,
          targetRole: payload.targetRole,
        })
      ).data,
    onSuccess: () => {
      toast('Pengumuman berhasil diperbarui!', 'success');
      qc.invalidateQueries({ queryKey: qk.pengumuman });
      setEditTarget(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Gagal memperbarui pengumuman';
      toast(Array.isArray(msg) ? msg.join(', ') : msg, 'danger');
    },
  });

  const hapus = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/pengumuman/${id}`)).data,
    onSuccess: () => {
      toast('Pengumuman berhasil dihapus!', 'success');
      qc.invalidateQueries({ queryKey: qk.pengumuman });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Gagal menghapus pengumuman';
      toast(Array.isArray(msg) ? msg.join(', ') : msg, 'danger');
    },
  });

  const toggleRole = (roleId: string) => {
    if (selectedRoles.includes(roleId)) {
      if (selectedRoles.length > 1) {
        setSelectedRoles(selectedRoles.filter((r) => r !== roleId));
      }
    } else {
      setSelectedRoles([...selectedRoles, roleId]);
    }
  };

  const toggleEditRole = (roleId: string) => {
    if (editRoles.includes(roleId)) {
      if (editRoles.length > 1) {
        setEditRoles(editRoles.filter((r) => r !== roleId));
      }
    } else {
      setEditRoles([...editRoles, roleId]);
    }
  };

  function bukaModalEdit(p: Info) {
    setEditTarget(p);
    setEditJudul(p.judul);
    setEditIsi(p.isi);
    setEditRoles(p.targetRole);
  }

  const list = q.data?.data ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Papan Pengumuman Sekolah
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4, margin: 0 }}>
            Siarkan informasi resmi dan edaran sekolah kepada guru, wali kelas, dan staf kependidikan.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setSelectedRoles(ROLES.map((r) => r.id));
            setShowAddModal(true);
          }}
        >
          📢 Buat Pengumuman Baru
        </button>
      </div>

      {/* Content */}
      {q.isPending ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Memuat pengumuman...
        </div>
      ) : q.isError ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--danger)' }}>
          Gagal memuat pengumuman. Pastikan server aktif.
        </div>
      ) : list.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.125rem' }}>
            Belum ada pengumuman
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Gunakan tombol di atas untuk membuat siaran informasi baru.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {list.map((p) => {
            const isAllRoles = p.targetRole.length >= ROLES.length;
            return (
              <div
                key={p.id}
                className="card"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: '#e0e7ff',
                        color: '#4338ca',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        flexShrink: 0,
                      }}
                    >
                      📢
                    </div>
                    <div>
                      <h2
                        style={{
                          fontSize: '1.125rem',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                          margin: 0,
                        }}
                      >
                        {p.judul}
                      </h2>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                          marginTop: 6,
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Target:
                        </span>
                        {isAllRoles ? (
                          <Badge variant="primary">Semua Pihak Sekolah</Badge>
                        ) : (
                          p.targetRole.map((role) => (
                            <Badge key={role} variant="info" style={{ fontSize: '0.6875rem' }}>
                              {role.replace('_', ' ')}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => bukaModalEdit(p)}
                      title="Ubah Pengumuman"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      style={{ color: 'var(--danger)', borderColor: '#fca5a5' }}
                      onClick={() => setDeleteTarget(p)}
                      title="Hapus Pengumuman"
                    >
                      Hapus
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    color: 'var(--text-main)',
                    fontSize: '0.9375rem',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    paddingLeft: 54,
                  }}
                >
                  {p.isi}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tambah Pengumuman */}
      {showAddModal && (
        <Modal title="Buat Pengumuman Baru" onClose={() => setShowAddModal(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              buat.mutate({
                judul: String(fd.get('judul')),
                isi: String(fd.get('isi')),
                targetRole: selectedRoles,
              });
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">JUDUL PENGUMUMAN</label>
              <input
                name="judul"
                className="input-control"
                placeholder="Contoh: Rapat Evaluasi Tengah Semester"
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">ISI INFORMASI / EDARAN</label>
              <textarea
                name="isi"
                className="input-control"
                rows={5}
                placeholder="Tuliskan detail pengumuman secara lengkap di sini..."
                required
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">TARGET PENERIMA INFORMASI</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {ROLES.map((r) => {
                  const checked = selectedRoles.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRole(r.id)}
                        style={{ width: 16, height: 16 }}
                      />
                      <span>{r.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAddModal(false)}
              >
                Batal
              </button>
              <button type="submit" className="btn btn-primary" disabled={buat.isPending}>
                {buat.isPending ? 'Menyiarkan...' : 'Siarkan Pengumuman'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Edit Pengumuman */}
      {editTarget && (
        <Modal title={`Edit Pengumuman: ${editTarget.judul}`} onClose={() => setEditTarget(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editJudul.trim() || !editIsi.trim()) {
                alert('Judul dan isi pengumuman wajib diisi');
                return;
              }
              updateMutasi.mutate({
                id: editTarget.id,
                judul: editJudul.trim(),
                isi: editIsi.trim(),
                targetRole: editRoles,
              });
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">JUDUL PENGUMUMAN *</label>
              <input
                className="input-control"
                value={editJudul}
                onChange={(e) => setEditJudul(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">ISI INFORMASI / EDARAN *</label>
              <textarea
                className="input-control"
                rows={5}
                value={editIsi}
                onChange={(e) => setEditIsi(e.target.value)}
                required
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">TARGET PENERIMA INFORMASI</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {ROLES.map((r) => {
                  const checked = editRoles.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEditRole(r.id)}
                        style={{ width: 16, height: 16 }}
                      />
                      <span>{r.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditTarget(null)}
              >
                Batal
              </button>
              <button type="submit" className="btn btn-primary" disabled={updateMutasi.isPending}>
                {updateMutasi.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteTarget && (
        <Modal title="Hapus Pengumuman" onClose={() => setDeleteTarget(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.9375rem' }}>
              Apakah Anda yakin ingin menghapus pengumuman{' '}
              <strong>&ldquo;{deleteTarget.judul}&rdquo;</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteTarget(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={hapus.isPending}
                onClick={() => hapus.mutate(deleteTarget.id)}
              >
                {hapus.isPending ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
