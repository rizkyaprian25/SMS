export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function pageMeta(total: number, page: number, limit: number): PageMeta {
  return { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export function pageParams(query: { page?: string; limit?: string }) {
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 30) || 30));
  return { page, limit, skip: (page - 1) * limit };
}
