/**
 * ============================================================================
 * ROUTER QUẢN TRỊ VIÊN (ADMIN ROUTES)
 * ============================================================================
 * Tập hợp toàn bộ các đường dẫn URL dành riêng cho Quản trị viên (Admin):
 * - Dashboard thống kê tổng quan (doanh thu, số học viên, lớp học).
 * - Quản lý Khóa học, Lớp học, Phòng học, Thời khóa biểu, Ca học.
 * - Quản lý Tin tức, Chương trình khuyến mãi, Hồ sơ Nhân sự & Học viên.
 * - Quản lý Tài khoản, Đăng ký lớp, Giao dịch thanh toán & Đề thi JSON.
 * Tất cả đường dẫn được bảo vệ bởi authMiddleware và roleMiddleware(['Admin']).
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AdminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Bảo vệ tất cả các route của admin bằng middleware xác thực đăng nhập và kiểm tra quyền Admin
router.use(authMiddleware);
router.use(roleMiddleware(['Admin']));

// Giao diện chính của bảng điều khiển Admin (Dashboard)
router.get('/dashboard', AdminController.showDashboard);

// Các route quản lý Khóa học (Courses)
router.post('/courses/add', AdminController.addCourse);
router.post('/courses/edit/:id', AdminController.editCourse);
router.post('/courses/delete/:id', AdminController.deleteCourse);
router.post('/courses/syllabus/:id', AdminController.updateCourseSyllabus);

// Các route quản lý Lộ trình đề xuất (LOTRINH_DEXUAT)
router.post('/roadmaps/add', AdminController.addRoadmap);
router.post('/roadmaps/edit/:id', AdminController.editRoadmap);
router.post('/roadmaps/delete/:id', AdminController.deleteRoadmap);

// Các route quản lý Lớp học (Classes)
router.post('/classes/add', AdminController.addClass);
router.post('/classes/edit/:id', AdminController.editClass);
router.post('/classes/delete/:id', AdminController.deleteClass);

// Các route quản lý Phòng học (Classrooms)
router.post('/rooms/add', AdminController.addClassroom);
router.post('/rooms/edit/:id', AdminController.editClassroom);
router.post('/rooms/delete/:id', AdminController.deleteClassroom);

// Các route quản lý Ca học/Buổi học (Sessions)
router.post('/sessions/add', AdminController.addSession);
router.post('/sessions/edit/:id', AdminController.editSession);
router.post('/sessions/delete/:id', AdminController.deleteSession);

// Các route quản lý Thời khóa biểu/Lịch học (Schedules)
router.post('/tkb/add', AdminController.addTKB);
router.post('/tkb/delete/:id', AdminController.deleteTKB);
router.post('/schedules/update/:id', AdminController.updateTKB);

// Các route quản lý Tin tức & Bài viết (News)
router.post('/news/add', AdminController.addNews);
router.post('/news/edit/:id', AdminController.editNews);
router.post('/news/delete/:id', AdminController.deleteNews);

// Các route quản lý Chương trình Khuyến mãi (Promotions)
router.post('/promotions/add', upload.single('HinhAnhFile'), AdminController.addPromotion);
router.post('/promotions/edit/:id', upload.single('HinhAnhFile'), AdminController.editPromotion);
router.post('/promotions/delete/:id', AdminController.deletePromotion);

// Các route quản lý Tài khoản người dùng (Accounts)
router.post('/accounts/add', upload.single('AnhDaiDienFile'), AdminController.addAccount);
router.post('/accounts/edit/:id', upload.single('AnhDaiDienFile'), AdminController.editAccount);
router.post('/accounts/change-password/:id', AdminController.changePassword);
router.post('/accounts/delete/:id', AdminController.deleteAccount);

// Các route quản lý Hồ sơ Nhân sự/Giảng viên (Staff)
router.post('/staff/add', AdminController.addStaff);
router.post('/staff/edit/:id', AdminController.editStaffProfile);
router.post('/staff/delete/:id', AdminController.deleteStaff);

// Các route quản lý Hồ sơ Học viên (Students)
router.post('/students/add', AdminController.addStudent);
router.post('/students/edit/:id', AdminController.editStudentProfile);
router.post('/students/delete/:id', AdminController.deleteStudent);

// Các route quản lý Đăng ký lớp học (Enrollments)
router.post('/enrollments/add', AdminController.addEnrollment);
router.post('/enrollments/transfer', AdminController.transferStudentClass);
router.post('/enrollments/approve-transfer/:id', AdminController.approveClassTransfer);
router.post('/enrollments/reject-transfer/:id', AdminController.rejectClassTransfer);
router.post('/enrollments/assign-future-shift', AdminController.assignFutureClassShift);
router.post('/enrollments/edit-status/:id', AdminController.editEnrollmentStatus);
router.post('/enrollments/delete/:id', AdminController.deleteEnrollment);

// Các route quản lý Giao dịch học phí (Transactions)
router.post('/transactions/add', AdminController.addTransaction);
router.post('/transactions/delete/:id', AdminController.deleteTransaction);

const jsonStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const jsonDir = path.join(__dirname, '../public/json');
    if (!fs.existsSync(jsonDir)) {
      fs.mkdirSync(jsonDir, { recursive: true });
    }
    cb(null, jsonDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'exam-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadJson = multer({ storage: jsonStorage });

// Các route quản lý chi tiết nội dung các bài viết tin tức đặc biệt
router.get('/news/edit-format', AdminController.editFormat);
router.post('/news/save-format', AdminController.saveFormat);
router.get('/news/edit-listening', AdminController.editListening);
router.post('/news/save-listening', AdminController.saveListening);
router.get('/news/edit-vocab', AdminController.editVocab);
router.post('/news/save-vocab', AdminController.saveVocab);

// Các route quản lý Đề thi & Luyện đề (Exams)
router.post('/exams/add', uploadJson.single('JsonFile'), AdminController.addExam);
router.post('/exams/edit/:id', uploadJson.single('JsonFile'), AdminController.editExam);
router.post('/exams/delete/:id', AdminController.deleteExam);
router.post('/exams/toggle-status/:id', AdminController.toggleExamStatus);
router.post('/exams/change-type/:id', AdminController.changeExamType);
router.get('/exams/edit-questions/:id', AdminController.editExamQuestions);
router.post('/exams/save-questions/:id', AdminController.saveExamQuestions);
router.get('/exams/save-questions/:id', (req, res) => res.redirect('/admin/exams/edit-questions/' + req.params.id));

module.exports = router;
