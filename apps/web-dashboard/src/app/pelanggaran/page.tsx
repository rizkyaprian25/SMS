'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { pesanError } from '@/components/import-siswa';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

interface Kasus {
  id: string;
  tanggal: string;
  kategori: string;
  poin: number;
  keterangan: string | null;
  siswa: { id: string; nama: string; rombel?: { nama: string } };
}

interface SiswaItem {
  id: string;
  nama: string;
  nisn?: string;
  rombel?: { nama: string };
}

const KATEGORI_PELANGGARAN = [
  { nama: 'Keterlambatan Masuk Sekolah', defaultPoin: 5 },
  { nama: 'Ketidaksesuaian Seragam / Atribut', defaultPoin: 5 },
  { nama: 'Meninggalkan Kelas Tanpa Izin (Bolos)', defaultPoin: 15 },
  { nama: 'Penggunaan Handphone Saat Pembelajaran', defaultPoin: 10 },
  { nama: 'Perkelahian / Kekerasan Fisik', defaultPoin: 50 },
  { nama: 'Merokok / Rokok Elektrik di Lingkungan Sekolah', defaultPoin: 40 },
  { nama: 'Tindakan Merusak Fasilitas Sekolah', defaultPoin: 30 },
  { nama: 'Lainnya', defaultPoin: 10 },
];

