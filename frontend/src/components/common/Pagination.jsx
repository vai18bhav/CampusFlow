import React from 'react';

const Pagination = ({ pagination, onPageChange, onLimitChange }) => {
  if (!pagination || pagination.totalPages <= 1 && pagination.totalRecords <= 25) {
    return null;
  }

  const { page, limit, totalRecords, totalPages } = pagination;

  const handlePrev = () => {
    if (page > 1) onPageChange(page - 1);
  };

  const handleNext = () => {
    if (page < totalPages) onPageChange(page + 1);
  };

  // Generate page numbers
  const pages = [];
  for (let i = 1; i <= Math.min(5, totalPages); i++) {
    pages.push(i);
  }

  return (
    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 pt-3 border-top mt-3">
      {/* Total records & page size selector */}
      <div className="d-flex align-items-center gap-2 text-muted small">
        <span>Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalRecords} records)</span>
        {onLimitChange && (
          <select
            className="form-select form-select-sm ms-2"
            style={{ width: '80px' }}
            value={limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
          >
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        )}
      </div>

      {/* Pagination Controls */}
      <nav aria-label="Page navigation">
        <ul className="pagination pagination-sm mb-0">
          <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
            <button className="page-item-btn btn btn-sm btn-outline-secondary rounded-start-pill px-3" onClick={handlePrev} disabled={page <= 1}>
              <i className="bi bi-chevron-left me-1"></i> Previous
            </button>
          </li>

          {pages.map(p => (
            <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
              <button
                className={`page-link ${p === page ? 'bg-primary text-white border-primary' : 'text-dark'}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            </li>
          ))}

          <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
            <button className="page-item-btn btn btn-sm btn-outline-secondary rounded-end-pill px-3 ms-1" onClick={handleNext} disabled={page >= totalPages}>
              Next <i className="bi bi-chevron-right ms-1"></i>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Pagination;
