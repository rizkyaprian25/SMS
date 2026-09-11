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
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <div className="pagination-bar">
      <span className="pagination-info">
        Menampilkan <strong>{from.toLocaleString('id-ID')}–{to.toLocaleString('id-ID')}</strong> dari <strong>{total.toLocaleString('id-ID')}</strong> data
      </span>
      <div className="pagination-controls">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Halaman sebelumnya"
        >
          &larr; Sebelumnya
        </button>
        <span className="pagination-page-indicator">
          Halaman <strong>{page}</strong> dari <strong>{safeTotalPages}</strong>
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page >= safeTotalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Halaman selanjutnya"
        >
          Selanjutnya &rarr;
        </button>
      </div>
    </div>
  );
}
