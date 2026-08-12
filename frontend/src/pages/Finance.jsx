import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import DashboardCard from '../components/common/DashboardCard';
import { useAuth } from '../context/AuthContext';

const Finance = () => {
  const { role, user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({ total_revenue: 0, total_collected: 0, total_pending: 0, overdue_amount: 0 });
  const [coursesList, setCoursesList] = useState([]);
  const [studentStatement, setStudentStatement] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');

  // Modals
  const [showPayModal, setShowPayModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState('');

  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(role);

  // Payment Form State
  const [payData, setPayData] = useState({
    amount: '',
    installment_id: '',
    payment_method: 'UPI',
    transaction_reference: '',
    remarks: ''
  });

  useEffect(() => {
    if (role === 'STUDENT') {
      fetchStudentFinance();
    } else {
      fetchInitialData();
    }
  }, [role, statusFilter, courseFilter]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      let queryParams = [];
      if (statusFilter) queryParams.push(`status=${encodeURIComponent(statusFilter)}`);
      if (courseFilter) queryParams.push(`course_id=${encodeURIComponent(courseFilter)}`);
      if (searchTerm) queryParams.push(`search=${encodeURIComponent(searchTerm)}`);

      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

      const [resS, resI, resC] = await Promise.all([
        api.get('/finance/summary'),
        api.get(`/finance/invoices${queryString}`),
        api.get('/courses?status=active')
      ]);

      if (resS.success && resS.data.summary) setSummary(resS.data.summary);
      if (resI.success) setInvoices(resI.data.invoices);
      if (resC.success) setCoursesList(resC.data.courses);
    } catch (err) {
      console.error('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentFinance = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/finance/student/${user.student_id || ''}`);
      if (res.success) {
        setStudentStatement(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch student financial statement');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInitialData();
  };

  const handleOpenPayModal = (inv) => {
    setSelectedInvoice(inv);
    setPayError('');
    setPayData({
      amount: inv.due_amount,
      installment_id: '',
      payment_method: 'UPI',
      transaction_reference: `UPI-${Date.now().toString().slice(-6)}`,
      remarks: 'Tuition fee installment payment'
    });
    setShowPayModal(true);
  };

  const handleOpenDetailsModal = async (invId) => {
    try {
      const res = await api.get(`/finance/invoices/${invId}`);
      if (res.success) {
        setSelectedInvoice(res.data.invoice);
        setShowDetailsModal(true);
      }
    } catch (err) {
      alert('Failed to load invoice details');
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setPayError('');

    const amtNum = parseFloat(payData.amount);
    if (isNaN(amtNum) || amtNum <= 0) return setPayError('Payment amount must be a positive number.');

    const maxDue = parseFloat(selectedInvoice.due_amount);
    if (amtNum > maxDue + 0.01) return setPayError(`Payment amount ($${amtNum}) cannot exceed total remaining due amount ($${maxDue}).`);

    setSubmitting(true);

    try {
      const res = await api.post(`/finance/invoices/${selectedInvoice.id}/payments`, {
        invoice_id: selectedInvoice.id,
        installment_id: payData.installment_id || null,
        amount: amtNum,
        payment_method: payData.payment_method,
        transaction_reference: payData.transaction_reference,
        remarks: payData.remarks
      });

      if (res.success) {
        setShowPayModal(false);
        fetchInitialData();
      }
    } catch (err) {
      setPayError(typeof err === 'string' ? err : 'Payment processing failed');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-1.5 rounded-pill fw-semibold"><i className="bi bi-check-circle-fill me-1"></i> Paid</span>;
      case 'PARTIALLY_PAID':
        return <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 px-3 py-1.5 rounded-pill fw-semibold"><i className="bi bi-pie-chart-fill me-1"></i> Partially Paid</span>;
      case 'OVERDUE':
        return <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-3 py-1.5 rounded-pill fw-semibold"><i className="bi bi-exclamation-triangle-fill me-1"></i> Overdue</span>;
      default:
        return <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 px-3 py-1.5 rounded-pill fw-semibold"><i className="bi bi-clock-fill me-1"></i> Unpaid</span>;
    }
  };

  if (role === 'STUDENT') {
    const stmt = studentStatement?.statement || {};
    return (
      <div>
        <div className="mb-4">
          <h3 className="fw-bold text-dark mb-1">My Fee Statement & Payment History</h3>
          <p className="text-muted mb-0">View tuition fee breakdown, installment due dates, and official payment receipts.</p>
        </div>

        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
        ) : (
          <>
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div className="cf-card text-center p-3">
                  <h6 className="text-muted text-uppercase fw-bold small mb-2">Total Net Fee</h6>
                  <h2 className="fw-extrabold text-dark mb-0">${parseFloat(stmt.total_fees || 0).toLocaleString()}</h2>
                </div>
              </div>
              <div className="col-md-4">
                <div className="cf-card text-center p-3">
                  <h6 className="text-muted text-uppercase fw-bold small mb-2">Total Paid Fee</h6>
                  <h2 className="fw-extrabold text-success mb-0">${parseFloat(stmt.paid_fees || 0).toLocaleString()}</h2>
                </div>
              </div>
              <div className="col-md-4">
                <div className="cf-card text-center p-3">
                  <h6 className="text-muted text-uppercase fw-bold small mb-2">Remaining Pending Fee</h6>
                  <h2 className="fw-extrabold text-danger mb-0">${parseFloat(stmt.pending_fees || 0).toLocaleString()}</h2>
                </div>
              </div>
            </div>

            {/* Installments Due Timeline */}
            <div className="cf-card mb-4 p-4">
              <h5 className="fw-bold text-dark mb-3"><i className="bi bi-calendar-event text-primary me-2"></i>Installments Schedule & Due Dates</h5>
              {studentStatement?.installments?.length === 0 ? (
                <p className="text-muted mb-0">No installment schedule configured.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Installment #</th>
                        <th>Amount</th>
                        <th>Due Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentStatement?.installments?.map(inst => (
                        <tr key={inst.id}>
                          <td className="fw-bold">Installment #{inst.installment_number}</td>
                          <td className="fw-bold text-dark">${parseFloat(inst.amount).toLocaleString()}</td>
                          <td className="small font-monospace">{inst.due_date ? inst.due_date.split('T')[0] : ''}</td>
                          <td>
                            <span className={`badge ${inst.status === 'PAID' ? 'bg-success' : 'bg-warning text-dark'} px-2.5 py-1 rounded-pill`}>
                              {inst.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payment Receipts History */}
            <div className="cf-card p-0 overflow-hidden">
              <div className="p-3 border-bottom"><h5 className="fw-bold mb-0"><i className="bi bi-receipt me-2 text-success"></i>Official Payment Receipts History</h5></div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Amount Paid</th>
                      <th className="py-3 px-3">Payment Method</th>
                      <th className="py-3 px-3">Transaction Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentStatement?.payments?.length === 0 ? (
                      <tr><td colSpan="4" className="text-center py-4 text-muted">No payments recorded yet</td></tr>
                    ) : (
                      studentStatement?.payments?.map(p => (
                        <tr key={p.id}>
                          <td className="py-3 px-3 fw-bold">{p.payment_date ? p.payment_date.split('T')[0] : ''}</td>
                          <td className="py-3 px-3 fw-bold text-success">${parseFloat(p.amount).toLocaleString()}</td>
                          <td className="py-3 px-3"><span className="badge bg-info bg-opacity-10 text-info border border-info px-2.5 py-1">{p.payment_method}</span></td>
                          <td className="py-3 px-3 font-monospace small">{p.transaction_reference || 'N/A'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  const columns = [
    { header: 'Invoice No.', accessor: 'invoice_number', render: (r) => <span className="badge bg-secondary bg-opacity-10 text-dark border font-monospace px-2.5 py-1">{r.invoice_number}</span> },
    { header: 'Student', accessor: 'student_name', render: (r) => (
        <div>
          <span className="fw-bold text-dark d-block">{r.student_name}</span>
          <span className="small text-muted font-monospace">{r.roll_number || r.student_email}</span>
        </div>
      )
    },
    { header: 'Course', accessor: 'course_name', render: (r) => <span className="fw-semibold text-dark">{r.course_name}</span> },
    { header: 'Net Total Fee', accessor: 'net_amount', render: (r) => <span className="fw-bold text-dark">${parseFloat(r.net_amount || r.total_amount).toLocaleString()}</span> },
    { header: 'Paid Amount', accessor: 'paid_amount', render: (r) => <span className="fw-bold text-success">${parseFloat(r.paid_amount || 0).toLocaleString()}</span> },
    { header: 'Pending Due', accessor: 'due_amount', render: (r) => <span className="fw-bold text-danger">${parseFloat(r.due_amount || 0).toLocaleString()}</span> },
    { header: 'Due Date', accessor: 'due_date', render: (r) => <span className="small font-monospace">{r.due_date ? r.due_date.split('T')[0] : ''}</span> },
    { header: 'Status', accessor: 'status', render: (r) => renderStatusBadge(r.status) },
    { header: 'Actions', accessor: 'id', render: (r) => (
        <div className="d-flex align-items-center gap-1.5">
          <button className="btn btn-sm btn-outline-info rounded-circle p-1.5" title="View Invoice Details" onClick={() => handleOpenDetailsModal(r.id)}>
            <i className="bi bi-eye-fill"></i>
          </button>

          {isAdmin && parseFloat(r.due_amount) > 0 && (
            <button className="btn btn-sm btn-success rounded-pill px-2.5 py-1 small fw-semibold" title="Record Payment" onClick={() => handleOpenPayModal(r)}>
              <i className="bi bi-credit-card-fill me-1"></i> Pay
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <DashboardCard title="Total Revenue" value={`$${parseFloat(summary.total_revenue || 0).toLocaleString()}`} icon="bi-currency-dollar" color="primary" subtitle="Gross tuition receivables" />
        </div>
        <div className="col-md-3">
          <DashboardCard title="Total Collected" value={`$${parseFloat(summary.total_collected || 0).toLocaleString()}`} icon="bi-check-circle" color="success" subtitle="Fee payments collected" />
        </div>
        <div className="col-md-3">
          <DashboardCard title="Total Pending" value={`$${parseFloat(summary.total_pending || 0).toLocaleString()}`} icon="bi-clock-history" color="warning" subtitle="Outstanding balance" />
        </div>
        <div className="col-md-3">
          <DashboardCard title="Overdue Amount" value={`$${parseFloat(summary.overdue_amount || 0).toLocaleString()}`} icon="bi-exclamation-triangle" color="danger" subtitle="Past due dates balance" />
        </div>
      </div>

      {/* Header Banner */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">Finance Management</h3>
          <p className="text-muted mb-0">Manage student tuition fees, invoices, installments, and payment records.</p>
        </div>
      </div>

      {/* Multi-Filter Bar */}
      <div className="cf-card mb-4 p-3">
        <form onSubmit={handleSearchSubmit} className="row g-3 align-items-center">
          <div className="col-md-4">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-search"></i></span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Search invoice no, student name, roll no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-3">
            <select className="form-select" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
              <option value="">All Courses</option>
              {coursesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="col-md-3">
            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Payment Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="UNPAID">Unpaid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>

          <div className="col-md-2 d-flex gap-2">
            <button type="submit" className="btn btn-dark rounded-pill w-100 fw-semibold">Filter</button>
            {(searchTerm || statusFilter || courseFilter) && (
              <button
                type="button"
                className="btn btn-outline-secondary rounded-pill"
                onClick={() => { setSearchTerm(''); setStatusFilter(''); setCourseFilter(''); }}
                title="Reset Filters"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Invoices Table */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <DataTable columns={columns} data={invoices} searchKey="student_name" title="Student Invoices & Payment Ledger" />
      )}

      {/* Record Payment Modal */}
      {showPayModal && selectedInvoice && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">Record Payment: {selectedInvoice.invoice_number}</h5>
                <button type="button" className="btn-close" onClick={() => setShowPayModal(false)}></button>
              </div>
              <form onSubmit={handlePaymentSubmit}>
                <div className="modal-body">
                  {payError && (
                    <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3">
                      <i className="bi bi-exclamation-circle-fill me-1"></i> {payError}
                    </div>
                  )}

                  <div className="p-3 bg-light rounded-3 border mb-3">
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="text-muted">Student:</span>
                      <strong className="text-dark">{selectedInvoice.student_name}</strong>
                    </div>
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="text-muted">Total Net Fee:</span>
                      <strong className="text-dark">${parseFloat(selectedInvoice.net_amount || selectedInvoice.total_amount).toLocaleString()}</strong>
                    </div>
                    <div className="d-flex justify-content-between small">
                      <span className="text-muted">Remaining Due:</span>
                      <strong className="text-danger">${parseFloat(selectedInvoice.due_amount).toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Payment Amount ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      className="form-control fw-bold fs-5 text-success"
                      value={payData.amount}
                      onChange={(e) => setPayData({ ...payData, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Payment Method *</label>
                    <select
                      className="form-select"
                      value={payData.payment_method}
                      onChange={(e) => setPayData({ ...payData, payment_method: e.target.value })}
                    >
                      <option value="UPI">UPI Payment</option>
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank Transfer / NetBanking</option>
                      <option value="CARD">Credit / Debit Card</option>
                      <option value="ONLINE">Online Portal</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Transaction Reference / UTR No.</label>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      placeholder="e.g. UPI123456789"
                      value={payData.transaction_reference}
                      onChange={(e) => setPayData({ ...payData, transaction_reference: e.target.value })}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-semibold text-muted">Remarks / Receipt Note</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Enter installment reference or payment note..."
                      value={payData.remarks}
                      onChange={(e) => setPayData({ ...payData, remarks: e.target.value })}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill" onClick={() => setShowPayModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success rounded-pill px-4 fw-semibold" disabled={submitting}>
                    {submitting ? 'Recording...' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      {showDetailsModal && selectedInvoice && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <h5 className="modal-title fw-bold">{selectedInvoice.invoice_number}</h5>
                  {renderStatusBadge(selectedInvoice.status)}
                </div>
                <button type="button" className="btn-close" onClick={() => setShowDetailsModal(false)}></button>
              </div>

              <div className="modal-body p-4">
                {/* Financial Summary */}
                <div className="row g-3 mb-4 text-center">
                  <div className="col-4">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="small text-muted text-uppercase fw-bold">Net Total Amount</div>
                      <div className="fs-5 fw-bold text-dark mt-1">${parseFloat(selectedInvoice.net_amount || selectedInvoice.total_amount).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3 bg-success bg-opacity-10 rounded-3 border border-success border-opacity-25">
                      <div className="small text-success text-uppercase fw-bold">Paid Collected</div>
                      <div className="fs-5 fw-bold text-success mt-1">${parseFloat(selectedInvoice.paid_amount || 0).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3 bg-danger bg-opacity-10 rounded-3 border border-danger border-opacity-25">
                      <div className="small text-danger text-uppercase fw-bold">Remaining Due</div>
                      <div className="fs-5 fw-bold text-danger mt-1">${parseFloat(selectedInvoice.due_amount).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="small text-muted">Student:</div>
                      <div className="fw-bold text-dark">{selectedInvoice.student_name} ({selectedInvoice.roll_number})</div>
                      <div className="small text-muted">{selectedInvoice.student_email}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded-3 border">
                      <div className="small text-muted">Course & Admission:</div>
                      <div className="fw-bold text-dark">{selectedInvoice.course_name}</div>
                      <div className="small text-muted font-monospace">{selectedInvoice.admission_number}</div>
                    </div>
                  </div>
                </div>

                {/* Auditable Payment Log */}
                <div className="mb-3">
                  <h6 className="fw-bold text-dark mb-2"><i className="bi bi-clock-history me-2 text-primary"></i>Payment History Log</h6>
                  {selectedInvoice.payments?.length > 0 ? (
                    <div className="table-responsive border rounded-3 overflow-hidden">
                      <table className="table table-hover table-sm mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Reference</th>
                            <th>Received By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedInvoice.payments.map(p => (
                            <tr key={p.id}>
                              <td className="small font-monospace">{p.payment_date ? p.payment_date.split('T')[0] : ''}</td>
                              <td className="fw-bold text-success">${parseFloat(p.amount).toLocaleString()}</td>
                              <td><span className="badge bg-secondary bg-opacity-10 text-dark border px-2 py-0.5">{p.payment_method}</span></td>
                              <td className="small font-monospace">{p.transaction_reference || '-'}</td>
                              <td className="small text-muted">{p.received_by_name || 'Admin'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-3 text-center text-muted bg-light rounded-3 small">No payments recorded for this invoice yet.</div>
                  )}
                </div>
              </div>

              <div className="modal-footer border-top">
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowDetailsModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
