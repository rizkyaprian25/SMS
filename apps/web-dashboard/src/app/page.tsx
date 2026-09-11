'use client';
import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StatCard } from '@/components/ui/stat-card';

interface RingkasanData {
  totalSiswa: number;
  totalGuru: number;
  totalRombel: number;
  hadirHariIni: number;
  alpaHariIni: number;
}

export default function DashboardPage() {
  const { data, isPending, isError, refetch } = useQuery<{ data: RingkasanData }>({
    queryKey: ['ringkasan'],
    queryFn: async () => (await api.get('/dashboard/ringkasan')).data,
    retry: false,
  });

  const ringkasan = data?.data ?? {
    totalSiswa: 0,
    totalGuru: 0,
    totalRombel: 0,
    hadirHariIni: 0,
    alpaHariIni: 0,
  };

  const totalCatat = ringkasan.hadirHariIni + ringkasan.alpaHariIni;
  const persenHadir = totalCatat > 0 ? Math.round((ringkasan.hadirHariIni / totalCatat) * 100) : 100;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Ringkasan Eksekutif Sekolah</h1>
          <p>Pantauan operasional kesiswaan, rombel belajar, dan rekapitulasi presensi harian SMP Negeri.</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => refetch()}
            title="Perbarui angka terbaru dari server"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            <span>Segarkan Data</span>
          </button>
          <Link href="/absensi-siswa" className="btn btn-primary btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span>Monitoring Absensi</span>
          </Link>
        </div>
      </div>

      {isError && (
        <div className="alert alert-warning" style={{ marginBottom: 24 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div style={{ flex: 1 }}>
            <strong>Server Backend Belum Terhubung:</strong> Menggunakan data cache lokal. Pastikan server API aktif di port 3001.
          </div>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => refetch()}>
            Coba Lagi
          </button>
        </div>
      )}

      {isPending ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ display: 'inline-block', width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <p style={{ fontWeight: 600 }}>Memuat indikator ringkasan sekolah…</p>
        </div>
      ) : (
        <>
          {/* Stat Cards Grid (Data-Driven KPI) */}
          <div className="stat-grid">
            <StatCard
              label="Total Siswa Aktif"
              value={ringkasan.totalSiswa}
              subText="Terdaftar di Dapodik / Sistem"
              badgeText="Aktif"
              badgeVariant="info"
              color="indigo"
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              }
            />

            <StatCard
              label="Kehadiran Hari Ini"
              value={`${persenHadir}%`}
              subText={`${ringkasan.hadirHariIni} siswa hadir tercatat`}
              badgeText={persenHadir >= 90 ? 'Sangat Baik' : 'Perhatian'}
              badgeVariant={persenHadir >= 90 ? 'success' : 'warning'}
              color="emerald"
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              }
            />

            <StatCard
              label="Guru & Tenaga Pendidik"
              value={ringkasan.totalGuru}
              subText="Pengajar & Wali Kelas"
              badgeText="Lengkap"
              badgeVariant="neutral"
              color="blue"
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                </svg>
              }
            />

            <StatCard
              label="Rombongan Belajar"
              value={ringkasan.totalRombel}
              subText="Tingkat Kelas 7, 8 & 9"
              badgeText="2025/2026"
              badgeVariant="neutral"
              color="amber"
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                </svg>
              }
            />

            <StatCard
              label="Siswa Alpa Hari Ini"
              value={ringkasan.alpaHariIni}
              subText={ringkasan.alpaHariIni === 0 ? 'Nihil (Semua hadir/berizin)' : 'Tanpa keterangan resmi'}
              badgeText={ringkasan.alpaHariIni === 0 ? 'Nihil' : 'Tindak Lanjuti'}
              badgeVariant={ringkasan.alpaHariIni === 0 ? 'success' : 'danger'}
              color={ringkasan.alpaHariIni === 0 ? 'emerald' : 'rose'}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" x2="9" y1="9" y2="15" />
                  <line x1="9" x2="15" y1="9" y2="15" />
                </svg>
              }
            />
          </div>

          {/* Widgets Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
            {/* Widget 1: Monitor Kehadiran Realtime */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Rasio Kehadiran Siswa Real-Time</div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Target Kehadiran Minimum Sekolah: 95%</span>
                </div>
                <span className="badge badge-success">{persenHadir}% Tercapai</span>
              </div>
              <div className="card-body">
                {/* Visual Progress Bar */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Tingkat Partisipasi Kelas:</span>
                    <span style={{ fontWeight: 700 }}>{persenHadir}% Terpenuhi</span>
                  </div>
                  <div style={{ height: 12, background: 'var(--bg-subtle)', borderRadius: 999, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, persenHadir)}%`,
                        background: persenHadir >= 90 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #f59e0b, #d97706)',
                        borderRadius: 999,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
                  <div style={{ padding: 12, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Hadir di Kelas</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)' }}>{ringkasan.hadirHariIni} Siswa</span>
                  </div>
                  <div style={{ padding: 12, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Tanpa Keterangan</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: ringkasan.alpaHariIni > 0 ? 'var(--danger)' : 'var(--text-main)' }}>
                      {ringkasan.alpaHariIni} Siswa
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <Link href="/absensi-siswa" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                    Buka Laporan Rinci Absensi &rarr;
                  </Link>
                </div>
              </div>
            </div>

            {/* Widget 2: Aksi Cepat Administrasi (Non-IT Friendly) */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Aksi Cepat Administrasi</div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pintas tugas harian staf sekolah</span>
                </div>
                <span className="badge badge-neutral">Sering Digunakan</span>
              </div>
              <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Link
                  href="/siswa"
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', padding: 14, flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--primary)' }}>
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>Data Siswa</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>Cari & kelola data induk</span>
                </Link>

                <Link
                  href="/perizinan"
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', padding: 14, flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--warning)' }}>
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>Perizinan Siswa</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>Validasi surat sakit & izin</span>
                </Link>

                <Link
                  href="/absensi-guru"
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', padding: 14, flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--info)' }}>
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>Presensi Guru</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>Verifikasi presensi & wajah</span>
                </Link>

                <Link
                  href="/laporan"
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', padding: 14, flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--success)' }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>Cetak Rapor</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>Unduh berkas PDF & Excel</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
