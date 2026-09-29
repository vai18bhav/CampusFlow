/**
 * CampusFlow — Complete Single-Page Database HTML & PDF Exporter
 * Generates an interactive, single-page visual documentation for all 31 tables in campusflow_db.
 * Usage: node database/generate_db_html.js
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'schema.sql');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CampusFlow — Complete Database Schema (31 Tables)</title>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<style>
    :root {
        --primary: #1e3a8a;
        --secondary: #2563eb;
        --accent: #0ea5e9;
        --bg-dark: #0f172a;
        --text-dark: #334155;
        --border-color: #e2e8f0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.5; padding: 2rem; }
    .container { max-width: 1400px; margin: 0 auto; background: white; padding: 3rem; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    header { text-align: center; border-bottom: 3px solid var(--secondary); padding-bottom: 2rem; margin-bottom: 2.5rem; }
    h1 { font-size: 2.5rem; color: var(--primary); font-weight: 800; margin-bottom: 0.5rem; }
    .subtitle { font-size: 1.1rem; color: #64748b; font-weight: 500; }
    .badge-bar { display: flex; justify-content: center; gap: 1rem; margin-top: 1rem; flex-wrap: wrap; }
    .badge { background: #eff6ff; color: var(--secondary); padding: 0.4rem 1rem; border-radius: 20px; font-weight: 600; font-size: 0.9rem; border: 1px solid #bfdbfe; }
    
    .section-title { font-size: 1.8rem; color: var(--primary); border-left: 5px solid var(--secondary); padding-left: 1rem; margin: 3rem 0 1.5rem 0; font-weight: 700; }
    .mermaid-container { background: #f1f5f9; padding: 2rem; border-radius: 12px; overflow-x: auto; border: 1px solid var(--border-color); text-align: center; }
    
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .stat-card { background: #f8fafc; border-radius: 12px; padding: 1.5rem; border: 1px solid var(--border-color); text-align: center; }
    .stat-card .val { font-size: 2.2rem; font-weight: 800; color: var(--secondary); }
    .stat-card .lbl { font-size: 0.9rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; font-size: 0.92rem; }
    th { background: var(--primary); color: white; text-align: left; padding: 0.75rem 1rem; font-weight: 600; }
    td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-color); }
    tr:nth-child(even) { background-color: #f8fafc; }
    .table-card { background: white; border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; margin-bottom: 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
    .table-card-header { background: #f1f5f9; padding: 1rem 1.5rem; font-weight: 700; font-size: 1.1rem; color: var(--primary); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
    .key-pk { background: #dcfce7; color: #166534; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.75rem; }
    .key-fk { background: #e0f2fe; color: #075985; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.75rem; }
    .key-uk { background: #fef3c7; color: #92400e; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.75rem; }

    pre { background: #0f172a; color: #f8fafc; padding: 1.5rem; border-radius: 12px; overflow-x: auto; font-family: 'Courier New', Courier, monospace; font-size: 0.88rem; line-height: 1.4; }
    
    @media print {
        body { padding: 0; background: white; }
        .container { max-width: 100%; box-shadow: none; padding: 1rem; }
        .table-card { page-break-inside: avoid; }
    }
</style>
</head>
<body>

<div class="container">
    <header>
        <h1>🎓 CampusFlow — Database Architecture</h1>
        <div class="subtitle">Complete Single-Page Database Reference &amp; Entity-Relationship Documentation</div>
        <div class="badge-bar">
            <span class="badge">Engine: MySQL 8.0+ / MariaDB</span>
            <span class="badge">Database: campusflow_db</span>
            <span class="badge">Tables: 31 Total</span>
            <span class="badge">Charset: utf8mb4</span>
        </div>
    </header>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="val">31</div>
            <div class="lbl">Total Tables</div>
        </div>
        <div class="stat-card">
            <div class="val">6</div>
            <div class="lbl">User Roles</div>
        </div>
        <div class="stat-card">
            <div class="val">100%</div>
            <div class="lbl">ACID InnoDB Compliant</div>
        </div>
        <div class="stat-card">
            <div class="val">7</div>
            <div class="lbl">Functional Modules</div>
        </div>
    </div>

    <h2 class="section-title">1. Entity-Relationship (ER) Diagram</h2>
    <div class="mermaid-container">
        <pre class="mermaid">
erDiagram
    roles ||--o{ users : "assigns"
    users ||--o| students : "extends"
    users ||--o| trainers : "extends"
    users ||--o| sales_executives : "extends"
    users ||--o| support_executives : "extends"
    
    courses ||--o{ batches : "has"
    trainers ||--o{ batches : "manages"
    batches ||--o{ batch_students : "enrolls"
    students ||--o{ batch_students : "belongs_to"
    
    sales_executives ||--o{ leads : "tracks"
    courses ||--o{ leads : "interested_in"
    leads ||--o{ lead_followups : "has"
    leads ||--o{ inquiries : "makes"
    sales_executives ||--o{ admission_links : "generates"
    courses ||--o{ admission_links : "bound_to"
    
    students ||--o{ admissions : "enrolled_via"
    courses ||--o{ admissions : "for_course"
    batches ||--o{ admissions : "assigned_to"
    admission_links ||--o| admissions : "created_from"
    
    batches ||--o{ timetable_slots : "schedules"
    trainers ||--o{ timetable_slots : "teaches"
    
    batches ||--o{ attendance : "records"
    students ||--o{ attendance : "logs"
    
    batches ||--o{ assignments : "publishes"
    trainers ||--o{ assignments : "creates"
    assignments ||--o{ assignment_submissions : "receives"
    students ||--o{ assignment_submissions : "submits"
    
    students ||--o{ mock_interviews : "participates"
    trainers ||--o{ mock_interviews : "evaluates"
    
    admissions ||--o{ invoices : "generates"
    students ||--o{ invoices : "billed_to"
    invoices ||--o{ installments : "split_into"
    invoices ||--o{ payments : "receives"
    installments ||--o{ payments : "clears"
    
    students ||--o{ student_wallet : "owns"
    students ||--o{ coin_transactions : "logs"
    students ||--o{ student_documents : "uploads"
    students ||--o{ placements : "achieves"
    students ||--o{ certificates : "awarded"
    students ||--o{ enrollment_requests : "submits"
    users ||--o{ notifications : "receives"
    users ||--o{ audit_logs : "triggers"
        </pre>
    </div>

    <h2 class="section-title">2. Complete Database DDL Schema (SQL Script)</h2>
    <pre><code>${schemaContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>

</div>

<script>
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
</script>
</body>
</html>`;

const outputPath = path.join(__dirname, 'campusflow_database_full.html');
fs.writeFileSync(outputPath, htmlContent, 'utf-8');
console.log('✓ Single-page HTML Database Documentation generated at:', outputPath);
