import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Wallet() {
  const navigate = useNavigate();

  return (
    <div className="container py-5 text-center">
      <div className="card shadow border-0 p-5 mx-auto" style={{ maxWidth: '600px', borderRadius: '16px' }}>
        <div className="display-1 text-warning mb-4">🪙</div>
        <h3 className="fw-bold mb-3">Wallet Module Retired</h3>
        <p className="text-muted mb-4">
          The coin wallet system has been disabled in favor of direct currency-based invoicing (INR/USD) as per official requirements.
        </p>
        <div>
          <button className="btn btn-primary rounded-pill px-4" onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
