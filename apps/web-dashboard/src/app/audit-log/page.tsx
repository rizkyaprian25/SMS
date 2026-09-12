'use client';

import React, { useState, useEffect } from 'react';
import { SidebarNav, Topbar } from '@/components/sidebar-nav';
import { api } from '@/lib/api';

interface AuditLogItem {
  id: string;
  aksi: string;
  entitas: string;
  entitasId: string;
  sebelum?: any;
  sesudah?: any;
  dilakukanOleh: string;
  kapan: string;
}

const ACTION_BADGES: Record<string, { label: string; badgeClass: string }> = {
  KENAIKAN_KELAS_KOLEKTIF: { label: 'Kenaikan Kelas', badgeClass: 'badge-primary' },
  PERIZINAN_DIPUTUSKAN: { label: 'Keputusan Izin', badgeClass: 'badge-warning' },
  GANTI_SEMESTER: { label: 'Ganti Semester', badgeClass: 'badge-info' },
  BUAT_TAHUN_AJARAN: { label: 'Buat TA Baru', badgeClass: 'badge-success' },
  AKTIFKAN_TAHUN_AJARAN: { label: 'Aktivasi TA', badgeClass: 'badge-success' },
  BUAT_PENGGUNA: { label: 'Buat Akun', badgeClass: 'badge-success' },
  UPDATE_PENGGUNA: { label: 'Ubah Akun', badgeClass: 'badge-warning' },
  RESET_PASSWORD: { label: 'Reset Password', badgeClass: 'badge-danger' },
  HAPUS_PENGGUNA: { label: 'Hapus Akun', badgeClass: 'badge-danger' },
};

