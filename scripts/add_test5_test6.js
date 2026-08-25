const fs = require('fs');
const path = require('path');
const pool = require('../models/db');

async function createTests() {
  try {
    const baseJsonPath = path.join(__dirname, '../public/json/toeic_test_4.json');
    const baseData = JSON.parse(fs.readFileSync(baseJsonPath, 'utf8'));

    // 1. Create TOEIC Test 5
    const test5Data = { ...baseData, title: 'TOEIC Test 5' };
    const test5Path = path.join(__dirname, '../public/json/toeic_test_5.json');
    fs.writeFileSync(test5Path, JSON.stringify(test5Data, null, 2), 'utf8');
    console.log('Saved public/json/toeic_test_5.json');

    // 2. Create TOEIC Test 6
    const test6Data = { ...baseData, title: 'TOEIC Test 6' };
    const test6Path = path.join(__dirname, '../public/json/toeic_test_6.json');
    fs.writeFileSync(test6Path, JSON.stringify(test6Data, null, 2), 'utf8');
    console.log('Saved public/json/toeic_test_6.json');

    // 3. Upsert into MySQL table 'baithi'
    const [res5] = await pool.query(
      'SELECT MaDeThi FROM baithi WHERE TenDeThi = ? OR DuongDanFileJSON = ?',
      ['TOEIC Test 5', 'json/toeic_test_5.json']
    );
    if (res5.length > 0) {
      await pool.query(
        'UPDATE baithi SET TenDeThi = ?, ThoiGianLamBai = 120, LoaiDe = ?, TrangThai = 1 WHERE MaDeThi = ?',
        ['TOEIC Test 5', 'Luyện đề chính thức', res5[0].MaDeThi]
      );
      console.log('Updated DB entry for TOEIC Test 5');
    } else {
      await pool.query(
        'INSERT INTO baithi (TenDeThi, ThoiGianLamBai, LoaiDe, DuongDanFileJSON, TrangThai) VALUES (?, 120, ?, ?, 1)',
        ['TOEIC Test 5', 'Luyện đề chính thức', 'json/toeic_test_5.json']
      );
      console.log('Inserted DB entry for TOEIC Test 5');
    }

    const [res6] = await pool.query(
      'SELECT MaDeThi FROM baithi WHERE TenDeThi = ? OR DuongDanFileJSON = ?',
      ['TOEIC Test 6', 'json/toeic_test_6.json']
    );
    if (res6.length > 0) {
      await pool.query(
        'UPDATE baithi SET TenDeThi = ?, ThoiGianLamBai = 120, LoaiDe = ?, TrangThai = 1 WHERE MaDeThi = ?',
        ['TOEIC Test 6', 'Luyện đề chính thức', res6[0].MaDeThi]
      );
      console.log('Updated DB entry for TOEIC Test 6');
    } else {
      await pool.query(
        'INSERT INTO baithi (TenDeThi, ThoiGianLamBai, LoaiDe, DuongDanFileJSON, TrangThai) VALUES (?, 120, ?, ?, 1)',
        ['TOEIC Test 6', 'Luyện đề chính thức', 'json/toeic_test_6.json']
      );
      console.log('Inserted DB entry for TOEIC Test 6');
    }

    console.log('Successfully created and registered TOEIC Test 5 and TOEIC Test 6!');
    process.exit(0);
  } catch (err) {
    console.error('Error adding Test 5 and Test 6:', err);
    process.exit(1);
  }
}

createTests();
