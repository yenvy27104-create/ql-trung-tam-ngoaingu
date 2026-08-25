/**
 * ============================================================================
 * TIỆN ÍCH KIỂM TRA TRẠNG THÁI LỚP HỌC (CLASS STATUS UTILITY)
 * ============================================================================
 * Định nghĩa các trạng thái lớp học không cho phép đăng ký mới
 * và hàm kiểm tra xem một lớp học có thể ghi danh / đăng ký hay không.
 */

const NON_ENROLLABLE_STATUSES = ['Đang diễn ra', 'Kết thúc', 'Đã đóng', 'Đã khai giảng'];

function isClassEnrollable(trangThaiLop) {
  return !NON_ENROLLABLE_STATUSES.includes(trangThaiLop);
}

module.exports = { NON_ENROLLABLE_STATUSES, isClassEnrollable };
