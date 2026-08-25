/**
 * ============================================================================
 * MIDDLEWARE PHÂN QUYỀN TRUY CẬP (ROLE MIDDLEWARE)
 * ============================================================================
 * Kiểm tra xem người dùng đã đăng nhập và có vai trò (Role) phù hợp hay không.
 * Nếu không thỏa mãn, trả về lỗi HTTP 403 Forbidden.
 * 
 * @param {Array<string>} roles - Danh sách các vai trò được phép truy cập (Ví dụ: ['Admin'], ['Giảng viên', 'Admin'])
 */
module.exports = (roles) => {
  return (req, res, next) => {
    // Nếu chưa đăng nhập hoặc vai trò của user không thuộc danh sách roles hợp lệ
    if (!req.session.user || !roles.includes(req.session.user.TenVaiTro)) {
      return res.status(403).send('Quyền truy cập bị từ chối');
    }
    next();
  };
};

