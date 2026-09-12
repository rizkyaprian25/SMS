'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { pesanError } from '@/components/import-siswa';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';

interface Izin {
  id: string;
  tglMulai: string;
  tglSelesai: string;
  jenis: string;
  alasan: string;
  status: string;
  siswa: { id?: string; nama: string; rombel?: { nama: string } };
}

export default function PerizinanPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('DIAJUKAN');

  const [targetIzin, setTargetIzin] = useState<{
    id: string;
    namaSiswa: string;
    jenis: string;
    putusan: 'SETUJU' | 'TOLAK';
  } | null>(null);

  // Modal Ajukan Izin Baru
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSiswaId, setNewSiswaId] = useState('');
  const [newTglMulai, setNewTglMulai] = useState(new Date().toISOString().slice(0, 10));
  const [newTglSelesai, setNewTglSelesai] = useState(new Date().toISOString().slice(0, 10));
  const [newJenis, setNewJenis] = useState<'IZIN' | 'SAKIT'>('IZIN');
  const [newAlasan, setNewAlasan] = useState('');
  const [addError, setAddError] = useState('');

  // Fetch daftar siswa untuk dropdown pengajuan
  const { data: siswaDropdownData } = useQuery<{ data: Array<{ id: string; nama: string; nisn: string; rombel?: { nama: string } }> }>({
    queryKey: ['siswa-dropdown-perizinan'],
    queryFn: async () => (await api.get('/siswa', { params: { limit: 100 } })).data,
    retry: false,
  });

  const ajukanMutasi = useMutation({
    mutationFn: async (payload: {
      siswaId: string;
      tglMulai: string;
      tglSelesai: string;
      jenis: 'IZIN' | 'SAKIT';
      alasan: string;
    }) => (await api.post('/perizinan', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perizinan'] });
      qc.invalidateQueries({ queryKey: ['perizinan-all-stats'] });
      setShowAddModal(false);
      setNewAlasan('');
      setAddError('');
    },
    onError: (err) => {
      setAddError(pesanError(err));
    },
  });

  const q = useQuery<{ data: Izin[] }>({
    queryKey: qk.perizinan(status),
    queryFn: async () =>
      (await api.get('/perizinan', { params: { status: status || undefined } })).data,
    retry: false,
  });

  // Query rekap seluruh status untuk StatCard
  const qSemua = useQuery<{ data: Izin[] }>({
    queryKey: ['perizinan-all-stats'],
    queryFn: async () => (await api.get('/perizinan')).data,
    retry: false,
  });

  const putus = useMutation({
    mutationFn: async (v: { id: string; putusan: string }) =>
      (await api.post(`/perizinan/${v.id}/putuskan`, { putusan: v.putusan })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perizinan'] });
      qc.invalidateQueries({ queryKey: ['perizinan-all-stats'] });
      qc.invalidateQueries({ queryKey: ['absensi'] });
      setTargetIzin(null);
    },
  });

  const list = q.data?.data ?? [];
  const allList = qSemua.data?.data ?? [];

  const pendingCount = allList.filter((z) => z.status === 'DIAJUKAN').length;
  const approvedCount = allList.filter((z) => z.status === 'DISETUJUI').length;
  const rejectedCount = allList.filter((z) => z.status === 'DITOLAK').length;
  const totalCount = allList.length;

  const getInitials = (nama: string) => {
    return (
      nama
        ?.split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase() || 'S'
    );
  };

  const formatTgl = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso.slice(0, 10);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Persetujuan Perizinan Siswa
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4, margin: 0 }}>
            Verifikasi pengajuan surat izin &amp; sakit dari orang tua siswa. Izin disetujui akan otomatis
            tercatat pada data absensi harian siswa.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', border: 'none', gap: 6, fontWeight: 600 }}
          onClick={() => {
            setAddError('');
            setShowAddModal(true);
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          + Ajukan Izin / Sakit Siswa
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard
          title="Menunggu Tindakan"
          value={qSemua.isPending ? '...' : String(pendingCount)}
          subtitle="Butuh persetujuan wali kelas"
          icon="⏳"
          colorVariant="warning"
        />
        <StatCard
          title="Telah Disetujui"
          value={qSemua.isPending ? '...' : String(approvedCount)}
          subtitle="Otomatis masuk absensi"
          icon="✅"
          colorVariant="success"
        />
        <StatCard
          title="Ditolak"
          value={qSemua.isPending ? '...' : String(rejectedCount)}
          subtitle="Izin tidak memenuhi syarat"
          icon="❌"
          colorVariant="danger"
        />
        <StatCard
          title="Total Pengajuan"
          value={qSemua.isPending ? '...' : String(totalCount)}
          subtitle="Semua riwayat perizinan"
          icon="📁"
          colorVariant="primary"
        />
      </div>

      {/* Segmented Filter Bar */}
      <div className="card" style={{ padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: 8 }}>
            STATUS:
          </span>
          {[
            { id: 'DIAJUKAN', label: 'Menunggu Persetujuan' },
            { id: 'DISETUJUI', label: 'Disetujui' },
            { id: 'DITOLAK', label: 'Ditolak' },
            { id: '', label: 'Semua Status' },
          ].map((tab) => {
            const active = status === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatus(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: '0.8125rem',
                  fontWeight: active ? 700 : 500,
                  border: active ? '1px solid var(--primary)' : '1px solid transparent',
                  backgroundColor: active ? '#e0e7ff' : '#f8fafc',
                  color: active ? '#4338ca' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
            Daftar Pengajuan Izin
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Menampilkan {list.length} pengajuan
          </div>
        </div>

        {q.isPending ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⏳</div>
            Memuat pengajuan perizinan...
          </div>
        ) : q.isError ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--danger)' }}>
            Gagal memuat catatan perizinan.
          </div>
        ) : list.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📬</div>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.125rem' }}>
              Tidak ada pengajuan {status ? `dengan status ${status}` : ''}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
              Semua permohonan izin siswa telah selesai diproses.
            </p>
          </div>
        ) : (
          <div className="data-table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Siswa</th>
                  <th>Rentang Tanggal</th>
                  <th style={{ textAlign: 'center' }}>Jenis</th>
                  <th style={{ width: '30%' }}>Alasan / Keterangan</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {list.map((z) => (
                  <tr key={z.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            backgroundColor: '#e0e7ff',
                            color: '#4338ca',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(z.siswa.nama)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {z.siswa.nama}
                          </div>
                          {z.siswa.rombel && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Kelas: {z.siswa.rombel.nama}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                        {formatTgl(z.tglMulai)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        s/d {formatTgl(z.tglSelesai)}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Badge variant={z.jenis === 'SAKIT' ? 'info' : 'warning'}>
                        {z.jenis}
                      </Badge>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>
                        {z.alasan}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Badge
                        variant={
                          z.status === 'DISETUJUI'
                            ? 'success'
                            : z.status === 'DIAJUKAN'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {z.status === 'DIAJUKAN' ? 'Menunggu' : z.status}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {z.status === 'DIAJUKAN' ? (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-success"
                            onClick={() =>
                              setTargetIzin({
                                id: z.id,
                                namaSiswa: z.siswa.nama,
                                jenis: z.jenis,
                                putusan: 'SETUJU',
                              })
                            }
                          >
                            Setujui
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() =>
                              setTargetIzin({
                                id: z.id,
                                namaSiswa: z.siswa.nama,
                                jenis: z.jenis,
                                putusan: 'TOLAK',
                              })
                            }
                          >
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Selesai
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Putusan */}
      {targetIzin && (
        <Modal
          title={`Konfirmasi Izin Siswa`}
          onClose={() => setTargetIzin(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-main)' }}>
              Apakah Anda yakin ingin{' '}
              <b>{targetIzin.putusan === 'SETUJU' ? 'menyetujui' : 'menolak'}</b> pengajuan izin{' '}
              <b>{targetIzin.jenis}</b> untuk <b>{targetIzin.namaSiswa}</b>?
            </p>

            {targetIzin.putusan === 'SETUJU' && (
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 8,
                  padding: '0.75rem',
                  fontSize: '0.8125rem',
                  color: '#166534',
                }}
              >
                ℹ️ <b>Catatan Sistem:</b> Menyetujui izin ini akan secara otomatis mengisi absensi siswa
                sebagai <b>{targetIzin.jenis}</b> pada tanggal izin tersebut.
              </div>
            )}

            {putus.isError && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: 8,
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  fontSize: '0.875rem',
                }}
              >
                {pesanError(putus.error)}
                <div style={{ fontSize: '0.75rem', marginTop: 4 }}>
                  (Catatan: Wali kelas hanya berhak memverifikasi izin siswa binaannya sendiri)
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setTargetIzin(null)}
                disabled={putus.isPending}
              >
                Batal
              </button>
              <button
                type="button"
                className={`btn ${
                  targetIzin.putusan === 'SETUJU' ? 'btn-success' : 'btn-danger'
                }`}
                disabled={putus.isPending}
                onClick={() =>
                  putus.mutate({
                    id: targetIzin.id,
                    putusan: targetIzin.putusan,
                  })
                }
              >
                {putus.isPending
                  ? 'Menyimpan...'
                  : targetIzin.putusan === 'SETUJU'
                  ? 'Ya, Setujui'
                  : 'Ya, Tolak'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Ajukan Surat Izin / Sakit Baru */}
      {showAddModal && (
        <Modal
          title="📝 Formulir Pengajuan Surat Izin / Sakit Siswa"
          onClose={() => setShowAddModal(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAddError('');
              if (!newSiswaId) {
                setAddError('Silakan pilih siswa terlebih dahulu.');
                return;
              }
              if (!newAlasan.trim()) {
                setAddError('Alasan / keterangan izin wajib diisi.');
                return;
              }
              ajukanMutasi.mutate({
                siswaId: newSiswaId,
                tglMulai: newTglMulai,
                tglSelesai: newTglSelesai,
                jenis: newJenis,
                alasan: newAlasan.trim(),
              });
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            {addError && (
              <div className="alert alert-danger" style={{ fontSize: 13, padding: '8px 12px' }}>
                {addError}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Pilih Peserta Didik
              </label>
              <select
                className="input"
                required
                value={newSiswaId}
                onChange={(e) => setNewSiswaId(e.target.value)}
              >
                <option value="">-- Pilih Siswa --</option>
                {(siswaDropdownData?.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama} ({s.rombel?.nama ? `Kelas ${s.rombel.nama}` : 'Tanpa Rombel'}) — NISN: {s.nisn}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  className="input"
                  required
                  value={newTglMulai}
                  onChange={(e) => setNewTglMulai(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Tanggal Selesai
                </label>
                <input
                  type="date"
                  className="input"
                  required
                  value={newTglSelesai}
                  onChange={(e) => setNewTglSelesai(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Jenis Keterangan
              </label>
              <div style={{ display: 'flex', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="radio"
                    name="jenisIzin"
                    checked={newJenis === 'IZIN'}
                    onChange={() => setNewJenis('IZIN')}
                  />
                  <span>Surat Izin Keperluan Keluarga / Dispensasi</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="radio"
                    name="jenisIzin"
                    checked={newJenis === 'SAKIT'}
                    onChange={() => setNewJenis('SAKIT')}
                  />
                  <span>Surat Keterangan Sakit (Dokter/Klinik)</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Alasan / Uraian Izin
              </label>
              <textarea
                className="input"
                rows={3}
                required
                value={newAlasan}
                onChange={(e) => setNewAlasan(e.target.value)}
                placeholder="Contoh: Mengikuti acara keluarga di luar kota / Sakit demam berdarah opname..."
              />
            </div>

            <div
              style={{
                padding: '10px 14px',
                borderRadius: 6,
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                fontSize: 12,
                color: 'var(--text-subtle)',
              }}
            >
              ⚡ <b>Otomasi Presensi:</b> Setelah izin ini diverifikasi dan disetujui, sistem presensi harian otomatis mencatat status <b>{newJenis}</b> pada seluruh jam mata pelajaran siswa di rentang tanggal tersebut.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={ajukanMutasi.isPending}
                onClick={() => setShowAddModal(false)}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={ajukanMutasi.isPending}
              >
                {ajukanMutasi.isPending ? 'Mengirim Pengajuan…' : 'Kirim Pengajuan Izin'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