export default function AuditLogPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [aksiFilter, setAksiFilter] = useState('');
  const [entitasFilter, setEntitasFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modal Detail State
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [activeTab, setActiveTab] = useState<'sesudah' | 'sebelum'>('sesudah');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { limit: '50' };
      if (aksiFilter) params.aksi = aksiFilter;
      if (entitasFilter) params.entitas = entitasFilter;
      if (search) params.q = search;
      const res = await api.get('/audit-log', { params });
      setLogs(res.data.data ?? []);
    } catch (err: any) {
      console.error('Gagal mengambil audit log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [aksiFilter, entitasFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div className="layout">
      <SidebarNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="layout-content">
        <Topbar onToggleMobileNav={() => setMobileNavOpen(!mobileNavOpen)} />

        <main className="main-content">
          {/* Header Banner */}
          <div className="page-header-action" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                Audit Trail & Jejak Aktivitas Sistem
              </h1>
              <p style={{ color: '#64748b', fontSize: 14 }}>
                Rekam jejak transaksi kritis dan perubahan data penting (kenaikan kelas, perizinan, pergantian semester, manajemen akun).
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchLogs}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>Segarkan Log</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="card" style={{ padding: 16, marginBottom: 24 }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: '1 1 240px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari aktor, id entitas, atau kata kunci..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ minWidth: 180 }}>
                <select
                  className="form-control"
                  value={aksiFilter}
                  onChange={(e) => setAksiFilter(e.target.value)}
                >
                  <option value="">-- Semua Jenis Aksi --</option>
                  <option value="KENAIKAN_KELAS_KOLEKTIF">Kenaikan Kelas Kolektif</option>
                  <option value="PERIZINAN_DIPUTUSKAN">Keputusan Perizinan</option>
                  <option value="GANTI_SEMESTER">Ganti Semester</option>
                  <option value="BUAT_TAHUN_AJARAN">Buat Tahun Ajaran</option>
                  <option value="AKTIFKAN_TAHUN_AJARAN">Aktivasi Tahun Ajaran</option>
                  <option value="BUAT_PENGGUNA">Tambah Pengguna</option>
                  <option value="UPDATE_PENGGUNA">Ubah Pengguna</option>
                  <option value="RESET_PASSWORD">Reset Kata Sandi</option>
                  <option value="HAPUS_PENGGUNA">Hapus Pengguna</option>
                </select>
              </div>

              <div style={{ minWidth: 160 }}>
                <select
                  className="form-control"
                  value={entitasFilter}
                  onChange={(e) => setEntitasFilter(e.target.value)}
                >
                  <option value="">-- Semua Entitas --</option>
                  <option value="Rombel">Rombel (Kelas)</option>
                  <option value="Perizinan">Perizinan Siswa</option>
                  <option value="TahunAjaran">Tahun Ajaran</option>
                  <option value="Pengguna">Akun Pengguna</option>
                </select>
              </div>

              <button type="submit" className="btn btn-secondary">Cari</button>

              {(search || aksiFilter || entitasFilter) && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSearch('');
                    setAksiFilter('');
                    setEntitasFilter('');
                  }}
                >
                  Reset
                </button>
              )}
            </form>
          </div>

          {/* Tabel Log */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: 13, width: 170 }}>Waktu Kejadian</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: 13, width: 200 }}>Aktor Pelaksana</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: 13 }}>Aktivitas / Aksi</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: 13 }}>Entitas Target</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: 13, textAlign: 'right' }}>Payload Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                        Memuat riwayat audit trail...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                        Tidak ada catatan audit trail yang cocok.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const badgeCfg = ACTION_BADGES[log.aksi] || { label: log.aksi, badgeClass: 'badge-secondary' };
                      const dateObj = new Date(log.kapan);
                      const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                      const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

                      return (
                        <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 16px', fontSize: 12 }}>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{dateStr}</div>
                            <div style={{ color: '#64748b' }}>{timeStr} WIB</div>
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: 13 }}>
                            <div style={{ fontWeight: 500, color: '#1e293b' }}>{log.dilakukanOleh}</div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span className={`badge ${badgeCfg.badgeClass}`} style={{ fontSize: 12, padding: '4px 8px' }}>
                              {badgeCfg.label}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: 13 }}>
                            <span style={{ fontWeight: 600, color: '#334155' }}>{log.entitas}</span>
                            <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                              ID: {log.entitasId.slice(0, 12)}...
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setSelectedLog(log);
                                setActiveTab(log.sesudah ? 'sesudah' : 'sebelum');
                              }}
                            >
                              🔍 Rincian Data
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Rincian Audit Data */}
          {selectedLog && (
            <div className="modal-backdrop">
              <div className="modal-card" style={{ maxWidth: 640 }}>
                <div className="modal-header">
                  <div>
                    <h3 style={{ margin: 0 }}>Rincian Audit Log</h3>
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      Aksi: {selectedLog.aksi} | Entitas: {selectedLog.entitas} ({selectedLog.entitasId})
                    </p>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setSelectedLog(null)}>✕</button>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${activeTab === 'sesudah' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setActiveTab('sesudah')}
                    >
                      Data Sesudah Perubahan
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${activeTab === 'sebelum' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setActiveTab('sebelum')}
                    >
                      Data Sebelum Perubahan
                    </button>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                      {activeTab === 'sesudah' ? 'Payload Snapshot (Setelah Aksi Berhasil):' : 'Snapshot Kondisi Awal (Sebelum Perubahan):'}
                    </div>
                    <pre
                      style={{
                        background: '#0f172a',
                        color: '#38bdf8',
                        padding: 16,
                        borderRadius: 8,
                        fontSize: 12,
                        lineHeight: 1.5,
                        overflowX: 'auto',
                        maxHeight: 320,
                        fontFamily: 'Consolas, Monaco, monospace',
                      }}
                    >
                      {activeTab === 'sesudah'
                        ? JSON.stringify(selectedLog.sesudah ?? { info: 'Tidak ada snapshot data sesudah' }, null, 2)
                        : JSON.stringify(selectedLog.sebelum ?? { info: 'Tidak ada snapshot data sebelum' }, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedLog(null)}>
                    Tutup
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
