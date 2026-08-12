import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import AuthLayout from '../layouts/AuthLayout';
import MainLayout from '../layouts/MainLayout';

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import MyProfile from '../pages/MyProfile';
import Students from '../pages/Students';
import Trainers from '../pages/Trainers';
import Courses from '../pages/Courses';
import Batches from '../pages/Batches';
import Leads from '../pages/Leads';
import Admissions from '../pages/Admissions';
import Attendance from '../pages/Attendance';
import Assignments from '../pages/Assignments';
import Finance from '../pages/Finance';
import MockInterviews from '../pages/MockInterviews';
import Reports from '../pages/Reports';
import Users from '../pages/Users';

import Inquiries from '../pages/Inquiries';
import Notices from '../pages/Notices';
import NotFound from '../pages/NotFound';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Root Route Redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Main App Routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<MyProfile />} />
        <Route path="/students" element={<Students />} />
        <Route path="/trainers" element={<Trainers />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/batches" element={<Batches />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/inquiries" element={<Inquiries />} />
        <Route path="/admissions" element={<Admissions />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/assignments" element={<Assignments />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/mock-interviews" element={<MockInterviews />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/users" element={<Users />} />
        <Route path="/notices" element={<Notices />} />
        <Route path="/settings" element={<MyProfile />} />
      </Route>

      {/* Catch-all 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
