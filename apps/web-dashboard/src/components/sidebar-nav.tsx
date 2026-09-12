'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { setAccessToken } from '@/lib/api';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const MENU_UTAMA: NavItem[] = [
  {
    href: '/',
    label: 'Ringkasan Eksekutif',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    href: '/siswa',
    label: 'Data Siswa & Induk',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/rombel',
    label: 'Rombongan Belajar',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
  {
    href: '/guru',
    label: 'Data Guru & Mapel',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
        <path d="M6 6h10" />
        <path d="M6 10h10" />
      </svg>
    ),
  },
  {
    href: '/jadwal',
    label: 'Jadwal Pelajaran',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    ),
  },
];

const MENU_AKADEMIK: NavItem[] = [
  {
    href: '/absensi-siswa',
    label: 'Monitoring Absensi',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    href: '/absensi-guru',
    label: 'Presensi Guru & Wajah',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    href: '/nilai',
    label: 'Nilai Akademik & Raport',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" x2="18" y1="20" y2="10" />
        <line x1="12" x2="12" y1="20" y2="4" />
        <line x1="6" x2="6" y1="20" y2="14" />
      </svg>
    ),
  },
  {
    href: '/perizinan',
    label: 'Persetujuan Izin Siswa',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
];

const MENU_KESISWAAN: NavItem[] = [
  {
    href: '/pengumuman',
    label: 'Papan Pengumuman',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 11 18-5v12L3 14v-3z" />
        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
      </svg>
    ),
  },
  {
    href: '/pelanggaran',
    label: 'Buku Kasus & BK',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" x2="12" y1="9" y2="13" />
        <line x1="12" x2="12.01" y1="17" y2="17" />
      </svg>
    ),
  },
  {
    href: '/laporan',
    label: 'Pusat Unduhan & Cetak',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" />
        <line x1="16" x2="8" y1="17" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
];

const MENU_PENGATURAN: NavItem[] = [
  {
    href: '/pengguna',
    label: 'Kelola Akun (RBAC)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/tahun-ajaran',
    label: 'Tahun Ajaran & Semester',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 14 14" />
      </svg>
    ),
  },
  {
    href: '/audit-log',
    label: 'Audit Trail Sistem',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
];

export interface SidebarNavProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function SidebarNav({ isOpen, onClose }: SidebarNavProps) {
  const pathname = usePathname();

  function renderLinks(items: NavItem[]) {
    return items.map((item) => {
      const isActive = pathname === item.href;
      return (
        <Link
          key={item.href}
          href={item.href}
          className={`sidebar-link ${isActive ? 'active' : ''}`}
          onClick={() => {
            if (onClose) onClose();
          }}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      );
    });
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand-group">
          <div className="sidebar-logo">SMS</div>
          <div className="sidebar-brand">
            <h2>SMP Negeri</h2>
            <p>Sistem Informasi Sekolah</p>
          </div>
        </div>

        {/* Tombol Tutup Khusus Mobile/Tablet */}
        <button
          type="button"
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Tutup menu navigasi"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Manajemen Data</span>
        {renderLinks(MENU_UTAMA)}

        <span className="sidebar-section-label" style={{ marginTop: 14 }}>
          Akademik & Presensi
        </span>
        {renderLinks(MENU_AKADEMIK)}

        <span className="sidebar-section-label" style={{ marginTop: 14 }}>
          Kesiswaan & Dokumen
        </span>
        {renderLinks(MENU_KESISWAAN)}

        <span className="sidebar-section-label" style={{ marginTop: 14 }}>
          Pengaturan & Audit
        </span>
        {renderLinks(MENU_PENGATURAN)}
      </nav>

      <div className="sidebar-footer">
        <div>
          <p style={{ fontWeight: 600, color: '#94a3b8' }}>SMS SMP Negeri</p>
          <p style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>Tahun Ajaran 2025/2026</p>
        </div>
        <span className="badge badge-success" style={{ fontSize: 10, padding: '2px 6px' }}>
          <span className="badge-dot" /> Online
        </span>
      </div>
    </aside>
  );
}

export interface TopbarProps {
  onToggleMobileNav?: () => void;
}

export function Topbar({ onToggleMobileNav }: TopbarProps) {
  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Tombol Hamburger di Layar < 1024px */}
        <button
          type="button"
          className="topbar-menu-btn"
          onClick={onToggleMobileNav}
          aria-label="Buka menu navigasi"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Tanggal Hari Ini */}
        <div className="topbar-date-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
          <span>{today}</span>
        </div>
      </div>

      <div className="topbar-actions">
        {/* Status Peran Admin (Non-IT Friendly) */}
        <div className="topbar-badge-role">
          <div className="topbar-avatar">A</div>
          <span>Admin Tata Usaha</span>
        </div>

        {/* Tombol Keluar / Logout */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setAccessToken(null);
            window.location.href = '/login';
          }}
          title="Keluar dari sesi dashboard"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
          </svg>
          <span>Keluar</span>
        </button>
      </div>
    </header>
  );
}
