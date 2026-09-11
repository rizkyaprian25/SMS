'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unduhFile } from '@/lib/api';

interface SiswaItem {
  id: string;
  nama: string;
  nisn?: string;
  rombel?: { nama: string } | null;
}

export default function LaporanPage() {
  const [siswaQ, setSiswaQ] = useState('');
  const [semester, setSemester] = useState('GANJIL');
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

  const cari = useQuery<{ data: SiswaItem[] }>({
    queryKey: ['siswa-cari-laporan', siswaQ],
    queryFn: async () => (await api.get('/siswa', { params: { q: siswaQ, limit: 10 } })).data,
    enabled: siswaQ.length >= 2,
    retry: false,
  });

  const unduh = async (url: string, params?: Record<string, string>) => {
    try {
      setDownloadingUrl(url);
      await unduhFile(url, params);
    } catch {
      alert('Gagal mengunduh berkas. Pastikan Anda memiliki hak akses dan server aktif.');
    } finally {
      setDownloadingUrl(null);
    }
  };

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
          Pusat Unduhan &amp; Laporan Sekolah
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4, margin: 0 }}>
          Ekspor rekapitulasi data absensi dan nilai akademik ke format Microsoft Excel (.xlsx), serta cetak dokumen rapor resmi (.pdf) per siswa.
        </p>
      </div>

      {/* Grid Menu Laporan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
        {/* Kartu 1: Rekapitulasi Excel */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: '#dcfce7',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                flexShrink: 0,
              }}
            >
              📊
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Rekap Data Excel (.xlsx)
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2, margin: 0 }}>
                Laporan agregat terstruktur untuk arsip tata usaha dan kurikulum.
              </p>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
              PILIH SEMESTER ACUAN
            </label>
            <select
              className="select-control"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            >
              <option value="GANJIL">Semester Ganjil</option>
              <option value="GENAP">Semester Genap</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                borderRadius: 8,
                backgroundColor: '#f8fafc',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                  Rekapitulasi Absensi Siswa
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Total Hadir, Izin, Sakit, Alpa per siswa &amp; kelas
                </div>
              </div>
              <button
                type="button"
                className="btn btn-success btn-sm"
                disabled={downloadingUrl === '/reports/absensi.xlsx'}
                onClick={() => unduh('/reports/absensi.xlsx')}
              >
                {downloadingUrl === '/reports/absensi.xlsx' ? 'Mengunduh...' : '📥 Unduh Excel'}
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                borderRadius: 8,
                backgroundColor: '#f8fafc',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                  Rekapitulasi Nilai Siswa
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Formatif, tugas, UTS, UAS ({semester})
                </div>
              </div>
              <button
                type="button"
                className="btn btn-success btn-sm"
                disabled={downloadingUrl === '/reports/nilai.xlsx'}
                onClick={() => unduh('/reports/nilai.xlsx', { semester })}
              >
                {downloadingUrl === '/reports/nilai.xlsx' ? 'Mengunduh...' : '📥 Unduh Excel'}
              </button>
            </div>
          </div>
        </div>

        {/* Kartu 2: Cetak Rapor PDF */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                flexShrink: 0,
              }}
            >
              📄
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Cetak Rapor Siswa (.pdf)
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2, margin: 0 }}>
                Dokumen resmi hasil belajar peserta didik siap cetak dan tandatangan.
              </p>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
              CARI NAMA SISWA
            </label>
            <input
              type="text"
              className="input-control"
              value={siswaQ}
              onChange={(e) => setSiswaQ(e.target.value)}
              placeholder="Ketik minimal 2 huruf nama siswa..."
            />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              maxHeight: 280,
              overflowY: 'auto',
            }}
          >
            {siswaQ.length < 2 ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                }}
              >
                🔍 Masukkan nama siswa pada kolom pencarian di atas.
              </div>
            ) : cari.isPending ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                }}
              >
                Mencari data siswa...
              </div>
            ) : (cari.data?.data?.length ?? 0) === 0 ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                }}
              >
                Tidak ditemukan siswa dengan nama tersebut.
              </div>
            ) : (
              cari.data!.data.map((s) => {
                const raporUrl = `/rapor/${s.id}.pdf`;
                const isDownloadingThis = downloadingUrl === raporUrl;
                return (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      borderRadius: 8,
                      backgroundColor: '#f8fafc',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: '#e0e7ff',
                          color: '#4338ca',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        {getInitials(s.nama)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                          {s.nama}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {s.rombel?.nama ? `Kelas ${s.rombel.nama}` : 'Belum ada rombel'}{' '}
                          {s.nisn ? `• NISN: ${s.nisn}` : ''}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={isDownloadingThis}
                      onClick={() => unduh(raporUrl, { semester })}
                      style={{ color: '#b91c1c', borderColor: '#fca5a5' }}
                    >
                      {isDownloadingThis ? 'Memproses...' : '🖨️ Cetak PDF'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
