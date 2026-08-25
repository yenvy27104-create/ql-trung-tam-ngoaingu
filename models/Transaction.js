/**
 * ============================================================================
 * MODEL GIAO DỊCH & TIN TỨC (TRANSACTION & NEWS MODEL)
 * ============================================================================
 * Quản lý lịch sử giao dịch thanh toán đăng ký học và bài viết tin tức:
 * - Lấy danh sách bài viết tin tức (tự động khởi tạo dữ liệu mẫu nếu rỗng).
 * - Quản lý giao dịch: tạo mới giao dịch, lấy danh sách, kiểm tra chi tiết và cập nhật trạng thái thanh toán.
 */

const pool = require('./db');

class Transaction {
  /**
   * Lấy danh sách bài viết tin tức trên trang chủ (tự khởi tạo tin tức mặc định nếu bảng rỗng)
   */
  static async getAllNews() {
    try {
      const [rows] = await pool.query(`
        SELECT t.*, u.HoTen AS NguoiDang
        FROM tintuc t
        LEFT JOIN nguoidung u ON t.MaNguoiDang = u.MaNguoiDung
        ORDER BY t.NgayDang DESC
      `);
      if (rows.length === 0) {
        // Tự động khởi tạo 3 bài viết tin tức mẫu ban đầu
        const [users] = await pool.query('SELECT MaNguoiDung FROM nguoidung ORDER BY MaNguoiDung ASC LIMIT 1');
        const adminId = users.length > 0 ? users[0].MaNguoiDung : 1;

        await pool.query(`
          INSERT INTO tintuc (TieuDe, TomTat, NoiDung, HinhAnh, NgayDang, MaNguoiDang) VALUES
          (?, ?, ?, ?, NOW(), ?),
          (?, ?, ?, ?, NOW(), ?),
          (?, ?, ?, ?, NOW(), ?)
        `, [
          'Cập nhật format TOEIC mới nhất năm 2026',
          'Những thay đổi quan trọng về cấu trúc đề thi TOEIC mà các thí sinh cần biết để đạt điểm cao.',
          'Tìm hiểu chi tiết cấu trúc đề thi TOEIC mới nhất với mô tả chi tiết từng Part từ 1 đến 7 và mẹo phân bổ thời gian.',
          '/images/Cap_Nhat_Fomat.png',
          adminId,
          'Mẹo làm bài Toeic Listening bứt phá điểm số',
          '5 chiến thuật nghe bắt từ khóa đỉnh cao giúp bạn bứt phá tối đa điểm số TOEIC Listening.',
          'Chiến thuật 1: Tận dụng thời gian vàng (Golden Time) để phán đoán trước... Chiến thuật 2: Đoán từ loại của đáp án...',
          '/images/Meo copy.png',
          adminId,
          'Kho 100 từ vựng TOEIC chủ đề văn phòng hay gặp',
          'Tổng hợp đầy đủ chức vụ, phòng ban, phúc lợi, văn phòng phẩm và mẫu câu giao tiếp văn phòng hay gặp.',
          'Kho từ vựng Tiếng Anh chủ đề Văn phòng & Công việc (Office & Corporate) với âm thanh phát âm và thanh tìm kiếm trực tuyến...',
          '/images/Kho_Tu_Vung.png',
          adminId
        ]);

        const [seededRows] = await pool.query(`
          SELECT t.*, u.HoTen AS NguoiDang
          FROM tintuc t
          LEFT JOIN nguoidung u ON t.MaNguoiDang = u.MaNguoiDung
          ORDER BY t.NgayDang DESC
        `);
        return seededRows;
      }
      return rows;
    } catch (err) {
      console.error('Error in getAllNews:', err);
      return [
        { MaTinTuc: 1, TieuDe: "Cập nhật format TOEIC mới nhất năm 2026", TomTat: "Những thay đổi quan trọng mà thí sinh cần biết.", NgayDang: new Date(), HinhAnh: "/images/Cap_Nhat_Fomat.png", NguoiDang: "Hệ thống" },
        { MaTinTuc: 2, TieuDe: "Mẹo làm bài Toeic Listening bứt phá điểm số", TomTat: "5 chiến thuật giúp bạn đạt điểm tối đa.", NgayDang: new Date(), HinhAnh: "/images/Meo copy.png", NguoiDang: "Hệ thống" },
        { MaTinTuc: 3, TieuDe: "Kho 100 từ vựng TOEIC chủ đề văn phòng hay gặp", TomTat: "100 từ vựng thường gặp trong đề thi.", NgayDang: new Date(), HinhAnh: "/images/Kho_Tu_Vung.png", NguoiDang: "Hệ thống" }
      ];
    }
  }

  /**
   * Lấy toàn bộ lịch sử giao dịch thanh toán
   */
  static async getAllTransactions() {
    const [rows] = await pool.query('SELECT * FROM GiaoDich ORDER BY NgayGiaoDich DESC');
    return rows;
  }

  /**
   * Lấy chi tiết giao dịch theo Mã giao dịch ID
   * @param {number} id - Mã giao dịch
   */
  static async getTransactionById(id) {
    const [rows] = await pool.query('SELECT * FROM GiaoDich WHERE MaGiaoDich = ?', [id]);
    return rows[0] || null;
  }

  /**
   * Tạo giao dịch thanh toán mới
   * @param {Object} data - Thông tin giao dịch (MaDangKy, SoTien, PhuongThuc, MaGiaoDichNgoai, TrangThai)
   */
  static async createTransaction(data) {
    const { MaDangKy, SoTien, PhuongThuc, MaGiaoDichNgoai, TrangThai } = data;
    const [result] = await pool.query(
      'INSERT INTO GiaoDich (MaDangKy, SoTien, PhuongThuc, MaGiaoDichNgoai, TrangThai) VALUES (?, ?, ?, ?, ?)',
      [MaDangKy, SoTien, PhuongThuc, MaGiaoDichNgoai, TrangThai || 'Pending']
    );
    return result.insertId;
  }

  /**
   * Cập nhật trạng thái giao dịch (Ví dụ: Thành công / Đang chờ / Thất bại)
   * @param {number} id - Mã giao dịch
   * @param {string} status - Trạng thái mới
   */
  static async updateStatus(id, status) {
    await pool.query('UPDATE GiaoDich SET TrangThai = ? WHERE MaGiaoDich = ?', [status, id]);
    return true;
  }
}

module.exports = Transaction;
