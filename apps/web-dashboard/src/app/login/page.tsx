'use client';
import { useState } from 'react';
import { api, setAccessToken } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@sekolah.sch.id');
  const [password, setPassword] = useState('Admin123!');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      const token = res.data?.data?.accessToken ?? res.data?.accessToken ?? null;
      setAccessToken(token);
      setSuccessMsg('Login berhasil! Mengalihkan ke dashboard...');
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      setErrorMsg(errObj.response?.data?.message || 'Login gagal. Periksa kembali email dan password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
        padding: 20,
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          background: '#ffffff',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '32px 28px 20px',
            textAlign: 'center',
            background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              margin: '0 auto 12px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #4338ca)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 22,
              fontWeight: 800,
              boxShadow: '0 8px 16px rgba(79, 70, 229, 0.35)',
            }}
          >
            SMS
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            SMP Negeri
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Sistem Informasi &amp; Administrasi Sekolah Terpadu
          </p>
        </div>

        <div style={{ padding: '24px 28px 32px' }}>
          {errorMsg && (
            <div className="alert alert-danger" style={{ marginBottom: 18 }}>
              <span>&bull;</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert alert-success" style={{ marginBottom: 18 }}>
              <span>&check;</span>
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Alamat Email
              </label>
              <input
                id="email"
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@sekolah.sch.id"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" htmlFor="password">
                Kata Sandi
              </label>
              <input
                id="password"
                className="input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '10px 16px', fontSize: 14 }}
            >
              {loading ? 'Memproses Masuk…' : 'Masuk ke Dashboard'}
            </button>
          </form>

          <div
            style={{
              marginTop: 24,
              padding: '12px 14px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              color: 'var(--text-muted)',
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Akun Pengujian Default:</span>
            <br />
            Email: <code>admin@sekolah.sch.id</code> &bull; Sandi: <code>Admin123!</code>
          </div>
        </div>
      </div>
    </div>
  );
}
