import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1',
  withCredentials: true,
});

let accessToken: string | null = null;
export function setAccessToken(t: string | null) {
  accessToken = t;
}

api.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  return cfg;
});

// Access 15 mnt mati -> tukar refresh cookie sekali -> ulangi request.
// Lihat docs/08-auth-rbac-multidevice.md
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const cfg = err.config as (InternalAxiosRequestConfig & { _smsRetry?: boolean }) | undefined;
    const perluRefresh =
      err.response?.status === 401 && cfg && !cfg._smsRetry && !cfg.url?.includes('/auth/refresh');
    if (!perluRefresh || !cfg) throw err;
    cfg._smsRetry = true;
    try {
      const r = await api.post<{ accessToken: string }>('/auth/refresh');
      setAccessToken(r.data.accessToken);
      cfg.headers.Authorization = `Bearer ${r.data.accessToken}`;
      return api(cfg);
    } catch {
      setAccessToken(null);
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      throw err;
    }
  },
);

/** Unduh file endpoint (xlsx/pdf) dengan token — window.open tanpa header = 401. */
export async function unduhFile(url: string, params?: Record<string, string>) {
  const res = await api.get<Blob>(url, { params, responseType: 'blob' });
  const nama =
    res.headers['content-disposition']?.match(/filename="(.+)"/)?.[1] ?? 'unduhan';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(res.data);
  a.download = nama;
  a.click();
  URL.revokeObjectURL(a.href);
}
