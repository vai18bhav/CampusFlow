import React, { useState } from 'react';

const DataTable = ({ columns, data, searchKey = 'name', title, actionButton }) => {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const filteredData = data.filter((item) => {
    if (!search) return true;
    const val = item[searchKey] || JSON.stringify(item);
    return String(val).toLowerCase().includes(search.toLowerCase());
  });

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="cf-card p-0 overflow-hidden">
      {(title || actionButton || searchKey) && (
        <div className="p-3 border-bottom d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
          {title && <h5 className="fw-bold mb-0 text-dark">{title}</h5>}
          <div className="d-flex align-items-center gap-2">
            <div className="input-group input-group-sm" style={{ maxWidth: '240px' }}>
              <span className="input-group-text bg-light"><i className="bi bi-search"></i></span>
              <input
                type="text"
                className="form-control"
                placeholder="Filter table..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {actionButton}
          </div>
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="bg-light text-muted small text-uppercase fw-semibold">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="py-3 px-3">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-5 text-muted">
                  <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary opacity-50"></i>
                  No records found
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rIdx) => (
                <tr key={rIdx}>
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="py-3 px-3">
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-3 border-top d-flex justify-content-between align-items-center">
          <span className="small text-muted">
            Page {currentPage} of {totalPages} ({filteredData.length} records)
          </span>
          <div className="btn-group btn-group-sm">
            <button
              className="btn btn-outline-secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            >
              Previous
            </button>
            <button
              className="btn btn-outline-secondary"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
