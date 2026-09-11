import type { Metadata } from 'next';
import { Providers } from '@/lib/providers';

export const metadata: Metadata = {
  title: 'SMS SMP Negeri — Dashboard',
  description: 'Web dashboard Admin & Kepala Sekolah',
};

const NAV: [string, string][] = [
  ['/', 'Ringkasan'],
  ['/siswa', 'Siswa'],
  ['/rombel', 'Rombel'],
  ['/guru', 'Guru'],
  ['/jadwal', 'Jadwal'],
  ['/absensi-siswa', 'Absensi'],
  ['/absensi-guru', 'Presensi Guru'],
  ['/nilai', 'Nilai'],
  ['/perizinan', 'Izin'],
  ['/pengumuman', 'Info'],
  ['/pelanggaran', 'BK'],
  ['/laporan', 'Laporan'],
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <Providers>
          <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '8px 24px', background: '#eee' }}>
            {NAV.map(([href, label]) => (
              <a key={href} href={href}>{label}</a>
            ))}
          </nav>
          {children}
        </Providers>
      </body>
    </html>
  );
}
