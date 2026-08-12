import React from 'react';

const Toast = ({ toasts, removeToast }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="cf-toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`cf-toast cf-toast-${toast.type || 'info'}`}>
          <div className="fs-5">
            {toast.type === 'success' && <i className="bi bi-check-circle-fill text-success"></i>}
            {toast.type === 'error' && <i className="bi bi-x-circle-fill text-danger"></i>}
            {toast.type === 'warning' && <i className="bi bi-exclamation-triangle-fill text-warning"></i>}
            {(!toast.type || toast.type === 'info') && <i className="bi bi-info-circle-fill text-primary"></i>}
          </div>
          <div className="flex-grow-1">
            <div className="fw-semibold text-dark small">{toast.message}</div>
          </div>
          <button
            type="button"
            className="btn-close btn-sm ms-2"
            onClick={() => removeToast(toast.id)}
          ></button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
