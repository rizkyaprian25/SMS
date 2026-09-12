'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { pesanError } from '@/components/import-siswa';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

const HARI = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

interface Jadwal {
  id: string;
  hari: string;
  jamKe: number;
  jamMulai?: string;
  jamSelesai?: string;
  rombel: { id: string; nama: string };
  mapel: { id: string; nama: string };
  guru: { id: string; nama: string };
}

export default function JadwalPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'mingguan' | 'matriks'>('mingguan');
  const [matriksFilterMapel, setMatriksFilterMapel] = useState('');
  const [matriksSearch, setMatriksSearch] = useState('');
  const [hari, setHari] = useState('SENIN');
  const [rombelId, setRombelId] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [conflictError, setConflictError] = useState('');

  // State untuk Edit Jadwal
  const [editJadwal, setEditJadwal] = useState<Jadwal | null>(null);
  const [editConflictError, setEditConflictError] = useState('');
  const [hapusTarget, setHapusTarget] = useState<Jadwal | null>(null);

  // Fungsi Cetak SK Resmi
  const handlePrint = () => {
    window.print();
  };

  // Fungsi Ekspor Data Matriks SK ke CSV / Excel
  const exportMatriksCSV = () => {
    const list = (guru.data?.data ?? []).filter((g: any) => {
      if (matriksSearch) {
        const s = matriksSearch.toLowerCase();
        const matchNama = g.nama?.toLowerCase().includes(s);
        const matchNip = g.nip?.toLowerCase().includes(s);
        const matchMapel = g.mapelDiampu?.some((m: any) => m.mapel?.nama?.toLowerCase().includes(s));
        const matchRombel = g.rombelDiampu?.some((r: any) => r.nama?.toLowerCase().includes(s));
        if (!matchNama && !matchNip && !matchMapel && !matchRombel) return false;
      }
      if (matriksFilterMapel) {
        const matchMapel = g.mapelDiampu?.some((m: any) => m.mapel?.nama?.toLowerCase() === matriksFilterMapel.toLowerCase());
        if (!matchMapel) return false;
      }
      return true;
    });

    const headers = ['No', 'Nama Guru & Gelar', 'NIP', 'Mata Pelajaran', 'Kelas yang Diajar (Rombel)', 'Jumlah Rombel', 'Perkiraan JTM (Jam)', 'Status Sertifikasi', 'Tugas Tambahan'];
    const rows = list.map((g: any, idx: number) => {
      const mapels = (g.mapelDiampu ?? []).map((m: any) => m.mapel?.nama).filter(Boolean).join('; ') || '-';
      const rombels = (g.rombelDiampu ?? []).map((r: any) => r.nama).join(', ') || '-';
      const jmlRombel = g.rombelDiampu?.length ?? 0;
      const jtm = jmlRombel * 4;
      const statusSertifikasi = jtm >= 24 ? 'Memenuhi Syarat (>= 24 JP)' : 'Kurang dari 24 JP';
      const tugasTambahan = (g.waliUntuk ?? []).map((w: any) => `Wali Kelas ${w.nama}`).join('; ') || 'Guru Mapel';
      return [
        idx + 1,
        `"${(g.nama ?? '').replace(/"/g, '""')}"`,
        `'${g.nip ?? '-'}`,
        `"${mapels.replace(/"/g, '""')}"`,
        `"${rombels.replace(/"/g, '""')}"`,
        jmlRombel,
        jtm,
        `"${statusSertifikasi}"`,
        `"${tugasTambahan.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SK_Pembagian_Tugas_Mengajar_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Data Matriks SK Mengajar berhasil diekspor ke format CSV/Excel!', 'success');
  };

  const jadwal = useQuery<{ data: Jadwal[] }>({
    queryKey: qk.jadwal(rombelId, '', hari),
    queryFn: async () =>
      (await api.get('/jadwal', { params: { rombelId: rombelId || undefined, hari } })).data,
    retry: false,
  });


  const rombel = useQuery({
    queryKey: qk.rombel(),
    queryFn: async () => (await api.get('/rombel', { params: { limit: 100 } })).data,
    retry: false,
  });

  const guru = useQuery({
    queryKey: qk.guru(''),
    queryFn: async () => (await api.get('/guru', { params: { limit: 100 } })).data,
    retry: false,
  });

  const mapel = useQuery({
    queryKey: qk.mapel,
    queryFn: async () => (await api.get('/mapel')).data,
    retry: false,
  });

  const tambah = useMutation({
    mutationFn: async (v: Record<string, any>) => (await api.post('/jadwal', v)).data,
    onSuccess: () => {
      toast('Slot jadwal berhasil ditambahkan!', 'success');
      qc.invalidateQueries({ queryKey: ['jadwal'] });
      setShowAddModal(false);
      setConflictError('');
    },
    onError: (err) => {
      setConflictError(pesanError(err));
      toast(pesanError(err), 'danger');
    },
  });

  const updateMutasi = useMutation({
    mutationFn: async (v: { id: string; payload: Record<string, any> }) =>
      (await api.patch(`/jadwal/${v.id}`, v.payload)).data,
    onSuccess: () => {
      toast('Jadwal pelajaran berhasil diperbarui!', 'success');
      qc.invalidateQueries({ queryKey: ['jadwal'] });
      setEditJadwal(null);
      setEditConflictError('');
    },
    onError: (err) => {
      setEditConflictError(pesanError(err));
      toast(pesanError(err), 'danger');
    },
  });

  const hapusMutasi = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/jadwal/${id}`)).data,
    onSuccess: () => {
      toast('Slot jadwal berhasil dihapus!', 'success');
      qc.invalidateQueries({ queryKey: ['jadwal'] });
      setHapusTarget(null);
    },
    onError: (err) => {
      toast(pesanError(err), 'danger');
    },
  });

  const jadwalList = jadwal.data?.data ?? [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Jadwal Pelajaran</h1>
          <p>Kelola jadwal belajar mengajar mingguan dan deteksi bentrok otomatis.</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setConflictError('');
              setShowAddModal(true);
            }}
          >
            + Tambah Slot Jadwal
          </button>
        </div>
      </div>

      {/* View Switcher: Jadwal Mingguan vs Matriks SK Pembagian Tugas */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          type="button"
          className={`btn btn-sm ${viewMode === 'mingguan' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setViewMode('mingguan')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span>📅</span>
          <span>Jadwal Mingguan (Per Jam &amp; Hari)</span>
        </button>
        <button
          type="button"
          className={`btn btn-sm ${viewMode === 'matriks' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setViewMode('matriks')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span>📋</span>
          <span>Matriks SK Pembagian Tugas Mengajar (Guru × Kelas)</span>
        </button>
      </div>

      {viewMode === 'mingguan' ? (
        <>
          {/* Filter by Hari Tabs */}
          <div className="filter-bar">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {HARI.map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`btn btn-sm ${hari === h ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setHari(h)}
                >
                  {h}
                </button>
              ))}
            </div>

            {/* Filter Rombel Select */}
            <div style={{ minWidth: 200 }}>
              <select
                className="select"
                value={rombelId}
                onChange={(e) => setRombelId(e.target.value)}
              >
                <option value="">Semua Rombel (Kelas)</option>
                {(rombel.data?.data ?? []).map((r: { id: string; nama: string }) => (
                  <option key={r.id} value={r.id}>
                    Kelas {r.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content State Mingguan */}
          {jadwal.isError && (
            <div className="alert alert-danger" style={{ marginBottom: 20 }}>
              <span>Gagal memuat jadwal pelajaran. Pastikan server backend sedang aktif.</span>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => jadwal.refetch()}>
                Coba Lagi
              </button>
            </div>
          )}

          {jadwal.isPending ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <p>Memuat slot jadwal…</p>
            </div>
          ) : jadwalList.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>Belum ada jadwal untuk hari {hari}.</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                Klik &quot;+ Tambah Slot Jadwal&quot; di atas untuk menjadwalkan pelajaran.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Jam Pelajaran</th>
                    <th>Rombel</th>
                    <th>Mata Pelajaran</th>
                    <th>Guru Pengampu</th>
                    <th>Hari</th>
                    <th style={{ textAlign: 'center', width: 140 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {jadwalList.map((j) => (
                    <tr key={j.id}>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: 12, padding: '4px 10px' }}>
                          Jam ke-{j.jamKe}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{j.rombel.nama}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{j.mapel.nama}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>👤</span>
                          <span>{j.guru.nama}</span>
                        </div>
                      </td>
                      <td>
                        <Badge variant="info">{j.hari}</Badge>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 12, padding: '4px 8px' }}
                            onClick={() => {
                              setEditConflictError('');
                              setEditJadwal(j);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: 12, padding: '4px 8px', color: 'var(--danger)' }}
                            onClick={() => setHapusTarget(j)}
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* View Mode: Matriks SK Pembagian Tugas Mengajar */
        <div>
          {/* Dokumen Resmi SK (Hanya Tampil Saat Cetak / Print Mode) */}
          <div className="print-only" style={{ marginBottom: 20, textAlign: 'center', fontFamily: 'serif' }}>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Pemerintah Kabupaten / Kota — Dinas Pendidikan
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2, letterSpacing: '0.5px' }}>
              SEKOLAH MENENGAH PERTAMA NEGERI (SMP NEGERI)
            </div>
            <div style={{ fontSize: 11, color: '#333', marginTop: 2 }}>
              Jalan Pendidikan No. 1 — Telepon (021) 12345678 — NPSN: 20299881 — Akreditasi A
            </div>
            <div style={{ borderBottom: '3px double #000', margin: '10px 0 16px' }} />

            <div style={{ fontSize: 13, fontWeight: 800, textDecoration: 'underline' }}>
              KEPUTUSAN KEPALA SEKOLAH MENENGAH PERTAMA NEGERI
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>
              Nomor : 421.3 / 084 / SMPN / SK / VII / 2026
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, marginTop: 4 }}>
              TENTANG PEMBAGIAN TUGAS GURU DALAM PROSES BELAJAR MENGAJAR
            </div>
            <div style={{ fontSize: 11, fontWeight: 600 }}>
              SEMESTER GANJIL TAHUN AJARAN 2026/2027
            </div>
          </div>

          {/* Matriks Control / Filter Bar (Disembunyikan Saat Print) */}
          <div className="card no-print" style={{ marginBottom: 20 }}>
            <div className="card-body" style={{ padding: '14px 18px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 260 }}>
                <input
                  className="input"
                  value={matriksSearch}
                  onChange={(e) => setMatriksSearch(e.target.value)}
                  placeholder="Cari guru, NIP, atau kelas (misal: Wiwin, 7A, MTK)..."
                  style={{ flex: 1 }}
                />
                {matriksSearch && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setMatriksSearch('')}
                  >
                    Reset
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Filter Mapel:</span>
                  <select
                    className="select"
                    style={{ width: 'auto' }}
                    value={matriksFilterMapel}
                    onChange={(e) => setMatriksFilterMapel(e.target.value)}
                  >
                    <option value="">Semua Mata Pelajaran</option>
                    {(mapel.data?.data ?? []).map((m: { id: string; nama: string }) => (
                      <option key={m.id} value={m.nama}>
                        {m.nama}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tombol Aksi Cetak & Ekspor */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={exportMatriksCSV}
                    title="Ekspor seluruh data SK ke format Excel (CSV UTF-8)"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <span>📥</span>
                    <span>Export Excel / CSV</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handlePrint}
                    title="Cetak Dokumen Resmi SK Mengajar dengan Kop Surat & Tanda Tangan"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <span>🖨️</span>
                    <span>Cetak SK Resmi (PDF)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabel Matriks SK Resmi */}
          <div className="table-container">
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: 'center' }}>No</th>
                  <th style={{ width: '25%' }}>Nama Guru &amp; NIP</th>
                  <th style={{ width: '20%' }}>Mata Pelajaran</th>
                  <th>Kelas yang Diajar (Rombel)</th>
                  <th style={{ width: 140, textAlign: 'center' }}>Beban Mengajar (JTM)</th>
                  <th style={{ width: '16%' }}>Tugas Tambahan</th>
                </tr>
              </thead>
              <tbody>
                {(guru.data?.data ?? [])
                  .filter((g: any) => {
                    if (matriksSearch) {
                      const s = matriksSearch.toLowerCase();
                      const matchNama = g.nama?.toLowerCase().includes(s);
                      const matchNip = g.nip?.toLowerCase().includes(s);
                      const matchMapel = g.mapelDiampu?.some((m: any) => m.mapel?.nama?.toLowerCase().includes(s));
                      const matchRombel = g.rombelDiampu?.some((r: any) => r.nama?.toLowerCase().includes(s));
                      if (!matchNama && !matchNip && !matchMapel && !matchRombel) return false;
                    }
                    if (matriksFilterMapel) {
                      const matchMapel = g.mapelDiampu?.some((m: any) => m.mapel?.nama?.toLowerCase() === matriksFilterMapel.toLowerCase());
                      if (!matchMapel) return false;
                    }
                    return true;
                  })
                  .map((g: any, idx: number) => {
                    const jmlRombel = g.rombelDiampu?.length ?? 0;
                    const jtm = jmlRombel * 4;
                    const isMemenuhi = jtm >= 24;

                    return (
                      <tr key={g.id}>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{g.nama}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>NIP. {g.nip}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {g.mapelDiampu && g.mapelDiampu.length > 0 ? (
                              g.mapelDiampu.map((m: any) => (
                                <Badge key={m.mapel.id} variant="info">
                                  {m.mapel.nama}
                                </Badge>
                              ))
                            ) : (
                              <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>-</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {g.rombelDiampu && g.rombelDiampu.length > 0 ? (
                              g.rombelDiampu.map((r: any) => (
                                <span
                                  key={r.id}
                                  title={`Mengajar ${r.mapels.join(', ')} di ${r.nama}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '2px 7px',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: 'var(--bg-subtle)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--primary)',
                                  }}
                                >
                                  {r.nama}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>Belum ada jadwal mengajar</span>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>
                            {jtm} JP / Minggu
                          </div>
                          <div style={{ marginTop: 2 }}>
                            {jmlRombel > 0 ? (
                              <Badge variant={isMemenuhi ? 'success' : 'warning'} style={{ fontSize: 10 }}>
                                {isMemenuhi ? '≥ 24 JP (Sah Sertifikasi)' : `${jtm} JP (< 24 JP)`}
                              </Badge>
                            ) : (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>0 JP</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {g.waliUntuk && g.waliUntuk.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {g.waliUntuk.map((w: any) => (
                                <Badge key={w.id} variant="success" style={{ fontSize: 11 }}>
                                  ★ Wali Kelas {w.nama}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>Guru Mapel</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Kolom Tanda Tangan Resmi Kepala Sekolah (Hanya Tampil Saat Print) */}
          <div className="print-only" style={{ marginTop: 36, display: 'flex', justifyContent: 'flex-end', fontFamily: 'serif' }}>
            <div style={{ width: 280, textAlign: 'left', fontSize: 12, lineHeight: 1.5 }}>
              <div>Ditetapkan di : Kota</div>
              <div>Pada tanggal : 14 Juli 2026</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>Kepala SMP Negeri,</div>
              <div style={{ height: 64 }} />
              <div style={{ fontWeight: 900, textDecoration: 'underline', fontSize: 13 }}>Dra. JUWARIYAH, M.Pd</div>
              <div>NIP. 19680512 199412 2 001</div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Slot Jadwal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Tambah Slot Jadwal Pelajaran"
      >
        {conflictError && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            <div>
              <strong>Jadwal Bentrok Terdeteksi!</strong>
              <p style={{ fontSize: 12, marginTop: 2 }}>{conflictError}</p>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            tambah.mutate({
              rombelId: String(fd.get('rombelId')),
              mapelId: String(fd.get('mapelId')),
              guruId: String(fd.get('guruId')),
              hari: String(fd.get('hari')),
              jamMulai: String(fd.get('jamMulai')),
              jamSelesai: String(fd.get('jamSelesai')),
              jamKe: Number(fd.get('jamKe') || 1),
            });
          }}
        >
          <div className="form-group">
            <label className="form-label">Rombongan Belajar (Kelas)</label>
            <select name="rombelId" className="select" required>
              {(rombel.data?.data ?? []).map((r: { id: string; nama: string }) => (
                <option key={r.id} value={r.id}>
                  Kelas {r.nama}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Mata Pelajaran</label>
            <select name="mapelId" className="select" required>
              {(mapel.data?.data ?? []).map((m: { id: string; nama: string }) => (
                <option key={m.id} value={m.id}>
                  {m.nama}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Guru Pengampu</label>
            <select name="guruId" className="select" required>
              {(guru.data?.data ?? []).map((g: { id: string; nama: string }) => (
                <option key={g.id} value={g.id}>
                  {g.nama}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Hari</label>
              <select name="hari" className="select" defaultValue={hari}>
                {HARI.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Jam Ke-</label>
              <input name="jamKe" type="number" min={1} max={12} className="input" defaultValue={1} required />
            </div>

            <div className="form-group">
              <label className="form-label">Mulai</label>
              <input name="jamMulai" className="input" defaultValue="07:00" placeholder="07:00" required />
            </div>

            <div className="form-group">
              <label className="form-label">Selesai</label>
              <input name="jamSelesai" className="input" defaultValue="08:20" placeholder="08:20" required />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={tambah.isPending}>
              {tambah.isPending ? 'Memvalidasi…' : 'Simpan Jadwal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Slot Jadwal */}
      {editJadwal && (
        <Modal
          isOpen={true}
          onClose={() => setEditJadwal(null)}
          title={`Edit Slot Jadwal: Kelas ${editJadwal.rombel.nama} (${editJadwal.mapel.nama})`}
        >
          {editConflictError && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              <div>
                <strong>Jadwal Bentrok Terdeteksi!</strong>
                <p style={{ fontSize: 12, marginTop: 2 }}>{editConflictError}</p>
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              updateMutasi.mutate({
                id: editJadwal.id,
                payload: {
                  rombelId: String(fd.get('rombelId')),
                  mapelId: String(fd.get('mapelId')),
                  guruId: String(fd.get('guruId')),
                  hari: String(fd.get('hari')),
                  jamMulai: String(fd.get('jamMulai')),
                  jamSelesai: String(fd.get('jamSelesai')),
                  jamKe: Number(fd.get('jamKe') || 1),
                },
              });
            }}
          >
            <div className="form-group">
              <label className="form-label">Rombongan Belajar (Kelas)</label>
              <select name="rombelId" className="select" defaultValue={editJadwal.rombel.id} required>
                {(rombel.data?.data ?? []).map((r: { id: string; nama: string }) => (
                  <option key={r.id} value={r.id}>
                    Kelas {r.nama}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Mata Pelajaran</label>
              <select name="mapelId" className="select" defaultValue={editJadwal.mapel.id} required>
                {(mapel.data?.data ?? []).map((m: { id: string; nama: string }) => (
                  <option key={m.id} value={m.id}>
                    {m.nama}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Guru Pengampu</label>
              <select name="guruId" className="select" defaultValue={editJadwal.guru.id} required>
                {(guru.data?.data ?? []).map((g: { id: string; nama: string }) => (
                  <option key={g.id} value={g.id}>
                    {g.nama}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Hari</label>
                <select name="hari" className="select" defaultValue={editJadwal.hari}>
                  {HARI.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Jam Ke-</label>
                <input name="jamKe" type="number" min={1} max={12} className="input" defaultValue={editJadwal.jamKe} required />
              </div>

              <div className="form-group">
                <label className="form-label">Mulai</label>
                <input name="jamMulai" className="input" defaultValue={editJadwal.jamMulai ? editJadwal.jamMulai.slice(11, 16) : '07:00'} placeholder="07:00" required />
              </div>

              <div className="form-group">
                <label className="form-label">Selesai</label>
                <input name="jamSelesai" className="input" defaultValue={editJadwal.jamSelesai ? editJadwal.jamSelesai.slice(11, 16) : '08:20'} placeholder="08:20" required />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" className="btn btn-outline" onClick={() => setEditJadwal(null)}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary" disabled={updateMutasi.isPending}>
                {updateMutasi.isPending ? 'Memvalidasi…' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Konfirmasi Hapus Jadwal */}
      {hapusTarget && (
        <Modal
          isOpen={true}
          onClose={() => setHapusTarget(null)}
          title="Hapus Slot Jadwal"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 14 }}>
              Apakah Anda yakin ingin menghapus jadwal <strong>{hapusTarget.mapel.nama}</strong> di kelas{' '}
              <strong>{hapusTarget.rombel.nama}</strong> ({hapusTarget.hari}, Jam ke-{hapusTarget.jamKe})?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setHapusTarget(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={hapusMutasi.isPending}
                onClick={() => hapusMutasi.mutate(hapusTarget.id)}
              >
                {hapusMutasi.isPending ? 'Menghapus…' : 'Ya, Hapus Jadwal'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
