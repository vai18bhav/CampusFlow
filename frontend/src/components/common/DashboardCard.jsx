import React from 'react';
import AnimatedCounter from './AnimatedCounter';

const DashboardCard = ({ title, value, icon, color = 'primary', subtitle }) => {
  return (
    <div className="cf-card h-100 shadow-sm">
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <span className="fw-bold small text-uppercase dashboard-card-title" style={{ fontSize: '0.725rem', letterSpacing: '0.5px' }}>
            {title}
          </span>
          <h2 className="fw-extrabold mt-1.5 mb-0 dashboard-card-value" style={{ letterSpacing: '-0.5px' }}>
            <AnimatedCounter value={value} />
          </h2>
          {subtitle && (
            <p className="small mt-1.5 mb-0 dashboard-card-subtitle" style={{ fontSize: '0.8rem' }}>
              {subtitle}
            </p>
          )}
        </div>
        <div className={`rounded-circle d-flex align-items-center justify-content-center bg-${color} bg-opacity-15 text-${color} p-3 shadow-sm`} style={{ width: '50px', height: '50px' }}>
          <i className={`bi ${icon} fs-4`}></i>
        </div>
      </div>
    </div>
  );
};

export default DashboardCard;
