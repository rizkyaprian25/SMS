import axios from 'axios';

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

// TODO: interceptor 401 -> POST /auth/refresh (cookie) -> retry sekali.
// Lihat docs/08-auth-rbac-multidevice.md
