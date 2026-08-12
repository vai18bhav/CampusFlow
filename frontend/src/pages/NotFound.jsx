import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-light p-4 text-center">
      <div className="badge bg-danger bg-opacity-10 text-danger border px-3 py-1.5 rounded-pill mb-3 fw-bold">404 Error</div>
      <h1 className="fw-extrabold text-dark display-3 mb-2">Page Not Found</h1>
      <p className="text-muted mb-4" style={{ maxWidth: '460px' }}>
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <button className="btn btn-primary rounded-pill px-4 fw-semibold" onClick={() => navigate('/dashboard')}>
        <i className="bi bi-arrow-left me-2"></i> Back to Dashboard
      </button>
    </div>
  );
};

export default NotFound;
