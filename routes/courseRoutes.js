/**
 * ============================================================================
 * ROUTER KHÓA HỌC, LỊCH KHAI GIẢNG & GIỎ HÀNG (COURSE & CART ROUTES)
 * ============================================================================
 * Đường dẫn phục vụ học viên xem chương trình học, lịch khai giảng và giỏ hàng:
 * - Lấy đề cương chi tiết môn học (Syllabus API).
 * - Hiển thị danh sách khóa học kèm lịch khai giảng đang mở đăng ký.
 * - Quản lý giỏ hàng: Thêm/Xóa môn học trong giỏ hàng, áp dụng mã giảm giá và thanh toán.
 */

const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Classroom = require('../models/Classroom');
const CartController = require('../controllers/cartController');
const authMiddleware = require('../middlewares/authMiddleware');
const pool = require('../models/db');
const { getSyllabusByCourseId, getCourseMetaById, syllabiData } = require('../utils/syllabi');

router.get('/syllabus/:id', (req, res) => {
  const courseId = parseInt(req.params.id);
  const syllabus = getSyllabusByCourseId(courseId);
  const meta = getCourseMetaById(courseId);
  return res.json({ success: true, syllabus, meta });
});

router.get('/', async (req, res) => {
  try {
    const courses = await Course.getAll();
    const [allClasses] = await pool.query(`
      SELECT lh.*, COALESCE(lh.HocPhi, kh.HocPhi) AS HocPhi, kh.ThoiLuong, kh.TenKhoaHoc AS TenKhoaHocGoc,
             (SELECT COUNT(*) FROM dangkyhoc dk WHERE dk.MaLopHoc = lh.MaLopHoc AND dk.TrangThai IN ('Thành công', 'Đang học')) AS SiSoHienTai
      FROM lophoc lh
      JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc
      WHERE lh.MaLopHoc IN (SELECT DISTINCT MaLopHoc FROM thoikhoabieu)
    `);
    const [schedules] = await pool.query(`
      SELECT tkb.MaLopHoc, tkb.ThuTrongTuan, bh.TenBuoi, 
             TIME_FORMAT(bh.GioBatDau, '%H:%i') AS GioBatDau, 
             TIME_FORMAT(bh.GioKetThuc, '%H:%i') AS GioKetThuc, 
             ph.TenPhong
      FROM thoikhoabieu tkb
      JOIN buoihoc bh ON tkb.MaBuoiHoc = bh.MaBuoiHoc
      JOIN phonghoc ph ON tkb.MaPhongHoc = ph.MaPhongHoc
      ORDER BY FIELD(tkb.ThuTrongTuan, 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'), bh.GioBatDau
    `);

    const getLocalDateStr = (d) => {
      if (!d) return '';
      if (typeof d === 'string') return d.split('T')[0];
      const dt = new Date(d);
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const todayStr = getLocalDateStr(new Date());

    // Map schedules to classes & check if start date has passed
    allClasses.forEach(cls => {
      const classStartStr = getLocalDateStr(cls.NgayKhaiGiang);
      if (classStartStr && classStartStr <= todayStr) {
        cls.TrangThaiLop = 'Đã khai giảng';
      }

      const clsSchedules = schedules.filter(s => s.MaLopHoc === cls.MaLopHoc);
      if (clsSchedules.length > 0) {
        const timeGroups = {};
        clsSchedules.forEach(s => {
          const timeKey = `${s.GioBatDau} - ${s.GioKetThuc}`;
          if (!timeGroups[timeKey]) {
            timeGroups[timeKey] = [];
          }
          timeGroups[timeKey].push(s.ThuTrongTuan);
        });
        cls.LichHoc = Object.entries(timeGroups)
          .map(([time, days]) => `${days.join(', ')} (${time})`)
          .join('; ');
      } else {
        cls.LichHoc = 'Chưa có lịch học cụ thể';
      }
    });
    
    // Chỉ hiển thị các lớp chưa khai giảng (đang tuyển sinh) trên trang lịch khai giảng
    const hiddenStatuses = ['Đang diễn ra', 'Kết thúc', 'Đã đóng', 'Đã khai giảng'];
    const classes = allClasses.filter(cls => !hiddenStatuses.includes(cls.TrangThaiLop));
    
    courses.forEach(course => {
      course.classes = classes.filter(cls => cls.MaKhoaHoc === course.MaKhoaHoc);
    });

    res.render('public/schedules', { 
      courses, 
      error: null, 
      user: req.session.user || null 
    });
  } catch (err) {
    res.render('public/schedules', { courses: [], error: err.message, user: req.session.user || null });
  }
});

// Cart routes
router.get('/cart', authMiddleware, CartController.getCart);
router.post('/cart/add', CartController.addToCart);
router.post('/cart/remove', authMiddleware, CartController.removeFromCart);
router.post('/cart/promo/validate', authMiddleware, CartController.validatePromo);
router.post('/cart/checkout', authMiddleware, CartController.checkout);

module.exports = router;
