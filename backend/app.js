const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const studentRoutes = require('./routes/studentRoutes');
const courseRoutes = require('./routes/courseRoutes');
const batchRoutes = require('./routes/batchRoutes');
const leadRoutes = require('./routes/leadRoutes');
const admissionRoutes = require('./routes/admissionRoutes');
const admissionLinkRoutes = require('./routes/admissionLinkRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const financeRoutes = require('./routes/financeRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const followupRoutes = require('./routes/followupRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const documentRoutes = require('./routes/documentRoutes');
const placementRoutes = require('./routes/placementRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const couponRoutes = require('./routes/couponRoutes');
const systemRoutes = require('./routes/systemRoutes');
const auditRoutes = require('./routes/auditRoutes');
const overrideRoutes = require('./routes/overrideRoutes');
const exportRoutes = require('./routes/exportRoutes');
const emailTemplateRoutes = require('./routes/emailTemplateRoutes');

const app = express();

// Global Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,          // Set this to your Vercel URL in Railway env vars
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Root health check endpoint
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CampusFlow Backend API is running smoothly',
    timestamp: new Date().toISOString(),
    mysql_port: process.env.DB_PORT || '3307'
  });
});

const studentDashboardRoutes = require('./routes/studentDashboardRoutes');

// API Routes
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/users', '/users'], userRoutes);
app.use(['/api/students', '/students'], studentRoutes);
app.use(['/api/student', '/student'], studentDashboardRoutes);
app.use(['/api/courses', '/courses'], courseRoutes);
app.use(['/api/batches', '/batches'], batchRoutes);
app.use(['/api/leads', '/leads'], leadRoutes);
app.use(['/api/admissions', '/admissions'], admissionRoutes);
app.use(['/api/admission-links', '/admission-links'], admissionLinkRoutes);
app.use(['/api/attendance', '/attendance'], attendanceRoutes);
app.use(['/api/assignments', '/assignments'], assignmentRoutes);
app.use(['/api/finance', '/finance'], financeRoutes);
app.use(['/api/invoices', '/invoices'], financeRoutes);
app.use(['/api/payments', '/payments'], financeRoutes);
app.use(['/api/installments', '/installments'], financeRoutes);
app.use(['/api/mock-interviews', '/mock-interviews'], interviewRoutes);
app.use(['/api/notifications', '/notifications'], notificationRoutes);
app.use(['/api/reports', '/reports'], reportRoutes);
app.use(['/api/timetable', '/timetable'], timetableRoutes);
app.use(['/api/documents', '/documents'], documentRoutes);
app.use(['/api/placements', '/placements'], placementRoutes);
app.use(['/api/certificates', '/certificates'], certificateRoutes);
app.use(['/api/enrollments', '/enrollments'], enrollmentRoutes);
app.use(['/api/coupons', '/coupons'], couponRoutes);
app.use(['/api/config', '/config'], systemRoutes);
app.use(['/api/audit-logs', '/audit-logs'], auditRoutes);
app.use(['/api/permission-overrides', '/permission-overrides'], overrideRoutes);
app.use(['/api/export', '/export'], exportRoutes);
app.use(['/api/admin/email-templates', '/admin/email-templates'], emailTemplateRoutes);

// Error Handling Middleware
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

