import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';

export interface Rombel {
  id: string;
  nama: string;
  kapasitas: number;
  tingkat: { id: string; nama: string };
  waliKelas: { id: string; nama: string } | null;
}

interface Page<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** Contoh hook list berpola: key terpusat + filter + pagination server-side. */
export function useRombel(tahunAjaranId?: string, tingkatId?: string, page = 1) {
  return useQuery({
    queryKey: qk.rombel(tahunAjaranId, tingkatId, page),
    queryFn: async () =>
      (
        await api.get<Page<Rombel>>('/rombel', {
          params: { tahunAjaranId, tingkatId, page, limit: 30 },
        })
      ).data,
    retry: false,
  });
}
