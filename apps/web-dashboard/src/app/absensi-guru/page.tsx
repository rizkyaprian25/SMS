'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { pesanError } from '@/components/import-siswa';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';

interface BarisPresensiGuru {
  id: string;
  tanggal: string;
  jamMasuk: string | null;
  jamPulang: string | null;
  metode: string;
  statusVerifikasi: string;
  diLuarArea: boolean;
  terlambatMenit: number | null;
  guru: { id?: string; nama: string; nip?: string };
}

export default function AbsensiGuruPage() {
  const qc = useQueryClient();
  const hariIni = new Date().toISOString().slice(0, 10);
  const [dari, setDari] = useState(hariIni);
  const [sampai, setSampai] = useState(hariIni);

  // State untuk modal konfirmasi verifikasi
  const [targetVerif, setTargetVerif] = useState<{
    id: string;
    namaGuru: string;
    putusan: 'SETUJU' | 'TOLAK';
  } | null>(null);

  const q = useQuery<{ data: BarisPresensiGuru[] }>({
    queryKey: qk.absensiGuru(dari, sampai),
    queryFn: async () =>
      (await api.get('/absensi-guru/rekap', { params: { dari, sampai } })).data,
    retry: false,
  });

  const verif = useMutation({
    mutationFn: async (v: { id: string; putusan: string }) =>
      (await api.post(`/absensi-guru/${v.id}/verifikasi`, { putusan: v.putusan })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['absensi-guru'] });
      setTargetVerif(null);
    },
  });

  const jam = (iso: string | null) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    } catch {
      return iso;
    }
  };

  const getInitials = (nama: string) => {
    return (
      nama
        ?.split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase() || 'G'
    );
  };

  // Kalkulasi statistik
  const list = q.data?.data ?? [];
  const totalPresensi = list.length;
  const tepatWaktu = list.filter((b) => (b.terlambatMenit ?? 0) <= 0 && b.jamMasuk).length;
  const terlambat = list.filter((b) => (b.terlambatMenit ?? 0) > 0).length;
  const butuhVerifikasi = list.filter((b) => b.statusVerifikasi === 'PENDING').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
          Presensi &amp; Kehadiran Guru
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4, margin: 0 }}>
          Rekap kehadiran jam masuk/pulang, verifikasi presensi fallback manual, dan deteksi keterlambatan guru.
        </p>
      </div>

      {/* Filter Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0, flex: '1 1 180px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
              DARI TANGGAL
            </label>
            <input
              type="date"
              className="input-control"
              value={dari}
              onChange={(e) => setDari(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0, flex: '1 1 180px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
              SAMPAI TANGGAL
            </label>
            <input
              type="date"
              className="input-control"
              value={sampai}
              onChange={(e) => setSampai(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setDari(hariIni);
                setSampai(hariIni);
              }}
            >
              Hari Ini
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                const past7 = new Date();
                past7.setDate(past7.getDate() - 7);
                setDari(past7.toISOString().slice(0, 10));
                setSampai(hariIni);
              }}
            >
              7 Hari Terakhir
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard
          title="Total Presensi"
          value={q.isPending ? '...' : String(totalPresensi)}
          subtitle="Tercatat di sistem"
          icon="📋"
          colorVariant="primary"
        />
        <StatCard
          title="Tepat Waktu"
          value={q.isPending ? '...' : String(tepatWaktu)}
          subtitle="Sebelum jam batas sekolah"
          icon="🕒"
          colorVariant="success"
        />
        <StatCard
          title="Terlambat"
          value={q.isPending ? '...' : String(terlambat)}
          subtitle="Tercatat menit keterlambatan"
          icon="⏳"
          colorVariant="danger"
        />
        <StatCard
          title="Menunggu Verifikasi"
          value={q.isPending ? '...' : String(butuhVerifikasi)}
          subtitle="Pengajuan fallback manual"
          icon="⚠️"
          colorVariant="warning"
        />
      </div>

      {/* Data Table Card */}
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
            Daftar Presensi Guru ({dari === sampai ? dari : `${dari} s/d ${sampai}`})
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Menampilkan {list.length} catatan
          </div>
        </div>

        {q.isPending ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⏳</div>
            Memuat data presensi guru...
          </div>
        ) : q.isError ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--danger)' }}>
            Gagal memuat catatan presensi guru.
          </div>
        ) : list.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>👨‍🏫</div>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.125rem' }}>
              Belum ada presensi guru
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
              Tidak ada data presensi pada rentang tanggal yang dipilih.
            </p>
          </div>
        ) : (
          <div className="data-table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Guru</th>
                  <th>Tanggal</th>
                  <th>Jam Masuk</th>
                  <th>Jam Pulang</th>
                  <th>Keterlambatan</th>
                  <th>Metode</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Aksi Verifikasi</th>
                </tr>
              </thead>
              <tbody>
                {list.map((b) => {
                  const isLate = (b.terlambatMenit ?? 0) > 0;
                  return (
                    <tr key={b.id}>
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
                            {getInitials(b.guru.nama)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                              {b.guru.nama}
                            </div>
                            {b.diLuarArea && (
                              <Badge variant="danger" style={{ fontSize: '0.6875rem', marginTop: 2 }}>
                                Di Luar Area Sekolah
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {b.tanggal.slice(0, 10)}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {jam(b.jamMasuk)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>
                          {jam(b.jamPulang)}
                        </span>
                      </td>
                      <td>
                        {b.terlambatMenit === null || !b.jamMasuk ? (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        ) : isLate ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 6,
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                            }}
                          >
                            +{b.terlambatMenit} mnt
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 6,
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          >
                            Tepat Waktu
                          </span>
                        )}
                      </td>
                      <td>
                        <Badge variant={b.metode === 'FACE' ? 'primary' : 'warning'}>
                          {b.metode}
                        </Badge>
                      </td>
                      <td>
                        <Badge
                          variant={
                            b.statusVerifikasi === 'APPROVED' || b.statusVerifikasi === 'SETUJU'
                              ? 'success'
                              : b.statusVerifikasi === 'PENDING'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {b.statusVerifikasi}
                        </Badge>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {b.statusVerifikasi === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              onClick={() =>
                                setTargetVerif({
                                  id: b.id,
                                  namaGuru: b.guru.nama,
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
                                setTargetVerif({
                                  id: b.id,
                                  namaGuru: b.guru.nama,
                                  putusan: 'TOLAK',
                                })
                              }
                            >
                              Tolak
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Tervalidasi
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Verifikasi */}
      {targetVerif && (
        <Modal
          title={`Konfirmasi Verifikasi Presensi`}
          onClose={() => setTargetVerif(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-main)' }}>
              Apakah Anda yakin ingin{' '}
              <b>{targetVerif.putusan === 'SETUJU' ? 'menyetujui' : 'menolak'}</b> presensi manual
              untuk <b>{targetVerif.namaGuru}</b>?
            </p>

            {verif.isError && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: 8,
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  fontSize: '0.875rem',
                }}
              >
                {pesanError(verif.error)}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setTargetVerif(null)}
                disabled={verif.isPending}
              >
                Batal
              </button>
              <button
                type="button"
                className={`btn ${
                  targetVerif.putusan === 'SETUJU' ? 'btn-success' : 'btn-danger'
                }`}
                disabled={verif.isPending}
                onClick={() =>
                  verif.mutate({
                    id: targetVerif.id,
                    putusan: targetVerif.putusan,
                  })
                }
              >
                {verif.isPending
                  ? 'Menyimpan...'
                  : targetVerif.putusan === 'SETUJU'
                  ? 'Ya, Setujui'
                  : 'Ya, Tolak'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
