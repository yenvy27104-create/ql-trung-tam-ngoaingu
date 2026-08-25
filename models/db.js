/**
 * ============================================================================
 * KHỞI TẠO KẾT NỐI CƠ SỞ DỮ LIỆU MYSQL (DATABASE POOL)
 * ============================================================================
 * Sử dụng thư viện mysql2/promise để tạo Connection Pool kết nối CSDL MySQL.
 * Các tham số kết nối được lấy từ file môi trường .env.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Tạo Connection Pool quản lý đồng thời nhiều kết nối CSDL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 4000, // Thêm dòng này để nhận cổng 4000 của TiDB
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'quanly_trungtam_ngoaingu',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  // 👇 THÊM ĐOẠN SSL NÀY VÀO ĐỂ BẮT BUỘC KẾT NỐI AN TOÀN VỚI TIDB CLOUD:
  ssl: {
    rejectUnauthorized: true
  }
});

module.exports = pool;