export default function PelanggaranPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedSiswa, setSelectedSiswa] = useState<SiswaItem | null>(null);
  const [cariSiswaText, setCariSiswaText] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state untuk modal tambah
  const [formSiswa, setFormSiswa] = useState<SiswaItem | null>(null);
  const [formCariText, setFormCariText] = useState('');
  const [formKategori, setFormKategori] = useState(KATEGORI_PELANGGARAN[0].nama);
  const [formPoin, setFormPoin] = useState(KATEGORI_PELANGGARAN[0].defaultPoin);

  // State untuk Edit & Hapus
  const [editTarget, setEditTarget] = useState<Kasus | null>(null);
  const [editKategori, setEditKategori] = useState(KATEGORI_PELANGGARAN[0].nama);
  const [editPoin, setEditPoin] = useState(KATEGORI_PELANGGARAN[0].defaultPoin);
  const [editKeterangan, setEditKeterangan] = useState('');
  const [editTanggal, setEditTanggal] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Kasus | null>(null);

  // State untuk Surat Panggilan Orang Tua Resmi (SP 1, SP 2, SP 3)
  const [suratTarget, setSuratTarget] = useState<{
    siswa: SiswaItem;
    totalPoin: number;
    kasusList: Kasus[];
    spLevel: 'SP 1' | 'SP 2' | 'SP 3';
  } | null>(null);
  const [nomorSurat, setNomorSurat] = useState('421.3 / 084 / SMP-BK / IX / 2026');
  const [hariTanggalTemu, setHariTanggalTemu] = useState('Senin, 15 September 2026');
  const [jamTemu, setJamTemu] = useState('09.00 WIB s/d selesai');
  const [tempatTemu, setTempatTemu] = useState('Ruang Bimbingan & Konseling (BK) SMP Negeri');
  const [menghadap, setMenghadap] = useState('Nika Musrifah, S.Pd (Guru BK) & Wali Kelas');

  // Query seluruh data kasus untuk deteksi akumulasi poin (Threshold Monitoring)
  const qAll = useQuery<{ data: Kasus[] }>({
    queryKey: ['pelanggaran-all-monitoring'],
    queryFn: async () => (await api.get('/pelanggaran', { params: { limit: 200 } })).data,
    retry: false,
  });

  // Query pencarian siswa untuk filter
  const siswaCari = useQuery<{ data: SiswaItem[] }>({
    queryKey: ['siswa-cari-bk', cariSiswaText],
    queryFn: async () => (await api.get('/siswa', { params: { q: cariSiswaText, limit: 5 } })).data,
    enabled: cariSiswaText.length >= 2,
    retry: false,
  });

  // Query pencarian siswa di dalam form modal
  const formSiswaCari = useQuery<{ data: SiswaItem[] }>({
    queryKey: ['siswa-cari-form-bk', formCariText],
    queryFn: async () => (await api.get('/siswa', { params: { q: formCariText, limit: 5 } })).data,
    enabled: formCariText.length >= 2,
    retry: false,
  });

  // Query kasus
  const q = useQuery<{ data: Kasus[] }>({
    queryKey: qk.pelanggaran(selectedSiswa?.id ?? ''),
    queryFn: async () =>
      (await api.get('/pelanggaran', { params: { siswaId: selectedSiswa?.id || undefined } })).data,
    retry: false,
  });

  // Query total poin untuk siswa terpilih
  const total = useQuery<{ data: { totalPoin: number; jumlahKasus: number } }>({
    queryKey: ['pelanggaran-total', selectedSiswa?.id ?? ''],
    queryFn: async () => (await api.get('/pelanggaran/total', { params: { siswaId: selectedSiswa!.id } })).data,
    enabled: !!selectedSiswa,
    retry: false,
  });

  const catat = useMutation({
    mutationFn: async (v: Record<string, unknown>) => (await api.post('/pelanggaran', v)).data,
    onSuccess: () => {
      toast('Catatan pelanggaran berhasil disimpan!', 'success');
      qc.invalidateQueries({ queryKey: ['pelanggaran'] });
      qc.invalidateQueries({ queryKey: ['pelanggaran-total'] });
      setShowAddModal(false);
      setFormSiswa(null);
      setFormCariText('');
      catat.reset();
    },
    onError: (err) => {
      toast(pesanError(err), 'danger');
    },
  });

  const updateMutasi = useMutation({
    mutationFn: async (payload: { id: string; kategori: string; poin: number; keterangan?: string; tanggal?: string }) =>
      (
        await api.patch(`/pelanggaran/${payload.id}`, {
          kategori: payload.kategori,
          poin: payload.poin,
          keterangan: payload.keterangan || undefined,
          tanggal: payload.tanggal || undefined,
        })
      ).data,
    onSuccess: () => {
      toast('Catatan kasus berhasil diperbarui!', 'success');
      qc.invalidateQueries({ queryKey: ['pelanggaran'] });
      qc.invalidateQueries({ queryKey: ['pelanggaran-total'] });
      setEditTarget(null);
    },
    onError: (err) => {
      toast(pesanError(err), 'danger');
    },
  });

  const hapusMutasi = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/pelanggaran/${id}`)).data,
    onSuccess: () => {
      toast('Catatan pelanggaran berhasil dihapus!', 'success');
      qc.invalidateQueries({ queryKey: ['pelanggaran'] });
      qc.invalidateQueries({ queryKey: ['pelanggaran-total'] });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast(pesanError(err), 'danger');
    },
  });

  const list = q.data?.data ?? [];

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

  const getTingkatSanksi = (poin: number) => {
    if (poin >= 50) {
      return { teks: 'Panggilan Orang Tua & Skorsing', variant: 'danger' as const };
    } else if (poin >= 25) {
      return { teks: 'Peringatan Tertulis & Pembinaan BK', variant: 'warning' as const };
    } else if (poin > 0) {
      return { teks: 'Teguran Lisan Guru BK', variant: 'info' as const };
    }
    return { teks: 'Catatan Bersih', variant: 'success' as const };
  };

  // Agregasi poin per siswa dari seluruh data kasus
  const siswaPoinMap = new Map<string, { siswa: SiswaItem; totalPoin: number; kasusList: Kasus[] }>();
  for (const k of qAll.data?.data ?? []) {
    const sId = k.siswa.id;
    const entry = siswaPoinMap.get(sId) ?? { siswa: k.siswa, totalPoin: 0, kasusList: [] as Kasus[] };
    entry.totalPoin += k.poin;
    entry.kasusList.push(k);
    siswaPoinMap.set(sId, entry);
  }
  const siswaPerluPenanganan = Array.from(siswaPoinMap.values())
    .filter((x) => x.totalPoin >= 25)
    .sort((a, b) => b.totalPoin - a.totalPoin);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Catatan Bimbingan Konseling &amp; Pelanggaran
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4, margin: 0 }}>
            Pencatatan pelanggaran tata tertib sekolah, monitoring akumulasi poin sanksi, dan tindak lanjut BK.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setFormSiswa(null);
            setFormCariText('');
            setShowAddModal(true);
          }}
        >
          ✍️ Catat Kasus Baru
        </button>
      </div>

      {/* BANNER MONITORING SISWA PERLU PENANGANAN KHUSUS (AMBANG BATAS BK) */}
      {siswaPerluPenanganan.length > 0 && (
        <div
          className="card"
          style={{
            padding: '1.25rem 1.5rem',
            border: '2px solid rgba(239, 68, 68, 0.3)',
            background: 'linear-gradient(135deg, rgba(254, 242, 242, 0.8) 0%, rgba(255, 255, 255, 0.95) 100%)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.5rem' }}>🚨</span>
              <div>
                <div style={{ fontWeight: 800, color: '#b91c1c', fontSize: '1rem' }}>
                  Monitoring Kasus BK — Siswa Mencapai Ambang Batas Sanksi ({siswaPerluPenanganan.length} Siswa)
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#7f1d1d' }}>
                  Siswa dengan akumulasi poin ≥ 25 memerlukan penerbitan Surat Panggilan Orang Tua (SP 1, SP 2, atau SP 3).
                </div>
              </div>
            </div>
            <Badge variant="danger">{siswaPerluPenanganan.length} Perlu Tindakan</Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {siswaPerluPenanganan.map((item) => {
              const spLevel: 'SP 1' | 'SP 2' | 'SP 3' =
                item.totalPoin >= 75 ? 'SP 3' : item.totalPoin >= 50 ? 'SP 2' : 'SP 1';
              return (
                <div
                  key={item.siswa.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: '#fff',
                    border: '1px solid #fecaca',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 13 }}>
                        {item.siswa.nama}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {item.siswa.rombel?.nama ? `Kelas ${item.siswa.rombel.nama}` : 'Tanpa Kelas'}{' '}
                        {item.siswa.nisn ? `• NISN: ${item.siswa.nisn}` : ''}
                      </div>
                    </div>
                    <Badge variant={spLevel === 'SP 3' ? 'danger' : 'warning'}>
                      {spLevel} ({item.totalPoin} Poin)
                    </Badge>
                  </div>

                  <div style={{ fontSize: 11, color: '#4b5563' }}>
                    Tercatat <strong>{item.kasusList.length} kasus pelanggaran</strong> aktif.
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{
                      width: '100%',
                      fontSize: 11,
                      gap: 6,
                      color: '#b91c1c',
                      borderColor: '#fca5a5',
                      fontWeight: 600,
                    }}
                    onClick={() =>
                      setSuratTarget({
                        siswa: item.siswa,
                        totalPoin: item.totalPoin,
                        kasusList: item.kasusList,
                        spLevel,
                      })
                    }
                  >
                    📨 Terbitkan Surat Panggilan ({spLevel})
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter & Pencarian Siswa */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
            FILTER DATA SISWA
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {selectedSiswa ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 14px',
                  borderRadius: 20,
                  backgroundColor: '#e0e7ff',
                  color: '#3730a3',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                <span>👤 {selectedSiswa.nama}</span>
                {selectedSiswa.rombel && (
                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({selectedSiswa.rombel.nama})</span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSiswa(null);
                    setCariSiswaText('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#3730a3',
                    fontWeight: 700,
                    padding: 0,
                    marginLeft: 4,
                  }}
                  title="Hapus filter siswa"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Ketik minimal 2 huruf nama siswa..."
                  value={cariSiswaText}
                  onChange={(e) => setCariSiswaText(e.target.value)}
                />

                {cariSiswaText.length >= 2 && siswaCari.data?.data && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 10,
                      backgroundColor: '#ffffff',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      marginTop: 4,
                      maxHeight: 200,
                      overflowY: 'auto',
                    }}
                  >
                    {siswaCari.data.data.length === 0 ? (
                      <div style={{ padding: '0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Siswa tidak ditemukan.
                      </div>
                    ) : (
                      siswaCari.data.data.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedSiswa(s);
                            setCariSiswaText('');
                          }}
                          style={{
                            padding: '0.75rem 1rem',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f1f5f9',
                            fontSize: '0.875rem',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                        >
                          <b>{s.nama}</b>{' '}
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {s.rombel?.nama ? `(${s.rombel.nama})` : ''} {s.nisn ? `• NISN: ${s.nisn}` : ''}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {selectedSiswa
                ? 'Menampilkan rekam jejak siswa ini.'
                : 'Kosongkan filter untuk melihat semua catatan pelanggaran terkini.'}
            </span>
          </div>
        </div>
      </div>

      {/* Stat Cards Siswa (Jika Filter Siswa Aktif) */}
      {selectedSiswa && total.data?.data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <StatCard
            title="Total Poin Akumulasi"
            value={String(total.data.data.totalPoin)}
            subtitle="Poin pelanggaran siswa"
            icon="⚠️"
            colorVariant={total.data.data.totalPoin >= 50 ? 'danger' : total.data.data.totalPoin >= 25 ? 'warning' : 'primary'}
          />
          <StatCard
            title="Jumlah Kasus Tercatat"
            value={String(total.data.data.jumlahKasus)}
            subtitle="Riwayat catatan BK"
            icon="📋"
            colorVariant="neutral"
          />
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              STATUS TINDAK LANJUT BK
            </div>
            <div style={{ marginTop: 8 }}>
              <Badge variant={getTingkatSanksi(total.data.data.totalPoin).variant} style={{ fontSize: '0.875rem', padding: '6px 12px' }}>
                {getTingkatSanksi(total.data.data.totalPoin).teks}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Table Kasus */}
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
            Daftar Kasus Pelanggaran
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Menampilkan {list.length} catatan
          </div>
        </div>

        {q.isPending ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⏳</div>
            Memuat catatan kasus...
          </div>
        ) : q.isError ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--danger)' }}>
            Gagal memuat catatan kasus (hanya dapat diakses oleh Admin, Guru BK, dan Wali Kelas binaan).
          </div>
        ) : list.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🛡️</div>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.125rem' }}>
              Tidak ada catatan pelanggaran
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
              {selectedSiswa
                ? 'Siswa ini belum memiliki riwayat pelanggaran tata tertib.'
                : 'Belum ada data kasus yang dicatat di sistem.'}
            </p>
          </div>
        ) : (
          <div className="data-table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Tanggal</th>
                  <th style={{ width: '220px' }}>Siswa</th>
                  <th>Kategori Pelanggaran</th>
                  <th style={{ textAlign: 'center', width: '90px' }}>Poin</th>
                  <th>Keterangan / Tindak Lanjut</th>
                  <th style={{ textAlign: 'center', width: '120px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.map((k) => (
                  <tr key={k.id}>
                    <td style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {k.tanggal.slice(0, 10)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(k.siswa.nama)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {k.siswa.nama}
                          </div>
                          {k.siswa.rombel && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Kelas: {k.siswa.rombel.nama}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge variant="warning">{k.kategori}</Badge>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 6,
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          fontWeight: 700,
                          fontSize: '0.875rem',
                        }}
                      >
                        +{k.poin}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>
                        {k.keterangan || '-'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 11, padding: '4px 8px', color: '#b45309', borderColor: '#fde68a', fontWeight: 600 }}
                          onClick={() => {
                            const entry = siswaPoinMap.get(k.siswa.id);
                            const tot = entry?.totalPoin ?? k.poin;
                            const spLevel: 'SP 1' | 'SP 2' | 'SP 3' = tot >= 75 ? 'SP 3' : tot >= 50 ? 'SP 2' : 'SP 1';
                            setSuratTarget({
                              siswa: k.siswa,
                              totalPoin: tot,
                              kasusList: entry?.kasusList || [k],
                              spLevel,
                            });
                          }}
                          title="Terbitkan Surat Panggilan Orang Tua"
                        >
                          📨 SP
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: 12, padding: '4px 8px' }}
                          onClick={() => {
                            setEditTarget(k);
                            setEditKategori(k.kategori);
                            setEditPoin(k.poin);
                            setEditKeterangan(k.keterangan || '');
                            setEditTanggal(k.tanggal.slice(0, 10));
                          }}
                          title="Ubah Kasus"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 12, padding: '4px 8px', color: 'var(--danger)' }}
                          onClick={() => setDeleteTarget(k)}
                          title="Hapus Catatan"
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
      </div>

      {/* Modal Catat Kasus Baru */}
      {showAddModal && (
        <Modal title="Catat Pelanggaran Tata Tertib" onClose={() => setShowAddModal(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!formSiswa) {
                alert('Pilih siswa terlebih dahulu!');
                return;
              }
              const fd = new FormData(e.currentTarget);
              catat.mutate({
                siswaId: formSiswa.id,
                tanggal: String(fd.get('tanggal')),
                kategori: formKategori,
                poin: Number(formPoin),
                keterangan: String(fd.get('keterangan') || ''),
              });
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {/* Input Pemilihan Siswa */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">PILIH SISWA</label>
              {formSiswa ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 8,
                    backgroundColor: '#e0e7ff',
                    color: '#3730a3',
                    fontWeight: 600,
                  }}
                >
                  <span>
                    👤 {formSiswa.nama}{' '}
                    {formSiswa.rombel ? `(${formSiswa.rombel.nama})` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormSiswa(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#3730a3',
                      fontWeight: 700,
                    }}
                  >
                    Ganti Siswa
                  </button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Cari nama siswa..."
                    value={formCariText}
                    onChange={(e) => setFormCariText(e.target.value)}
                  />
                  {formCariText.length >= 2 && formSiswaCari.data?.data && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 20,
                        backgroundColor: '#ffffff',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        marginTop: 4,
                        maxHeight: 180,
                        overflowY: 'auto',
                      }}
                    >
                      {formSiswaCari.data.data.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setFormSiswa(s);
                            setFormCariText('');
                          }}
                          style={{
                            padding: '0.75rem 1rem',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f1f5f9',
                            fontSize: '0.875rem',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                        >
                          <b>{s.nama}</b>{' '}
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {s.rombel?.nama ? `(${s.rombel.nama})` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">TANGGAL KEJADIAN</label>
              <input
                name="tanggal"
                type="date"
                className="input-control"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">KATEGORI PELANGGARAN</label>
              <select
                className="select-control"
                value={formKategori}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormKategori(val);
                  const preset = KATEGORI_PELANGGARAN.find((k) => k.nama === val);
                  if (preset) setFormPoin(preset.defaultPoin);
                }}
              >
                {KATEGORI_PELANGGARAN.map((k) => (
                  <option key={k.nama} value={k.nama}>
                    {k.nama} (+{k.defaultPoin} poin)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">BOBOT POIN SANKSI</label>
              <input
                name="poin"
                type="number"
                min={1}
                className="input-control"
                value={formPoin}
                onChange={(e) => setFormPoin(Number(e.target.value))}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">KETERANGAN / TINDAK LANJUT</label>
              <textarea
                name="keterangan"
                className="textarea-control"
                rows={3}
                placeholder="Catatan kronologi kejadian atau teguran yang diberikan..."
              />
            </div>

            {catat.isError && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: 8,
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  fontSize: '0.875rem',
                }}
              >
                {pesanError(catat.error)}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAddModal(false)}
                disabled={catat.isPending}
              >
                Batal
              </button>
              <button type="submit" className="btn btn-primary" disabled={catat.isPending}>
                {catat.isPending ? 'Menyimpan...' : 'Simpan Kasus Pelanggaran'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Edit Kasus Pelanggaran */}
      {editTarget && (
        <Modal
          title={`Edit Catatan Kasus: ${editTarget.siswa.nama}`}
          onClose={() => setEditTarget(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutasi.mutate({
                id: editTarget.id,
                kategori: editKategori,
                poin: Number(editPoin),
                keterangan: editKeterangan,
                tanggal: editTanggal,
              });
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">TANGGAL KEJADIAN</label>
              <input
                type="date"
                className="input-control"
                value={editTanggal}
                onChange={(e) => setEditTanggal(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">KATEGORI PELANGGARAN</label>
              <select
                className="select-control"
                value={editKategori}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditKategori(val);
                  const preset = KATEGORI_PELANGGARAN.find((k) => k.nama === val);
                  if (preset) setEditPoin(preset.defaultPoin);
                }}
              >
                {KATEGORI_PELANGGARAN.map((k) => (
                  <option key={k.nama} value={k.nama}>
                    {k.nama} (+{k.defaultPoin} poin)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">BOBOT POIN SANKSI</label>
              <input
                type="number"
                min={1}
                className="input-control"
                value={editPoin}
                onChange={(e) => setEditPoin(Number(e.target.value))}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">KETERANGAN / TINDAK LANJUT</label>
              <textarea
                className="textarea-control"
                rows={3}
                value={editKeterangan}
                onChange={(e) => setEditKeterangan(e.target.value)}
                placeholder="Catatan kronologi kejadian atau teguran yang diberikan..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditTarget(null)}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={updateMutasi.isPending}
              >
                {updateMutasi.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Konfirmasi Hapus Pelanggaran */}
      {deleteTarget && (
        <Modal title="Hapus Catatan Pelanggaran" onClose={() => setDeleteTarget(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.9375rem' }}>
              Apakah Anda yakin ingin menghapus catatan pelanggaran <strong>{deleteTarget.kategori}</strong> untuk siswa{' '}
              <strong>{deleteTarget.siswa.nama}</strong> (+{deleteTarget.poin} poin)?
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Poin sanksi siswa akan otomatis dikurangi kembali.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteTarget(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={hapusMutasi.isPending}
                onClick={() => hapusMutasi.mutate(deleteTarget.id)}
              >
                {hapusMutasi.isPending ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Cetak Surat Panggilan Orang Tua Resmi (SP 1, SP 2, SP 3) */}
      {suratTarget && (
        <Modal
          title={`📨 Cetak Surat Panggilan Orang Tua — ${suratTarget.siswa.nama} (${suratTarget.spLevel})`}
          onClose={() => setSuratTarget(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Form Pengaturan Surat (No-Print) */}
            <div
              className="no-print"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: '12px 14px',
                background: 'var(--bg-subtle)',
                borderRadius: 8,
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>
                ⚙️ Parameter Lembar Surat Kedinasan
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 2 }}>
                    NOMOR SURAT RESMI
                  </label>
                  <input
                    className="input"
                    style={{ fontSize: 12 }}
                    value={nomorSurat}
                    onChange={(e) => setNomorSurat(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 2 }}>
                    TINGKAT SURAT PANGGILAN
                  </label>
                  <select
                    className="input"
                    style={{ fontSize: 12 }}
                    value={suratTarget.spLevel}
                    onChange={(e) =>
                      setSuratTarget({
                        ...suratTarget,
                        spLevel: e.target.value as 'SP 1' | 'SP 2' | 'SP 3',
                      })
                    }
                  >
                    <option value="SP 1">Surat Panggilan I (SP 1) — Peringatan Awal</option>
                    <option value="SP 2">Surat Panggilan II (SP 2) — Peringatan Keras</option>
                    <option value="SP 3">Surat Panggilan III (SP 3) — Skorsing &amp; Konferensi</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 2 }}>
                    HARI &amp; TANGGAL PERTEMUAN
                  </label>
                  <input
                    className="input"
                    style={{ fontSize: 12 }}
                    value={hariTanggalTemu}
                    onChange={(e) => setHariTanggalTemu(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 2 }}>
                    JAM / WAKTU
                  </label>
                  <input
                    className="input"
                    style={{ fontSize: 12 }}
                    value={jamTemu}
                    onChange={(e) => setJamTemu(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSuratTarget(null)}
                >
                  Tutup
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', border: 'none', gap: 6 }}
                  onClick={() => window.print()}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  🖨️ Cetak Surat Panggilan Resmi (A4)
                </button>
              </div>
            </div>

            {/* LEMBAR DOKUMEN CETAK RESMI (A4 PORTRAIT) */}
            <div
              style={{
                maxHeight: '62vh',
                overflowY: 'auto',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                background: '#ffffff',
                padding: '28px 32px',
                color: '#000',
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              {/* KOP SURAT RESMI */}
              <div
                style={{
                  textAlign: 'center',
                  borderBottom: '2.5px solid #000',
                  paddingBottom: 8,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em' }}>
                  PEMERINTAH DAERAH KABUPATEN / KOTA
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em' }}>
                  DINAS PENDIDIKAN DAN KEBUDAYAAN
                </div>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.03em', marginTop: 2 }}>
                  SMP NEGERI
                </div>
                <div style={{ fontSize: 10, color: '#4b5563' }}>
                  Jl. Pendidikan Terpadu No. 1 • Telp. (021) 7654321 • NPSN: 20210001 • Akreditasi: A (Unggul)
                </div>
              </div>

              {/* TANGGAL & NOMOR SURAT */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div>Nomor : <strong>{nomorSurat}</strong></div>
                  <div>Lampiran : 1 (satu) Berkas Lembar Rekap Kasus</div>
                  <div>
                    Perihal : <strong>SURAT PANGGILAN ORANG TUA / WALI ({suratTarget.spLevel})</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  Kota Kedinasan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>

              {/* KEPADA YTH */}
              <div style={{ marginBottom: 14 }}>
                <div>Kepada Yth.</div>
                <div style={{ fontWeight: 700 }}>Bapak / Ibu Orang Tua / Wali Peserta Didik</div>
                <div>Dari: <strong>{suratTarget.siswa.nama}</strong> (NISN: {suratTarget.siswa.nisn || '-'})</div>
                <div>Kelas: <strong>{suratTarget.siswa.rombel?.nama ? `Kelas ${suratTarget.siswa.rombel.nama}` : '-'}</strong></div>
                <div>di Tempat</div>
              </div>

              {/* ISI SURAT */}
              <div style={{ marginBottom: 14, textAlign: 'justify' }}>
                Dengan hormat,
                <br />
                Sehubungan dengan pemantauan kedisiplinan dan tata tertib peserta didik di lingkungan SMP Negeri, bersama surat ini kami memberitahukan bahwa putra/putri Bapak/Ibu tercatat telah mengakumulasikan total <strong>{suratTarget.totalPoin} Poin Pelanggaran Tata Tertib</strong>, yang telah melampaui ambang batas sanksi kategori <strong>{suratTarget.spLevel}</strong>.
              </div>

              {/* TABEL RINCIAN KASUS */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Rincian Catatan Kasus Pelanggaran Terakhir:</div>
                <table className="table" style={{ fontSize: 11, margin: 0 }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6' }}>
                      <th style={{ width: 30, textAlign: 'center' }}>No</th>
                      <th style={{ width: 90 }}>Tanggal</th>
                      <th>Kategori Pelanggaran</th>
                      <th style={{ width: 60, textAlign: 'center' }}>Poin</th>
                      <th>Keterangan / Tindak Lanjut Awal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suratTarget.kasusList.map((k, kIdx) => (
                      <tr key={k.id}>
                        <td style={{ textAlign: 'center' }}>{kIdx + 1}</td>
                        <td>{k.tanggal.slice(0, 10)}</td>
                        <td style={{ fontWeight: 600 }}>{k.kategori}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#b91c1c' }}>+{k.poin}</td>
                        <td style={{ fontSize: 10, color: '#374151' }}>{k.keterangan || 'Teguran lisan & pencatatan BK'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#fef2f2', fontWeight: 800 }}>
                      <td colSpan={3} style={{ textAlign: 'right', paddingRight: 10 }}>TOTAL AKUMULASI POIN SANKSI:</td>
                      <td style={{ textAlign: 'center', color: '#b91c1c', fontSize: 12 }}>{suratTarget.totalPoin} Poin</td>
                      <td style={{ fontSize: 10, color: '#b91c1c' }}>Tingkat Sanksi: {suratTarget.spLevel}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* JADWAL PERTEMUAN */}
              <div style={{ marginBottom: 14 }}>
                Demi pembinaan mental, karakter, dan kelancaran pendidikan peserta didik yang bersangkutan, kami sangat mengharapkan kehadiran Bapak/Ibu Orang Tua/Wali pada:
                <div
                  style={{
                    background: '#f9fafb',
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid #e5e7eb',
                    margin: '8px 0',
                  }}
                >
                  <div>• <strong>Hari / Tanggal:</strong> {hariTanggalTemu}</div>
                  <div>• <strong>Waktu:</strong> {jamTemu}</div>
                  <div>• <strong>Tempat:</strong> {tempatTemu}</div>
                  <div>• <strong>Menghadap:</strong> {menghadap}</div>
                  <div>
                    • <strong>Agenda / Keperluan:</strong>{' '}
                    {suratTarget.spLevel === 'SP 3'
                      ? 'Konferensi Kasus Terpadu, Penandatanganan Pakta Integritas Terakhir & Skorsing'
                      : 'Konsultasi Tindak Lanjut Pembinaan Kedisiplinan Peserta Didik'}
                  </div>
                </div>
                Mengingat pentingnya agenda ini bagi kelangsungan belajar peserta didik, kami mohon kehadiran Bapak/Ibu tepat pada waktunya tanpa diwakilkan.
              </div>

              {/* PENUTUP & TANDA TANGAN DUA PIHAK */}
              <div style={{ marginTop: 20 }}>
                <div>Demikian surat panggilan ini kami sampaikan. Atas perhatian dan kerja sama yang baik, kami ucapkan terima kasih.</div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    textAlign: 'center',
                    marginTop: 24,
                  }}
                >
                  <div>
                    <div>Mengetahui,</div>
                    <div>Kepala SMP Negeri,</div>
                    <div style={{ height: 50 }} />
                    <div style={{ fontWeight: 700, textDecoration: 'underline' }}>
                      Dra. Juwariyah, M.Pd
                    </div>
                    <div style={{ fontSize: 11, color: '#4b5563' }}>NIP. 196805121994122001</div>
                  </div>

                  <div>
                    <div>Guru Bimbingan Konseling (BK),</div>
                    <div style={{ height: 50 }} />
                    <div style={{ fontWeight: 700, textDecoration: 'underline' }}>
                      Nika Musrifah, S.Pd
                    </div>
                    <div style={{ fontSize: 11, color: '#4b5563' }}>NIP. 198203152008012006</div>
                  </div>
                </div>

                {/* TEMBUSAN */}
                <div style={{ marginTop: 24, fontSize: 10, color: '#4b5563', borderTop: '1px solid #e5e7eb', paddingTop: 6 }}>
                  <strong>Tembusan Yth:</strong>
                  <div>1. Kepala SMP Negeri (sebagai laporan)</div>
                  <div>2. Wali Kelas ybs</div>
                  <div>3. Arsip Layanan Bimbingan &amp; Konseling (BK)</div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
