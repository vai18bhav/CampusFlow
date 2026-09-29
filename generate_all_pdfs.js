/**
 * CampusFlow — PDF Report Compiler
 * Converts HTML reports into actual PDF documents using Microsoft Edge CLI.
 * Usage: node generate_all_pdfs.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname);
const databaseDir = path.join(__dirname, 'database');
const backendDir = path.join(__dirname, 'backend');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

console.log('====================================================');
console.log('  CAMPUSFLOW — PDF DOCUMENT COMPILER');
console.log('====================================================\n');

// 1. Ensure HTML report for Database exists
const dbHtmlPath = path.join(databaseDir, 'campusflow_database_full.html');
if (!fs.existsSync(dbHtmlPath)) {
  console.log('Generating database HTML report...');
  execSync('node database/generate_db_html.js', { stdio: 'inherit' });
}

// 2. Ensure HTML report for Master Tests exists
const testHtmlPath = path.join(backendDir, 'CampusFlow_Test_Report.html');
if (!fs.existsSync(testHtmlPath)) {
  console.log('Generating test HTML report...');
  execSync('node backend/generate_test_pdf.js', { stdio: 'inherit' });
}

// Target PDF outputs
const dbPdfPath = path.join(rootDir, 'CampusFlow_Database_Documentation.pdf');
const testPdfPath = path.join(rootDir, 'CampusFlow_Testing_Report.pdf');

function convertToPdf(htmlPath, pdfPath, title) {
  console.log(`Compiling ${title} to PDF...`);
  try {
    const cmd = `"${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${htmlPath}"`;
    execSync(cmd, { stdio: 'pipe' });
    const stats = fs.statSync(pdfPath);
    console.log(`✓ Generated ${title}: ${pdfPath} (${(stats.size / 1024).toFixed(1)} KB)`);
  } catch (error) {
    console.error(`✗ Failed to generate ${title}:`, error.message);
  }
}

// Compile both PDFs
convertToPdf(dbHtmlPath, dbPdfPath, 'Database Architecture PDF');
convertToPdf(testHtmlPath, testPdfPath, 'System Testing Report PDF');

console.log('\n====================================================');
console.log('  PDF COMPILATION COMPLETE!');
console.log('====================================================');
console.log('Files generated:');
console.log('  1. ' + dbPdfPath);
console.log('  2. ' + testPdfPath);
console.log('====================================================\n');
