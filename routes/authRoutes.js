/**
 * ============================================================================
 * ROUTER XÁC THỰC NGƯỜI DÙNG (AUTH ROUTES)
 * ============================================================================
 * Định tuyến xử lý toàn bộ các tính năng liên quan đến tài khoản & bảo mật:
 * - Đăng nhập truyền thống (Email/Password) & Đăng xuất.
 * - Gửi mã OTP xác thực qua Email & Đăng ký tài khoản học viên mới.
 * - Đăng nhập nhanh qua Google OAuth 2.0.
 * - Quên mật khẩu, xác minh OTP và đặt lại mật khẩu mới.
 */

const express = require('express');
const router = express.Router();
const passport = require('passport');
const AuthController = require('../controllers/authController');

// [GET & POST] Trang hiển thị và xử lý đăng nhập truyền thống (Email & Mật khẩu)
router.get('/login', AuthController.showLogin);
router.post('/login', AuthController.login);

// Route xử lý gửi OTP đăng ký & Đăng ký tài khoản mới
router.post('/register/send-otp', AuthController.sendRegisterOTP);
router.post('/register', AuthController.register);

// Route đăng xuất hệ thống
router.get('/logout', AuthController.logout);

// Route kích hoạt đăng nhập qua Google OAuth
router.get('/google', (req, res, next) => {
    const redirect = req.query.redirect;
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: redirect ? encodeURIComponent(redirect) : undefined
    })(req, res, next);
});

// Route callback nhận kết quả trả về từ Google sau khi người dùng xác thực thành công
router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/auth/login?error=Đăng nhập bằng Google thất bại'
    }),
    (req, res) => {
        // Lưu thông tin người dùng từ Google vào Session
        req.session.userId = req.user.MaNguoiDung;
        req.session.user = req.user;
        if (!req.user.SoDienThoai || req.user.SoDienThoai.trim() === '' || req.user.SoDienThoai === '0000000000') {
            req.session.user.isGoogleGuest = true;
        }
        
        // Điều hướng người dùng theo vai trò tương ứng (Admin, Giảng viên, Học viên)
        let redirect = req.query.state ? decodeURIComponent(req.query.state) : null;
        if (!redirect || redirect === '/') {
            if (req.user.TenVaiTro === 'Admin') {
                redirect = '/admin/dashboard';
            } else if (req.user.TenVaiTro === 'Giảng viên') {
                redirect = '/classes/dashboard';
            } else if (req.user.TenVaiTro === 'Học viên') {
                redirect = '/classes/my-classes';
            } else {
                redirect = '/';
            }
        }
        const separator = redirect.includes('?') ? '&' : '?';
        res.redirect(redirect + separator + 'login_success=1');
    }
);

router.get('/forgot-password', (req, res) => {
    res.render('auth/forgot-password', { error: null });
});
router.post('/forgot-password', AuthController.processForgotEmailOTP);
router.get('/verify-otp', (req, res) => {
  const email = req.query.email || 'yenvy27104@gmail.com';
  const error = req.query.expired ? 'Mã OTP không hợp lệ hoặc đã hết hạn!' : (req.query.error || null);
  const expiresAt = req.query.expired ? Date.now() - 1000 : Date.now() + 5 * 60 * 1000;
  res.render('auth/verify-otp', { Email: email, error: error, expiresAt: expiresAt });
});
router.post('/verify-otp', AuthController.verifyEmailOTP);
router.post('/reset-password/:id', AuthController.processResetPassword);
module.exports = router;
