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
    </div>
  );
}
