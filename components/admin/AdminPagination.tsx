'use client';

export default function AdminPagination({
  page,
  totalPages,
  onPageChange,
  label,
}: Readonly<{
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  label: string;
}>) {
  if (totalPages <= 1) return null;

  return (
    <nav className="admin-pagination" aria-label={`${label} pagination`}>
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
      >
        ← Previous
      </button>
      <span aria-live="polite">Page {page} of {totalPages}</span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
      >
        Next →
      </button>
    </nav>
  );
}
