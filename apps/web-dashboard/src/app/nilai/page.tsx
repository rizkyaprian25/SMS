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

interface BarisNilai {
  id: string;
  jenis: string;
  semester: string;
  judul?: string | null;
  nilai: number | string;
  siswa: { id?: string; nama: string; nisn?: string };
  mapel: { id?: string; nama: string };
}

export default function NilaiPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [rombelId, setRombelId] = useState('');
  const [mapelId, setMapelId] = useState('');
  const [semester, setSemester] = useState('GANJIL');
  const [jenis, setJenis] = useState('');
  const [selectedGuruId, setSelectedGuruId] = useState('');

  // Fetch daftar guru untuk simulasi peran dan penguncian hak input berbasis SK
  const guru = useQuery({
    queryKey: qk.guru(''),
    queryFn: async () => (await api.get('/guru', { params: { limit: 100 } })).data,
    retry: false,
  });
  const guruList: any[] = guru.data?.data ?? [];
  const chosenGuru = guruList.find((g) => g.id === selectedGuruId);

  // Periksa apakah guru yang dipilih berhak mengajar di rombel & mapel aktif
  const isGuruSelected = Boolean(selectedGuruId && chosenGuru);
  const teachesRombel = !rombelId || !isGuruSelected || chosenGuru?.rombelDiampu?.some((r: any) => r.id === rombelId);
  const teachesMapel = !mapelId || !isGuruSelected || chosenGuru?.mapelDiampu?.some((m: any) => m.mapel?.id === mapelId);
  const isAuthorizedToEdit = !isGuruSelected || (teachesRombel && teachesMapel);

  // Fetch rombel & mapel untuk nama di kop cetak
  const rombelQuery = useQuery({
    queryKey: qk.rombel(),
    queryFn: async () => (await api.get('/rombel', { params: { limit: 100 } })).data,
    retry: false,
  });
  const rombelList: any[] = rombelQuery.data?.data ?? [];
  const selectedRombel = rombelList.find((r) => r.id === rombelId);

  const mapelQuery = useQuery({
    queryKey: qk.mapel,
    queryFn: async () => (await api.get('/mapel')).data,
    retry: false,
  });
  const mapelList: any[] = mapelQuery.data?.data ?? [];
  const selectedMapel = mapelList.find((m) => m.id === mapelId);

  // State Edit Nilai & Dialog Cetak
  const [editTarget, setEditTarget] = useState<BarisNilai | null>(null);
  const [editNilaiAngka, setEditNilaiAngka] = useState<number>(75);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printScope, setPrintScope] = useState<'kelas-mapel' | 'guru-multi'>('kelas-mapel');

  // Fungsi Ekspor Nilai ke CSV / Excel
  const exportNilaiCSV = () => {
    const dataList = q.data?.data ?? [];
    if (dataList.length === 0) {
      toast('Tidak ada data nilai untuk diekspor', 'danger');
      return;
    }

    const headers = ['No', 'Nama Siswa', 'NISN', 'Mata Pelajaran', 'Semester', 'Jenis Asesmen', 'Skor Nilai', 'Status KKM (>= 75)', 'Guru Pengampu'];
    const rows = dataList.map((item, idx) => {
      const numVal = Number(item.nilai);
      const isPass = !isNaN(numVal) && numVal >= 75 ? 'Tuntas' : 'Remedial';
      return [
        idx + 1,
        `"${(item.siswa?.nama ?? '').replace(/"/g, '""')}"`,
        `'${item.siswa?.nisn ?? '-'}`,
        `"${(item.mapel?.nama ?? '').replace(/"/g, '""')}"`,
        item.semester,
        item.jenis,
        item.nilai,
        isPass,
        `"${(chosenGuru?.nama ?? 'Guru Mapel').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const kelasStr = selectedRombel?.nama ? `Kelas_${selectedRombel.nama}_` : '';
    const mapelStr = selectedMapel?.nama ? `${selectedMapel.nama.replace(/\s+/g, '_')}_` : '';
    link.setAttribute('download', `Daftar_Nilai_${kelasStr}${mapelStr}${semester}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Data Nilai berhasil diekspor ke file Excel/CSV!', 'success');
  };

  const q = useQuery<{ data: BarisNilai[] }>({
    queryKey: qk.nilai(rombelId, mapelId, semester, jenis),
    queryFn: async () =>
      (
        await api.get('/nilai', {
          params: {
            rombelId: rombelId || undefined,
            mapelId: mapelId || undefined,
            semester,
            jenis: jenis || undefined,
            limit: 100,
          },
        })
      ).data,
    retry: false,
  });


  const updateMutasi = useMutation({
    mutationFn: async (payload: { id: string; nilai: number }) =>
      (await api.patch(`/nilai/${payload.id}`, { nilai: payload.nilai })).data,
    onSuccess: () => {
      toast('Nilai siswa berhasil diperbarui!', 'success');
      qc.invalidateQueries({ queryKey: ['nilai'] });
      setEditTarget(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Gagal memperbarui nilai';
      toast(Array.isArray(msg) ? msg.join(', ') : msg, 'danger');
    },
  });

  // Fetch tahun ajaran aktif untuk konteks penilaian
  const taQuery = useQuery({
    queryKey: ['tahun-ajaran-aktif'],
    queryFn: async () => (await api.get('/tahun-ajaran')).data,
    retry: false,
  });
  const taList: any[] = taQuery.data?.data ?? [];
  const activeTa = taList.find((ta) => ta.isAktif) || taList[0];
  const activeTaId = activeTa?.id || '';

  // State Modal Pembobotan Nilai Guru
  const [showBobotModal, setShowBobotModal] = useState(false);
  const [bobotMapelId, setBobotMapelId] = useState('');
  const [bobotTugas, setBobotTugas] = useState<number>(20);
  const [bobotHarian, setBobotHarian] = useState<number>(30);
  const [bobotUts, setBobotUts] = useState<number>(25);
  const [bobotUas, setBobotUas] = useState<number>(25);

  const targetBobotMapel = bobotMapelId || mapelId;
  const bobotQuery = useQuery({
    queryKey: qk.bobotNilai(targetBobotMapel, activeTaId),
    queryFn: async () => {
      if (!targetBobotMapel || !activeTaId) return null;
      return (await api.get('/nilai/bobot', { params: { mapelId: targetBobotMapel, tahunAjaranId: activeTaId } })).data;
    },
    enabled: Boolean(targetBobotMapel && activeTaId),
  });
  const activeBobot = bobotQuery.data?.data;

  // Buka modal pembobotan dengan nilai awal
  const handleOpenBobotModal = () => {
    const targetId = mapelId || (mapelList[0]?.id ?? '');
    setBobotMapelId(targetId);
    if (activeBobot) {
      setBobotTugas(activeBobot.bobotTugas);
      setBobotHarian(activeBobot.bobotHarian);
      setBobotUts(activeBobot.bobotUts);
      setBobotUas(activeBobot.bobotUas);
    } else {
      setBobotTugas(20);
      setBobotHarian(30);
      setBobotUts(25);
      setBobotUas(25);
    }
    setShowBobotModal(true);
  };

  const saveBobotMutation = useMutation({
    mutationFn: async (payload: {
      mapelId: string;
      tahunAjaranId: string;
      bobotTugas: number;
      bobotHarian: number;
      bobotUts: number;
      bobotUas: number;
    }) => {
      return (await api.put('/nilai/bobot', payload)).data;
    },
    onSuccess: () => {
      toast('Bobot persentase penilaian berhasil disimpan!', 'success');
      qc.invalidateQueries({ queryKey: ['bobot-nilai'] });
      setShowBobotModal(false);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Gagal menyimpan bobot penilaian';
      toast(Array.isArray(msg) ? msg.join(', ') : msg, 'danger');
    },
  });

  // State Modal Tambah Penilaian / Tugas / Ulangan Baru
  const [showTambahNilaiModal, setShowTambahNilaiModal] = useState(false);
  const [tambahRombelId, setTambahRombelId] = useState('');
  const [tambahMapelId, setTambahMapelId] = useState('');
  const [tambahSemester, setTambahSemester] = useState('GANJIL');
  const [tambahJenis, setTambahJenis] = useState('HARIAN');
  const [tambahJudul, setTambahJudul] = useState('');
  const [siswaNilaiMap, setSiswaNilaiMap] = useState<Record<string, number | string>>({});
  const [nilaiSerentak, setNilaiSerentak] = useState<string>('80');

  // Query Siswa untuk Rombel di Modal Tambah Penilaian
  const modalSiswaQuery = useQuery({
    queryKey: ['siswa-modal', tambahRombelId],
    queryFn: async () => {
      if (!tambahRombelId) return { data: [] };
      return (await api.get('/siswa', { params: { rombelId: tambahRombelId, limit: 100 } })).data;
    },
    enabled: Boolean(tambahRombelId && showTambahNilaiModal),
  });
  const modalSiswaList: Array<{ id: string; nama: string; nisn?: string }> = modalSiswaQuery.data?.data ?? [];

  // Buka modal input nilai baru
  const handleOpenTambahNilaiModal = () => {
    setTambahRombelId(rombelId || (rombelList[0]?.id ?? ''));
    setTambahMapelId(mapelId || (mapelList[0]?.id ?? ''));
    setTambahSemester(semester || 'GANJIL');
    setTambahJenis(jenis || 'HARIAN');
    setTambahJudul('');
    setSiswaNilaiMap({});
    setShowTambahNilaiModal(true);
  };

  const saveBulkNilaiMutation = useMutation({
    mutationFn: async () => {
      const items = Object.entries(siswaNilaiMap)
        .filter(([_, val]) => val !== '' && val !== undefined && !isNaN(Number(val)))
        .map(([siswaId, val]) => ({
          siswaId,
          nilai: Number(val),
        }));

      if (items.length === 0) {
        throw new Error('Harap masukkan skor nilai minimal untuk 1 siswa!');
      }
      if (!tambahMapelId) throw new Error('Pilih mata pelajaran terlebih dahulu!');
      if (!activeTaId) throw new Error('Tahun ajaran aktif belum ditemukan!');

      return (
        await api.post('/nilai/bulk', {
          mapelId: tambahMapelId,
          tahunAjaranId: activeTaId,
          semester: tambahSemester,
          jenis: tambahJenis,
          judul: tambahJudul.trim() || undefined,
          items,
        })
      ).data;
    },
    onSuccess: (res: any) => {
      const jml = res.data?.tersimpan ?? 0;
      toast(`Berhasil menyimpan ${jml} nilai siswa untuk asesmen "${tambahJudul || tambahJenis}"!`, 'success');
      qc.invalidateQueries({ queryKey: ['nilai'] });
      setShowTambahNilaiModal(false);
      setTambahJudul('');
      setSiswaNilaiMap({});
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Gagal menyimpan nilai asesmen';
      toast(Array.isArray(msg) ? msg.join(', ') : msg, 'danger');
    },
  });

  const list = q.data?.data ?? [];

  // Hitung rata-rata, tertinggi, terendah
  const angkaNilai = list
    .map((item) => Number(item.nilai))
    .filter((n) => !isNaN(n));

  const totalSiswaDinilai = angkaNilai.length;
  const rerata =
    totalSiswaDinilai > 0
      ? (angkaNilai.reduce((a, b) => a + b, 0) / totalSiswaDinilai).toFixed(1)
      : '-';
  const nilaiMax = totalSiswaDinilai > 0 ? Math.max(...angkaNilai) : '-';
  const nilaiMin = totalSiswaDinilai > 0 ? Math.min(...angkaNilai) : '-';

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

  const getJenisBadge = (j: string) => {
    switch (j) {
      case 'UTS':
      case 'UAS':
        return 'primary';
      case 'SUMATIF':
        return 'info';
      case 'HARIAN':
        return 'success';
      case 'TUGAS':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Monitoring Nilai Akademik
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4, margin: 0 }}>
            Pantau capaian nilai formatif &amp; sumatif siswa per rombel dan mata pelajaran.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={exportNilaiCSV}
            title="Ekspor daftar nilai ke file CSV / Excel"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>📥</span>
            <span>Export Excel / CSV</span>
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleOpenBobotModal}
            title="Atur persentase bobot penilaian mata pelajaran (Tugas, Formatif, UTS, UAS)"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>⚙️</span>
            <span>Atur Bobot Penilaian</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleOpenTambahNilaiModal}
            title="Tambah penilaian / tugas baru / ulangan harian siswa"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>➕</span>
            <span>Input Penilaian Baru</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowPrintModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>🖨️</span>
            <span>Cetak Dokumen Resmi (PDF)</span>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div
        style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 8,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: '0.875rem',
          color: '#1e40af',
        }}
      >
        <span style={{ fontSize: '1.25rem' }}>ℹ️</span>
        <div>
          <strong>Informasi Penilaian:</strong> Nilai diinput langsung oleh guru mata pelajaran yang
          bersangkutan via aplikasi mobile guru atau dashboard. Batas KKM sekolah adalah <strong>75</strong>.
        </div>
      </div>

      {/* Filter Bar Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          {/* Selector Simulasi Guru Pengampu Berbasis SK */}
          <div className="form-group" style={{ margin: 0, flex: '1 1 280px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
              SIMULASI PERAN GURU PENGAMPU (SK)
            </label>
            <select
              className="select-control"
              value={selectedGuruId}
              onChange={(e) => {
                const newGuruId = e.target.value;
                setSelectedGuruId(newGuruId);
                if (newGuruId) {
                  const g = guruList.find((item) => item.id === newGuruId);
                  if (g?.rombelDiampu?.[0]?.id) {
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
              <optgroup label="Pilih Guru Pengampu (Sesuai SK Mengajar)">
                {guruList.map((g) => {
                  const mapels = (g.mapelDiampu ?? []).map((m: any) => m.mapel?.nama).join(', ') || 'Mapel';
                  const rombels = (g.rombelDiampu ?? []).map((r: any) => r.nama).join(', ') || '-';
                  return (
                    <option key={g.id} value={g.id}>
                      {g.nama} — {mapels} ({rombels})
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

          <div className="form-group" style={{ margin: 0, flex: '1 1 140px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
              SEMESTER
            </label>
            <select
              className="select-control"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            >
              <option value="GANJIL">Ganjil</option>
              <option value="GENAP">Genap</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0, flex: '1 1 150px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
              JENIS ASESMEN
            </label>
            <select
              className="select-control"
              value={jenis}
              onChange={(e) => setJenis(e.target.value)}
            >
              <option value="">Semua Jenis</option>
              <option value="HARIAN">Formatif Harian</option>
              <option value="TUGAS">Tugas / PR</option>
              <option value="UTS">Asesmen Tengah Semester</option>
              <option value="UAS">Asesmen Akhir Semester</option>
              <option value="SUMATIF">Sumatif Lingkup Materi</option>
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
                setSemester('GANJIL');
                setJenis('');
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
            isAuthorizedToEdit ? (
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
                  <strong>Otorisasi Pengampu Sah:</strong> Anda bertindak sebagai <strong>{chosenGuru?.nama}</strong>. Kombinasi kelas dan mata pelajaran ini sesuai dengan SK Mengajar Anda. Hak edit skor nilai diaktifkan.
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
                  <strong>Akses Dibatasi (Di Luar Penugasan SK):</strong> <strong>{chosenGuru?.nama}</strong> bukan guru pengampu untuk kelas / mata pelajaran ini. Tombol edit nilai dinonaktifkan untuk menjamin integritas data asesmen.
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
              <span><strong>Mode Administrator:</strong> Anda memiliki otorisasi penuh untuk mengelola dan memvalidasi seluruh data nilai di semua rombel dan mata pelajaran.</span>
            </div>
          )}
        </div>
      </div>

      {/* Panel Ringkasan Pembobotan Nilai Guru */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.25rem' }}>⚖️</span>
          <div style={{ fontSize: '0.875rem' }}>
            <strong>Bobot Penilaian {selectedMapel?.nama ? `Mapel ${selectedMapel.nama}` : 'Standar'}:</strong>{' '}
            <span style={{ color: 'var(--text-muted)' }}>
              Tugas: <strong style={{ color: 'var(--text-main)' }}>{activeBobot?.bobotTugas ?? 20}%</strong> •{' '}
              Formatif / UH: <strong style={{ color: 'var(--text-main)' }}>{activeBobot?.bobotHarian ?? 30}%</strong> •{' '}
              UTS: <strong style={{ color: 'var(--text-main)' }}>{activeBobot?.bobotUts ?? 25}%</strong> •{' '}
              UAS: <strong style={{ color: 'var(--text-main)' }}>{activeBobot?.bobotUas ?? 25}%</strong>
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleOpenBobotModal}
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            ⚙️ Konfigurasi Bobot
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleOpenTambahNilaiModal}
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            ➕ Input Penilaian Baru
          </button>
        </div>
      </div>

      {/* Ringkasan Statistik Nilai */}
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 12 }}>
          Statistik Capaian Siswa
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <StatCard
            title="Siswa Terinput Nilai"
            value={q.isPending ? '...' : String(totalSiswaDinilai)}
            subtitle="Record nilai tersimpan"
            icon="👥"
            colorVariant="primary"
          />
          <StatCard
            title="Nilai Rata-rata"
            value={q.isPending ? '...' : String(rerata)}
            subtitle="Rata-rata kelas terfilter"
            icon="📈"
            colorVariant="info"
          />
          <StatCard
            title="Nilai Tertinggi"
            value={q.isPending ? '...' : String(nilaiMax)}
            subtitle="Pencapaian skor maksimal"
            icon="🏆"
            colorVariant="success"
          />
          <StatCard
            title="Nilai Terendah"
            value={q.isPending ? '...' : String(nilaiMin)}
            subtitle="Perlu bimbingan / remedial"
            icon="⚠️"
            colorVariant="warning"
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
            Rekap Nilai Siswa
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Menampilkan {list.length} data nilai
          </div>
        </div>

        {q.isPending ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⏳</div>
            Memuat buku nilai siswa...
          </div>
        ) : q.isError ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--danger)' }}>
            Gagal memuat buku nilai. Pastikan server aktif.
          </div>
        ) : list.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📝</div>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.125rem' }}>
              Tidak ada data nilai ditemukan
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
              Pilih rombel dan mata pelajaran untuk melihat rekaman nilai siswa.
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
                DAFTAR REKAPITULASI HASIL ASESMEN NILAI SISWA
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>
                Tahun Ajaran 2026/2027 — Semester {semester}
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
                  <div><strong>Kelas / Rombel:</strong> {selectedRombel?.nama ? `Kelas ${selectedRombel.nama}` : 'Semua Rombel Terpilih'}</div>
                  <div><strong>Mata Pelajaran:</strong> {selectedMapel?.nama || 'Seluruh Mata Pelajaran'}</div>
                  <div><strong>Kriteria Ketuntasan Minimal (KKM):</strong> 75 (Skala 0–100)</div>
                </div>
                <div>
                  <div><strong>Guru Pengampu:</strong> {chosenGuru?.nama || 'Tim Guru Pengampu'}</div>
                  <div><strong>NIP Guru Pengampu:</strong> {chosenGuru?.nip || '-'}</div>
                  <div><strong>Wali Kelas:</strong> {selectedRombel?.waliKelas?.nama || '-'}</div>
                </div>
              </div>
            </div>

            <div className="data-table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '28%' }}>Siswa</th>
                    <th>Mata Pelajaran</th>
                    <th style={{ textAlign: 'center' }}>Semester</th>
                    <th style={{ textAlign: 'center' }}>Jenis</th>
                    <th>Judul / Materi</th>
                    <th style={{ textAlign: 'center' }}>Nilai</th>
                    <th style={{ textAlign: 'center' }}>Status KKM</th>
                    <th className="no-print" style={{ textAlign: 'center', width: 100 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((b) => {
                    const numVal = Number(b.nilai);
                    const isPass = !isNaN(numVal) && numVal >= 75;
                    return (
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
                                justifySelf: 'center',
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
                            {b.mapel.nama}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                            {b.semester}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Badge variant={getJenisBadge(b.jenis)}>{b.jenis}</Badge>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.8125rem',
                              fontWeight: b.judul ? 600 : 400,
                              color: b.judul ? 'var(--text-main)' : 'var(--text-muted)',
                            }}
                          >
                            {b.judul || '—'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: '1rem',
                              color: isPass ? '#15803d' : '#b91c1c',
                            }}
                          >
                            {String(b.nilai)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Badge variant={isPass ? 'success' : 'warning'}>
                            {isPass ? 'Tuntas KKM' : 'Remedial *'}
                          </Badge>
                        </td>
                        <td className="no-print" style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            disabled={!isAuthorizedToEdit}
                            className={`btn btn-secondary btn-sm ${!isAuthorizedToEdit ? 'disabled' : ''}`}
                            style={{
                              fontSize: 12,
                              padding: '4px 8px',
                              opacity: isAuthorizedToEdit ? 1 : 0.5,
                              cursor: isAuthorizedToEdit ? 'pointer' : 'not-allowed',
                            }}
                            onClick={() => {
                              if (!isAuthorizedToEdit) return;
                              setEditTarget(b);
                              setEditNilaiAngka(Number(b.nilai) || 75);
                            }}
                            title={
                              isAuthorizedToEdit
                                ? 'Ubah Skor Nilai Siswa'
                                : `Akses Terkunci: ${chosenGuru?.nama} bukan pengampu kelas/mapel ini`
                            }
                          >
                            {isAuthorizedToEdit ? 'Edit' : '🔒 Terkunci'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
                  {isGuruSelected ? `Guru Pengampu (${selectedMapel?.nama || 'Mapel'})` : 'Guru Mata Pelajaran'}
                </div>
                <div style={{ height: 50 }} />
                <div style={{ fontWeight: 900, textDecoration: 'underline' }}>
                  {chosenGuru?.nama || 'Tim Guru Mata Pelajaran'}
                </div>
                <div>NIP. {chosenGuru?.nip || '...................................'}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Dialog Opsi Cetak Laporan Nilai Resmi */}
      {showPrintModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowPrintModal(false)}
          title="Cetak Dokumen Resmi Nilai Siswa"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Pilih cakupan dan format cetak dokumen nilai asesmen siswa sesuai standar kedinasan SMP Negeri.
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, background: 'var(--bg-subtle)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-main)' }}>
                INFORMASI DOKUMEN CETAK:
              </div>
              <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><strong>Kelas:</strong> {selectedRombel?.nama ? `Kelas ${selectedRombel.nama}` : 'Semua Kelas Terfilter'}</div>
                <div><strong>Mata Pelajaran:</strong> {selectedMapel?.nama || 'Semua Mata Pelajaran'}</div>
                <div><strong>Guru Pengampu:</strong> {chosenGuru?.nama || 'Administrator / Seluruh Pengampu'}</div>
                <div><strong>Wali Kelas:</strong> {selectedRombel?.waliKelas?.nama || '-'}</div>
                <div><strong>Jumlah Siswa Dinilai:</strong> {totalSiswaDinilai} siswa (Rata-rata: {rerata})</div>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
                LINGKUP DOKUMEN CETAK
              </label>
              <select
                className="select"
                value={printScope}
                onChange={(e) => setPrintScope(e.target.value as any)}
              >
                <option value="kelas-mapel">
                  📄 Dokumen Nilai Per Kelas &amp; Mapel Aktif ({selectedRombel?.nama ? `Kelas ${selectedRombel.nama}` : 'Terfilter'})
                </option>
                <option value="guru-multi">
                  📑 Portofolio Lengkap Seluruh Kelas yang Diajar Guru Ini ({chosenGuru?.nama || 'Guru Terpilih'})
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
                  exportNilaiCSV();
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
                <span>🖨️ Cetak / Simpan PDF</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Edit Nilai Siswa */}
      {editTarget && (
        <Modal
          isOpen={true}
          onClose={() => setEditTarget(null)}
          title={`Edit Nilai: ${editTarget.siswa.nama}`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editNilaiAngka < 0 || editNilaiAngka > 100) {
                alert('Skor nilai harus berada di rentang 0 sampai 100');
                return;
              }
              updateMutasi.mutate({
                id: editTarget.id,
                nilai: editNilaiAngka,
              });
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              <div><strong>Mata Pelajaran:</strong> {editTarget.mapel.nama}</div>
              <div><strong>Jenis Asesmen:</strong> {editTarget.jenis} (Semester {editTarget.semester})</div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>
                SKOR NILAI (0 - 100) *
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step="any"
                className="input"
                value={editNilaiAngka}
                onChange={(e) => setEditNilaiAngka(Number(e.target.value))}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setEditTarget(null)}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={updateMutasi.isPending}
              >
                {updateMutasi.isPending ? 'Menyimpan…' : 'Simpan Nilai'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Atur Bobot Penilaian Guru */}
      {showBobotModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowBobotModal(false)}
          title="Atur Bobot Penilaian Mata Pelajaran"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const total = Number(bobotTugas) + Number(bobotHarian) + Number(bobotUts) + Number(bobotUas);
              if (total !== 100) {
                toast(`Total persentase bobot harus 100% (saat ini ${total}%)`, 'danger');
                return;
              }
              if (!bobotMapelId) {
                toast('Pilih mata pelajaran terlebih dahulu', 'danger');
                return;
              }
              if (!activeTaId) {
                toast('Tahun ajaran aktif belum dipilih', 'danger');
                return;
              }
              saveBobotMutation.mutate({
                mapelId: bobotMapelId,
                tahunAjaranId: activeTaId,
                bobotTugas: Number(bobotTugas),
                bobotHarian: Number(bobotHarian),
                bobotUts: Number(bobotUts),
                bobotUas: Number(bobotUas),
              });
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Tentukan porsi persentase setiap komponen penilaian untuk perhitungan nilai akhir rapor siswa. Total akumulasi seluruh komponen wajib berjumlah tepat <strong>100%</strong>.
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                MATA PELAJARAN *
              </label>
              <select
                className="select-control"
                value={bobotMapelId}
                onChange={(e) => setBobotMapelId(e.target.value)}
                required
              >
                <option value="">-- Pilih Mata Pelajaran --</option>
                {mapelList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nama}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  BOBOT TUGAS / PR (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="input"
                  value={bobotTugas}
                  onChange={(e) => setBobotTugas(Number(e.target.value))}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  BOBOT ULANGAN HARIAN / FORMATIF (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="input"
                  value={bobotHarian}
                  onChange={(e) => setBobotHarian(Number(e.target.value))}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  BOBOT UTS / ASESMEN TENGAH (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="input"
                  value={bobotUts}
                  onChange={(e) => setBobotUts(Number(e.target.value))}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  BOBOT UAS / ASESMEN AKHIR (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="input"
                  value={bobotUas}
                  onChange={(e) => setBobotUas(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            {/* Indikator Total Kalkulasi */}
            {(() => {
              const total = Number(bobotTugas) + Number(bobotHarian) + Number(bobotUts) + Number(bobotUas);
              const isValid = total === 100;
              return (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 6,
                    backgroundColor: isValid ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${isValid ? '#bbf7d0' : '#fecaca'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div style={{ color: isValid ? '#15803d' : '#b91c1c', fontWeight: 600 }}>
                    {isValid
                      ? '✅ Total Persentase Tepat 100% (Sesuai Syarat)'
                      : `⚠️ Total Persentase: ${total}% (Harus berjumlah tepat 100%)`}
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                    onClick={() => {
                      setBobotTugas(20);
                      setBobotHarian(30);
                      setBobotUts(25);
                      setBobotUas(25);
                    }}
                  >
                    Reset Standar (20:30:25:25)
                  </button>
                </div>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowBobotModal(false)}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  saveBobotMutation.isPending ||
                  Number(bobotTugas) + Number(bobotHarian) + Number(bobotUts) + Number(bobotUas) !== 100
                }
              >
                {saveBobotMutation.isPending ? 'Menyimpan…' : 'Simpan Konfigurasi Bobot'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Tambah Penilaian Baru (Tugas / UH / Asesmen Lain) */}
      {showTambahNilaiModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowTambahNilaiModal(false)}
          title="Input Penilaian Baru (Tugas / Ulangan Harian / Asesmen)"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '75vh', overflowY: 'auto' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Buat catatan penilaian baru untuk kelas dan mata pelajaran yang Anda ampu, lalu masukkan skor nilai siswa secara kolektif.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  KELAS / ROMBEL *
                </label>
                <select
                  className="select-control"
                  value={tambahRombelId}
                  onChange={(e) => setTambahRombelId(e.target.value)}
                  required
                >
                  <option value="">-- Pilih Kelas --</option>
                  {rombelList.map((r) => (
                    <option key={r.id} value={r.id}>
                      Kelas {r.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  MATA PELAJARAN *
                </label>
                <select
                  className="select-control"
                  value={tambahMapelId}
                  onChange={(e) => setTambahMapelId(e.target.value)}
                  required
                >
                  <option value="">-- Pilih Mapel --</option>
                  {mapelList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  SEMESTER *
                </label>
                <select
                  className="select-control"
                  value={tambahSemester}
                  onChange={(e) => setTambahSemester(e.target.value)}
                >
                  <option value="GANJIL">Ganjil</option>
                  <option value="GENAP">Genap</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  JENIS ASESMEN *
                </label>
                <select
                  className="select-control"
                  value={tambahJenis}
                  onChange={(e) => setTambahJenis(e.target.value)}
                >
                  <option value="HARIAN">Formatif / Ulangan Harian</option>
                  <option value="TUGAS">Tugas / PR / Mandiri</option>
                  <option value="UTS">Asesmen Tengah Semester (UTS)</option>
                  <option value="UAS">Asesmen Akhir Semester (UAS)</option>
                  <option value="SUMATIF">Sumatif Lingkup Materi</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                JUDUL / TOPIK ASESMEN (OPSIONAL, MISAL: &ldquo;UH 1 BAB BILANGAN BULAT&rdquo;)
              </label>
              <input
                type="text"
                className="input"
                placeholder="Contoh: Ulangan Harian 1, Tugas Bab 2, Remedial UTS..."
                value={tambahJudul}
                onChange={(e) => setTambahJudul(e.target.value)}
              />
            </div>

            {/* Quick Fill Nilai Serentak */}
            {modalSiswaList.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: 6,
                  fontSize: '0.8125rem',
                }}
              >
                <span>⚡ <strong>Isi Cepat:</strong></span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  style={{ width: 70, padding: '4px 8px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                  value={nilaiSerentak}
                  onChange={(e) => setNilaiSerentak(e.target.value)}
                  placeholder="Skor"
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const val = Number(nilaiSerentak);
                    if (isNaN(val) || val < 0 || val > 100) {
                      toast('Nilai harus di rentang 0-100', 'danger');
                      return;
                    }
                    const updated: Record<string, number> = {};
                    modalSiswaList.forEach((s) => {
                      updated[s.id] = val;
                    });
                    setSiswaNilaiMap(updated);
                    toast(`Semua siswa diisi nilai ${val}`, 'success');
                  }}
                  style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                >
                  Terapkan ke Semua Siswa ({modalSiswaList.length})
                </button>
              </div>
            )}

            {/* Tabel Input Nilai Siswa */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-subtle)',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>Daftar Siswa Kelas Terpilih</span>
                <span>{modalSiswaList.length} Siswa</span>
              </div>

              {!tambahRombelId ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  Pilih Kelas / Rombel terlebih dahulu untuk menampilkan daftar siswa.
                </div>
              ) : modalSiswaQuery.isPending ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                  ⏳ Memuat siswa rombel...
                </div>
              ) : modalSiswaList.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  Belum ada siswa terdaftar di rombel ini.
                </div>
              ) : (
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  <table className="data-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: 'center' }}>No</th>
                        <th>Nama Siswa</th>
                        <th>NISN</th>
                        <th style={{ width: 140, textAlign: 'center' }}>Skor Nilai (0-100)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalSiswaList.map((s, idx) => (
                        <tr key={s.id}>
                          <td style={{ textAlign: 'center', fontSize: '0.8125rem' }}>{idx + 1}</td>
                          <td style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.nama}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{s.nisn || '-'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="any"
                              className="input"
                              placeholder="0 - 100"
                              style={{ width: 90, textAlign: 'center', padding: '4px 6px', margin: '0 auto' }}
                              value={siswaNilaiMap[s.id] ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSiswaNilaiMap((prev) => ({
                                  ...prev,
                                  [s.id]: val === '' ? '' : Number(val),
                                }));
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowTambahNilaiModal(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saveBulkNilaiMutation.isPending || modalSiswaList.length === 0}
                onClick={() => saveBulkNilaiMutation.mutate()}
              >
                {saveBulkNilaiMutation.isPending ? 'Menyimpan Nilai…' : 'Simpan Semua Nilai'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
