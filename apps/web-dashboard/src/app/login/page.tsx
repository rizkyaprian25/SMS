'use client';
import { useState } from 'react';
import { api, setAccessToken } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@sekolah.sch.id');
  const [password, setPassword] = useState('Admin123!');
  const [showPassword, setShowPassword] = useState(false);
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
      const errObj = err as { response?: { data?: { message?: string } }; code?: string; message?: string };
      if (errObj.code === 'ERR_NETWORK' || !errObj.response) {
        setErrorMsg('Tidak dapat terhubung ke server API (port 3001). Pastikan backend NestJS sudah aktif.');
      } else {
        setErrorMsg(errObj.response?.data?.message || 'Login gagal. Periksa kembali email dan password.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function quickLogin(demoEmail: string, demoPass: string, roleName: string, targetPath: string) {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email: demoEmail, password: demoPass });
      const token = res.data?.data?.accessToken ?? res.data?.accessToken ?? null;
      setAccessToken(token);
      setSuccessMsg(`Login ${roleName} sukses! Mengalihkan...`);
      setTimeout(() => {
        window.location.href = targetPath;
      }, 400);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      setErrorMsg(errObj.response?.data?.message || 'Login gagal.');
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
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 20% 20%, #1e1b4b 0%, #0f172a 60%, #020617 100%)',
        padding: 24,
      }}
    >
      {/* Ambient Glow Orbs (Apple Design Craft) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '15%',
          left: '20%',
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0) 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '20%',
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.2) 0%, rgba(14, 165, 233, 0) 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Glass Card */}
      <div
        style={{
          maxWidth: 440,
          width: '100%',
          position: 'relative',
          zIndex: 10,
          boxShadow: '0 32px 64px -16px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.12)',
          borderRadius: 20,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: 'rgba(255, 255, 255, 0.94)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '36px 32px 24px',
            textAlign: 'center',
            background: 'linear-gradient(180deg, rgba(248, 250, 252, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
            borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              margin: '0 auto 14px',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 22,
              fontWeight: 800,
              boxShadow: '0 10px 20px -3px rgba(79, 70, 229, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
              letterSpacing: '-0.02em',
            }}
          >
            SMS
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>
            SMP Negeri Terpadu
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4, fontWeight: 500 }}>
            Sistem Informasi &amp; Administrasi Sekolah
          </p>
        </div>

        {/* Content Body */}
        <div style={{ padding: '28px 32px 36px' }}>
          {errorMsg && (
            <div className="alert alert-danger" style={{ marginBottom: 20 }}>
              <span>&bull;</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert alert-success" style={{ marginBottom: 20 }}>
              <span>&check;</span>
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Alamat Email Pengguna
              </label>
              <input
                id="email"
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@sekolah.sch.id"
                style={{ height: 44 }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" htmlFor="password" style={{ marginBottom: 0 }}>
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--primary)',
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? 'Sembunyikan' : 'Lihat Sandi'}
                </button>
              </div>
              <input
                id="password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                style={{ height: 44 }}
              />
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', height: 46, fontSize: 14, fontWeight: 700 }}
              disabled={loading}
            >
              {loading ? 'Memproses Otentikasi...' : 'Masuk ke Dashboard'}
            </button>

            <div
              style={{
                marginTop: 22,
                marginBottom: 12,
                fontSize: 11,
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
              <span>Masuk Cepat Demo Peran</span>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: 38, fontSize: 11, fontWeight: 600, padding: '0 6px' }}
                disabled={loading}
                onClick={() => quickLogin('admin@sekolah.sch.id', 'Admin123!', 'Super Admin', '/')}
              >
                Super Admin
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: 38, fontSize: 11, fontWeight: 600, padding: '0 6px' }}
                disabled={loading}
                onClick={() => quickLogin('kepsek@sekolah.sch.id', 'Guru123!', 'Kepala Sekolah', '/absensi-guru')}
              >
                Kepala Sekolah
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: 38, fontSize: 11, fontWeight: 600, padding: '0 6px' }}
                disabled={loading}
                onClick={() => quickLogin('guru@sekolah.sch.id', 'Guru123!', 'Guru Mapel', '/jadwal')}
              >
                Guru / Wali
              </button>
            </div>
          </form>

          <div
            style={{
              marginTop: 22,
              padding: '12px 14px',
              backgroundColor: 'rgba(241, 245, 249, 0.8)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 11,
              color: 'var(--text-muted)',
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Kredensial Bawaan:</span>
            <br />
            &bull; Admin: <code>admin@sekolah.sch.id</code> (Sandi: <code>Admin123!</code>)
            <br />
            &bull; Guru / Kepsek: Sandi bawaan <code>Guru123!</code>
          </div>
        </div>
      </div>
    </div>
  );
}
