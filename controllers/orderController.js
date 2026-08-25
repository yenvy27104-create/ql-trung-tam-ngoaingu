/**
 * ============================================================================
 * BỘ ĐIỀU KHIỂN ĐƠN HÀNG (ORDER CONTROLLER)
 * ============================================================================
 * Xử lý thông tin đơn hàng và đối soát thanh toán tự động SePay Webhook.
 */

const pool = require('../models/db');
const { notifyAdminPaymentSuccess } = require('../utils/paymentNotification');
const sepayHelper = require('../utils/sepayHelper');
const { updateStudentProficiencyLevel } = require('../utils/scoreCalc');

class OrderController {
  static async checkout(req, res) {
    res.send('Checkout page mock');
  }

  static async sepayWebhook(req, res) {
    try {
      console.log('[Sepay Webhook] Received webhook payload:', req.body);

      if (!sepayHelper.verifyWebhook(req.headers, req.body)) {
        return res.status(401).json({ success: false, message: 'Chữ ký Webhook không hợp lệ.' });
      }

      const { amountIn, content } = req.body;
      if (!content) {
        return res.status(400).json({ success: false, message: 'Nội dung chuyển khoản trống.' });
      }
      const match = content.match(/MaDK([\d_]+)/i);
      if (!match) {
        return res.status(400).json({ success: false, message: 'Nội dung chuyển khoản không chứa MaDK hợp lệ.' });
      }

      const idsStr = match[1];
      const maDangKyIds = idsStr.split('_').map(Number);
      const actualAmount = parseFloat(amountIn || 0);

      // Query the registrations
      const [registrations] = await pool.query(
        'SELECT * FROM dangkyhoc WHERE MaDangKy IN (?)',
        [maDangKyIds]
      );

      if (registrations.length === 0) {
        return res.status(404).json({ success: false, message: `Không tìm thấy đơn đăng ký với các MaDK: ${idsStr}` });
      }
      const allSuccessful = registrations.every(r => r.TrangThai === 'Thành công' || r.TrangThai === 'Đang học');
      if (allSuccessful) {
        return res.json({ success: true, message: 'Các đơn đăng ký này đã được xác nhận thanh toán trước đó.' });
      }
      for (const reg of registrations) {
        await pool.query(
          `INSERT INTO giaodich (MaDangKy, SoTien, NoiDungChuyenKhoan, NgayGiaoDich, TrangThai)
           VALUES (?, ?, ?, NOW(), 'Thành công')`,
          [reg.MaDangKy, reg.HocPhiDaGiam, content]
        );
        await pool.query(
          `UPDATE dangkyhoc SET TrangThai = 'Đang học' WHERE MaDangKy = ?`,
          [reg.MaDangKy]
        );
        if (reg.MaHocVien) {
          await updateStudentProficiencyLevel(reg.MaHocVien);
        }
      }
      notifyAdminPaymentSuccess(registrations.map(r => r.MaDangKy), { soTien: actualAmount, noiDungChuyenKhoan: content });

      console.log(`[Sepay Webhook] Đối soát tự động thành công cho các Đơn đăng ký #${idsStr}, số tiền: ${actualAmount}đ`);

      return res.json({ success: true, message: 'Đối soát thanh toán tự động thành công.' });
    } catch (err) {
      console.error('[Sepay Webhook Error]:', err);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đối soát webhook.' });
    }
  }
}

module.exports = OrderController;
