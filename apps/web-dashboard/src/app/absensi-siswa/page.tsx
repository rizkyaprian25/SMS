'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { MapelSelect, RombelSelect } from '@/components/selects';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

const hariIni = () => new Date().toISOString().slice(0, 10);

interface BarisAbsensi {
  id: string;
  tanggal: string;
  jamKe: number;
  status: 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPA' | string;
  keterangan?: string | null;
  siswa: { id?: string; nama: string; nisn?: string };
  mapel: { id?: string; nama: string };
}

interface RekapStatus {
  status: string;
  jumlah: number;
}

export default function AbsensiSiswaPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [rombelId, setRombelId] = useState('');
  const [mapelId, setMapelId] = useState('');
  const [tanggal, setTanggal] = useState(hariIni());
  const [status, setStatus] = useState('');

  // State Koreksi Absensi
  const [koreksiTarget, setKoreksiTarget] = useState<BarisAbsensi | null>(null);
  const [koreksiStatus, setKoreksiStatus] = useState<string>('HADIR');
  const [koreksiKeterangan, setKoreksiKeterangan] = useState<string>('');

  const rekap = useQuery<{ data: RekapStatus[] }>({
    queryKey: qk.absensiRekap({ rombelId, mapelId, tanggal }),
    queryFn: async () =>
      (
        await api.get('/absensi/rekap', {
          params: {
            rombelId: rombelId || undefined,
            mapelId: mapelId || undefined,
            dari: tanggal,
            sampai: tanggal,
          },
        })
      ).data,
    retry: false,
  });

  const list = useQuery<{ data: BarisAbsensi[]; meta?: { total: number } }>({
    queryKey: qk.absensi(rombelId, mapelId, tanggal, status, 1),
    queryFn: async () =>
      (
        await api.get('/absensi', {
          params: {
            rombelId: rombelId || undefined,
            mapelId: mapelId || undefined,
            tanggal,
            status: status || undefined,
            limit: 100,
          },
        })
      ).data,
    retry: false,
  });

  const koreksiMutasi = useMutation({
    mutationFn: async (payload: { id: string; status: string; keterangan?: string }) =>
      (
        await api.patch(`/absensi/${payload.id}`, {
          status: payload.status,
          keterangan: payload.keterangan || undefined,
        })
      ).data,
    onSuccess: () => {
      toast('Status kehadiran siswa berhasil dikoreksi!', 'success');
      qc.invalidateQueries({ queryKey: ['absensi'] });
      qc.invalidateQueries({ queryKey: ['absensi-rekap'] });
      setKoreksiTarget(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Gagal memperbarui status absensi';
      toast(Array.isArray(msg) ? msg.join(', ') : msg, 'danger');
    },
  });

  // Hitung jumlah per status dari data rekap
  const rekapMap: Record<string, number> = {};
  if (rekap.data?.data) {
    for (const r of rekap.data.data) {
      rekapMap[r.status] = r.jumlah;
    }
  }

  const getStatusVariant = (st: string) => {
    switch (st) {
      case 'HADIR':
        return 'success';
      case 'IZIN':
        return 'warning';
      case 'SAKIT':
        return 'info';
      case 'ALPA':
        return 'danger';
      default:
        return 'neutral';
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

  function bukaModalKoreksi(b: BarisAbsensi) {
    setKoreksiTarget(b);
    setKoreksiStatus(b.status);
    setKoreksiKeterangan(b.keterangan ?? '');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Monitoring Absensi Siswa
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4, margin: 0 }}>
            Pantau kehadiran siswa per kelas, mata pelajaran, dan tanggal secara real-time.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => window.print()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect width="12" height="8" x="6" y="14" />
            </svg>
            Cetak Rekap Harian
          </button>
        </div>
      </div>

      {/* Filter Bar Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
              PILIH ROMBEL / KELAS
            </label>
            <RombelSelect value={rombelId} onChange={setRombelId} />
          </div>

          <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
              MATA PELAJARAN
            </label>
            <MapelSelect value={mapelId} onChange={setMapelId} />
          </div>

          <div className="form-group" style={{ margin: 0, flex: '1 1 160px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
              TANGGAL
            </label>
            <input
              type="date"
              className="input-control"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0, flex: '1 1 160px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
              STATUS KEHADIRAN
            </label>
            <select
              className="select-control"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="HADIR">Hadir</option>
              <option value="IZIN">Izin</option>
              <option value="SAKIT">Sakit</option>
              <option value="ALPA">Alpa / Tanpa Keterangan</option>
            </select>
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setRombelId('');
                setMapelId('');
                setTanggal(hariIni());
                setStatus('');
              }}
              title="Reset Filter"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Ringkasan Rekap Harian */}
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 12 }}>
          Ringkasan Kehadiran ({tanggal})
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <StatCard
            title="Siswa Hadir"
            value={rekap.isPending ? '...' : String(rekapMap['HADIR'] ?? 0)}
            subtitle="Tercatat di kelas"
            icon="✅"
            colorVariant="success"
          />
          <StatCard
            title="Siswa Izin"
            value={rekap.isPending ? '...' : String(rekapMap['IZIN'] ?? 0)}
            subtitle="Surat keterangan"
            icon="📝"
            colorVariant="warning"
          />
          <StatCard
            title="Siswa Sakit"
            value={rekap.isPending ? '...' : String(rekapMap['SAKIT'] ?? 0)}
            subtitle="Surat dokter / sakit"
            icon="🏥"
            colorVariant="primary"
          />
          <StatCard
            title="Alpa / Tanpa Keterangan"
            value={rekap.isPending ? '...' : String(rekapMap['ALPA'] ?? 0)}
            subtitle="Perlu tindak lanjut BK"
            icon="⚠️"
            colorVariant="danger"
          />
        </div>
      </div>

      {/* Data Table */}
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
            Daftar Kehadiran Siswa
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Menampilkan {list.data?.data?.length ?? 0} data
          </div>
        </div>

        {list.isPending ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⏳</div>
            Memuat catatan absensi siswa...
          </div>
        ) : list.isError ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--danger)' }}>
            Gagal memuat catatan absensi. Pastikan server aktif.
          </div>
        ) : (list.data?.data?.length ?? 0) === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.125rem' }}>
              Tidak ada data absensi
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
              Belum ada absensi yang tercatat untuk filter rombel, mapel, atau tanggal ini.
            </p>
          </div>
        ) : (
          <div className="data-table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '35%' }}>Siswa</th>
                  <th>Mata Pelajaran</th>
                  <th style={{ textAlign: 'center' }}>Jam Ke-</th>
                  <th>Tanggal</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center', width: 100 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(list.data!.data as BarisAbsensi[]).map((b) => (
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
                          {getInitials(b.siswa.nama)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {b.siswa.nama}
                          </div>
                          {b.siswa.nisn && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              NISN: {b.siswa.nisn}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                        {b.mapel?.nama || '-'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 6,
                          backgroundColor: '#f1f5f9',
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          color: '#475569',
                        }}
                      >
                        Ke-{b.jamKe}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {b.tanggal.slice(0, 10)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Badge variant={getStatusVariant(b.status)}>{b.status}</Badge>
                      {b.keterangan && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {b.keterangan}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 12, padding: '4px 8px' }}
                        onClick={() => bukaModalKoreksi(b)}
                        title="Koreksi Status Presensi"
                      >
                        Koreksi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Koreksi Status Absensi */}
      {koreksiTarget && (
        <Modal
          isOpen={true}
          onClose={() => setKoreksiTarget(null)}
          title={`Koreksi Status Absensi: ${koreksiTarget.siswa.nama}`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              koreksiMutasi.mutate({
                id: koreksiTarget.id,
                status: koreksiStatus,
                keterangan: koreksiKeterangan,
              });
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              <div><strong>Mata Pelajaran:</strong> {koreksiTarget.mapel?.nama || '-'}</div>
              <div><strong>Jam Pelajaran:</strong> Ke-{koreksiTarget.jamKe} ({koreksiTarget.tanggal.slice(0, 10)})</div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
                STATUS KEHADIRAN BARU
              </label>
              <select
                className="select"
                value={koreksiStatus}
                onChange={(e) => setKoreksiStatus(e.target.value)}
                required
              >
                <option value="HADIR">HADIR — Siswa berada di kelas</option>
                <option value="IZIN">IZIN — Ada surat / izin resmi</option>
                <option value="SAKIT">SAKIT — Ada surat dokter / sakit</option>
                <option value="ALPA">ALPA — Tanpa keterangan</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
                CATATAN / KETERANGAN KOREKSI (OPSIONAL)
              </label>
              <input
                className="input"
                value={koreksiKeterangan}
                onChange={(e) => setKoreksiKeterangan(e.target.value)}
                placeholder="Contoh: Surat keterangan dokter susulan"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setKoreksiTarget(null)}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={koreksiMutasi.isPending}
              >
                {koreksiMutasi.isPending ? 'Menyimpan…' : 'Simpan Koreksi'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
