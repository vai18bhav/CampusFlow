import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { can, hasRole } from '../../utils/permissions';

/**
 * PermissionGate Component
 * Conditionally renders children if current user has required role or permission.
 *
 * Props:
 *  - permission: string (e.g. 'USER_MANAGEMENT')
 *  - roles: string | array (e.g. ['SUPER_ADMIN', 'ADMIN'])
 *  - fallback: ReactNode (optional fallback if unauthorized)
 */
const PermissionGate = ({ permission, roles, fallback = null, children }) => {
  const { role } = useAuth();

  if (permission && !can(role, permission)) {
    return fallback;
  }

  if (roles) {
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    if (!hasRole(role, ...rolesArray)) {
      return fallback;
    }
  }

  return <>{children}</>;
};

export default PermissionGate;
