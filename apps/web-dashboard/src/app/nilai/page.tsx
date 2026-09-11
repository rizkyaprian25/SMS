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

  // State Edit Nilai
  const [editTarget, setEditTarget] = useState<BarisNilai | null>(null);
  const [editNilaiAngka, setEditNilaiAngka] = useState<number>(75);

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
            Cetak Leger Nilai
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

          <div className="form-group" style={{ margin: 0, flex: '1 1 150px' }}>
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
          <div className="data-table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '35%' }}>Siswa</th>
                  <th>Mata Pelajaran</th>
                  <th style={{ textAlign: 'center' }}>Semester</th>
                  <th style={{ textAlign: 'center' }}>Jenis</th>
                  <th style={{ textAlign: 'center' }}>Nilai</th>
                  <th style={{ textAlign: 'center' }}>Status KKM</th>
                  <th style={{ textAlign: 'center', width: 100 }}>Aksi</th>
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
                          {isPass ? 'Tuntas KKM' : 'Remedial'}
                        </Badge>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: 12, padding: '4px 8px' }}
                          onClick={() => {
                            setEditTarget(b);
                            setEditNilaiAngka(Number(b.nilai) || 75);
                          }}
                          title="Ubah Skor Nilai"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
    </div>
  );
}
