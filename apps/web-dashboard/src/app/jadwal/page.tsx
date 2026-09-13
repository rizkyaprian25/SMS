'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

const HARI = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'] as const;
type HariType = typeof HARI[number];

interface JadwalItem {
  id: string;
  hari: string;
  jamKe: number;
  jamMulai?: string;
  jamSelesai?: string;
  rombel: { id: string; nama: string };
  mapel: { id: string; nama: string };
  guru: { id: string; nama: string; nip?: string | null };
}

const JAM_PELAJARAN_PRESETS = [
  { jamKe: 1, label: 'Jam 1', mulai: '07:30', selesai: '08:50' },
  { jamKe: 2, label: 'Jam 2', mulai: '09:05', selesai: '10:25' },
  { jamKe: 3, label: 'Jam 3', mulai: '10:40', selesai: '12:00' },
  { jamKe: 4, label: 'Jam 4', mulai: '12:30', selesai: '13:50' },
  { jamKe: 5, label: 'Jam 5', mulai: '14:00', selesai: '15:20' },
];

export default function JadwalPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  // Mode Tampilan: 'kelas' (Grid Rombel) | 'guru' (Jadwal per Guru) | 'matriks' (SK Mengajar)
  const [viewMode, setViewMode] = useState<'kelas' | 'guru' | 'matriks'>('kelas');

  // Filter State
  const [selectedRombelId, setSelectedRombelId] = useState<string>('');
  const [selectedGuruId, setSelectedGuruId] = useState<string>('');
  const [matriksSearch, setMatriksSearch] = useState('');
  const [matriksFilterMapel, setMatriksFilterMapel] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<JadwalItem | null>(null);
  const [hapusTarget, setHapusTarget] = useState<JadwalItem | null>(null);

  // Form State untuk Tambah / Edit
  const [formRombelId, setFormRombelId] = useState('');
  const [formMapelId, setFormMapelId] = useState('');
  const [formGuruId, setFormGuruId] = useState('');
  const [formHari, setFormHari] = useState<HariType>('SENIN');
  const [formJamKe, setFormJamKe] = useState(1);
  const [formJamMulai, setFormJamMulai] = useState('07:30');
  const [formJamSelesai, setFormJamSelesai] = useState('08:50');

  // Real-time Conflict Validation State
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  const [conflictState, setConflictState] = useState<{ bentrok: boolean; pesan?: string } | null>(null);

  // Print Target Mode: 'kelas' | 'guru' | 'sk'
  const [printTarget, setPrintTarget] = useState<'kelas' | 'guru' | 'sk'>('kelas');

  // Queries
  const rombelQuery = useQuery({
    queryKey: qk.rombel(),
    queryFn: async () => (await api.get('/rombel', { params: { limit: 100 } })).data,
  });

  const guruQuery = useQuery({
    queryKey: qk.guru(''),
    queryFn: async () => (await api.get('/guru', { params: { limit: 100 } })).data,
  });

  const mapelQuery = useQuery({
    queryKey: qk.mapel,
    queryFn: async () => (await api.get('/mapel')).data,
  });

  // Fetch all schedules for current active filter (limit 200 for full timetable)
  const jadwalQuery = useQuery<{ data: JadwalItem[] }>({
    queryKey: ['jadwal', viewMode, selectedRombelId, selectedGuruId],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 200 };
      if (viewMode === 'kelas' && selectedRombelId) params.rombelId = selectedRombelId;
      if (viewMode === 'guru' && selectedGuruId) params.guruId = selectedGuruId;
      const res = await api.get('/jadwal', { params });
      return res.data;
    },
  });

  const rombelList = rombelQuery.data?.data ?? [];
  const guruList = guruQuery.data?.data ?? [];
  const mapelList = mapelQuery.data?.data ?? [];
  const allJadwal = jadwalQuery.data?.data ?? [];

  // Default selection jika belum dipilih
  useEffect(() => {
    if (!selectedRombelId && rombelList.length > 0) {
      setSelectedRombelId(rombelList[0].id);
    }
  }, [rombelList, selectedRombelId]);

  useEffect(() => {
    if (!selectedGuruId && guruList.length > 0) {
      setSelectedGuruId(guruList[0].id);
    }
  }, [guruList, selectedGuruId]);

  // Real-time conflict check saat nilai form berubah
  useEffect(() => {
    if (!showModal || !formRombelId || !formMapelId || !formGuruId || !formJamMulai || !formJamSelesai) {
      setConflictState(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingConflict(true);
        const res = await api.post('/jadwal/cek-bentrok', {
          rombelId: formRombelId,
          mapelId: formMapelId,
          guruId: formGuruId,
          hari: formHari,
          jamKe: formJamKe,
          jamMulai: formJamMulai,
          jamSelesai: formJamSelesai,
        }, {
          params: editTarget ? { kecualiId: editTarget.id } : undefined,
        });

        if (res.data?.data?.bentrok) {
          setConflictState({ bentrok: true, pesan: res.data.data.pesan });
        } else {
          setConflictState({ bentrok: false });
        }
      } catch (err: any) {
        setConflictState({
          bentrok: true,
          pesan: err.response?.data?.message || 'Gagal memvalidasi bentrok jadwal.',
        });
      } finally {
        setIsCheckingConflict(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [showModal, formRombelId, formMapelId, formGuruId, formHari, formJamKe, formJamMulai, formJamSelesai, editTarget]);

  // Handle open modal tambah baru dengan pre-populate hari dan jamKe
  const handleOpenAdd = (defaultHari?: HariType, defaultJamKe?: number) => {
    setEditTarget(null);
    setConflictState(null);

    const preset = JAM_PELAJARAN_PRESETS.find((p) => p.jamKe === defaultJamKe) || JAM_PELAJARAN_PRESETS[0];

    setFormRombelId(selectedRombelId || (rombelList[0]?.id ?? ''));
    setFormMapelId(mapelList[0]?.id ?? '');
    setFormGuruId(selectedGuruId || (guruList[0]?.id ?? ''));
    setFormHari(defaultHari || 'SENIN');
    setFormJamKe(preset.jamKe);
    setFormJamMulai(preset.mulai);
    setFormJamSelesai(preset.selesai);
    setShowModal(true);
  };

  // Handle open modal edit jadwal
  const handleOpenEdit = (item: JadwalItem) => {
    setEditTarget(item);
    setConflictState(null);

    setFormRombelId(item.rombel.id);
    setFormMapelId(item.mapel.id);
    setFormGuruId(item.guru.id);
    setFormHari((item.hari as HariType) || 'SENIN');
    setFormJamKe(item.jamKe || 1);
    setFormJamMulai(item.jamMulai ? item.jamMulai.slice(11, 16) : '07:30');
    setFormJamSelesai(item.jamSelesai ? item.jamSelesai.slice(11, 16) : '08:50');
    setShowModal(true);
  };

  // Mutations
  const simpanMutasi = useMutation({
    mutationFn: async () => {
      const payload = {
        rombelId: formRombelId,
        mapelId: formMapelId,
        guruId: formGuruId,
        hari: formHari,
        jamKe: formJamKe,
        jamMulai: formJamMulai,
        jamSelesai: formJamSelesai,
      };
      if (editTarget) {
        return (await api.patch(`/jadwal/${editTarget.id}`, payload)).data;
      }
      return (await api.post('/jadwal', payload)).data;
    },
    onSuccess: () => {
      toast(editTarget ? 'Jadwal pelajaran berhasil diperbarui!' : 'Slot jadwal berhasil ditambahkan!', 'success');
      qc.invalidateQueries({ queryKey: ['jadwal'] });
      setShowModal(false);
      setEditTarget(null);
      setConflictState(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Gagal menyimpan slot jadwal.';
      toast(msg, 'danger');
    },
  });

  const hapusMutasi = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/jadwal/${id}`)).data,
    onSuccess: () => {
      toast('Slot jadwal berhasil dihapus!', 'success');
      qc.invalidateQueries({ queryKey: ['jadwal'] });
      setHapusTarget(null);
    },
    onError: (err: any) => {
      toast(err.response?.data?.message || 'Gagal menghapus jadwal.', 'danger');
    },
  });

  // Current active Rombel and Guru object
  const activeRombel = rombelList.find((r: any) => r.id === selectedRombelId);
  const activeGuru = guruList.find((g: any) => g.id === selectedGuruId);

  // Map jadwal ke matrix [hari][jamKe]
  const timetableMatrix = useMemo(() => {
    const map: Record<string, Record<number, JadwalItem>> = {};
    HARI.forEach((h) => {
      map[h] = {};
    });
    allJadwal.forEach((j) => {
      if (map[j.hari]) {
        map[j.hari][j.jamKe] = j;
      }
    });
    return map;
  }, [allJadwal]);

  // Hitung total JP rombel / guru terpilih
  const totalJpAktif = allJadwal.length;

  const handlePrintDocument = (target: 'kelas' | 'guru' | 'sk') => {
    setPrintTarget(target);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Export SK Mengajar CSV
  const exportMatriksCSV = () => {
    const list = guruList.filter((g: any) => {
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

    const headers = ['No', 'Nama Guru & Gelar', 'NIP', 'Mata Pelajaran', 'Kelas yang Diajar', 'Jumlah Rombel', 'JTM (Jam)', 'Status Sertifikasi', 'Tugas Tambahan'];
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
    toast('Data SK Pembagian Tugas Mengajar berhasil diekspor ke format CSV/Excel!', 'success');
  };

  return (
    <div>
      {/* ========================================================================= */}
      {/* TAMPILAN RESMI CETAK PRINT (HANYA MUNCUL SAAT DI-PRINT / CTRL+P)           */}
      {/* ========================================================================= */}
      <div className="print-only">
        {/* Kop Surat Resmi */}
        <div style={{ textAlign: 'center', fontFamily: 'serif', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Pemerintah Daerah Provinsi Jawa Barat — Dinas Pendidikan
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>
            SEKOLAH MENENGAH PERTAMA NEGERI (SMP NEGERI)
          </div>
          <div style={{ fontSize: 11, color: '#333', marginTop: 2 }}>
            Jalan Pendidikan No. 1, Kota Bandung — Telp: (022) 7201234 — NPSN: 20299881 — Akreditasi A
          </div>
          <div style={{ borderBottom: '3px double #000', margin: '8px 0 14px' }} />

          {printTarget === 'kelas' && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, textDecoration: 'underline' }}>
                JADWAL PELAJARAN MINGGUAN KELAS {activeRombel?.nama ?? '-'}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>
                Tahun Ajaran 2026/2027 — Semester Ganjil
              </div>
              <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>
                Wali Kelas: {activeRombel?.waliKelas?.nama ?? 'Dra. Wiwin Djueriah'} | Kapasitas: {activeRombel?.kapasitas ?? 40} Siswa
              </div>
            </div>
          )}

          {printTarget === 'guru' && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, textDecoration: 'underline' }}>
                JADWAL MENGAJAR GURU (INDIVIDUAL)
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2 }}>
                {activeGuru?.nama ?? '-'} (NIP. {activeGuru?.nip ?? '-'})
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>
                Total Beban Mengajar: {totalJpAktif * 2} Jam Pelajaran (JP) / Minggu
              </div>
            </div>
          )}

          {printTarget === 'sk' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, textDecoration: 'underline' }}>
                KEPUTUSAN KEPALA SEKOLAH MENENGAH PERTAMA NEGERI
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                Nomor : 421.3 / 084 / SMPN / SK / VII / 2026
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, marginTop: 4 }}>
                TENTANG PEMBAGIAN TUGAS GURU DALAM PROSES BELAJAR MENGAJAR (SK MENGAJAR)
              </div>
            </div>
          )}
        </div>

        {/* Tabel Print Grid Jadwal */}
        {(printTarget === 'kelas' || printTarget === 'guru') && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, textAlign: 'center' }} border={1}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '6px 8px', width: 90 }}>Jam Ke / Waktu</th>
                {HARI.map((h) => (
                  <th key={h} style={{ padding: '6px 8px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {JAM_PELAJARAN_PRESETS.map((preset) => (
                <tr key={preset.jamKe}>
                  <td style={{ padding: '6px 4px', fontWeight: 600 }}>
                    <div>Jam {preset.jamKe}</div>
                    <div style={{ fontSize: 9, color: '#666' }}>{preset.mulai} - {preset.selesai}</div>
                  </td>
                  {HARI.map((h) => {
                    const item = timetableMatrix[h]?.[preset.jamKe];
                    return (
                      <td key={h} style={{ padding: '6px 4px', verticalAlign: 'middle' }}>
                        {item ? (
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 11 }}>{item.mapel.nama}</div>
                            <div style={{ fontSize: 10, color: '#333' }}>
                              {printTarget === 'kelas' ? item.guru.nama : `Kelas ${item.rombel.nama}`}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#aaa', fontStyle: 'italic', fontSize: 10 }}>-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pengesahan Tanda Tangan Kepsek */}
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', fontFamily: 'serif' }}>
          <div style={{ width: 260, textAlign: 'left', fontSize: 11, lineHeight: 1.5 }}>
            <div>Ditetapkan di : Kota Bandung</div>
            <div>Pada tanggal : 14 Juli 2026</div>
            <div style={{ marginTop: 6, fontWeight: 700 }}>Kepala SMP Negeri,</div>
            <div style={{ height: 50 }} />
            <div style={{ fontWeight: 900, textDecoration: 'underline', fontSize: 12 }}>Dra. JUWARIYAH, M.Pd</div>
            <div>NIP. 19680512 199412 2 001</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAMPILAN INTERAKTIF DASHBOARD (LAYAR MONITOR)                              */}
      {/* ========================================================================= */}
      <div className="no-print">
        {/* Header Banner */}
        <div className="page-header" style={{ marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
              Jadwal Pelajaran &amp; Deteksi Bentrok Otomatis
            </h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>
              Penyusunan jadwal interaktif mingguan per rombel &amp; per guru dengan validasi bentrok jam mengajar real-time.
            </p>
          </div>
          <div className="page-header-actions" style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleOpenAdd()}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>+ Tambah Slot Jadwal</span>
            </button>
          </div>
        </div>

        {/* View Switcher Bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'kelas' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('kelas')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>🏫</span>
            <span>Matriks Mingguan per Kelas (Rombel)</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'guru' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('guru')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>👨‍🏫</span>
            <span>Jadwal Mengajar per Guru (Personal)</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'matriks' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('matriks')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>📋</span>
            <span>Matriks SK Pembagian Tugas (Beban JTM)</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: GRID MATRIKS MINGGUAN PER KELAS (ROMBEL)                          */}
        {/* ========================================================================= */}
        {viewMode === 'kelas' && (
          <div>
            {/* Control Bar Kelas */}
            <div className="card" style={{ padding: '14px 18px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <label style={{ fontWeight: 600, fontSize: 13, color: '#475569' }}>Pilih Rombel:</label>
                  <select
                    className="select"
                    style={{ minWidth: 200, fontWeight: 700 }}
                    value={selectedRombelId}
                    onChange={(e) => setSelectedRombelId(e.target.value)}
                  >
                    {rombelList.map((r: any) => (
                      <option key={r.id} value={r.id}>
                        Kelas {r.nama} (Kapasitas: {r.kapasitas ?? 40} Siswa)
                      </option>
                    ))}
                  </select>

                  <span className="badge badge-primary" style={{ fontSize: 12, padding: '4px 10px' }}>
                    {totalJpAktif} Slot Terjadwal
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handlePrintDocument('kelas')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  title="Cetak Jadwal Pelajaran Kelas ke PDF (A4 Landscape)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect width="12" height="8" x="6" y="14" />
                  </svg>
                  <span>🖨️ Cetak Jadwal Kelas (PDF)</span>
                </button>
              </div>
            </div>

            {/* Timetable Interactive Grid */}
            <div className="card" style={{ overflow: 'hidden', marginBottom: 24 }}>
              <div className="table-responsive">
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 14px', width: 110, textAlign: 'center', color: '#475569' }}>
                        Jam Pelajaran
                      </th>
                      {HARI.map((h) => (
                        <th key={h} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 700 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {JAM_PELAJARAN_PRESETS.map((preset) => (
                      <tr key={preset.jamKe} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {/* Kolom Info Jam Ke */}
                        <td style={{ padding: '12px 10px', background: '#f8fafc', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>
                            Jam ke-{preset.jamKe}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            {preset.mulai} - {preset.selesai}
                          </div>
                        </td>

                        {/* Sel Hari */}
                        {HARI.map((h) => {
                          const item = timetableMatrix[h]?.[preset.jamKe];
                          return (
                            <td
                              key={h}
                              style={{
                                padding: '10px 8px',
                                verticalAlign: 'middle',
                                minWidth: 150,
                                background: item ? '#ffffff' : '#fafafa',
                              }}
                            >
                              {item ? (
                                <div
                                  style={{
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 8,
                                    padding: '10px 12px',
                                    background: '#f0f9ff',
                                    textAlign: 'left',
                                    position: 'relative',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <span style={{ fontWeight: 700, color: '#0369a1', fontSize: 13 }}>
                                      {item.mapel.nama}
                                    </span>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEdit(item)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: 2 }}
                                        title="Edit Slot Jadwal"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setHapusTarget(item)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: 2 }}
                                        title="Hapus Slot Jadwal"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>

                                  <div style={{ fontSize: 11, color: '#475569', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span>👤</span>
                                    <span>{item.guru.nama}</span>
                                  </div>

                                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                                    {preset.mulai} - {preset.selesai} WIB
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  onClick={() => handleOpenAdd(h, preset.jamKe)}
                                  style={{
                                    width: '100%',
                                    borderStyle: 'dashed',
                                    borderColor: '#cbd5e1',
                                    color: '#94a3b8',
                                    fontSize: 12,
                                    padding: '10px 6px',
                                  }}
                                  title={`Klik untuk menambahkan mata pelajaran pada ${h} Jam ke-${preset.jamKe}`}
                                >
                                  + Isi Slot
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: JADWAL MENGAJAR PER GURU (INDIVIDUAL)                             */}
        {/* ========================================================================= */}
        {viewMode === 'guru' && (
          <div>
            {/* Control Bar Guru */}
            <div className="card" style={{ padding: '14px 18px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <label style={{ fontWeight: 600, fontSize: 13, color: '#475569' }}>Pilih Guru:</label>
                  <select
                    className="select"
                    style={{ minWidth: 260, fontWeight: 700 }}
                    value={selectedGuruId}
                    onChange={(e) => setSelectedGuruId(e.target.value)}
                  >
                    {guruList.map((g: any) => (
                      <option key={g.id} value={g.id}>
                        {g.nama} (NIP: {g.nip || '-'})
                      </option>
                    ))}
                  </select>

                  <span className="badge badge-success" style={{ fontSize: 12, padding: '4px 10px' }}>
                    {totalJpAktif * 2} Jam Pelajaran (JP) / Minggu
                  </span>

                  <span className={`badge ${totalJpAktif * 2 >= 24 ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 12 }}>
                    {totalJpAktif * 2 >= 24 ? '✓ Memenuhi Beban Sertifikasi (≥ 24 JP)' : '⚠ Kurang dari 24 JP'}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handlePrintDocument('guru')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  title="Cetak Jadwal Pengajaran Pribadi Guru"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect width="12" height="8" x="6" y="14" />
                  </svg>
                  <span>🖨️ Cetak Jadwal Guru (PDF)</span>
                </button>
              </div>
            </div>

            {/* Grid Jadwal Guru */}
            <div className="card" style={{ overflow: 'hidden', marginBottom: 24 }}>
              <div className="table-responsive">
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 14px', width: 110, textAlign: 'center', color: '#475569' }}>
                        Jam Pelajaran
                      </th>
                      {HARI.map((h) => (
                        <th key={h} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 700 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {JAM_PELAJARAN_PRESETS.map((preset) => (
                      <tr key={preset.jamKe} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 10px', background: '#f8fafc', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>
                            Jam ke-{preset.jamKe}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            {preset.mulai} - {preset.selesai}
                          </div>
                        </td>

                        {HARI.map((h) => {
                          const item = timetableMatrix[h]?.[preset.jamKe];
                          return (
                            <td key={h} style={{ padding: '10px 8px', verticalAlign: 'middle', minWidth: 150 }}>
                              {item ? (
                                <div
                                  style={{
                                    border: '1px solid #86efac',
                                    borderRadius: 8,
                                    padding: '10px 12px',
                                    background: '#f0fdf4',
                                    textAlign: 'left',
                                  }}
                                >
                                  <div style={{ fontWeight: 800, color: '#166534', fontSize: 13 }}>
                                    Kelas {item.rombel.nama}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#1e293b', marginTop: 2, fontWeight: 600 }}>
                                    {item.mapel.nama}
                                  </div>
                                  <div style={{ fontSize: 10, color: '#15803d', marginTop: 2 }}>
                                    {preset.mulai} - {preset.selesai} WIB
                                  </div>
                                </div>
                              ) : (
                                <div style={{ color: '#cbd5e1', fontSize: 12, fontStyle: 'italic' }}>
                                  Tidak Ada Jadwal
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: MATRIKS SK PEMBAGIAN TUGAS MENGAJAR                               */}
        {/* ========================================================================= */}
        {viewMode === 'matriks' && (
          <div>
            <div className="card" style={{ padding: '14px 18px', marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 260 }}>
                  <input
                    className="input"
                    value={matriksSearch}
                    onChange={(e) => setMatriksSearch(e.target.value)}
                    placeholder="Cari nama guru, NIP, atau rombel diajar..."
                    style={{ flex: 1 }}
                  />
                  {matriksSearch && (
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setMatriksSearch('')}>
                      Reset
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    className="select"
                    style={{ width: 'auto' }}
                    value={matriksFilterMapel}
                    onChange={(e) => setMatriksFilterMapel(e.target.value)}
                  >
                    <option value="">Semua Mata Pelajaran</option>
                    {mapelList.map((m: any) => (
                      <option key={m.id} value={m.nama}>{m.nama}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={exportMatriksCSV}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <span>📥</span>
                    <span>Export Excel / CSV</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handlePrintDocument('sk')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <span>🖨️</span>
                    <span>Cetak SK Resmi (PDF)</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="table-responsive">
                <table className="table" style={{ fontSize: 13, width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ width: 44, textAlign: 'center', padding: '12px 14px' }}>No</th>
                      <th style={{ width: '25%', padding: '12px 14px' }}>Nama Guru &amp; NIP</th>
                      <th style={{ width: '20%', padding: '12px 14px' }}>Mata Pelajaran</th>
                      <th style={{ padding: '12px 14px' }}>Kelas yang Diajar (Rombel)</th>
                      <th style={{ width: 140, textAlign: 'center', padding: '12px 14px' }}>Beban JTM</th>
                      <th style={{ width: '16%', padding: '12px 14px' }}>Tugas Tambahan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guruList
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
                          <tr key={g.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b', padding: '12px 14px' }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: 700, color: '#1e293b' }}>{g.nama}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>NIP. {g.nip || '-'}</div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {g.mapelDiampu && g.mapelDiampu.length > 0 ? (
                                  g.mapelDiampu.map((m: any) => (
                                    <Badge key={m.mapel.id} variant="info">{m.mapel.nama}</Badge>
                                  ))
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: 12 }}>-</span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {g.rombelDiampu && g.rombelDiampu.length > 0 ? (
                                  g.rombelDiampu.map((r: any) => (
                                    <span
                                      key={r.id}
                                      style={{
                                        display: 'inline-flex',
                                        padding: '2px 7px',
                                        borderRadius: 4,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        background: '#f1f5f9',
                                        border: '1px solid #cbd5e1',
                                        color: '#2563eb',
                                      }}
                                    >
                                      {r.nama}
                                    </span>
                                  ))
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: 12 }}>Belum ada rombel diajar</span>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                                {jtm} JP / Minggu
                              </div>
                              <div style={{ marginTop: 2 }}>
                                {jmlRombel > 0 ? (
                                  <Badge variant={isMemenuhi ? 'success' : 'warning'} style={{ fontSize: 10 }}>
                                    {isMemenuhi ? '≥ 24 JP (Sah)' : `${jtm} JP (< 24 JP)`}
                                  </Badge>
                                ) : (
                                  <span style={{ fontSize: 11, color: '#94a3b8' }}>0 JP</span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              {g.waliUntuk && g.waliUntuk.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                  {g.waliUntuk.map((w: any) => (
                                    <Badge key={w.id} variant="success" style={{ fontSize: 11 }}>
                                      ★ Wali Kelas {w.nama}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color: '#64748b', fontSize: 12 }}>Guru Mapel</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL TAMBAH & EDIT SLOT JADWAL DENGAN VALIDASI BENTROK REAL-TIME         */}
        {/* ========================================================================= */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editTarget ? 'Edit Slot Jadwal Pelajaran' : 'Tambah Slot Jadwal Pelajaran Baru'}
        >
          {/* Banner Peringatan Bentrok Real-Time */}
          {conflictState?.bentrok && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #f87171',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 16,
                color: '#991b1b',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13 }}>
                <span>⚠️</span>
                <span>Jadwal Bentrok Terdeteksi!</span>
              </div>
              <div style={{ fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>
                {conflictState.pesan}
              </div>
              <div style={{ fontSize: 11, marginTop: 6, color: '#b91c1c', fontStyle: 'italic' }}>
                Silakan ganti jam pelajaran, hari, atau pilih guru lain yang sedang tidak mengajar di slot ini.
              </div>
            </div>
          )}

          {conflictState && !conflictState.bentrok && (
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 16,
                color: '#166534',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>✓</span>
              <span>Slot jadwal ini tersedia dan tidak ada bentrok mengajar.</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (conflictState?.bentrok) return;
              simpanMutasi.mutate();
            }}
          >
            {/* Pilihan Rombel */}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                Rombongan Belajar (Kelas)
              </label>
              <select
                className="select"
                value={formRombelId}
                onChange={(e) => setFormRombelId(e.target.value)}
                required
                style={{ width: '100%' }}
              >
                {rombelList.map((r: any) => (
                  <option key={r.id} value={r.id}>Kelas {r.nama}</option>
                ))}
              </select>
            </div>

            {/* Pilihan Mapel */}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                Mata Pelajaran
              </label>
              <select
                className="select"
                value={formMapelId}
                onChange={(e) => setFormMapelId(e.target.value)}
                required
                style={{ width: '100%' }}
              >
                {mapelList.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.nama} ({m.kode})</option>
                ))}
              </select>
            </div>

            {/* Pilihan Guru Pengampu */}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                Guru Pengampu
              </label>
              <select
                className="select"
                value={formGuruId}
                onChange={(e) => setFormGuruId(e.target.value)}
                required
                style={{ width: '100%' }}
              >
                {guruList.map((g: any) => (
                  <option key={g.id} value={g.id}>
                    {g.nama} (NIP: {g.nip || '-'})
                  </option>
                ))}
              </select>
            </div>

            {/* Pilihan Hari & Preset Jam Pelajaran */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Hari</label>
                <select
                  className="select"
                  value={formHari}
                  onChange={(e) => setFormHari(e.target.value as HariType)}
                  style={{ width: '100%' }}
                >
                  {HARI.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Jam Ke-</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  className="input"
                  value={formJamKe}
                  onChange={(e) => setFormJamKe(Number(e.target.value))}
                  required
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Preset Tombol JP Cepat */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>
                Preset Jam Pelajaran (Klik untuk isi cepat waktu):
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {JAM_PELAJARAN_PRESETS.map((preset) => (
                  <button
                    key={preset.jamKe}
                    type="button"
                    className={`btn btn-sm ${formJamKe === preset.jamKe && formJamMulai === preset.mulai ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => {
                      setFormJamKe(preset.jamKe);
                      setFormJamMulai(preset.mulai);
                      setFormJamSelesai(preset.selesai);
                    }}
                    style={{ fontSize: 11, padding: '3px 8px' }}
                  >
                    Jam {preset.jamKe} ({preset.mulai})
                  </button>
                ))}
              </div>
            </div>

            {/* Jam Mulai & Jam Selesai */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Jam Mulai (JJ:MM)</label>
                <input
                  type="text"
                  className="input"
                  value={formJamMulai}
                  onChange={(e) => setFormJamMulai(e.target.value)}
                  placeholder="07:30"
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Jam Selesai (JJ:MM)</label>
                <input
                  type="text"
                  className="input"
                  value={formJamSelesai}
                  onChange={(e) => setFormJamSelesai(e.target.value)}
                  placeholder="08:50"
                  required
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Tombol Aksi Modal */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={simpanMutasi.isPending || isCheckingConflict || (conflictState?.bentrok === true)}
              >
                {simpanMutasi.isPending ? 'Menyimpan…' : editTarget ? 'Simpan Perubahan' : 'Tambah Jadwal'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal Konfirmasi Hapus */}
        {hapusTarget && (
          <Modal
            isOpen={true}
            onClose={() => setHapusTarget(null)}
            title="Hapus Slot Jadwal Pelajaran"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 14, color: '#334155' }}>
                Apakah Anda yakin ingin menghapus jadwal <strong>{hapusTarget.mapel.nama}</strong> di kelas{' '}
                <strong>{hapusTarget.rombel.nama}</strong> ({hapusTarget.hari}, Jam ke-{hapusTarget.jamKe})?
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setHapusTarget(null)}>
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
    </div>
  );
}
