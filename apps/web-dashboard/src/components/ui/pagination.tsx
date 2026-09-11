import React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (newPage: number) => void;
}

export function Pagination({ page, totalPages, total, limit, onPageChange }: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);

  return (
    <div className="pagination-bar">
      <span>
        Menampilkan <strong>{from}–{to}</strong> dari <strong>{total}</strong> data
      </span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          &larr; Sebelumnya
        </button>
        <span style={{ fontSize: 12, fontWeight: 600, padding: '0 8px' }}>
          {page} / {Math.max(1, totalPages)}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Selanjutnya &rarr;
        </button>
      </div>
    </div>
  );
}
