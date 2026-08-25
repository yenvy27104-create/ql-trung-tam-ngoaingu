/**
 * ============================================================================
 * MODEL ĐỀ THI & BÀI THI (EXAM MODEL)
 * ============================================================================
 * Đảm nhận các truy vấn dữ liệu liên quan tới Đề thi thử và Đề thi kiểm tra đầu vào:
 * - Lấy danh sách toàn bộ đề thi thử (TOEIC, IELTS,...).
 * - Lấy danh sách đề thi đánh giá năng lực đầu vào (Placement Test).
 * - Lấy thông tin chi tiết bài thi theo mã MaDeThi.
 */

const pool = require('./db');

class Exam {
  /**
   * Lấy danh sách tất cả đề thi thử (không bao gồm đề kiểm tra đầu vào) đang kích hoạt
   */
  static async getAll() {
    const [rows] = await pool.query('SELECT * FROM baithi WHERE LoaiDe != "Đầu vào" AND TrangThai = 1');
    return rows;
  }

  /**
   * Lấy thông tin chi tiết một đề thi theo Mã đề thi
   * @param {number} id - Mã đề thi (MaDeThi)
   */
  static async getById(id) {
    const [rows] = await pool.query('SELECT * FROM baithi WHERE MaDeThi = ?', [id]);
    return rows[0] || null;
  }

  /**
   * Lấy danh sách các đề thi đánh giá năng lực đầu vào (Placement Tests)
   */
  static async getPlacementTests() {
    const [rows] = await pool.query('SELECT * FROM baithi WHERE LoaiDe = "Đầu vào" AND TrangThai = 1');
    return rows;
  }
}

module.exports = Exam;
