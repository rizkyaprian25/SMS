'use client';

import React, { useState, useEffect } from 'react';
import { SidebarNav, Topbar } from '@/components/sidebar-nav';
import { api } from '@/lib/api';

interface PenggunaItem {
  id: string;
  email: string;
  role: string;
  guruId?: string | null;
  siswaId?: string | null;
  guru?: { id: string; nama: string; nip?: string | null } | null;
  siswa?: { id: string; nama: string; nisn?: string | null } | null;
  _count?: { sesi: number };
  createdAt: string;
  updatedAt: string;
}

const ROLE_LABELS: Record<string, { label: string; badgeClass: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', badgeClass: 'badge-danger' },
  KEPALA_SEKOLAH: { label: 'Kepala Sekolah', badgeClass: 'badge-warning' },
  TATA_USAHA: { label: 'Tata Usaha', badgeClass: 'badge-info' },
  GURU: { label: 'Guru Mapel/BK', badgeClass: 'badge-primary' },
  SISWA: { label: 'Siswa', badgeClass: 'badge-secondary' },
  ORTU: { label: 'Orang Tua / Wali', badgeClass: 'badge-secondary' },
};

export default function PenggunaPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [users, setUsers] = useState<PenggunaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PenggunaItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'GURU',
  });
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('GURU');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (selectedRole) params.role = selectedRole;
      if (search) params.q = search;
      const res = await api.get('/pengguna', { params });
      setUsers(res.data.data ?? []);
    } catch (err: any) {
      console.error('Gagal mengambil data pengguna:', err);
      showNotification('Gagal memuat daftar pengguna.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedRole]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      showNotification('Email dan password wajib diisi!', 'error');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/pengguna', formData);
      showNotification(`Pengguna ${formData.email} berhasil ditambahkan.`, 'success');
      setShowAddModal(false);
      setFormData({ email: '', password: '', role: 'GURU' });
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menambahkan akun pengguna.';
      showNotification(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword || newPassword.length < 6) {
      showNotification('Password baru minimal 6 karakter.', 'error');
      return;
    }
    try {
      setSubmitting(true);
      await api.post(`/pengguna/${selectedUser.id}/reset-password`, { passwordBaru: newPassword });
      showNotification(`Password untuk ${selectedUser.email} berhasil direset!`, 'success');
      setShowResetModal(false);
      setNewPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mereset password.';
      showNotification(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setSubmitting(true);
      await api.patch(`/pengguna/${selectedUser.id}`, { role: newRole });
      showNotification(`Peran untuk ${selectedUser.email} berhasil diubah menjadi ${newRole}.`, 'success');
      setShowEditRoleModal(false);
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mengubah peran.';
      showNotification(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: PenggunaItem) => {
    if (user.email === 'admin@sekolah.sch.id') {
      alert('Akun Super Admin Utama tidak dapat dihapus demi keamanan sistem.');
      return;
    }
    if (!confirm(`Apakah Anda yakin ingin menghapus akun ${user.email}? Seluruh sesi login terkait akan ditutup.`)) {
      return;
    }
    try {
      await api.delete(`/pengguna/${user.id}`);
      showNotification(`Akun ${user.email} berhasil dihapus.`, 'success');
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menghapus pengguna.';
      showNotification(msg, 'error');
    }
  };

  // Hitung ringkasan
  const totalAkun = users.length;
  const totalAdmin = users.filter((u) => u.role === 'SUPER_ADMIN' || u.role === 'TATA_USAHA').length;
  const totalGuru = users.filter((u) => u.role === 'GURU' || u.role === 'KEPALA_SEKOLAH').length;
  const totalSiswaOrtu = users.filter((u) => u.role === 'SISWA' || u.role === 'ORTU').length;

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
                Manajemen Pengguna & Hak Akses (RBAC)
              </h1>
              <p style={{ color: '#64748b', fontSize: 14 }}>
                Kelola akun sistem, atur kewenangan pengguna, reset kata sandi, dan hubungkan dengan profil guru atau siswa.
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
              <span>+ Tambah Akun Baru</span>
            </button>
          </div>

          {/* Ringkasan Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Total Pengguna</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>{totalAkun}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Akun terdaftar di sistem</div>
            </div>

            <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Admin & Tata Usaha</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>{totalAdmin}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Hak akses penuh & operasional</div>
            </div>

            <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Guru & Kepsek</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>{totalGuru}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Akses nilai & absensi</div>
            </div>

            <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Siswa & Wali</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>{totalSiswaOrtu}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Akses portal akademik</div>
            </div>
          </div>

          {/* Filter & Pencarian */}
          <div className="card" style={{ padding: 16, marginBottom: 24 }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: '1 1 260px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari email atau nama pengguna..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ minWidth: 180 }}>
                <select
                  className="form-control"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="">-- Semua Hak Akses --</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="KEPALA_SEKOLAH">Kepala Sekolah</option>
                  <option value="TATA_USAHA">Tata Usaha</option>
                  <option value="GURU">Guru Mapel/BK</option>
                  <option value="SISWA">Siswa</option>
                  <option value="ORTU">Orang Tua / Wali</option>
                </select>
              </div>

              <button type="submit" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>Cari</span>
              </button>

              {(search || selectedRole) && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSearch('');
                    setSelectedRole('');
                  }}
                >
                  Reset Filter
                </button>
              )}
            </form>
          </div>

          {/* Tabel Pengguna */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: 13 }}>Pengguna (Email)</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: 13 }}>Hak Akses (Role)</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: 13 }}>Profil Terhubung</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: 13 }}>Sesi Aktif</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: 13, textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                        Memuat data pengguna...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                        Tidak ditemukan data pengguna yang cocok dengan kriteria.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const roleConfig = ROLE_LABELS[user.role] || { label: user.role, badgeClass: 'badge-secondary' };
                      const isPrimaryAdmin = user.email === 'admin@sekolah.sch.id';

                      return (
                        <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{user.email}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                              Dibuat: {new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span className={`badge ${roleConfig.badgeClass}`} style={{ fontSize: 12, padding: '4px 8px' }}>
                              {roleConfig.label}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: 13 }}>
                            {user.guru ? (
                              <div>
                                <span style={{ fontWeight: 500, color: '#1e293b' }}>{user.guru.nama}</span>
                                <div style={{ fontSize: 11, color: '#64748b' }}>NIP: {user.guru.nip || '-'}</div>
                              </div>
                            ) : user.siswa ? (
                              <div>
                                <span style={{ fontWeight: 500, color: '#1e293b' }}>{user.siswa.nama}</span>
                                <div style={{ fontSize: 11, color: '#64748b' }}>NISN: {user.siswa.nisn || '-'}</div>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Akun Sistem (Independen)</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: 13 }}>
                            <span style={{ color: (user._count?.sesi ?? 0) > 0 ? '#10b981' : '#94a3b8', fontWeight: 500 }}>
                              {user._count?.sesi ?? 0} perangkat aktif
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setNewPassword('');
                                  setShowResetModal(true);
                                }}
                                title="Reset Kata Sandi"
                              >
                                🔑 Reset
                              </button>

                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setNewRole(user.role);
                                  setShowEditRoleModal(true);
                                }}
                                disabled={isPrimaryAdmin}
                                title={isPrimaryAdmin ? 'Super Admin Utama tidak dapat diubah perannya' : 'Ubah Hak Akses'}
                              >
                                ⚙ Peran
                              </button>

                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteUser(user)}
                                disabled={isPrimaryAdmin}
                                title={isPrimaryAdmin ? 'Super Admin Utama tidak dapat dihapus' : 'Hapus Akun'}
                              >
                                🗑 Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Tambah Pengguna */}
          {showAddModal && (
            <div className="modal-backdrop">
              <div className="modal-card" style={{ maxWidth: 480 }}>
                <div className="modal-header">
                  <h3>Tambah Akun Pengguna Baru</h3>
                  <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}>✕</button>
                </div>
                <form onSubmit={handleCreateUser}>
                  <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
                        Alamat Email (Digunakan untuk Login)
                      </label>
                      <input
                        type="email"
                        required
                        className="form-control"
                        placeholder="contoh: guru.smp@sekolah.sch.id"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
                        Kata Sandi Awal (Min. 6 Karakter)
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        className="form-control"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
                        Hak Akses & Kewenangan (Role)
                      </label>
                      <select
                        className="form-control"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        style={{ width: '100%' }}
                      >
                        <option value="GURU">Guru Mapel / BK</option>
                        <option value="TATA_USAHA">Staff Tata Usaha (TU)</option>
                        <option value="KEPALA_SEKOLAH">Kepala Sekolah</option>
                        <option value="SUPER_ADMIN">Super Admin Sistem</option>
                        <option value="SISWA">Siswa</option>
                        <option value="ORTU">Orang Tua / Wali Siswa</option>
                      </select>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                      Batal
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? 'Menyimpan...' : 'Simpan Akun'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Reset Password */}
          {showResetModal && selectedUser && (
            <div className="modal-backdrop">
              <div className="modal-card" style={{ maxWidth: 440 }}>
                <div className="modal-header">
                  <h3>Reset Kata Sandi Akun</h3>
                  <button type="button" className="btn-close" onClick={() => setShowResetModal(false)}>✕</button>
                </div>
                <form onSubmit={handleResetPassword}>
                  <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <p style={{ fontSize: 14, color: '#475569' }}>
                      Anda akan mengatur ulang kata sandi untuk akun <strong>{selectedUser.email}</strong>.
                    </p>
                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
                        Kata Sandi Baru (Min. 6 Karakter)
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        className="form-control"
                        placeholder="Masukkan sandi baru"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div style={{ fontSize: 12, color: '#e11d48', backgroundColor: '#ffe4e6', padding: '8px 12px', borderRadius: 6 }}>
                      ℹ Sesi login pengguna di perangkat lain akan otomatis dinonaktifkan demi keamanan.
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowResetModal(false)}>
                      Batal
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? 'Memproses...' : 'Ubah Kata Sandi'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Edit Role */}
          {showEditRoleModal && selectedUser && (
            <div className="modal-backdrop">
              <div className="modal-card" style={{ maxWidth: 440 }}>
                <div className="modal-header">
                  <h3>Ubah Hak Akses Akun</h3>
                  <button type="button" className="btn-close" onClick={() => setShowEditRoleModal(false)}>✕</button>
                </div>
                <form onSubmit={handleUpdateRole}>
                  <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <p style={{ fontSize: 14, color: '#475569' }}>
                      Ubah peran dan hak akses akun untuk <strong>{selectedUser.email}</strong>.
                    </p>
                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
                        Pilih Hak Akses Baru
                      </label>
                      <select
                        className="form-control"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        style={{ width: '100%' }}
                      >
                        <option value="GURU">Guru Mapel / BK</option>
                        <option value="TATA_USAHA">Staff Tata Usaha (TU)</option>
                        <option value="KEPALA_SEKOLAH">Kepala Sekolah</option>
                        <option value="SUPER_ADMIN">Super Admin Sistem</option>
                        <option value="SISWA">Siswa</option>
                        <option value="ORTU">Orang Tua / Wali Siswa</option>
                      </select>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowEditRoleModal(false)}>
                      Batal
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
