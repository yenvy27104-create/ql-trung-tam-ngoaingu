/**
 * ============================================================================
 * ROUTER LỚP HỌC & GIẢNG VIÊN / HỌC VIÊN (CLASS ROUTES)
 * ============================================================================
 * Định tuyến các tính năng dành cho Học viên và Giảng viên:
 * - Học viên: Xem lớp học cá nhân, cập nhật hồ sơ, đăng ký lớp, gửi/hủy thanh toán, thanh toán VNPay.
 * - Giảng viên: Bảng điều khiển giảng dạy (Dashboard), điểm danh học viên, nhập điểm số, giao bài tập, quản lý đề thi.
 */

const express = require('express');
const router = express.Router();
const ClassController = require('../controllers/classController');
const AdminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

router.get('/my-classes', authMiddleware, ClassController.listClasses);
router.post('/update-profile', authMiddleware, ClassController.updateProfile);
router.post('/add-student-profile', authMiddleware, ClassController.addStudentProfile);
router.post('/register-class', authMiddleware, ClassController.registerClass);
router.post('/submit-payment', authMiddleware, ClassController.submitPayment);
router.post('/cancel-payment', authMiddleware, ClassController.cancelPayment);
router.post('/delete-registration/:id', authMiddleware, ClassController.deleteRegistration);
router.post('/create-vnpay-payment', authMiddleware, ClassController.createVNPayPayment);
router.get('/vnpay-return', ClassController.vnpayReturn);
router.get('/vnpay-ipn', ClassController.vnpayIPN);
router.post('/vnpay-ipn', ClassController.vnpayIPN);

router.post('/update-phone', authMiddleware, ClassController.updatePhone);
router.post('/student-request-transfer', authMiddleware, ClassController.studentRequestTransfer);

// Teacher routes (Protected by authMiddleware & roleMiddleware for Teacher & Admin)
const isTeacherOrAdmin = roleMiddleware(['Giảng viên', 'Admin']);

router.get('/dashboard', authMiddleware, isTeacherOrAdmin, ClassController.showTeacherDashboard);
router.post('/attendance', authMiddleware, isTeacherOrAdmin, ClassController.saveAttendance);
router.post('/save-attendance', authMiddleware, isTeacherOrAdmin, ClassController.saveAttendance);
router.post('/grades', authMiddleware, isTeacherOrAdmin, ClassController.saveGrades);
router.post('/save-grades', authMiddleware, isTeacherOrAdmin, ClassController.saveGrades);
router.post('/create-practice', authMiddleware, isTeacherOrAdmin, upload.any(), ClassController.createPracticeTest);
router.post('/update-registration-status', authMiddleware, isTeacherOrAdmin, ClassController.updateRegistrationStatus);
router.post('/submit-teacher-report', authMiddleware, isTeacherOrAdmin, ClassController.submitTeacherReport);
router.post('/submit-report', authMiddleware, isTeacherOrAdmin, ClassController.submitTeacherReport);
router.post('/teacher-profile', authMiddleware, isTeacherOrAdmin, ClassController.updateTeacherProfile);
router.get('/exams/edit-questions/:id', authMiddleware, isTeacherOrAdmin, AdminController.editExamQuestions);
router.post('/exams/save-questions/:id', authMiddleware, isTeacherOrAdmin, AdminController.saveExamQuestions);
router.get('/exams/save-questions/:id', authMiddleware, isTeacherOrAdmin, (req, res) => res.redirect('/classes/exams/edit-questions/' + req.params.id));

module.exports = router;
