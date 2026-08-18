const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const batchRoutes = require('./routes/batchRoutes');
const leadRoutes = require('./routes/leadRoutes');
const admissionRoutes = require('./routes/admissionRoutes');
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
const walletRoutes = require('./routes/walletRoutes');

const app = express();

// Global Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,          // Set this to your Vercel URL in Railway env vars
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);
    // Allow any vercel.app domain or localhost
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Allow all for now — restrict after go-live
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Root health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CampusFlow Backend API is running smoothly',
    timestamp: new Date().toISOString(),
    mysql_port: process.env.DB_PORT || '3307'
  });
});

const studentRoutes = require('./routes/studentRoutes');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', userRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/invoices', financeRoutes);
app.use('/api/payments', financeRoutes);
app.use('/api/installments', financeRoutes);
app.use('/api/mock-interviews', interviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/leads', followupRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/placements', placementRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/wallet', walletRoutes);

// Error Handling Middleware
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
