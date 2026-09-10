'use client';
import { useState } from 'react';
import { api, setAccessToken } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@sekolah.sch.id');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('Memuat…');
    try {
      const res = await api.post('/auth/login', { email, password });
      setAccessToken(res.data?.data?.accessToken ?? res.data?.accessToken ?? null);
      setMsg('Login berhasil. Buka halaman utama.');
    } catch {
      setMsg('Login gagal. Cek email/password & backend.');
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 420, margin: '0 auto' }}>
      <h1>Masuk Dashboard</h1>
      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <button type="submit">Masuk</button>
      </form>
      <p>{msg}</p>
    </main>
  );
}
