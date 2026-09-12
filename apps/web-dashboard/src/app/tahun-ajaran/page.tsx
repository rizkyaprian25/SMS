'use client';

import React, { useState, useEffect } from 'react';
import { SidebarNav, Topbar } from '@/components/sidebar-nav';
import { api } from '@/lib/api';

interface TahunAjaranItem {
  id: string;
  nama: string;
  mulai: string;
  selesai: string;
  semesterAktif: 'GANJIL' | 'GENAP';
  aktif: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TahunAjaranPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [list, setList] = useState<TahunAjaranItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSwitchSemesterModal, setShowSwitchSemesterModal] = useState(false);
  const [selectedTa, setSelectedTa] = useState<TahunAjaranItem | null>(null);

  // Form State
  const [newNama, setNewNama] = useState('');
  const [newMulai, setNewMulai] = useState('');
  const [newSelesai, setNewSelesai] = useState('');

  const fetchTahunAjaran = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tahun-ajaran');
      setList(res.data.data ?? []);
    } catch (err: any) {
      console.error('Gagal mengambil data tahun ajaran:', err);
      showNotification('Gagal memuat data tahun ajaran.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTahunAjaran();
  }, []);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const activeTa = list.find((ta) => ta.aktif);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama || !newMulai || !newSelesai) {
      showNotification('Semua field wajib diisi!', 'error');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/tahun-ajaran', {
        nama: newNama,
        mulai: new Date(newMulai).toISOString(),
        selesai: new Date(newSelesai).toISOString(),
        semesterAktif: 'GANJIL',
      });
      showNotification(`Tahun ajaran ${newNama} berhasil dibuat.`, 'success');
      setShowAddModal(false);
      setNewNama('');
      setNewMulai('');
      setNewSelesai('');
      fetchTahunAjaran();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menambahkan tahun ajaran.';
      showNotification(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAktifkan = async (ta: TahunAjaranItem) => {
    if (!confirm(`Aktifkan tahun ajaran ${ta.nama} sebagai tahun ajaran operasional sekolah saat ini?`)) {
      return;
    }
    try {
      await api.post(`/tahun-ajaran/${ta.id}/aktifkan`);
      showNotification(`Tahun ajaran ${ta.nama} sekarang berstatus aktif!`, 'success');
      fetchTahunAjaran();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mengaktifkan tahun ajaran.';
      showNotification(msg, 'error');
    }
  };

  const handleSwitchSemester = async () => {
    if (!selectedTa) return;
    const targetSemester = selectedTa.semesterAktif === 'GANJIL' ? 'GENAP' : 'GANJIL';
    try {
      setSubmitting(true);
      await api.patch(`/tahun-ajaran/${selectedTa.id}`, {
        semesterAktif: targetSemester,
      });
      showNotification(`Semester aktif berhasil diubah menjadi Semester ${targetSemester}!`, 'success');
      setShowSwitchSemesterModal(false);
      fetchTahunAjaran();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mengubah semester aktif.';
      showNotification(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="layout">
      <SidebarNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="layout-content">
        <Topbar onToggleMobileNav={() => setMobileNavOpen(!mobileNavOpen)} />

        <main className="main-content">
          {toast && (
            <div
              style={{
                position: 'fixed',
                top: 24,
                right: 24,
                zIndex: 9999,
                padding: '12px 20px',
                borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
              <span>{toast.message}</span>
            </div>
          )}

          {/* Header Banner */}
          <div className="page-header-action" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                Tahun Ajaran & Semester Aktif
              </h1>
              <p style={{ color: '#64748b', fontSize: 14 }}>
                Konfigurasi periode kalender akademik sekolah, pergantian semester aktif (Ganjil/Genap), dan arsip tahun ajaran.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>+ Buat Tahun Ajaran</span>
            </button>
          </div>

          {/* Banner Tahun Ajaran Aktif Saat Ini */}
          {activeTa ? (
            <div
              className="card"
              style={{
                padding: 24,
                marginBottom: 24,
                background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                color: '#ffffff',
                borderRadius: 12,
                boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4ade80', display: 'inline-block' }} />
                    SEDANG BERJALAN AKTIF
                  </div>
                  <h2 style={{ fontSize: 28, fontWeight: 800, marginTop: 8, letterSpacing: '-0.02em' }}>
                    Tahun Ajaran {activeTa.nama}
                  </h2>
                  <p style={{ opacity: 0.9, fontSize: 14, marginTop: 4 }}>
                    Periode: {new Date(activeTa.mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} s/d {new Date(activeTa.selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.15)', padding: 16, borderRadius: 10, backdropFilter: 'blur(4px)', minWidth: 240, textAlign: 'right' }}>
                  <div style={{ fontSize: 13, opacity: 0.85 }}>Semester Operasional</div>
                  <div style={{ fontSize: 24, fontWeight: 700, margin: '4px 0 10px 0' }}>
                    Semester {activeTa.semesterAktif}
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setSelectedTa(activeTa);
                      setShowSwitchSemesterModal(true);
                    }}
                    style={{ background: '#ffffff', color: '#1e3a8a', border: 'none', fontWeight: 600 }}
                  >
                    ⇄ Beralih ke Semester {activeTa.semesterAktif === 'GANJIL' ? 'GENAP' : 'GANJIL'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 24, marginBottom: 24, background: '#fffbeb', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontWeight: 600, color: '#b45309' }}>Peringatan Sistem: Belum Ada Tahun Ajaran Aktif</div>
              <div style={{ fontSize: 13, color: '#92400e', marginTop: 4 }}>
                Silakan pilih salah satu tahun ajaran di bawah ini dan klik tombol <strong>"Aktifkan"</strong> untuk menjalankan modul absensi, jadwal, dan nilai.
              </div>
            </div>
          )}

          {/* Tabel Daftar Semua Tahun Ajaran */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Daftar Arsip & Riwayat Tahun Ajaran</h3>
            </div>
            <div className="table-responsive">
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: 13 }}>Tahun Ajaran</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: 13 }}>Rentang Kalender</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: 13 }}>Semester</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: 13 }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: 13, textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                        Memuat data tahun ajaran...
                      </td>
                    </tr>
                  ) : list.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                        Belum ada data tahun ajaran. Silakan buat tahun ajaran baru.
                      </td>
                    </tr>
                  ) : (
                    list.map((ta) => (
                      <tr key={ta.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>
                          {ta.nama}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: '#64748b' }}>
                          {new Date(ta.mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} s/d {new Date(ta.selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span className={`badge ${ta.semesterAktif === 'GANJIL' ? 'badge-primary' : 'badge-info'}`}>
                            Semester {ta.semesterAktif}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {ta.aktif ? (
                            <span className="badge badge-success" style={{ fontSize: 12, padding: '4px 8px' }}>
                              ✓ Sedang Aktif
                            </span>
                          ) : (
                            <span className="badge badge-secondary" style={{ fontSize: 12, padding: '4px 8px' }}>
                              Arsip / Non-Aktif
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            {!ta.aktif && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleAktifkan(ta)}
                              >
                                Aktifkan
                              </button>
                            )}

                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setSelectedTa(ta);
                                setShowSwitchSemesterModal(true);
                              }}
                            >
                              Ganti Semester
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Tambah Tahun Ajaran */}
          {showAddModal && (
            <div className="modal-backdrop">
              <div className="modal-card" style={{ maxWidth: 460 }}>
                <div className="modal-header">
                  <h3>Tambah Tahun Ajaran Baru</h3>
                  <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}>✕</button>
                </div>
                <form onSubmit={handleCreate}>
                  <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
                        Nama Tahun Ajaran
                      </label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        placeholder="contoh: 2026/2027"
                        value={newNama}
                        onChange={(e) => setNewNama(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
                        Tanggal Mulai
                      </label>
                      <input
                        type="date"
                        required
                        className="form-control"
                        value={newMulai}
                        onChange={(e) => setNewMulai(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
                        Tanggal Selesai
                      </label>
                      <input
                        type="date"
                        required
                        className="form-control"
                        value={newSelesai}
                        onChange={(e) => setNewSelesai(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                      Batal
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? 'Menyimpan...' : 'Simpan Tahun Ajaran'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Beralih Semester */}
          {showSwitchSemesterModal && selectedTa && (
            <div className="modal-backdrop">
              <div className="modal-card" style={{ maxWidth: 460 }}>
                <div className="modal-header">
                  <h3>Beralih Semester Operasional</h3>
                  <button type="button" className="btn-close" onClick={() => setShowSwitchSemesterModal(false)}>✕</button>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p style={{ fontSize: 14, color: '#475569' }}>
                    Anda akan mengubah semester operasional untuk Tahun Ajaran <strong>{selectedTa.nama}</strong> dari:
                  </p>
                  <div style={{ textAlign: 'center', padding: '12px 16px', background: '#f1f5f9', borderRadius: 8 }}>
                    <span style={{ fontWeight: 600, color: '#64748b' }}>Semester {selectedTa.semesterAktif}</span>
                    <span style={{ margin: '0 12px', fontSize: 18 }}>➔</span>
                    <span style={{ fontWeight: 700, color: '#2563eb' }}>
                      Semester {selectedTa.semesterAktif === 'GANJIL' ? 'GENAP' : 'GANJIL'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#b45309', backgroundColor: '#fffbeb', padding: '10px 14px', borderRadius: 6 }}>
                    ⚠ Perhatian: Pergantian semester akan mempengaruhi rekap absensi harian dan kolom input nilai siswa yang aktif. Aktivitas ini akan tercatat dalam <strong>Audit Trail Sistem</strong>.
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowSwitchSemesterModal(false)}>
                    Batal
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleSwitchSemester} disabled={submitting}>
                    {submitting ? 'Memproses...' : `Ya, Beralih ke Semester ${selectedTa.semesterAktif === 'GANJIL' ? 'GENAP' : 'GANJIL'}`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
