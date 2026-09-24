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
    const [rows] = await pool.query('SELECT * FROM lophoc');
    return rows;
  }

  /**
   * Lấy chi tiết thông tin lớp học theo Mã lớp học
   * @param {number} id - Mã lớp học (MaLopHoc)
   */
  static async getById(id) {
    const [rows] = await pool.query('SELECT * FROM lophoc WHERE MaLopHoc = ?', [id]);
    return rows[0] || null;
  }
}

module.exports = Classroom;
