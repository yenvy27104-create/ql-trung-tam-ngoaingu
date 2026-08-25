/**
 * ============================================================================
 * MODEL LỚP HỌC (CLASSROOM MODEL)
 * ============================================================================
 * Đảm nhận các truy vấn liên quan tới thông tin Lớp học:
 * - Lấy danh sách toàn bộ các lớp học trong trung tâm.
 * - Lấy thông tin chi tiết một lớp học theo mã MaLopHoc.
 */

const pool = require('./db');

class Classroom {
  /**
   * Lấy tất cả danh sách lớp học từ cơ sở dữ liệu
   */
  static async getAll() {
    try {
      const [rows] = await pool.query('SELECT * FROM LopHoc');
      return rows;
    } catch (err) {
      try {
        const [rows] = await pool.query('SELECT * FROM LOPHOC');
        return rows;
      } catch (err2) {
        return [];
      }
    }
  }

  /**
   * Lấy chi tiết thông tin lớp học theo Mã lớp học
   * @param {number} id - Mã lớp học (MaLopHoc)
   */
  static async getById(id) {
    try {
      const [rows] = await pool.query('SELECT * FROM LopHoc WHERE MaLopHoc = ?', [id]);
      return rows[0] || null;
    } catch (err) {
      try {
        const [rows] = await pool.query('SELECT * FROM LOPHOC WHERE MaLopHoc = ?', [id]);
        return rows[0] || null;
      } catch (err2) {
        return null;
      }
    }
  }
}

module.exports = Classroom;
