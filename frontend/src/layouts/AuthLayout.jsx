import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="cf-auth-bg">
      <Outlet />
    </div>
  );
};

export default AuthLayout;
