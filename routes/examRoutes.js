/**
 * ============================================================================
 * ROUTER THI THỬ & ĐÁNH GIÁ NĂNG LỰC ĐẦU VÀO (EXAM ROUTES)
 * ============================================================================
 * Đường dẫn điều hướng tính năng luyện đề và làm bài thi trực tuyến:
 * - Danh sách các đề thi thử miễn phí (TOEIC/IELTS).
 * - Đề thi đánh giá năng lực đầu vào (Placement Test).
 * - Nộp bài làm thi đầu vào và hiển thị kết quả chi tiết kèm phân tích điểm.
 */

const express = require('express');
const router = express.Router();
const ExamController = require('../controllers/examController');

// [GET] Hiển thị danh sách các đề thi thử miễn phí
router.get('/free', ExamController.listExams);

// [GET] Hiển thị giao diện làm bài thi kiểm tra đầu vào
router.get('/placement', ExamController.getPlacementTest);

// [POST] Tiếp nhận bài làm thi đầu vào, tự động chấm điểm và chuyển sang trang kết quả
router.post('/submit-placement', ExamController.submitPlacementTest);

// [GET] Hiển thị trang báo cáo kết quả chi tiết của lượt thi theo Mã lượt thi (MaLuotThi)
router.get('/result/:id', ExamController.showResult);

module.exports = router;
