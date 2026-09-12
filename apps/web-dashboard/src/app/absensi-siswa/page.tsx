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
  const [selectedGuruId, setSelectedGuruId] = useState('');

  // Fetch data guru & rombel untuk simulasi peran dan validasi otorisasi presensi
  const guru = useQuery({
    queryKey: qk.guru(''),
    queryFn: async () => (await api.get('/guru', { params: { limit: 100 } })).data,
    retry: false,
  });
  const guruList: any[] = guru.data?.data ?? [];
  const chosenGuru = guruList.find((g) => g.id === selectedGuruId);

  const rombelQuery = useQuery({
    queryKey: qk.rombel(),
    queryFn: async () => (await api.get('/rombel', { params: { limit: 100 } })).data,
    retry: false,
  });
  const rombelList: any[] = rombelQuery.data?.data ?? [];
  const selectedRombelObj = rombelList.find((r) => r.id === rombelId);

  // Periksa otorisasi: apakah admin, atau guru bersangkutan adalah wali kelas atau pengampu kelas terpilih
  const isGuruSelected = Boolean(selectedGuruId && chosenGuru);
  const isWaliKelas = Boolean(selectedRombelObj?.waliKelas?.id && chosenGuru?.id === selectedRombelObj.waliKelas.id);
  const isPengampuKelas = Boolean(chosenGuru?.rombelDiampu?.some((r: any) => r.id === rombelId));
  const isAuthorizedToCorrect = !isGuruSelected || !rombelId || isWaliKelas || isPengampuKelas;

  const mapelQuery = useQuery({
    queryKey: qk.mapel,
    queryFn: async () => (await api.get('/mapel')).data,
    retry: false,
  });
  const mapelList: any[] = mapelQuery.data?.data ?? [];
  const selectedMapelObj = mapelList.find((m) => m.id === mapelId);

  // State Koreksi Absensi & Dialog Cetak
  const [koreksiTarget, setKoreksiTarget] = useState<BarisAbsensi | null>(null);
  const [koreksiStatus, setKoreksiStatus] = useState<string>('HADIR');
  const [koreksiKeterangan, setKoreksiKeterangan] = useState<string>('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printScope, setPrintScope] = useState<'harian' | 'bulanan-rapor' | 'guru-multi'>('harian');

  // Fungsi Ekspor Presensi ke CSV / Excel
  const exportAbsensiCSV = () => {
    const dataList = (list.data?.data as BarisAbsensi[]) ?? [];
    if (dataList.length === 0) {
      toast('Tidak ada data presensi untuk diekspor', 'danger');
      return;
    }

    const headers = ['No', 'Nama Siswa', 'NISN', 'Mata Pelajaran', 'Jam Ke', 'Tanggal', 'Status Kehadiran', 'Keterangan', 'Wali Kelas'];
    const rows = dataList.map((item, idx) => {
      return [
        idx + 1,
        `"${(item.siswa?.nama ?? '').replace(/"/g, '""')}"`,
        `'${item.siswa?.nisn ?? '-'}`,
        `"${(item.mapel?.nama ?? '-').replace(/"/g, '""')}"`,
        item.jamKe ?? 1,
        item.tanggal?.slice(0, 10) ?? '-',
        item.status,
        `"${(item.keterangan ?? '-').replace(/"/g, '""')}"`,
        `"${(selectedRombelObj?.waliKelas?.nama ?? '-').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const kelasStr = selectedRombelObj?.nama ? `Kelas_${selectedRombelObj.nama}_` : '';
    link.setAttribute('download', `Rekap_Presensi_${kelasStr}${tanggal}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Data Presensi berhasil diekspor ke file Excel/CSV!', 'success');
  };



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
            className="btn btn-outline btn-sm"
            onClick={exportAbsensiCSV}
            title="Ekspor daftar presensi ke file CSV / Excel"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>📥</span>
            <span>Export Excel / CSV</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowPrintModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>🖨️</span>
            <span>Cetak Dokumen Resmi (PDF)</span>
          </button>
        </div>
      </div>

      {/* Filter Bar Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          {/* Selector Simulasi Guru / Wali Kelas */}
          <div className="form-group" style={{ margin: 0, flex: '1 1 280px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
              SIMULASI PERAN GURU / WALI KELAS
            </label>
            <select
              className="select-control"
              value={selectedGuruId}
              onChange={(e) => {
                const newGuruId = e.target.value;
                setSelectedGuruId(newGuruId);
                if (newGuruId) {
                  const g = guruList.find((item) => item.id === newGuruId);
                  if (g?.waliUntuk?.[0]?.id) {
                    setRombelId(g.waliUntuk[0].id);
                  } else if (g?.rombelDiampu?.[0]?.id) {
                    setRombelId(g.rombelDiampu[0].id);
                  }
                  if (g?.mapelDiampu?.[0]?.mapel?.id) {
                    setMapelId(g.mapelDiampu[0].mapel.id);
                  }
                }
              }}
              style={{ fontWeight: 600 }}
            >
              <option value="">👑 Mode Admin / Kurikulum (Akses Penuh Semua Kelas)</option>
              <optgroup label="Pilih Guru / Wali Kelas (Sesuai SK)">
                {guruList.map((g) => {
                  const wali = (g.waliUntuk ?? []).map((w: any) => `Wali ${w.nama}`).join(', ');
                  const mapels = (g.mapelDiampu ?? []).map((m: any) => m.mapel?.nama).join(', ') || 'Mapel';
                  return (
                    <option key={g.id} value={g.id}>
                      {g.nama} {wali ? `[★ ${wali}]` : `(${mapels})`}
                    </option>
                  );
                })}
              </optgroup>
            </select>
          </div>

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
                setSelectedGuruId('');
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

        {/* Dynamic RBAC Authorization Status Alert */}
        <div style={{ marginTop: 16 }}>
          {isGuruSelected ? (
            isAuthorizedToCorrect ? (
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 6,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '0.8125rem',
                  color: '#15803d',
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>✅</span>
                <div>
                  <strong>Otorisasi Presensi Sah:</strong> Anda bertindak sebagai <strong>{chosenGuru?.nama}</strong>{' '}
                  {isWaliKelas ? (
                    <span>(selaku <strong>Wali Kelas {selectedRombelObj?.nama}</strong>)</span>
                  ) : (
                    <span>(selaku Guru Pengampu Kelas)</span>
                  )}. Anda berwenang memantau dan mengoreksi presensi kelas ini.
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 6,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '0.8125rem',
                  color: '#b91c1c',
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>🔒</span>
                <div>
                  <strong>Akses Dibatasi:</strong> <strong>{chosenGuru?.nama}</strong> bukan Wali Kelas maupun Guru Pengampu untuk kelas {selectedRombelObj?.nama || 'terpilih'}. Tindakan koreksi presensi dinonaktifkan.
                </div>
              </div>
            )
          ) : (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>👑</span>
              <span>
                <strong>Mode Administrator:</strong> Anda memiliki otorisasi penuh untuk memantau dan mengoreksi presensi seluruh siswa di 22 rombel.
                {selectedRombelObj?.waliKelas && (
                  <span style={{ marginLeft: 8, color: 'var(--primary)', fontWeight: 600 }}>
                    (Wali Kelas {selectedRombelObj.nama}: {selectedRombelObj.waliKelas.nama})
                  </span>
                )}
              </span>
            </div>
          )}
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
          <div>
            {/* Header Kop Surat Resmi (Hanya Muncul Saat Cetak/Print) */}
            <div className="print-only" style={{ marginBottom: 16, textAlign: 'center', fontFamily: 'serif' }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                Pemerintah Kabupaten / Kota — Dinas Pendidikan
              </div>
              <div style={{ fontSize: 17, fontWeight: 900, marginTop: 2 }}>
                SEKOLAH MENENGAH PERTAMA NEGERI (SMP NEGERI)
              </div>
              <div style={{ fontSize: 10, color: '#333' }}>
                Jalan Pendidikan No. 1 — Telepon (021) 12345678 — NPSN: 20299881 — Akreditasi A
              </div>
              <div style={{ borderBottom: '3px double #000', margin: '8px 0 12px' }} />

              <div style={{ fontSize: 13, fontWeight: 800, textDecoration: 'underline' }}>
                LEMBAR REKAPITULASI PRESENSI &amp; KEHADIRAN SISWA
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>
                Tanggal Pelaksanaan : {new Date(tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>

              {/* Kotak Metadata Informasi Cetak */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  marginTop: 10,
                  textAlign: 'left',
                  border: '1px solid #999',
                  padding: '6px 12px',
                  background: '#fafafa',
                }}
              >
                <div>
                  <div><strong>Kelas / Rombel:</strong> {selectedRombelObj?.nama ? `Kelas ${selectedRombelObj.nama}` : 'Semua Rombel Terpilih'}</div>
                  <div><strong>Mata Pelajaran:</strong> {selectedMapelObj?.nama || 'Seluruh Mata Pelajaran (Harian)'}</div>
                  <div><strong>Total Siswa Tercatat:</strong> {(list.data?.data as BarisAbsensi[])?.length ?? 0} siswa</div>
                </div>
                <div>
                  <div><strong>Wali Kelas:</strong> {selectedRombelObj?.waliKelas?.nama || '-'}</div>
                  <div><strong>NIP Wali Kelas:</strong> {selectedRombelObj?.waliKelas?.nip || '-'}</div>
                  <div><strong>Guru Pengampu:</strong> {chosenGuru?.nama || 'Tim Guru SMP Negeri'}</div>
                </div>
              </div>
            </div>

            <div className="data-table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>Siswa</th>
                    <th>Mata Pelajaran</th>
                    <th style={{ textAlign: 'center' }}>Jam Ke-</th>
                    <th>Tanggal</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th className="no-print" style={{ textAlign: 'center', width: 100 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(list.data!.data as BarisAbsensi[]).map((b) => (
                    <tr key={b.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            className="no-print"
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
                      <td className="no-print" style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          disabled={!isAuthorizedToCorrect}
                          className={`btn btn-secondary btn-sm ${!isAuthorizedToCorrect ? 'disabled' : ''}`}
                          style={{
                            fontSize: 12,
                            padding: '4px 8px',
                            opacity: isAuthorizedToCorrect ? 1 : 0.5,
                            cursor: isAuthorizedToCorrect ? 'pointer' : 'not-allowed',
                          }}
                          onClick={() => {
                            if (!isAuthorizedToCorrect) return;
                            bukaModalKoreksi(b);
                          }}
                          title={
                            isAuthorizedToCorrect
                              ? 'Koreksi Status Presensi Siswa'
                              : `Akses Terkunci: ${chosenGuru?.nama} bukan Wali Kelas atau Pengampu kelas ${selectedRombelObj?.nama || ''}`
                          }
                        >
                          {isAuthorizedToCorrect ? 'Koreksi' : '🔒 Terkunci'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Lembar Pengesahan Tanda Tangan Ganda Resmi (Print Only) */}
            <div className="print-only" style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between', fontFamily: 'serif', fontSize: 11, lineHeight: 1.5 }}>
              <div style={{ width: 240, textAlign: 'center' }}>
                <div>Mengetahui,</div>
                <div style={{ fontWeight: 700 }}>Kepala SMP Negeri</div>
                <div style={{ height: 50 }} />
                <div style={{ fontWeight: 900, textDecoration: 'underline' }}>Dra. JUWARIYAH, M.Pd</div>
                <div>NIP. 19680512 199412 2 001</div>
              </div>
              <div style={{ width: 260, textAlign: 'center' }}>
                <div>Ditetapkan di Kota, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <div style={{ fontWeight: 700 }}>
                  {isWaliKelas ? `Wali Kelas ${selectedRombelObj?.nama || ''}` : isGuruSelected ? 'Guru Pengampu' : 'Wali Kelas / Guru Pengampu'}
                </div>
                <div style={{ height: 50 }} />
                <div style={{ fontWeight: 900, textDecoration: 'underline' }}>
                  {chosenGuru?.nama || selectedRombelObj?.waliKelas?.nama || '.............................................'}
                </div>
                <div>NIP. {chosenGuru?.nip || selectedRombelObj?.waliKelas?.nip || '...................................'}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Dialog Opsi Cetak Laporan Presensi Resmi */}
      {showPrintModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowPrintModal(false)}
          title="Cetak Dokumen Resmi Presensi Siswa"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Pilih cakupan dan format cetak dokumen presensi siswa sesuai kebutuhan laporan operasional sekolah.
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, background: 'var(--bg-subtle)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-main)' }}>
                INFORMASI DOKUMEN CETAK:
              </div>
              <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><strong>Kelas:</strong> {selectedRombelObj?.nama ? `Kelas ${selectedRombelObj.nama}` : 'Semua Rombel Terpilih'}</div>
                <div><strong>Mata Pelajaran:</strong> {selectedMapelObj?.nama || 'Seluruh Mata Pelajaran'}</div>
                <div><strong>Tanggal Presensi:</strong> {tanggal}</div>
                <div><strong>Wali Kelas:</strong> {selectedRombelObj?.waliKelas?.nama || '-'}</div>
                <div><strong>Guru / Akun Aktif:</strong> {chosenGuru?.nama || 'Administrator'}</div>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
                LINGKUP REKAPITULASI CETAK
              </label>
              <select
                className="select"
                value={printScope}
                onChange={(e) => setPrintScope(e.target.value as any)}
              >
                <option value="harian">
                  📄 Rekap Harian Kelas &amp; Mapel Aktif ({selectedRombelObj?.nama ? `Kelas ${selectedRombelObj.nama}` : 'Terfilter'})
                </option>
                <option value="bulanan-rapor">
                  📊 Format Baku Rekapitulasi Rapor Wali Kelas (Akumulasi H/I/S/A &amp; % Kehadiran)
                </option>
                <option value="guru-multi">
                  📑 Jurnal Mengajar Seluruh Kelas Guru Ini ({chosenGuru?.nama || 'Guru Terpilih'})
                </option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPrintModal(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowPrintModal(false);
                  exportAbsensiCSV();
                }}
              >
                <span>📥 Unduh Excel / CSV</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowPrintModal(false);
                  setTimeout(() => {
                    window.print();
                  }, 300);
                }}
              >
                <span>🖨️ Mulai Cetak (PDF / Kertas)</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

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
