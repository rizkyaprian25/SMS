'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '@/lib/api';

interface HasilImpor {
  dibuat: number;
  diperbarui: number;
  gagal: { baris: number; nisn: string; alasan: string }[];
}

export function ImportSiswa() {
  const qc = useQueryClient();
  const [hasil, setHasil] = useState<HasilImpor | null>(null);

  const mut = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post<{ data: HasilImpor }>('/siswa/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    },
    onSuccess: (d) => {
      setHasil(d);
      qc.invalidateQueries({ queryKey: ['siswa'] });
    },
  });

  return (
    <div>
      <div
        style={{
          border: '2px dashed var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '28px 20px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-subtle)',
          cursor: 'pointer',
          marginBottom: 16,
        }}
        onClick={() => document.getElementById('file-import-input')?.click()}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          style={{ margin: '0 auto 10px' }}
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" x2="12" y1="18" y2="12" />
          <polyline points="9 15 12 12 15 15" />
        </svg>
        <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-main)' }}>
          Pilih berkas Excel (.xlsx) untuk diunggah
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          Kolom wajib: <code>NISN, Nama, Rombel, JK, TglLahir</code> (Maksimal 5MB).
        </p>

        <input
          id="file-import-input"
          type="file"
          accept=".xlsx"
          disabled={mut.isPending}
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setHasil(null);
              mut.mutate(f);
            }
            e.target.value = '';
          }}
        />
      </div>

      {mut.isPending && (
        <div className="alert alert-info">
          <span>Memproses dan memvalidasi baris data Excel… Mohon tunggu sebentar.</span>
        </div>
      )}

      {mut.isError && (
        <div className="alert alert-danger">
          <span>Gagal import: {pesanError(mut.error)}</span>
        </div>
      )}

      {hasil && (
        <div style={{ marginTop: 14 }}>
          <div className="alert alert-success" style={{ marginBottom: 12 }}>
            <div>
              <strong>Proses Import Selesai!</strong>
              <p style={{ marginTop: 2, fontSize: 12 }}>
                Data baru dibuat: <strong>{hasil.dibuat}</strong> &bull; Data diperbarui: <strong>{hasil.diperbarui}</strong> &bull; Gagal: <strong>{hasil.gagal.length}</strong>
              </p>
            </div>
          </div>

          {hasil.gagal.length > 0 && (
            <div
              style={{
                backgroundColor: 'var(--danger-bg)',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                fontSize: 12,
                maxHeight: 160,
                overflowY: 'auto',
              }}
            >
              <strong style={{ color: 'var(--danger-text)' }}>Baris yang gagal diproses:</strong>
              <ul style={{ paddingLeft: 18, marginTop: 6, color: 'var(--danger-text)' }}>
                {hasil.gagal.map((g) => (
                  <li key={g.baris}>
                    Baris {g.baris} (NISN: {g.nisn || '-'}): {g.alasan}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function pesanError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const m = (e.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return m.join(', ');
  }
  return 'Terjadi kesalahan';
}
