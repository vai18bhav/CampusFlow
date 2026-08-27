/**
 * Database Migration Script for MySQL Indexing & Query Performance Optimization
 */

const pool = require('./config/db');

async function createIndexIfNotExists(conn, tableName, indexName, columnsSql) {
  try {
    const [rows] = await conn.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [tableName, indexName]
    );

    if (rows.length === 0) {
      await conn.query(`CREATE INDEX ${indexName} ON ${tableName} (${columnsSql})`);
      console.log(`  ✅ Created index '${indexName}' on table '${tableName}'.`);
    } else {
      console.log(`  ℹ️ Index '${indexName}' already exists on table '${tableName}'.`);
    }
  } catch (err) {
    console.error(`  ⚠️ Error creating index '${indexName}' on '${tableName}':`, err.message);
  }
}

async function runPerformanceIndexesMigration() {
  console.log('🔄 Running MySQL Performance Indexing Migration...');
  const conn = await pool.getConnection();

  try {
    // 1. Users table indexes
    await createIndexIfNotExists(conn, 'users', 'idx_users_role_status', 'role_id, status');
    await createIndexIfNotExists(conn, 'users', 'idx_users_email', 'email');

    // 2. Students table indexes
    await createIndexIfNotExists(conn, 'students', 'idx_students_user_id', 'user_id');
    await createIndexIfNotExists(conn, 'students', 'idx_students_roll_number', 'roll_number');

    // 3. Admissions table indexes
    await createIndexIfNotExists(conn, 'admissions', 'idx_admissions_student_id', 'student_id');
    await createIndexIfNotExists(conn, 'admissions', 'idx_admissions_course_batch', 'course_id, batch_id');
    await createIndexIfNotExists(conn, 'admissions', 'idx_admissions_status', 'status');

    // 4. Batches & Courses indexes
    await createIndexIfNotExists(conn, 'batches', 'idx_batches_course_trainer', 'course_id, trainer_id, status');
    await createIndexIfNotExists(conn, 'courses', 'idx_courses_status', 'status');

    // 5. Attendance table indexes
    await createIndexIfNotExists(conn, 'attendance', 'idx_attendance_stu_date', 'student_id, date');
    await createIndexIfNotExists(conn, 'attendance', 'idx_attendance_batch_status', 'batch_id, status');

    // 6. Mock Interviews table indexes
    await createIndexIfNotExists(conn, 'mock_interviews', 'idx_mock_stu_status', 'student_id, status');
    await createIndexIfNotExists(conn, 'mock_interviews', 'idx_mock_trainer_delegated', 'trainer_id, delegated_to_user_id, delegation_status');
    await createIndexIfNotExists(conn, 'mock_interviews', 'idx_mock_scheduled_date', 'scheduled_date');

    // 7. Assignments & Submissions table indexes
    await createIndexIfNotExists(conn, 'assignments', 'idx_assignments_batch_due', 'batch_id, due_date');
    await createIndexIfNotExists(conn, 'assignment_submissions', 'idx_sub_assign_stu', 'assignment_id, student_id');

    // 8. Invoices & Installments table indexes
    await createIndexIfNotExists(conn, 'invoices', 'idx_invoices_stu_status', 'student_id, status');
    await createIndexIfNotExists(conn, 'invoices', 'idx_invoices_number', 'invoice_number');
    await createIndexIfNotExists(conn, 'installments', 'idx_installments_inv_due', 'invoice_id, due_date, status');

    // 9. Coupons table indexes
    await createIndexIfNotExists(conn, 'coupons', 'idx_coupons_code_active', 'code, is_active');

    // 10. Notifications & Audit Logs table indexes
    await createIndexIfNotExists(conn, 'notifications', 'idx_notif_user_read', 'user_id, is_read');
    await createIndexIfNotExists(conn, 'notifications', 'idx_notif_ref', 'reference_type, reference_id');
    await createIndexIfNotExists(conn, 'audit_logs', 'idx_audit_user_action', 'user_id, action');

    console.log('🎉 Performance indexing migration completed successfully.\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration Error:', error.message);
    process.exit(1);
  } finally {
    conn.release();
  }
}

runPerformanceIndexesMigration();
