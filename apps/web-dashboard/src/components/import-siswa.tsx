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

/** Upload xlsx -> POST /siswa/import (multipart). Lihat docs/04. */
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
    <section style={{ border: '1px solid #ccc', padding: 12, marginTop: 16 }}>
      <h3>Import Excel</h3>
      <p>Header: NISN, Nama, Rombel, JK, TglLahir. Maks 5MB.</p>
      <input
        type="file"
        accept=".xlsx"
        disabled={mut.isPending}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            setHasil(null);
            mut.mutate(f);
          }
          e.target.value = '';
        }}
      />
      {mut.isPending && <p>Mengunggah…</p>}
      {mut.isError && <p>Gagal: {pesanError(mut.error)}</p>}
      {hasil && (
        <div>
          <p>
            Dibuat: {hasil.dibuat}, diperbarui: {hasil.diperbarui}, gagal: {hasil.gagal.length}
          </p>
          {hasil.gagal.length > 0 && (
            <ul>
              {hasil.gagal.map((g) => (
                <li key={g.baris}>
                  Baris {g.baris} ({g.nisn || '-'}): {g.alasan}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
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
