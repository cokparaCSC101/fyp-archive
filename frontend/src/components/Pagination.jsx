// Numbered pagination control
export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  // Build a compact window of page numbers around the current page
  const pages = [];
  const windowSize = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - windowSize && i <= page + windowSize)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  return (
    <div className="pagination">
      <button
        className="page-btn"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        ‹
      </button>

      {pages.map((p, idx) =>
        p === '…' ? (
          <span key={`gap-${idx}`} className="page-btn" style={{ border: 'none', background: 'none' }}>
            …
          </span>
        ) : (
          <button
            key={p}
            className={`page-btn ${p === page ? 'active' : ''}`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        )
      )}

      <button
        className="page-btn"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}
