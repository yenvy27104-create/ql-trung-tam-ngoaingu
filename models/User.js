/**
 * ============================================================================
 * MODEL NGƯỜI DÙNG (USER MODEL)
 * ============================================================================
 * Đảm nhận các thao tác CSDL liên quan tới tài khoản người dùng:
 * - Lấy thông tin người dùng theo ID, Email, Số điện thoại.
 * - Tạo mới tài khoản học viên (kèm Transaction hồ sơ học viên).
 * - Xác thực mật khẩu đăng nhập (bằng Bcrypt).
 * - Cập nhật mật khẩu và lấy danh sách nhân sự/giảng viên.
 */

const pool = require('./db');
const bcrypt = require('bcryptjs');

class User {
  /**
   * Lấy thông tin người dùng đầy đủ (kèm tên vai trò) theo Mã người dùng ID
   * @param {number} id - ID người dùng
   */
  static async getById(id) {
    const [rows] = await pool.query(
      `SELECT u.*, r.TenVaiTro 
       FROM NguoiDung u 
       JOIN VaiTro r ON u.MaVaiTro = r.MaVaiTro 
       WHERE u.MaNguoiDung = ?`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Tìm người dùng theo địa chỉ Email
   * @param {string} email - Email người dùng
   */
  static async getByEmail(email) {
    const [rows] = await pool.query(
      `SELECT u.*, r.TenVaiTro 
       FROM NguoiDung u 
       JOIN VaiTro r ON u.MaVaiTro = r.MaVaiTro 
       WHERE u.Email = ?`,
      [email]
    );
    return rows[0] || null;
  }

  /**
   * Tìm người dùng theo Số điện thoại
   * @param {string} phone - Số điện thoại
   */
  static async getByPhone(phone) {
    const [rows] = await pool.query(
      `SELECT u.*, r.TenVaiTro 
       FROM NguoiDung u 
       JOIN VaiTro r ON u.MaVaiTro = r.MaVaiTro 
       WHERE u.SoDienThoai = ?`,
      [phone]
    );
    return rows[0] || null;
  }

  /**
   * Tạo tài khoản học viên mới (Transaction tự động chèn thông tin tài khoản & hồ sơ học viên)
   * @param {Object} userData - Thông tin đăng ký học viên (HoTen, Email, SoDienThoai, MatKhau,...)
   */
  static async createStudent(userData) {
    const { HoTen, SoDienThoai, Email, MatKhau, DiaChi, NgaySinh } = userData;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Lấy ID vai trò 'Học viên' từ bảng vaitro
      const [roles] = await conn.query('SELECT MaVaiTro FROM vaitro WHERE TenVaiTro = "Học viên"');
      const roleId = roles.length > 0 ? roles[0].MaVaiTro : 3;

      // Mã hóa mật khẩu bằng bcrypt (salt round = 10)
      const hashedPassword = await bcrypt.hash(MatKhau, 10);
      const [userResult] = await conn.query(
        'INSERT INTO nguoidung (HoTen, Email, SoDienThoai, MatKhau, MaVaiTro, TrangThai, NgayTao) VALUES (?, ?, ?, ?, ?, "Hoạt động", NOW())',
        [HoTen, Email, SoDienThoai, hashedPassword, roleId]
      );
      const userId = userResult.insertId;

      // Tạo hồ sơ học viên tương ứng
      try {
        await conn.query(
          'INSERT INTO hosohocvien (MaNguoiDung, HoTen, QuanHe, NgaySinh, DiaChi, TrinhDoHienTai) VALUES (?, ?, "Bản thân", ?, ?, "Chưa xác định")',
          [userId, HoTen, NgaySinh || null, DiaChi || null]
        );
      } catch (profileErr) {
        console.warn('[User.createStudent] Fallback hosohocvien insert without HoTen/QuanHe:', profileErr.message);
        await conn.query(
          'INSERT INTO hosohocvien (MaNguoiDung, NgaySinh, DiaChi, TrinhDoHienTai) VALUES (?, ?, ?, "Chưa xác định")',
          [userId, NgaySinh || null, DiaChi || null]
        );
      }

      await conn.commit();
      return userId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Xác thực đăng nhập của người dùng bằng Email và Mật khẩu
   * @param {string} email - Email đăng nhập
   * @param {string} password - Mật khẩu chưa mã hóa
   */
  static async authenticate(email, password) {
    const user = await this.getByEmail(email);
    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.MatKhau);
    if (!isMatch) return null;
    return user;
  }

  /**
   * Lấy danh sách toàn bộ nhân sự / giảng viên trong trung tâm
   */
  static async getAllStaff() {
    const [rows] = await pool.query(
      `SELECT u.HoTen, u.AnhDaiDien, u.Email, u.SoDienThoai, ns.ChucVu, ns.HocVi, ns.ChungChiNgoaiNgu, ns.KinhNghiem, ns.NgayVaoLam 
       FROM hosonhansu ns 
       JOIN nguoidung u ON ns.MaNguoiDung = u.MaNguoiDung`
    );
    return rows;
  }

  /**
   * Cập nhật mật khẩu mới (đã mã hóa) cho người dùng
   * @param {number} userId - ID người dùng
   * @param {string} newHashedPassword - Mật khẩu mới đã qua Bcrypt
   */
  static async updatePassword(userId, newHashedPassword) {
    const [result] = await pool.query(
      'UPDATE NguoiDung set MatKhau=? where MaNguoiDung=?',
      [newHashedPassword, userId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = User;
