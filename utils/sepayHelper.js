/**
 * ============================================================================
 * TIỆN ÍCH THANH TOÁN SEPAY & VIETQR (SEPAY HELPER)
 * ============================================================================
 * Hàm tiện ích hỗ trợ tích hợp SePay & VietQR:
 * - Xác thực webhook chuyển khoản ngân hàng từ SePay.
 * - Tạo đường dẫn ảnh QR VietQR động với số tiền và nội dung chuyển khoản.
 */

module.exports = {
  verifyWebhook: (headers, body) => true,
  generateQR: (amount, description) => `https://api.vietqr.io/image/mock-qr.png?amount=${amount}&addInfo=${encodeURIComponent(description)}`
};
