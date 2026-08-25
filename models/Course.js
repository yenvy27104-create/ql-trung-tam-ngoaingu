/**
 * ============================================================================
 * MODEL KHÓA HỌC (COURSE MODEL)
 * ============================================================================
 * Đảm nhận truy vấn CSDL liên quan tới danh mục khóa học (TOEIC, IELTS,...):
 * - Lấy danh sách toàn bộ khóa học.
 * - Chi tiết khóa học theo mã MaKhoaHoc.
 * - Thêm mới, cập nhật thông tin và xóa khóa học.
 */

const pool = require('./db');

class Course {
  /**
   * Lấy tất cả danh sách khóa học từ CSDL
   */
  static async getAll() {
    try {
      const [rows] = await pool.query('SELECT * FROM KhoaHoc');
      return rows;
    } catch (err) {
      try {
        const [rows] = await pool.query('SELECT * FROM KHOAHOC');
        return rows;
      } catch (err2) {
        return [];
      }
    }
  }

  /**
   * Lấy chi tiết thông tin một khóa học theo Mã khóa học ID
   * @param {number} id - Mã khóa học
   */
  static async getById(id) {
    try {
      const [rows] = await pool.query('SELECT * FROM KhoaHoc WHERE MaKhoaHoc = ?', [id]);
      return rows[0] || null;
    } catch (err) {
      try {
        const [rows] = await pool.query('SELECT * FROM KHOAHOC WHERE MaKhoaHoc = ?', [id]);
        return rows[0] || null;
      } catch (err2) {
        return null;
      }
    }
  }

  /**
   * Tạo một khóa học mới
   * @param {Object} course - Thông tin khóa học (TenKhoaHoc, MoTa, ThoiLuong, HocPhi, CapDo)
   */
  static async create(course) {
    const { TenKhoaHoc, MoTa, ThoiLuong, HocPhi, CapDo } = course;
    const [result] = await pool.query(
      'INSERT INTO KhoaHoc (TenKhoaHoc, MoTa, ThoiLuong, HocPhi, CapDo) VALUES (?, ?, ?, ?, ?)',
      [TenKhoaHoc, MoTa, ThoiLuong, HocPhi, CapDo]
    );
    return result.insertId;
  }

  /**
   * Cập nhật thông tin khóa học theo ID
   * @param {number} id - Mã khóa học cần sửa
   * @param {Object} course - Thông tin chỉnh sửa mới
   */
  static async update(id, course) {
    const { TenKhoaHoc, MoTa, ThoiLuong, HocPhi, CapDo } = course;
    await pool.query(
      'UPDATE KhoaHoc SET TenKhoaHoc = ?, MoTa = ?, ThoiLuong = ?, HocPhi = ?, CapDo = ? WHERE MaKhoaHoc = ?',
      [TenKhoaHoc, MoTa, ThoiLuong, HocPhi, CapDo, id]
    );
    return true;
  }

  /**
   * Xóa một khóa học khỏi hệ thống theo ID
   * @param {number} id - Mã khóa học cần xóa
   */
  static async delete(id) {
    await pool.query('DELETE FROM KhoaHoc WHERE MaKhoaHoc = ?', [id]);
    return true;
  }
}

module.exports = Course;
