/**
 * ============================================================================
 * KHỞI TẠO KẾT NỐI CƠ SỞ DỮ LIỆU MYSQL (DATABASE POOL)
 * ============================================================================
 * Sử dụng thư viện mysql2/promise để tạo Connection Pool kết nối CSDL MySQL.
 * Các tham số kết nối được lấy từ file môi trường .env.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Cấu hình SSL linh hoạt cho cả Local và Cloud Database (TiDB, Aiven, Render, AWS RDS...)
let sslOption = undefined;
if (process.env.DB_SSL === 'true') {
  sslOption = { rejectUnauthorized: false };
} else if (process.env.DB_SSL === 'false') {
  sslOption = false;
} else if (process.env.DB_HOST && !['localhost', '127.0.0.1'].includes(process.env.DB_HOST)) {
  // Mặc định bật SSL (rejectUnauthorized: false) nếu kết nối CSDL Cloud ngoài localhost
  sslOption = { rejectUnauthorized: false };
}

// Tạo Connection Pool quản lý đồng thời nhiều kết nối CSDL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 4000, // Nhận cổng DB từ .env (VD: 4000 cho TiDB, 3306 cho MySQL)
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ql-trung-tam',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  ...(sslOption !== undefined && { ssl: sslOption })
});

module.exports = pool;