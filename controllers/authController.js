/**
 * =========================================================================
 * BỘ ĐIỀU KHIỂN XÁC THỰC NGƯỜI DÙNG (AUTH CONTROLLER)
 * Chức năng: Đăng ký tài khoản, Gửi mã xác nhận OTP qua Email, 
 * Đăng nhập hệ thống, Đổi mật khẩu, và Đăng xuất.
 * =========================================================================
 */
const User = require('../models/User');
const pool = require('../models/db');
const bcrypt = require('bcryptjs');
const path = require('path');
const ejs = require('ejs');
const { sendMail } = require('../utils/mailer');

class AuthController {
  /**
   * [CHỨC NĂNG 1] Gửi mã xác thực OTP qua Email khi Đăng ký tài khoản mới
   */
  static async sendRegisterOTP(req, res) {
    const { Email } = req.body;
    try {
      if (!Email) {
        return res.status(400).json({ success: false, message: 'Email là bắt buộc.' });
      }

      // Check if email format is valid
      const emailRegex = /^[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)*@[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(Email.trim())) {
        return res.status(400).json({ success: false, message: 'Định dạng email không hợp lệ.' });
      }

      // Check if email already exists
      const existingUser = await User.getByEmail(Email.trim());
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email đã tồn tại trên hệ thống.' });
      }

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('[DEBUG] Register OTP code generated:', otpCode);
      req.session.registerOtpData = {
        email: Email.trim(),
        code: otpCode,
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
      };

      const templatePath = path.join(__dirname, '../views/emails/register-otp-mail.ejs');
      const mailContent = await ejs.renderFile(templatePath, { otpCode: otpCode });
      await sendMail(Email.trim(), 'Mã xác nhận đăng ký tài khoản - Anh Ngữ Y&V', mailContent);

      return res.status(200).json({ success: true, message: 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra tin nhắn email.' });
    } catch (error) {
      console.error('Error sending register OTP:', error);
      return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi gửi mã OTP. Vui lòng thử lại sau.' });
    }
  }

  static async register(req, res) {
    try {
      const { HoTen, SoDienThoai, Email, MatKhau, otp } = req.body;
      
      // 1. Validate HoTen (must have last name/family name, i.e., at least 2 words)
      const nameParts = HoTen.trim().split(/\s+/);
      if (nameParts.length < 2) {
        return res.redirect('/?register_error=name');
      }
      
      // 2. Validate SoDienThoai (Vietnamese mobile carrier prefixes: starts with 03, 05, 07, 08, 09, total 10 digits)
      const phoneRegex = /^(03[2-9]|05[2689]|07[06-9]|08[1-9]|09[0-9])[0-9]{7}$/;
      if (!phoneRegex.test(SoDienThoai.trim())) {
        return res.redirect('/?register_error=phone');
      }
      
      // 3. Validate Email format (strict pattern without consecutive dots or special character errors)
      const emailRegex = /^[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)*@[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(Email.trim())) {
        return res.redirect('/?register_error=email_format');
      }

      // 3.2. Validate OTP
      const registerOtpData = req.session.registerOtpData;
      if (!registerOtpData || registerOtpData.email !== Email.trim() || registerOtpData.code !== otp || Date.now() > registerOtpData.expiresAt) {
        return res.redirect('/?register_error=otp_invalid');
      }
      
      // 3.5. Validate existing SoDienThoai (duplicate check)
      const existingPhone = await User.getByPhone(SoDienThoai.trim());
      if (existingPhone) {
        return res.redirect('/?register_error=phone_exists');
      }
      
      // 4. Validate existing Email
      const existingUser = await User.getByEmail(Email.trim());
      if (existingUser) {
        if (!existingUser.SoDienThoai || existingUser.SoDienThoai.trim() === '' || existingUser.SoDienThoai === '0000000000') {
          // Temporary unlink their test history to the current session so it gets relinked after creation
          const [profiles] = await pool.query('SELECT MaHocVien FROM hosohocvien WHERE MaNguoiDung = ?', [existingUser.MaNguoiDung]);
          if (profiles.length > 0) {
            await pool.query('UPDATE ketquathi SET MaHocVien = NULL, SessionKhach = ? WHERE MaHocVien = ?', [req.sessionID, profiles[0].MaHocVien]);
            await pool.query('DELETE FROM hosohocvien WHERE MaNguoiDung = ?', [existingUser.MaNguoiDung]);
          }
          await pool.query('DELETE FROM nguoidung WHERE MaNguoiDung = ?', [existingUser.MaNguoiDung]);
        } else {
          return res.redirect('/?register_error=email_exists');
        }
      }

      const DiaChi = req.body.DiaChi ? req.body.DiaChi.trim() : null;
      const NgaySinh = req.body.NgaySinh ? req.body.NgaySinh.trim() : null;

      const userId = await User.createStudent({ 
        HoTen: HoTen.trim(), 
        SoDienThoai: SoDienThoai.trim(), 
        Email: Email.trim(), 
        MatKhau,
        DiaChi,
        NgaySinh
      });
      const user = await User.getById(userId);
      
      // Clear OTP from session
      delete req.session.registerOtpData;

      // Save user to session
      req.session.userId = user.MaNguoiDung;
      req.session.user = user;
 
      // Link guest session results to this new student
      let [profiles] = await pool.query('SELECT MaHocVien FROM hosohocvien WHERE MaNguoiDung = ?', [user.MaNguoiDung]);
      let profile = profiles[0];
      if (!profile) {
        await pool.query('INSERT INTO hosohocvien (MaNguoiDung, HoTen, QuanHe, NgaySinh, DiaChi, TrinhDoHienTai) VALUES (?, ?, "Bản thân", ?, ?, "Chưa xác định")', [user.MaNguoiDung, user.HoTen, NgaySinh, DiaChi]);
        [profiles] = await pool.query('SELECT MaHocVien FROM hosohocvien WHERE MaNguoiDung = ?', [user.MaNguoiDung]);
        profile = profiles[0];
      } else {
        await pool.query('UPDATE hosohocvien SET DiaChi = COALESCE(?, DiaChi), NgaySinh = COALESCE(?, NgaySinh), HoTen = COALESCE(HoTen, ?) WHERE MaHocVien = ?', [DiaChi, NgaySinh, user.HoTen, profile.MaHocVien]);
      }
      
      if (profile && req.sessionID) {
        await pool.query(
          'UPDATE ketquathi SET MaHocVien = ?, SessionKhach = NULL WHERE SessionKhach = ? AND MaHocVien IS NULL',
          [profile.MaHocVien, req.sessionID]
        );
      }
      
      let redirect = req.body.redirect || req.query.redirect;
      if (!redirect || redirect === '/') {
        redirect = '/classes/my-classes';
      }
      const separator = redirect.includes('?') ? '&' : '?';
      res.redirect(redirect + separator + 'register_success=1');
    } catch (err) {
      console.error(err);
      res.redirect('/?register_error=1');
    }
  }

  static async login(req, res) {
    try {
      const { Email, MatKhau } = req.body;
      const user = await User.authenticate(Email, MatKhau);
      if (!user) {
        return res.render('auth/login', { error: 'Email hoặc mật khẩu không chính xác', user: null, redirect: req.query.redirect || null });
      }

      if (user.TrangThai !== 'Hoạt động' && user.TrangThai !== 'Active') {
        return res.render('auth/login', { error: 'Tài khoản chưa được kích hoạt hoặc đã bị khóa!', user: null, redirect: req.query.redirect || null });
      }
      
      req.session.userId = user.MaNguoiDung;
      req.session.user = user;

      // Link guest session results to this student
      let [profiles] = await pool.query('SELECT MaHocVien FROM hosohocvien WHERE MaNguoiDung = ?', [user.MaNguoiDung]);
      let profile = profiles[0];
      if (!profile && user.TenVaiTro === 'Học viên') {
        await pool.query('INSERT INTO hosohocvien (MaNguoiDung, TrinhDoHienTai) VALUES (?, "Chưa xác định")', [user.MaNguoiDung]);
        [profiles] = await pool.query('SELECT MaHocVien FROM hosohocvien WHERE MaNguoiDung = ?', [user.MaNguoiDung]);
        profile = profiles[0];
      }
      
      if (profile && req.sessionID) {
        await pool.query(
          'UPDATE ketquathi SET MaHocVien = ?, SessionKhach = NULL WHERE SessionKhach = ? AND MaHocVien IS NULL',
          [profile.MaHocVien, req.sessionID]
        );
      }
      
      let redirect = req.body.redirect || req.query.redirect;
      if (!redirect || redirect === '/') {
        if (user.TenVaiTro === 'Admin') {
          redirect = '/admin/dashboard';
        } else if (user.TenVaiTro === 'Giảng viên') {
          redirect = '/classes/dashboard';
        } else if (user.TenVaiTro === 'Học viên') {
          redirect = '/classes/my-classes';
        } else {
          redirect = '/';
        }
      }
      
      const separator = redirect.includes('?') ? '&' : '?';
      res.redirect(redirect + separator + 'login_success=1');
    } catch (err) {
      console.error(err);
      res.render('auth/login', { error: 'Lỗi đăng nhập hệ thống', user: null });
    }
  }

  /**
   * [CHỨC NĂNG] Đăng xuất tài khoản khỏi hệ thống
   */
  static async logout(req, res) {
    req.session.destroy(() => {
      res.redirect('/');
    });
  }

  /**
   * [CHỨC NĂNG] Hiển thị trang giao diện Đăng nhập
   */
  static showLogin(req, res) {
    if (req.session.user) {
      let redirect = '/';
      if (req.session.user.TenVaiTro === 'Admin') {
        redirect = '/admin/dashboard';
      } else if (req.session.user.TenVaiTro === 'Giảng viên') {
        redirect = '/classes/dashboard';
      } else if (req.session.user.TenVaiTro === 'Học viên') {
        redirect = '/classes/my-classes';
      }
      return res.redirect(redirect);
    }
    let errorMsg = null;
    if (req.query.expired || req.query.reason === 'session_expired') {
      errorMsg = 'Phiên làm việc của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục!';
    }

    res.render('auth/login', { 
      error: errorMsg, 
      user: null, 
      message: req.query.message || null,
      redirect: req.query.redirect || null,
      isExpired: !!(req.query.expired || req.query.reason === 'session_expired')
    });
  }

  /**
   * [CHỨC NĂNG] Gửi mã OTP xác nhận khi người dùng yêu cầu Quên mật khẩu
   */
  static async processForgotEmailOTP(req, res) {
    const { Email } = req.body;
    try {
      const user = await User.getByEmail(Email);
      if (!user) {
        return res.render('auth/forgot-password', { error: 'Email không tồn tại trong hệ thống!' });
      }
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      req.session.otpData = {
        email: Email,
        userId: user.MaNguoiDung,
        code: otpCode,
        expiresAt: Date.now() + 5 * 60 * 1000
      };
      const templatePath = path.join(__dirname, '../views/emails/otp-mail.ejs');
      const mailContent = await ejs.renderFile(templatePath, { otpCode: otpCode });
      await sendMail(Email, 'Mã xác nhận đặt lại mật khẩu', mailContent);
      res.render('auth/verify-otp', { Email: Email, error: null, expiresAt: req.session.otpData.expiresAt });
    } catch (error) {
      console.error(error);
      res.render('auth/forgot-password', { error: 'Lỗi hệ thống khi gửi Email, vui lòng thử lại sau.' });
    }
  }

  /**
   * [CHỨC NĂNG] Xác minh mã OTP Quên mật khẩu từ email
   */
  static async verifyEmailOTP(req, res) {
    const { Email, otp } = req.body;
    const otpData = req.session.otpData;
    const inputOtp = otp ? String(otp).trim() : '';
    if (!otpData || otpData.email !== Email || String(otpData.code).trim() !== inputOtp || Date.now() > otpData.expiresAt) {
      return res.render('auth/verify-otp', { 
        Email: Email, 
        error: 'Mã OTP không hợp lệ hoặc đã hết hạn! Vui lòng kiểm tra thư Email mới nhất vừa được gửi đến.',
        expiresAt: otpData ? otpData.expiresAt : (Date.now() + 5 * 60 * 1000)
      }); 
    }
    const userId = otpData.userId;
    delete req.session.otpData;
    res.render('auth/reset-password', { id: userId, error: null });
  }

  /**
   * [CHỨC NĂNG] Xử lý lưu mật khẩu mới sau khi xác thực OTP thành công
   */
  static async processResetPassword(req, res) {
    const { id } = req.params;
    const { password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      return res.render('auth/reset-password', { id, error: 'Mật khẩu xác nhận không khớp!' });
    }

    try {
      const hash = await bcrypt.hash(password, 10);
      // Gọi hàm cập nhật mật khẩu trong Model User
      await User.updatePassword(id, hash);

      res.redirect('/auth/login?message=' + encodeURIComponent('Đặt lại mật khẩu thành công!'));
    } catch (error) {
      console.error(error);
      res.render('auth/reset-password', { id, error: 'Đã xảy ra lỗi khi cập nhật mật khẩu.' });
    }
  }
}

module.exports = AuthController;
