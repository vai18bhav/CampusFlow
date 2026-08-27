import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasRole, ROLES } from '../utils/permissions';

import AuthLayout from '../layouts/AuthLayout';
import MainLayout from '../layouts/MainLayout';

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import MyProfile from '../pages/MyProfile';
import Students from '../pages/Students';
import AddStudent from '../pages/AddStudent';
import Trainers from '../pages/Trainers';
import Courses from '../pages/Courses';
import Batches from '../pages/Batches';
import Leads from '../pages/Leads';
import Admissions from '../pages/Admissions';
import AdmissionLinks from '../pages/AdmissionLinks';
import PublicAdmissionForm from '../pages/PublicAdmissionForm';
import Coupons from '../pages/Coupons';
import TestBank from '../pages/TestBank';
import Attendance from '../pages/Attendance';
import Assignments from '../pages/Assignments';
import Finance from '../pages/Finance';
import MockInterviews from '../pages/MockInterviews';
import Reports from '../pages/Reports';
import Users from '../pages/Users';

import Inquiries from '../pages/Inquiries';
import Notices from '../pages/Notices';
import Timetable from '../pages/Timetable';
import CourseEnroll from '../pages/CourseEnroll';
import EnrollmentRequests from '../pages/EnrollmentRequests';
import NotFound from '../pages/NotFound';

import PlatformConfig from '../pages/PlatformConfig';
import AuditLogs from '../pages/AuditLogs';
import PermissionOverrides from '../pages/PermissionOverrides';
import DataExport from '../pages/DataExport';
import EmailTemplates from '../pages/EmailTemplates';

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

const RoleRoute = ({ allowedRoles, children }) => {
  const { role } = useAuth();

  if (!hasRole(role, ...allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
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

      {/* Public Admission Form — no auth guard */}
      <Route path="/apply/:token" element={<PublicAdmissionForm />} />

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

        {/* User Accounts Management: Super Admin, Admin */}
        <Route
          path="/users"
          element={
            <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
              <Users />
            </RoleRoute>
          }
        />

        {/* Add Student: Super Admin, Admin */}
        <Route
          path="/students/add"
          element={
            <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
              <AddStudent />
            </RoleRoute>
          }
        />

        <Route path="/students" element={<Students />} />
        <Route path="/trainers" element={<Trainers />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/batches" element={<Batches />} />

        {/* Leads: Super Admin, Admin, Sales Exec */}
        <Route
          path="/leads"
          element={
            <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SALES_EXECUTIVE]}>
              <Leads />
            </RoleRoute>
          }
        />

        <Route path="/inquiries" element={<Inquiries />} />

        {/* Admissions & Links: Super Admin, Admin, Sales Exec */}
        <Route
          path="/admissions"
          element={
            <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SALES_EXECUTIVE]}>
              <Admissions />
            </RoleRoute>
          }
        />
        <Route
          path="/admission-links"
          element={
            <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SALES_EXECUTIVE]}>
              <AdmissionLinks />
            </RoleRoute>
          }
        />
        <Route
          path="/coupons"
          element={
            <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SALES_EXECUTIVE]}>
              <Coupons />
            </RoleRoute>
          }
        />

        <Route path="/attendance" element={<Attendance />} />
        <Route path="/assignments" element={<Assignments />} />
        <Route
          path="/test-bank"
          element={
            <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TRAINER]}>
              <TestBank />
            </RoleRoute>
          }
        />

        {/* Finance: Super Admin, Admin, Sales Exec, Student (own fees) */}
        <Route path="/finance" element={<Finance />} />

        {/* Mock Interviews: All 6 roles */}
        <Route path="/mock-interviews" element={<MockInterviews />} />

        {/* Reports: Super Admin, Admin, Sales Exec */}
        <Route
          path="/reports"
          element={
            <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SALES_EXECUTIVE]}>
              <Reports />
            </RoleRoute>
          }
        />

        <Route path="/notices" element={<Notices />} />
        <Route path="/timetable" element={<Timetable />} />
        <Route path="/enroll" element={<CourseEnroll />} />
        <Route path="/enrollment-requests" element={<EnrollmentRequests />} />

        {/* Super Admin Special Modules */}
        <Route
          path="/settings"
          element={
            <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
              <PlatformConfig />
            </RoleRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
              <AuditLogs />
            </RoleRoute>
          }
        />
        <Route
          path="/permission-overrides"
          element={
            <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
              <PermissionOverrides />
            </RoleRoute>
          }
        />
        <Route
          path="/data-export"
          element={
            <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
              <DataExport />
            </RoleRoute>
          }
        />
        <Route
          path="/email-templates"
          element={
            <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
              <EmailTemplates />
            </RoleRoute>
          }
        />
      </Route>

      {/* Catch-all 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
