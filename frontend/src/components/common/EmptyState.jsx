import React from 'react';

const EmptyState = ({ title = 'No records found', message = 'There are no items matching your criteria.', icon = 'bi-inbox', actionText, onAction }) => {
  return (
    <div className="cf-card text-center py-5 px-4 my-3">
      <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center p-3 mb-3" style={{ width: '64px', height: '64px' }}>
        <i className={`bi ${icon} text-secondary fs-2`}></i>
      </div>
      <h5 className="fw-bold text-dark mb-1">{title}</h5>
      <p className="text-muted small mb-3" style={{ maxWidth: '400px', margin: '0 auto' }}>{message}</p>
      {actionText && onAction && (
        <button className="btn btn-primary rounded-pill px-4 btn-sm fw-semibold" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
