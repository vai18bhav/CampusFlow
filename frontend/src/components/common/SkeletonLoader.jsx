import React from 'react';

export const SkeletonCard = () => (
  <div className="cf-card skeleton-pulse p-4">
    <div className="skeleton-pulse skeleton-title"></div>
    <div className="skeleton-pulse skeleton-text mb-3"></div>
    <div className="skeleton-pulse skeleton-text w-50"></div>
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4 }) => (
  <div className="table-responsive bg-white rounded-3 border p-3">
    <table className="table mb-0">
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, idx) => (
            <th key={idx}><div className="skeleton-pulse skeleton-title mb-0" style={{ height: '14px' }}></div></th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, rIdx) => (
          <tr key={rIdx}>
            {Array.from({ length: cols }).map((_, cIdx) => (
              <td key={cIdx}><div className="skeleton-pulse skeleton-text mb-0" style={{ height: '16px' }}></div></td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default { SkeletonCard, SkeletonTable };
