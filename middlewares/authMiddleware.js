/**
 * Middleware kiểm tra phiên đăng nhập của người dùng.
 * - Nếu không có req.session.user (chưa đăng nhập hoặc phiên đã hết hạn sau 24h):
 *   -> Chuyển hướng người dùng về trang /login với tham số expired=1 để hiển thị thông báo hết hạn.
 * - Nếu người dùng là khách Google chưa hoàn tất đăng ký SĐT:
 *   -> Chuyển hướng yêu cầu hoàn tất thông tin.
 */
module.exports = (req, res, next) => {
  if (!req.session.user) {
    const redirect = encodeURIComponent(req.originalUrl);
    return res.redirect(`/login?redirect=${redirect}&expired=1`);
  }
  if (req.session.user.isGoogleGuest) {
    return res.redirect('/?show_register=1&reason=require_register');
  }
  next();
};


