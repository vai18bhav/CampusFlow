import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';

const MainLayout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <div className="app-wrapper">
      {/* Mobile Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div className="cf-sidebar-overlay" onClick={closeMobileSidebar}></div>
      )}

      {/* Sidebar with Drawer State */}
      <Sidebar isOpen={mobileSidebarOpen} onClose={closeMobileSidebar} />

      <div className="cf-main-content">
        <Navbar onToggleSidebar={toggleMobileSidebar} />
        <main className="p-3 p-md-4 flex-grow-1">
          <Outlet />
        </main>
        <footer className="py-3 px-4 border-top text-muted small bg-white d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
          <div>
            &copy; {new Date().getFullYear()} <strong className="text-dark">CampusFlow</strong> – Enterprise Training & Admission Management Portal.
          </div>
          <div className="d-flex gap-3 text-muted">
            <span className="badge bg-success bg-opacity-10 text-success border px-2.5 py-1">v1.0.0 Stable</span>
            <span>Security Encrypted (256-bit JWT)</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
