# CampusFlow — Training & Admission Management Portal

![CampusFlow Logo](https://img.shields.io/badge/CampusFlow-v1.0.0-blue.svg)
![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20Express%20%7C%20MySQL-orange.svg)

---

## 📌 Project Overview
**CampusFlow** is an enterprise-grade, centralized web-based **Training & Admission Management Portal** designed to manage the end-to-end student lifecycle—from lead acquisition and inquiry management to admission enrollment, batch scheduling, attendance tracking, assignment evaluation, tuition fee finance, mock interviews, student dashboard, notifications, executive reports, and platform configuration.

---

## 🚀 Technology Stack
- **Frontend**: React.js, HTML5, Vanilla CSS3, Bootstrap 5, Bootstrap Icons, Axios, React Router v6.
- **Backend**: Node.js, Express.js (REST APIs), CORS, Dotenv, JWT Authentication, bcryptjs password hashing.
- **Database**: MySQL 8.0+ (Port 3307) with InnoDB engine, parameterized queries, and ACID transactions.
- **Security**: Role-Based Access Control (RBAC), bcrypt password encryption, parameterized SQL queries, CORS origin guards.

---

## 📂 Folder Structure

```
CampusFlow/
├── backend/
│   ├── config/
│   │   └── db.js                 # MySQL Connection Pool (Port 3307)
│   ├── controllers/
│   │   ├── authController.js     # Login, Register, Password Reset
│   │   ├── userController.js     # User Management & Roles
│   │   ├── courseController.js   # Courses Management
│   │   ├── batchController.js    # Batches Management
│   │   ├── leadController.js     # Leads & Inquiries
│   │   ├── admissionController.js# Admission Processing & Unique ADM-2026-XXXX
│   │   ├── attendanceController.js# Bulk Attendance & Percentage Engine
│   │   ├── assignmentController.js# Assignments & Solution Grading
│   │   ├── financeController.js # Invoices, Installments, Payments (Transactions)
│   │   ├── interviewController.js# Mock Interviews & Evaluation Scores
│   │   ├── studentDashboardController.js # Student Dashboard Aggregator
│   │   ├── notificationController.js# System Notifications
│   │   └── reportController.js  # Executive Reports & Analytics
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT Bearer Token Verification
│   │   ├── roleMiddleware.js     # RBAC Role Authorization
│   │   └── errorMiddleware.js    # Centralized Error & 404 Handlers
│   ├── routes/                   # Mounted REST API Routes
│   ├── utils/
│   │   ├── responseHelper.js     # Standard API Response Formatter
│   │   └── notificationHelper.js # Event Notification Helper
│   ├── test_e2e_master.js        # Master E2E Integration Test Suite
│   ├── .env                      # Environment Variables (Port 3307)
│   ├── .env.example              # Environment Configuration Template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/           # Reusable UI Cards, DataTables, Navbar, Sidebar
│   │   ├── context/              # Auth Context & Token Management
│   │   ├── pages/                # All Feature Pages (Modules 1-12)
│   │   ├── routes/               # Protected App Router
│   │   ├── services/             # Axios API Service Layer
│   │   └── index.css             # Design System & Token Styles
│   ├── .env                      # Frontend Environment Config (VITE_API_URL)
│   ├── .env.example              # Frontend Environment Template
│   └── package.json
│
├── database/
│   ├── schema.sql                # Complete Database Schema (21 Tables)
│   ├── seed.sql                  # Seed Data & Bcrypt Password Hashes
│   └── init_db.js                # Database Initialization Script
│
└── README.md                     # Project Documentation & Deployment Guide
```

---

## 🔐 Default Demo Accounts
All default accounts use the password: `password123`

| Role | Email | Access Scope |
| :--- | :--- | :--- |
| **Super Admin** | `superadmin@campusflow.com` | Full System Control, Audits, User Management, Reports |
| **Admin** | `admin@campusflow.com` | Operational Management, Invoices, Admissions, Batches |
| **Sales Executive** | `sales@campusflow.com` | Lead Management, Inquiries, Admission Conversions |
| **Trainer** | `trainer@campusflow.com` | Assigned Batches, Attendance, Assignments, Interviews |
| **Support Executive** | `support@campusflow.com` | Candidate Queries & Operational Support |
| **Student** | `student@campusflow.com` | Personal Student Dashboard, My Fees, Assignments, Attendance |

---

## 🛠️ Environment Configuration Setup

### 1. Backend Configuration (`backend/.env`)
```env
NODE_ENV=development
PORT=5000

# Database Configuration (Preserving MySQL Port 3307)
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=campusflow_db

# JWT Configuration
JWT_SECRET=campusflow_production_jwt_secret_key_2026
JWT_EXPIRES_IN=1d

# CORS Allowed Origin
FRONTEND_URL=http://localhost:5173
```

### 2. Frontend Configuration (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 💻 Local Installation & Setup Steps

### 1. Clone & Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Initialize Database & Seed Data (MySQL Port 3307)
```bash
cd backend
npm run init-db
```
*Creates `campusflow_db` and seeds initial accounts with encrypted bcrypt passwords.*

### 3. Start Backend Development Server (Port 5000)
```bash
cd backend
npm run dev
```

### 4. Start Frontend Development Server (Port 5173)
```bash
cd frontend
npm run dev
```

---

## 🧪 Master Testing & Verification Suite

Run the master automated E2E integration test suite covering all 7 core workflows and security checks:
```bash
cd backend
node test_e2e_master.js
```

### Test Results Summary
```
================================================================
CAMPUSFLOW MASTER END-TO-END INTEGRATION & SECURITY TEST SUITE
================================================================

[PASS] Health Check API: Status 200 (CampusFlow Backend API is running smoothly, MySQL Port: 3307)
[PASS] Auth & Token Generation: Admin, Trainer, and Student tokens acquired successfully.
[PASS] WORKFLOW 1 (Student -> Admission -> Dashboard): Student "John Doe" enrolled in "Full Stack Web Development (MERN/PERN)".
[PASS] WORKFLOW 2 (Finance Ledger): Total Tuition: $1100, Total Paid: $600, Balance Due: $500.
[PASS] WORKFLOW 3 (Attendance Engine): Cumulative Attendance Percentage = 100%.
[PASS] WORKFLOW 4 (Assignments Engine): Retrieved 2 assignments with personal submission states.
[PASS] WORKFLOW 5 (Mock Interviews Engine): Retrieved 2 mock interview schedules.
[PASS] WORKFLOW 6 (Notifications System): 3 notifications fetched.
[PASS] WORKFLOW 7 (Executive Reports & Analytics): Total Students: 3, Admissions: 3, Total Collected: $2300.
[PASS] Security Check 1: Missing JWT token cleanly rejected with 401 Unauthorized.
[PASS] Security Check 2: Student access to Admin Reports correctly blocked with 403 Forbidden.
[PASS] Security Check 3: Over-payment amount correctly rejected with 400 Bad Request.

================================================================
ALL 7 WORKFLOWS AND SECURITY CHECKS PASSED WITH 100% SUCCESS!
================================================================
```

---

## 📦 Production Build & Deployment

### 1. Build Frontend Production Bundle
```bash
cd frontend
npm run build
```
*Generates optimized production assets in `frontend/dist/` in under 3 seconds with 0 errors.*

### 2. Database Backup Command
```bash
mysqldump -u root -p -P 3307 campusflow_db > campusflow_db_backup.sql
```

### 3. Production Hosting Deployment
- **Frontend Hosting**: Deploy `frontend/dist` to **Vercel** or **Netlify**. Set `VITE_API_URL=https://your-backend-api.com/api`.
- **Backend Hosting**: Deploy `backend/` to **Render** or **Railway**. Set production `.env` variables (`NODE_ENV=production`, `FRONTEND_URL`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`).
- **Database Hosting**: Use managed **PlanetScale**, **Aiven**, or **Render MySQL**.

---

## 📄 License
This project is proprietary software developed for the **CampusFlow Training & Admission Management Portal**. All rights reserved.
