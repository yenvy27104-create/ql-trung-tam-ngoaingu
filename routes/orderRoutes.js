/**
 * ============================================================================
 * ROUTER ĐƠN HÀNG & THANH TOÁN (ORDER & WEBHOOK ROUTES)
 * ============================================================================
 * Đường dẫn xử lý đơn hàng và tích hợp cổng thanh toán tự động:
 * - Hiển thị trang xác nhận thanh toán đơn hàng (Checkout).
 * - Tiếp nhận Webhook thông báo chuyển khoản tự động từ hệ thống SePay.
 */

const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/orderController');
const PaymentWebhookController = require('../controllers/paymentWebhookController');

// [GET] Hiển thị thông tin đơn hàng và mã QR chuyển khoản ngân hàng
router.get('/checkout', OrderController.checkout);

// [POST] Endpoint tiếp nhận Webhook ngân hàng tức thì từ SePay
router.post('/sepay-webhook', PaymentWebhookController.handleWebhook);

module.exports = router;
