/**
 * ============================================================================
 * CẤU HÌNH PASSPORT GOOGLE OAUTH 2.0
 * ============================================================================
 * File này đảm nhận việc xác thực người dùng đăng nhập qua tài khoản Google.
 * - Kiểm tra email Google đã có trong CSDL hay chưa.
 * - Nếu chưa có, tự động tạo tài khoản học viên mới.
 * - Quản lý lưu trữ phiên làm việc (Session) thông qua serializeUser và deserializeUser.
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

/**
 * Cấu hình chiến lược đăng nhập Google OAuth 2.0
 */
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
    proxy: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      if (!email) {
        return done(null, false, { message: 'Không thể truy cập email từ tài khoản Google của bạn.' });
      }

      // 1. Kiểm tra xem người dùng đã tồn tại trong cơ sở dữ liệu chưa
      let user = await User.getByEmail(email);
      if (!user) {
        // 2. Nếu chưa có, tự động tạo tài khoản học viên mới với thông tin từ Google
        const dummyPassword = Math.random().toString(36).substring(2) + Date.now().toString();
        const userId = await User.createStudent({
          HoTen: profile.displayName || 'Học viên Google',
          SoDienThoai: '',
          Email: email,
          MatKhau: dummyPassword
        });
        user = await User.getById(userId);
      }
      return done(null, user);
    } catch (err) {
      console.error('[GOOGLE OAUTH ERROR]', err);
      return done(err);
    }
  }
));

// Lưu ID người dùng vào Passport session
passport.serializeUser((user, done) => {
  done(null, user.MaNguoiDung);
});

// Trích xuất thông tin người dùng từ ID đã lưu
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.getById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

