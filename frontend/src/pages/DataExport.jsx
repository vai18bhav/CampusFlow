import React, { useState } from 'react';
import api from '../services/api';

const DataExport = () => {
  const [downloading, setDownloading] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });

  const exportTypes = [
    {
      id: 'students',
      name: 'Student Roster Data',
      description: 'Export all student records, roll numbers, emails, phone numbers, addresses, and account statuses.',
      icon: 'bi-people-fill',
      color: 'primary'
    },
    {
      id: 'invoices',
      name: 'Financial Invoices Data',
      description: 'Export complete invoice register with currencies (INR/USD), fee breakdowns, discounts, paid and due amounts.',
      icon: 'bi-receipt-cutoff',
      color: 'success'
    },
    {
      id: 'attendance',
      name: 'Attendance Register Data',
      description: 'Export batch attendance entries, class dates, attendance statuses (PRESENT, ABSENT, LATE), and remarks.',
      icon: 'bi-calendar-check-fill',
      color: 'warning'
    },
    {
      id: 'progress',
      name: 'Student Progress & Analytics',
      description: 'Export student academic progress including attendance percentage, assignment submission counts, and mock interview scores.',
      icon: 'bi-graph-up-arrow',
      color: 'info'
    }
  ];

  const handleDownload = async (type, format) => {
    const key = `${type}-${format}`;
    setDownloading(key); setMsg({ text: '', type: '' });

    try {
      const response = await fetch(`http://localhost:5000/api/export/${type}?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error(`Export failed with status ${response.status}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setMsg({ text: `Successfully exported ${type} data in ${format.toUpperCase()} format!`, type: 'success' });
    } catch (err) {
      setMsg({ text: typeof err === 'string' ? err : 'Export failed. Please try again.', type: 'danger' });
    } finally {
      setDownloading('');
    }
  };

  return (
    <div className="container-fluid py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <i className="bi bi-file-earmark-arrow-down-fill text-primary me-2"></i>Data Export Center
          </h4>
          <p className="text-muted small mb-0">FR-006: Export student data, invoices, attendance, and student progress in CSV, Excel, and JSON formats</p>
        </div>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type} alert-dismissible fade show small rounded-3 mb-4`} role="alert">
          {msg.text}
          <button type="button" className="btn-close" onClick={() => setMsg({ text: '', type: '' })}></button>
        </div>
      )}

      {/* Export Cards Grid */}
      <div className="row g-4">
        {exportTypes.map(item => (
          <div key={item.id} className="col-md-6">
            <div className="card border-0 shadow-sm rounded-4 h-100 p-3">
              <div className="card-body d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div className={`p-3 rounded-4 bg-${item.color} bg-opacity-10 text-${item.color}`}>
                      <i className={`bi ${item.icon} fs-3`}></i>
                    </div>
                    <div>
                      <h5 className="fw-bold text-dark mb-1">{item.name}</h5>
                      <span className="badge bg-light text-secondary border">FR-006 Data Export</span>
                    </div>
                  </div>
                  <p className="text-muted small mb-4" style={{ lineHeight: 1.6 }}>
                    {item.description}
                  </p>
                </div>

                <div className="d-flex gap-2 pt-2 border-top">
                  <button
                    className="btn btn-primary rounded-pill btn-sm px-3 flex-grow-1 fw-semibold"
                    disabled={downloading === `${item.id}-csv`}
                    onClick={() => handleDownload(item.id, 'csv')}
                  >
                    {downloading === `${item.id}-csv` ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span>Exporting...</>
                    ) : (
                      <><i className="bi bi-filetype-csv me-2"></i>Export CSV (Excel)</>
                    )}
                  </button>
                  <button
                    className="btn btn-outline-dark rounded-pill btn-sm px-3 flex-grow-1 fw-semibold"
                    disabled={downloading === `${item.id}-json`}
                    onClick={() => handleDownload(item.id, 'json')}
                  >
                    {downloading === `${item.id}-json` ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span>Exporting...</>
                    ) : (
                      <><i className="bi bi-filetype-json me-2"></i>Export JSON</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DataExport;
