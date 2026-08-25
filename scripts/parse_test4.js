const pool = require('../models/db');

async function checkExams() {
  try {
    const [rows] = await pool.query('SELECT * FROM baithi');
    console.log('--- Current exams in baithi table ---');
    console.log(JSON.stringify(rows, null, 2));
    
    // Check table structure
    const [fields] = await pool.query('DESCRIBE baithi');
    console.log('--- baithi table structure ---');
    console.log(JSON.stringify(fields, null, 2));
  } catch (err) {
    console.error('Error fetching exams:', err);
  } finally {
    process.exit(0);
  }
}

checkExams();
