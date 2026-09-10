import type { Metadata } from 'next';
import { Providers } from '@/lib/providers';

export const metadata: Metadata = {
  title: 'SMS SMP Negeri — Dashboard',
  description: 'Web dashboard Admin & Kepala Sekolah',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
