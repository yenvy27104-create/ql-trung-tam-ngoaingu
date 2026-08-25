/**
 * ============================================================================
 * FILE MÁY CHỦ CHÍNH (SERVER.JS - MAIN ENTRY POINT)
 * ============================================================================
 * Khởi chạy và điều phối toàn bộ ứng dụng Quản lý Trung tâm Ngoại ngữ QL_TTNN:
 * - Khởi tạo Express, cấu hình Body Parser, Session, Cookie (thời hạn 24h).
 * - Cấu hình xác thực Passport Google OAuth 2.0.
 * - Khởi tạo Socket.IO hỗ trợ phát thông báo thanh toán realtime.
 * - Cấu hình View Engine EJS & các thư mục tĩnh (public/uploads, css, js).
 * - Đăng ký các tuyến đường (Routes): Auth, Admin, Classes, Courses, Exams, Orders.
 * - Khởi chạy Cron Job / Task tự động đối soát trạng thái lớp học.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
// Reload trigger: webhook matching rewritten + route aliases added 19:21
const express = require('express');
const session = require('express-session');
const Course = require('./models/Course');
const Transaction = require('./models/Transaction');
const Classroom = require('./models/Classroom');
const User = require('./models/User');

// ==========================================
// 1. CẤU HÌNH VÀ KHỞI TẠO ỨNG DỤNG (EXPRESS APP)
// ==========================================
const app = express();
app.set('trust proxy', 1); // Cần thiết khi deploy lên Render / Reverse Proxy để bảo mật session & HTTPS
const PORT = process.env.PORT || 3000;

// Helper đọc dữ liệu tĩnh từ các file JSON trong public/json
const readJsonData = (filename, defaultValue = {}) => {
  try {
    const filePath = path.join(__dirname, 'public/json', filename);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error(`Error reading JSON ${filename}:`, err);
  }
  return defaultValue;
};

// Cấu hình Middleware xử lý dữ liệu form (urlencoded) và JSON từ client gửi lên (nâng giới hạn 50MB & 100.000 tham số cho đề thi)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 100000 }));

// ==========================================
// 2. CẤU HÌNH PHIÊN ĐĂNG NHẬP (EXPRESS-SESSION)
// ==========================================
// maxAge: 24 * 60 * 60 * 1000 = 86.400.000 ms (tương đương 24 giờ / 1 ngày)
// Sau 24 giờ không tương tác hoặc đóng trình duyệt (tuỳ cookie), phiên làm việc sẽ tự hết hạn.
app.use(session({
  secret: process.env.SESSION_SECRET || 'Y_and_V_TOEIC_Center_Key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 ngày
}));

// ==========================================
// 3. CẤU HÌNH XÁC THỰC PASSPORT (GOOGLE OAUTH)
// ==========================================
const passport = require('passport');
require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

// ==========================================
// 4. CẤU HÌNH VIEW ENGINE (EJS) VÀ THƯ MỤC TĨNH (PUBLIC)
// ==========================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

const pool = require('./models/db');

// Middleware toàn cục: Gán biến `user`, `cartCount` và thông tin ngân hàng vào `res.locals` để giao diện EJS dùng trực tiếp
app.use(async (req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.cartCount = req.session.cart ? req.session.cart.length : 0;
  res.locals.paymentConfig = {
    bankId: process.env.BANK_ID || 'MB',
    bankName: process.env.BANK_NAME || 'MB Bank (Ngân hàng Quân Đội)',
    accountNo: process.env.ACCOUNT_NO || '190227102026',
    accountName: process.env.ACCOUNT_NAME || 'TRUNG TAM TOEIC Y&V',
    template: process.env.PAYMENT_TEMPLATE || 'compact',
    qrImage: process.env.PAYMENT_QR_IMAGE || null
  };

  res.locals.statusNotifications = [];
  res.locals.notificationBadgeCount = 0;

  if (req.session.user) {
    try {
      const u = req.session.user;
      const notis = [];

      if (u.TenVaiTro === 'Admin') {
        // Nếu là Admin: Hiển thị danh sách các phiếu xin chuyển lớp, đăng ký chờ duyệt từ Học viên
        const [pendingRequests] = await pool.query(
          `SELECT dk.*, lh.TenLop, kh.TenKhoaHoc, hh.HoTen AS TenHocVien 
           FROM dangkyhoc dk 
           JOIN lophoc lh ON dk.MaLopHoc = lh.MaLopHoc 
           JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc 
           JOIN hosohocvien hh ON dk.MaHocVien = hh.MaHocVien 
           WHERE dk.TrangThai LIKE '%Xin chuyển%' OR dk.TrangThai = 'Chờ xử lý - Xin chuyển lớp' OR dk.TrangThai = 'Chờ duyệt'
           ORDER BY dk.MaDangKy DESC LIMIT 15`
        );

        pendingRequests.forEach(r => {
          const isTransfer = r.TrangThai.includes('Xin chuyển');
          notis.push({
            id: r.MaDangKy,
            type: isTransfer ? 'warning' : 'info',
            badge: isTransfer ? 'Xin chuyển lớp' : 'Chờ duyệt',
            title: isTransfer ? `Yêu cầu xin chuyển lớp mới` : `Đơn đăng ký cần duyệt`,
            message: isTransfer 
              ? `Học viên ${r.TenHocVien} gửi phiếu xin chuyển khỏi lớp ${r.TenLop} (${r.TenKhoaHoc}).` 
              : `Đơn đăng ký mới từ học viên ${r.TenHocVien} tại lớp ${r.TenLop}.`,
            link: '/admin/dashboard?tab=enrollments',
            date: r.NgayDangKy
          });
        });
      } else if (u.TenVaiTro === 'Giảng viên') {
        // Nếu là Giảng viên: Nhắc nhở lịch dạy, kiểm tra Giữa kỳ & Cuối kỳ của lớp đảm nhận
        const [teacherClasses] = await pool.query(
          `SELECT lh.MaLopHoc, lh.TenLop, kh.TenKhoaHoc, kh.ThoiLuong 
           FROM lophoc lh 
           JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc 
           JOIN hosonhansu hn ON lh.MaGiangVien = hn.MaNhanSu 
           WHERE hn.MaNguoiDung = ? AND lh.TrangThaiLop = 'Đang diễn ra'`,
          [u.MaNguoiDung]
        );

        for (const tc of teacherClasses) {
          const [attCnt] = await pool.query(
            `SELECT COUNT(DISTINCT NgayHoc) AS cnt FROM diemdanh WHERE MaLopHoc = ?`,
            [tc.MaLopHoc]
          );
          const sessionsDone = attCnt[0]?.cnt || 0;
          const totalSessions = Number(tc.ThoiLuong || 26);
          const midTermSession = Math.floor(totalSessions / 2);

          if (sessionsDone >= midTermSession - 1 && sessionsDone <= midTermSession + 1) {
            notis.push({
              id: `tc-mid-${tc.MaLopHoc}`,
              type: 'info',
              badge: 'Lịch thi Giữa kỳ',
              title: `📝 Kiểm tra Giữa kỳ (Lớp ${tc.TenLop})`,
              message: `Lớp ${tc.TenLop} (${tc.TenKhoaHoc}) sắp/đang diễn ra bài kiểm tra Giữa kỳ (Buổi ${midTermSession}/${totalSessions}). Vui lòng cập nhật điểm số.`,
              link: `/classes/dashboard?tab=attendance&classId=${tc.MaLopHoc}`,
              date: new Date()
            });
          }

          if (sessionsDone >= totalSessions - 1) {
            notis.push({
              id: `tc-final-${tc.MaLopHoc}`,
              type: 'warning',
              badge: 'Lịch thi Cuối kỳ',
              title: `🎓 Kiểm tra Cuối kỳ (Lớp ${tc.TenLop})`,
              message: `Lớp ${tc.TenLop} (${tc.TenKhoaHoc}) sắp/đang diễn ra bài kiểm tra Cuối kỳ & tổng kết (Buổi ${totalSessions}/${totalSessions}). Vui lòng nhập điểm & nhận xét.`,
              link: `/classes/dashboard?tab=attendance&classId=${tc.MaLopHoc}`,
              date: new Date()
            });
          }
        }
      } else {
        // Nếu là Học viên: Hiển thị thông báo trạng thái đơn học + Nhắc lịch thi Giữa kỳ / Cuối kỳ
        const [registrations] = await pool.query(
          `SELECT dk.*, lh.TenLop, kh.TenKhoaHoc, kh.ThoiLuong, hh.HoTen AS TenHocVien 
           FROM dangkyhoc dk 
           JOIN lophoc lh ON dk.MaLopHoc = lh.MaLopHoc 
           JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc 
           JOIN hosohocvien hh ON dk.MaHocVien = hh.MaHocVien 
           WHERE hh.MaNguoiDung = ? OR dk.MaNguoiDangKy = ? 
           ORDER BY dk.MaDangKy DESC LIMIT 15`,
          [u.MaNguoiDung, u.MaNguoiDung]
        );

        for (const r of registrations) {
          const st = r.TrangThai;
          const note = r.GhiChu || '';

          if (st === 'Đang học') {
            // Notifications for active classes
          }

          if (st === 'Bảo lưu') {
            notis.push({
              id: r.MaDangKy,
              type: 'warning',
              badge: 'Bảo lưu',
              title: `Bảo lưu kết quả học tập`,
              message: `Hồ sơ đăng ký lớp ${r.TenLop} (${r.TenKhoaHoc}) đang ở trạng thái BẢO LƯU học phí và lịch học.`,
              link: '/classes/my-classes',
              date: r.NgayDangKy
            });
          } else if (st === 'Ngừng học') {
            notis.push({
              id: r.MaDangKy,
              type: 'danger',
              badge: 'Ngừng học',
              title: `Cập nhật trạng thái Ngừng học`,
              message: `Lớp ${r.TenLop} (${r.TenKhoaHoc}) đã chuyển sang trạng thái NGỪNG HỌC.${note ? ` Ghi chú: ${note}` : ''}`,
              link: '/classes/my-classes',
              date: r.NgayDangKy
            });
          } else if (['Hoàn thành', 'Đã hoàn thành'].includes(st)) {
            notis.push({
              id: r.MaDangKy,
              type: 'success',
              badge: 'Hoàn thành',
              title: `🎉 Hoàn thành khóa học!`,
              message: `Chúc mừng bạn đã hoàn thành xuất sắc khóa học ${r.TenKhoaHoc} - Lớp ${r.TenLop}.`,
              link: '/classes/my-classes',
              date: r.NgayDangKy
            });
          } else if (note.includes('[Từ chối chuyển lớp]')) {
            notis.push({
              id: r.MaDangKy,
              type: 'info',
              badge: 'Chuyển lớp',
              title: `Thông báo xử lý chuyển lớp`,
              message: `Phản hồi về đơn chuyển lớp ${r.TenLop}: ${note}`,
              link: '/classes/my-classes',
              date: r.NgayDangKy
            });
          } else if (note.includes('[Đã xếp ca đợt mới]')) {
            notis.push({
              id: r.MaDangKy,
              type: 'success',
              badge: 'Xếp ca đợt mới',
              title: `Đã xếp ca đợt mở mới!`,
              message: `Bạn đã được gán vào lớp đợt mới: ${r.TenLop} (${r.TenKhoaHoc}).`,
              link: '/classes/my-classes',
              date: r.NgayDangKy
            });
          }
        }
      }

      res.locals.statusNotifications = notis;
      res.locals.notificationBadgeCount = notis.length;
    } catch (e) {
      console.error('Lỗi nạp thông báo người dùng:', e.message);
    }
  }

  next();
});

// Routes mounting
app.use('/auth', require('./routes/authRoutes'));
app.use('/courses', require('./routes/courseRoutes'));
app.use('/classes', require('./routes/classRoutes'));
app.use('/exams', require('./routes/examRoutes'));
app.use('/orders', require('./routes/orderRoutes'));
app.use('/admin', require('./routes/adminRoutes'));

// Route alias cho Bảng điều khiển Giảng viên (/teacher/dashboard -> /classes/dashboard)
app.use(['/teacher/dashboard', '/teacher'], (req, res) => {
  const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  res.redirect('/classes/dashboard' + queryString);
});

// Payment Webhook API (bên thứ 3: SePay, Casso, ...)
// Đăng ký nhiều route alias để SePay có thể gọi bất kỳ URL nào
const PaymentWebhookController = require('./controllers/paymentWebhookController');
app.post('/api/payment-webhook', PaymentWebhookController.handleWebhook);
app.post('/sepay-webhook', PaymentWebhookController.handleWebhook);
app.post('/webhook', PaymentWebhookController.handleWebhook);
app.get('/api/payment-status/:maDangKy', PaymentWebhookController.checkPaymentStatus);

// TOEIC Format Article route
app.get('/format-toeic', async (req, res) => {
  try {
    const pool = require('./models/db');
    const [rows] = await pool.query("SELECT * FROM tintuc WHERE MaTinTuc = 1 OR TieuDe LIKE '%format%' OR TieuDe LIKE '%cấu trúc%' LIMIT 1");
    const article = rows.length > 0 ? rows[0] : null;
    const formatData = readJsonData('format_toeic.json', {});
    res.render('public/format-toeic', {
      user: req.session.user || null,
      article,
      formatData
    });
  } catch (err) {
    console.error(err);
    res.render('public/format-toeic', {
      user: req.session.user || null,
      article: null,
      formatData: {}
    });
  }
});

// TOEIC Listening Tips Article route
app.get('/meo-toeic-listening', async (req, res) => {
  try {
    const pool = require('./models/db');
    const [rows] = await pool.query("SELECT * FROM tintuc WHERE MaTinTuc = 2 OR TieuDe LIKE '%mẹo%' OR TieuDe LIKE '%listening%' LIMIT 1");
    const article = rows.length > 0 ? rows[0] : null;
    const meoData = readJsonData('meo_listening.json', {});
    res.render('public/meo-toeic-listening', {
      user: req.session.user || null,
      article,
      meoData
    });
  } catch (err) {
    console.error(err);
    res.render('public/meo-toeic-listening', {
      user: req.session.user || null,
      article: null,
      meoData: {}
    });
  }
});

// Office Vocabulary route
app.get('/tu-vung-van-phong', async (req, res) => {
  try {
    const pool = require('./models/db');
    const [rows] = await pool.query("SELECT * FROM tintuc WHERE MaTinTuc = 3 OR TieuDe LIKE '%từ vựng%' OR TieuDe LIKE '%văn phòng%' LIMIT 1");
    const article = rows.length > 0 ? rows[0] : null;
    const vocabData = readJsonData('tu_vung_van_phong.json', {});
    res.render('public/tu-vung-van-phong', {
      user: req.session.user || null,
      article,
      vocabData
    });
  } catch (err) {
    console.error(err);
    res.render('public/tu-vung-van-phong', {
      user: req.session.user || null,
      article: null,
      vocabData: {}
    });
  }
});

// News detail route
app.get('/news/detail/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pool = require('./models/db');
    const [rows] = await pool.query(`
      SELECT t.*, u.HoTen AS NguoiDang
      FROM tintuc t
      LEFT JOIN nguoidung u ON t.MaNguoiDang = u.MaNguoiDung
      WHERE t.MaTinTuc = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).send('Không tìm thấy bài viết.');
    }
    const article = rows[0];

    const titleLower = article.TieuDe.toLowerCase();
    // Core Article 1: Format TOEIC
    if (id === 1 || titleLower.includes('format') || titleLower.includes('cấu trúc')) {
      const formatData = readJsonData('format_toeic.json', {});
      return res.render('public/format-toeic', {
        user: req.session.user || null,
        article,
        formatData
      });
    }
    // Core Article 2: Listening Tips
    if (id === 2 || titleLower.includes('mẹo') || titleLower.includes('listening')) {
      const meoData = readJsonData('meo_listening.json', {});
      return res.render('public/meo-toeic-listening', {
        user: req.session.user || null,
        article,
        meoData
      });
    }
    // Core Article 3: Office Vocabulary
    if (id === 3 || titleLower.includes('từ vựng') || titleLower.includes('văn phòng')) {
      const vocabData = readJsonData('tu_vung_van_phong.json', {});
      return res.render('public/tu-vung-van-phong', {
        user: req.session.user || null,
        article,
        vocabData
      });
    }

    // Generic detail page
    res.render('public/news-detail', {
      user: req.session.user || null,
      article
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Lỗi máy chủ khi tải chi tiết tin tức.');
  }
});

// Hàm tự động cập nhật trạng thái lớp học theo ngày (chạy ngầm định kỳ)
async function updateClassStatuses() {
  try {
    const pool = require('./models/db');

    // 1. Tự động chuyển thành "Sắp mở" nếu chưa tới ngày khai giảng
    await pool.query(`
      UPDATE lophoc 
      SET TrangThaiLop = 'Sắp mở' 
      WHERE DATE(NgayKhaiGiang) > CURDATE()
        AND DATE(NgayKetThuc) >= CURDATE()
    `);

    // 2. Tự động chuyển thành "Đang diễn ra" khi đã đến/qua ngày khai giảng và chưa bế giảng
    await pool.query(`
      UPDATE lophoc 
      SET TrangThaiLop = 'Đang diễn ra' 
      WHERE DATE(NgayKhaiGiang) <= CURDATE() 
        AND DATE(NgayKetThuc) >= CURDATE()
    `);

    // 3. Tự động chuyển thành "Đã đóng" khi đã qua ngày bế giảng/kết thúc khóa học
    await pool.query(`
      UPDATE lophoc 
      SET TrangThaiLop = 'Đã đóng' 
      WHERE DATE(NgayKetThuc) < CURDATE()
    `);
  } catch (err) {
    console.error('[CLASS STATUS UPDATE Error]', err);
  }
}

// Homepage route - renders views/public/home.ejs
app.get('/', async (req, res) => {
  try {
    const pool = require('./models/db');
    const courses = await Course.getAll();
    const [classes] = await pool.query(`
      SELECT lh.*, COALESCE(lh.HocPhi, kh.HocPhi) AS HocPhi, kh.TenKhoaHoc AS TenKhoaHocGoc,
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
    classes.forEach(cls => {
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

    const news = await Transaction.getAllNews();
    const staff = await User.getAllStaff();
    const [promotions] = await pool.query('SELECT * FROM khuyenmai WHERE NOW() BETWEEN NgayBatDau AND NgayKetThuc');

    // Map classes to their respective courses
    courses.forEach(course => {
      course.classes = classes.filter(cls => cls.MaKhoaHoc === course.MaKhoaHoc);
    });

    res.render('public/home', { 
      courses, 
      news, 
      staff,
      promotions,
      error: null,
      user: req.session.user || null
    });
  } catch (err) {
    console.error(err);
    res.render('public/home', { 
      courses: [], 
      news: [], 
      staff: [],
      promotions: [],
      error: 'Không thể tải dữ liệu trang chủ',
      user: req.session.user || null
    });
  }
});

// Auth templates integration
app.get('/register', (req, res) => {
  const redirect = req.query.redirect ? `&redirect=${encodeURIComponent(req.query.redirect)}` : '';
  res.redirect(`/login?register=1${redirect}`);
});

app.get('/login', (req, res) => {
  if (req.session.user) {
    let redirect = '/';
    if (req.session.user.TenVaiTro === 'Admin') {
      redirect = '/admin/dashboard';
    } else if (req.session.user.TenVaiTro === 'Giảng viên') {
      redirect = '/classes/dashboard';
    } else if (req.session.user.TenVaiTro === 'Học viên') {
      redirect = '/classes/my-classes';
    }
    return res.redirect(redirect);
  }
  res.render('auth/login', { 
    error: null, 
    user: null, 
    redirect: req.query.redirect || null, 
    message: req.query.message || null 
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/?logout_success=1');
  });
});

// Sync function to ensure giaodich table has matching entries for all dangkyhoc records
async function syncMissingGiaodich() {
  try {
    const pool = require('./models/db');
    
    // Find all dangkyhoc without giaodich
    const [missingRows] = await pool.query(`
      SELECT dk.MaDangKy, dk.HocPhiDaGiam, dk.TrangThai, dk.NgayDangKy, lh.TenLop
      FROM dangkyhoc dk
      LEFT JOIN giaodich gd ON dk.MaDangKy = gd.MaDangKy
      JOIN lophoc lh ON dk.MaLopHoc = lh.MaLopHoc
      WHERE gd.MaGiaoDich IS NULL
    `);

    if (missingRows.length > 0) {
      console.log(`[DB SYNC] Found ${missingRows.length} registration(s) without giaodich records. Synchronizing...`);
      for (const row of missingRows) {
        let gdStatus = 'Chờ duyệt';
        if (['Đang học', 'Thành công', 'Hoàn thành', 'Đã hoàn thành'].includes(row.TrangThai)) {
          gdStatus = 'Thành công';
        } else if (['Thất bại', 'Đã hủy'].includes(row.TrangThai)) {
          gdStatus = 'Thất bại';
        }

        const cleanTitle = (row.TenLop || 'Lop').replace(/[^a-zA-Z0-9 ]/g, '').trim();
        const noiDungCK = `DK hoc lop ${cleanTitle} MaDK${row.MaDangKy}`.substring(0, 50);

        await pool.query(`
          INSERT INTO giaodich (MaDangKy, SoTien, NgayGiaoDich, NoiDungChuyenKhoan, TrangThai)
          VALUES (?, ?, ?, ?, ?)
        `, [row.MaDangKy, row.HocPhiDaGiam || 0, row.NgayDangKy || new Date(), noiDungCK, gdStatus]);
        console.log(`[DB SYNC] ✅ Created giaodich for MaDK#${row.MaDangKy} (Status: ${gdStatus}, Amount: ${row.HocPhiDaGiam}đ)`);
      }
    }
  } catch (err) {
    console.error('[DB SYNC Error]', err);
  }
}

async function syncMissingAttendance() {
  try {
    const pool = require('./models/db');
    const [regs] = await pool.query(`
      SELECT dk.MaHocVien, dk.MaLopHoc, dk.NgayDangKy, lh.NgayKhaiGiang, lh.TenLop
      FROM dangkyhoc dk
      JOIN lophoc lh ON dk.MaLopHoc = lh.MaLopHoc
      WHERE dk.TrangThai IN ('Thành công', 'Đang học')
    `);

    const [schedules] = await pool.query(`
      SELECT tkb.MaLopHoc, tkb.ThuTrongTuan, bh.GioBatDau, bh.GioKetThuc
      FROM thoikhoabieu tkb
      JOIN buoihoc bh ON tkb.MaBuoiHoc = bh.MaBuoiHoc
    `);

    const dayMap = {
      'Chủ Nhật': 0,
      'Thứ Hai': 1,
      'Thứ Ba': 2,
      'Thứ Tư': 3,
      'Thứ Năm': 4,
      'Thứ Sáu': 5,
      'Thứ Bảy': 6
    };

    const realNow = new Date();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (const r of regs) {
      const startDate = r.NgayKhaiGiang ? new Date(r.NgayKhaiGiang) : new Date(r.NgayDangKy);
      const regDate = r.NgayDangKy ? new Date(r.NgayDangKy) : startDate;

      startDate.setHours(0, 0, 0, 0);
      regDate.setHours(0, 0, 0, 0);

      // Effective start is whichever is later between class start date & student reg date
      const effectiveStart = regDate > startDate ? regDate : startDate;
      if (now < effectiveStart) continue;

      const clsSchedules = schedules.filter(s => s.MaLopHoc === r.MaLopHoc);
      const targetDays = clsSchedules.map(s => dayMap[s.ThuTrongTuan]).filter(d => d !== undefined);
      if (targetDays.length === 0) continue;

      let curr = new Date(effectiveStart);
      // CHỈ tự động bổ sung điểm danh cho các NGÀY ĐÃ QUA (curr < now), KHÔNG tự chèn cho ngày hôm nay
      while (curr < now) {
        if (targetDays.includes(curr.getDay())) {
          const year = curr.getFullYear();
          const month = String(curr.getMonth() + 1).padStart(2, '0');
          const day = String(curr.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;

          const [exist] = await pool.query(
            'SELECT MaDiemDanh FROM diemdanh WHERE MaHocVien = ? AND MaLopHoc = ? AND DATE(NgayHoc) = ?',
            [r.MaHocVien, r.MaLopHoc, dateStr]
          );

          if (exist.length === 0) {
            await pool.query(
              'INSERT INTO diemdanh (MaHocVien, MaLopHoc, NgayHoc, TrangThai) VALUES (?, ?, ?, "Có mặt")',
              [r.MaHocVien, r.MaLopHoc, dateStr]
            );
            console.log(`[ATTENDANCE SYNC] ✅ Auto generated attendance for Student #${r.MaHocVien} (${r.TenLop}) on ${dateStr}`);
          }
        }
        curr.setDate(curr.getDate() + 1);
      }
    }
  } catch (err) {
    console.error('[ATTENDANCE SYNC Error]', err);
  }
}

async function fixClassDates() {
  try {
    const pool = require('./models/db');
    await pool.query(`
      UPDATE nguoidung SET SoDienThoai = '0901000003' WHERE Email = 'yenvytranthi297@gmail.com' AND SoDienThoai = '0901000002'
    `);
    await pool.query(`
      UPDATE lophoc SET TrangThaiLop = 'Đang diễn ra' WHERE TenLop = 'PRE109519' AND NgayKhaiGiang <= NOW()
    `);
    await pool.query(`
      UPDATE dangkyhoc d
      JOIN hosohocvien h ON d.MaHocVien = h.MaHocVien
      SET d.TrangThai = 'Đang học'
      WHERE h.HoTen LIKE '%Nam Anh%' AND d.TrangThai = 'Bảo lưu' AND (d.GhiChu IS NULL OR (d.GhiChu NOT LIKE '%Xin chuyển%' AND d.GhiChu NOT LIKE '%Từ chối%'))
    `);

    // Ensure class PRE_102 / MaLopHoc = 1 is set to Ca chiều 2 (15:45 - 17:45, MaBuoiHoc = 4)
    await pool.query("UPDATE thoikhoabieu SET MaBuoiHoc = 4 WHERE MaLopHoc = 1");

    // Schema sync for lotrinh_dexuat: LoaiLoTrinh & is_active & MaCode
    const [cols] = await pool.query("SHOW COLUMNS FROM lotrinh_dexuat LIKE 'LoaiLoTrinh'");
    if (cols.length === 0) {
      await pool.query("ALTER TABLE lotrinh_dexuat ADD COLUMN LoaiLoTrinh VARCHAR(50) NOT NULL DEFAULT 'Tiêu chuẩn'");
    }
    const [activeCols] = await pool.query("SHOW COLUMNS FROM lotrinh_dexuat LIKE 'is_active'");
    if (activeCols.length === 0) {
      await pool.query("ALTER TABLE lotrinh_dexuat ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1");
    }
    const [codeCols] = await pool.query("SHOW COLUMNS FROM lotrinh_dexuat LIKE 'MaCode'");
    if (codeCols.length === 0) {
      await pool.query("ALTER TABLE lotrinh_dexuat ADD COLUMN MaCode VARCHAR(50) NULL");
    }

    // Schema sync for khoahoc: TrangThai
    const [khCols] = await pool.query("SHOW COLUMNS FROM khoahoc LIKE 'TrangThai'");
    if (khCols.length === 0) {
      await pool.query("ALTER TABLE khoahoc ADD COLUMN TrangThai VARCHAR(50) NOT NULL DEFAULT 'Hoạt động'");
    }

    // Auto classify intensive courses & normalize CapDo
    await pool.query("UPDATE lotrinh_dexuat r JOIN khoahoc k ON r.MaKhoaHoc = k.MaKhoaHoc SET r.LoaiLoTrinh = 'Cấp tốc' WHERE (k.TenKhoaHoc LIKE '%cấp tốc%' OR k.TenKhoaHoc LIKE '%Luyện Đề%')");
    await pool.query("UPDATE lotrinh_dexuat r JOIN khoahoc k ON r.MaKhoaHoc = k.MaKhoaHoc SET r.DiemDen = 500 WHERE k.TenKhoaHoc LIKE '%cấp tốc%' AND r.DiemDen > 500");
    await pool.query("UPDATE khoahoc SET CapDo = 'Foundation' WHERE LOWER(CapDo) = 'foundation' OR TenKhoaHoc LIKE '%Pre%' OR TenKhoaHoc LIKE '%300+%'");
    await pool.query("UPDATE khoahoc SET CapDo = '450+' WHERE TenKhoaHoc LIKE '%TOEIC A%' AND TenKhoaHoc NOT LIKE '%Cấp Tốc%'");
    await pool.query("UPDATE khoahoc SET CapDo = '650+' WHERE TenKhoaHoc LIKE '%TOEIC B%'");
    await pool.query("UPDATE khoahoc SET CapDo = 'Luyện đề' WHERE TenKhoaHoc LIKE '%Luyện Đề%'");
    await pool.query("UPDATE khoahoc SET CapDo = 'Cấp tốc' WHERE TenKhoaHoc LIKE '%Cấp Tốc%' OR TenKhoaHoc LIKE '%cấp tốc%' OR TenKhoaHoc LIKE '%bứt tốc%'");

    // Clean up deleted test_dauvao records in baithi table
    await pool.query("UPDATE ketquathi SET MaDeThi = (SELECT MaDeThi FROM baithi WHERE DuongDanFileJSON = 'json/toeic_test_6.json' LIMIT 1) WHERE MaDeThi IN (SELECT MaDeThi FROM baithi WHERE DuongDanFileJSON LIKE '%test_dauvao%')");
    await pool.query("DELETE FROM baithi WHERE DuongDanFileJSON LIKE '%test_dauvao%'");

    // TOEIC Test 4
    const [t4Check] = await pool.query("SELECT MaDeThi FROM baithi WHERE DuongDanFileJSON = 'json/toeic_test_4.json' OR TenDeThi = 'TOEIC Test 4'");
    if (t4Check.length > 0) {
      await pool.query("UPDATE baithi SET TenDeThi = 'TOEIC Test 4', ThoiGianLamBai = 120, LoaiDe = 'Luyện đề chính thức', DuongDanFileJSON = 'json/toeic_test_4.json', TrangThai = 1 WHERE MaDeThi = ?", [t4Check[0].MaDeThi]);
    } else {
      await pool.query("INSERT INTO baithi (TenDeThi, ThoiGianLamBai, LoaiDe, DuongDanFileJSON, TrangThai) VALUES ('TOEIC Test 4', 120, 'Luyện đề chính thức', 'json/toeic_test_4.json', 1)");
    }

    // TOEIC Test 5
    const [t5Check] = await pool.query("SELECT MaDeThi FROM baithi WHERE DuongDanFileJSON = 'json/toeic_test_5.json' OR TenDeThi = 'TOEIC Test 5'");
    if (t5Check.length > 0) {
      await pool.query("UPDATE baithi SET TenDeThi = 'TOEIC Test 5', ThoiGianLamBai = 120, LoaiDe = 'Luyện đề chính thức', DuongDanFileJSON = 'json/toeic_test_5.json', TrangThai = 1 WHERE MaDeThi = ?", [t5Check[0].MaDeThi]);
    } else {
      await pool.query("INSERT INTO baithi (TenDeThi, ThoiGianLamBai, LoaiDe, DuongDanFileJSON, TrangThai) VALUES ('TOEIC Test 5', 120, 'Luyện đề chính thức', 'json/toeic_test_5.json', 1)");
    }

    // Placement Test (TOEIC Test 6)
    const [t6Check] = await pool.query("SELECT MaDeThi FROM baithi WHERE DuongDanFileJSON = 'json/toeic_test_6.json' OR TenDeThi LIKE '%Đầu Vào%'");
    if (t6Check.length > 0) {
      await pool.query("UPDATE baithi SET TenDeThi = 'Đề Test Đầu Vào (200 Câu)', ThoiGianLamBai = 120, LoaiDe = 'Đầu vào', DuongDanFileJSON = 'json/toeic_test_6.json', TrangThai = 1 WHERE MaDeThi = ?", [t6Check[0].MaDeThi]);
    } else {
      await pool.query("INSERT INTO baithi (TenDeThi, ThoiGianLamBai, LoaiDe, DuongDanFileJSON, TrangThai) VALUES ('Đề Test Đầu Vào (200 Câu)', 120, 'Đầu vào', 'json/toeic_test_6.json', 1)");
    }

    // Backfill MaCode for lotrinh_dexuat
    function getRoadmapPrefix(typeStr) {
      const type = (typeStr || 'Tiêu chuẩn').trim();
      if (type === 'Tiêu chuẩn') return 'LTR_TC';
      if (type === 'Cấp tốc') return 'LTR_CT';
      if (type === 'Mất gốc') return 'LTR_MG';
      return 'LTR_' + type.split(/\s+/).map(w => w.charAt(0).toUpperCase()).join('');
    }
    const [allRoadmaps] = await pool.query("SELECT * FROM lotrinh_dexuat ORDER BY LoaiLoTrinh ASC, DiemTu ASC, MaLoTrinh ASC");
    const stepMap = {};
    for (const r of allRoadmaps) {
      const type = r.LoaiLoTrinh || 'Tiêu chuẩn';
      if (!stepMap[type]) stepMap[type] = 0;
      stepMap[type]++;
      const autoCode = `${getRoadmapPrefix(type)}_${String(stepMap[type]).padStart(2, '0')}`;
      if (r.MaCode !== autoCode) {
        await pool.query("UPDATE lotrinh_dexuat SET MaCode = ? WHERE MaLoTrinh = ?", [autoCode, r.MaLoTrinh]);
      }
    }

    console.log('[DB SYNC] ✅ Fixed duplicate phone numbers, class statuses, and lotrinh_dexuat schema.');
  } catch (err) {
    console.error('[DB SYNC Fix Error]', err);
  }
}

async function syncLopHocHocPhi() {
  try {
    const pool = require('./models/db');
    await pool.query(`
      UPDATE lophoc lh
      JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc
      SET lh.HocPhi = kh.HocPhi
      WHERE lh.HocPhi IS NULL OR lh.HocPhi = 0
    `);
    console.log('[DB SYNC] ✅ Synchronized HocPhi for lophoc from khoahoc table.');
  } catch (err) {
    console.error('[DB SYNC HocPhi Error]', err);
  }
}

app.listen(PORT, () => {
  console.log(`[SERVER START] Máy chủ đang chạy tại: http://localhost:${PORT}`);
  updateClassStatuses();
  syncMissingGiaodich();
  syncMissingAttendance();
  fixClassDates();
  syncLopHocHocPhi();
  // Chạy cập nhật trạng thái lớp ngầm định kỳ mỗi 12 giờ
  setInterval(updateClassStatuses, 12 * 60 * 60 * 1000);
});
