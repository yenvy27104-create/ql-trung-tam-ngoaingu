/**
 * ============================================================================
 * BỘ ĐIỀU KHIỂN LỚP HỌC & HỌC VỤ (CLASS CONTROLLER)
 * ============================================================================
 * Đảm nhận các chức năng nghiệp vụ học vụ dành cho Học viên và Giảng viên:
 * - Học viên: Danh sách lớp học cá nhân, cập nhật hồ sơ, ghi danh lớp, thanh toán VNPay.
 * - Giảng viên: Dashboard điểm danh, nhập điểm số, giao bài tập luyện đề, quản lý lớp giảng dạy.
 * - Tự động tính toán số buổi đã học (tự né ngày nghỉ Lễ Tết Việt Nam).
 */

const Classroom = require('../models/Classroom');
const pool = require('../models/db');
const User = require('../models/User');
const Exam = require('../models/Exam');
const { notifyAdminPaymentSuccess } = require('../utils/paymentNotification');
const { isClassEnrollable } = require('../utils/classStatus');
const { updateStudentProficiencyLevel } = require('../utils/scoreCalc');
const { sendStudentTransferRequestMailToAdmin, sendEnrollmentStatusMail } = require('../utils/mailer');
const fs = require('fs');
const path = require('path');

function formatDateYMD(inputDate) {
  if (inputDate && typeof inputDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(inputDate.trim())) {
    return inputDate.trim();
  }
  try {
    const d = inputDate ? new Date(inputDate) : new Date();
    if (isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    }
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
  } catch (e) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}

function getAllowTimeInfo(gioBatDauStr) {
  const [startH, startM] = gioBatDauStr.split(':').map(Number);
  const startMins = startH * 60 + startM;
  const allowMins = startMins + 90;
  const allowH = Math.floor(allowMins / 60) % 24;
  const allowM = allowMins % 60;
  const formattedTime = `${String(allowH).padStart(2, '0')}h${String(allowM).padStart(2, '0')}`;
  return { startMins, allowMins, formattedTime };
}

function normalizeAttendanceRecords(records) {
  if (!records) return {};

  const normalized = {};

  const pushEntry = (key, value) => {
    if (key === undefined || key === null || key === '') return;
    if (value === undefined || value === null) return;

    const cleanKey = String(key).replace(/^records\[(.+)\]$/, '$1').replace(/\[\]$/, '');
    const cleanValue = typeof value === 'object' ? value.TrangThai || value.status || value.value || value.trangThai : value;

    if (cleanKey && cleanValue !== undefined && cleanValue !== null && cleanValue !== '') {
      normalized[cleanKey] = String(cleanValue);
    }
  };

  if (Array.isArray(records)) {
    records.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const id = item.MaHocVien ?? item.MaNguoiDung ?? item.id ?? item.maHocVien ?? item.maNguoiDung;
      const status = item.TrangThai ?? item.status ?? item.value ?? item.trangThai;
      pushEntry(id, status);
    });
    return normalized;
  }

  if (typeof records === 'object') {
    Object.entries(records).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const id = value.MaHocVien ?? value.MaNguoiDung ?? value.id ?? value.maHocVien ?? value.maNguoiDung;
        const status = value.TrangThai ?? value.status ?? value.value ?? value.trangThai;
        pushEntry(id, status);
      } else {
        pushEntry(key, value);
      }
    });
  }

  return normalized;
}

// Danh sách các ngày Lễ Tết Việt Nam (Định dạng 'MM-DD' hoặc 'YYYY-MM-DD')
const VIETNAM_HOLIDAYS = [
  '01-01', // Tết Dương Lịch
  '04-30', // Ngày Giải Phóng Miền Nam (30/4)
  '05-01', // Quốc Tế Lao Động (1/5)
  '09-02', // Quốc Khánh (2/9)
  '09-03', // Nghỉ Quốc Khánh bổ sung
  // Lễ Tết năm 2026:
  '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22', // Tết Nguyên Đán Bính Ngọ 2026
  '2026-04-26', // Giỗ Tổ Hùng Vương 2026 (10/3 Âm lịch)
];

function isVietnameseHoliday(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();

  const mmdd = `${mm}-${dd}`;
  const yyyymmdd = `${yyyy}-${mm}-${dd}`;

  return VIETNAM_HOLIDAYS.includes(mmdd) || VIETNAM_HOLIDAYS.includes(yyyymmdd);
}

function calculateElapsedSessions(startDate, scheduleDays, totalSessions, regDate) {
  if (!startDate || !scheduleDays || scheduleDays.length === 0) return 0;
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  // Mốc tính buổi học tự động của lớp học luôn dựa trên Ngày Khai Giảng của lớp đó
  const effectiveStart = start;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (now < effectiveStart) return 0;

  const dayMap = {
    'Chủ Nhật': 0,
    'Thứ Hai': 1,
    'Thứ Ba': 2,
    'Thứ Tư': 3,
    'Thứ Năm': 4,
    'Thứ Sáu': 5,
    'Thứ Bảy': 6
  };
  const targetDays = scheduleDays.map(d => dayMap[d]).filter(d => d !== undefined);
  if (targetDays.length === 0) return 0;

  let count = 0;
  let curr = new Date(effectiveStart);

  while (curr <= now) {
    if (targetDays.includes(curr.getDay())) {
      // Tự động bỏ qua các ngày Lễ Tết Việt Nam (Không tính vào số buổi đã học)
      if (!isVietnameseHoliday(curr)) {
        count++;
        if (totalSessions && count >= totalSessions) break;
      }
    }
    curr.setDate(curr.getDate() + 1);
  }

  return totalSessions ? Math.min(count, totalSessions) : count;
}

class ClassController {
  static async listClasses(req, res) {
    try {
      const user = req.session.user;
      if (!user) {
        return res.redirect('/login');
      }

      // 1. Fetch/Create student profiles
      let [profiles] = await pool.query('SELECT * FROM hosohocvien WHERE MaNguoiDung = ? ORDER BY MaHocVien ASC', [user.MaNguoiDung]);
      if (profiles.length === 0) {
        await pool.query('INSERT INTO hosohocvien (MaNguoiDung, HoTen, QuanHe, TrinhDoHienTai) VALUES (?, ?, "Bản thân", "Chưa xác định")', [user.MaNguoiDung, user.HoTen]);
        [profiles] = await pool.query('SELECT * FROM hosohocvien WHERE MaNguoiDung = ? ORDER BY MaHocVien ASC', [user.MaNguoiDung]);
      }

      // Auto-sync proficiency level for each student profile based on enrolled courses or test scores
      for (const p of profiles) {
        const updatedLevel = await updateStudentProficiencyLevel(p.MaHocVien);
        if (updatedLevel) {
          p.TrinhDoHienTai = updatedLevel;
        }
      }

      const profile = profiles[0];
      const studentIds = profiles.map(p => p.MaHocVien);

      // Fetch latest User info
      const [users] = await pool.query('SELECT HoTen, Email, SoDienThoai, AnhDaiDien FROM nguoidung WHERE MaNguoiDung = ?', [user.MaNguoiDung]);
      const fullUser = users[0] || user;
      req.session.user = { ...req.session.user, ...fullUser };

      // 2. Fetch registered classes for all student profiles of this user
      const [registeredClasses] = await pool.query(
        `SELECT dk.*, lh.TenLop, lh.NgayKhaiGiang, lh.NgayKetThuc, lh.TrangThaiLop, kh.TenKhoaHoc, kh.HocPhi, kh.ThoiLuong, kh.CapDo, lh.MaKhoaHoc,
                COALESCE(NULLIF(TRIM(hh.HoTen), ''), nd.HoTen) AS TenHocVien, hh.QuanHe, u.HoTen AS TenGiangVien
         FROM dangkyhoc dk
         JOIN lophoc lh ON dk.MaLopHoc = lh.MaLopHoc
         JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc
         JOIN hosohocvien hh ON dk.MaHocVien = hh.MaHocVien
         LEFT JOIN nguoidung nd ON hh.MaNguoiDung = nd.MaNguoiDung
         LEFT JOIN hosonhansu n ON lh.MaGiangVien = n.MaNhanSu
         LEFT JOIN nguoidung u ON n.MaNguoiDung = u.MaNguoiDung
         WHERE dk.MaHocVien IN (?) OR dk.MaNguoiDangKy = ?
         ORDER BY dk.MaDangKy DESC`,
        [studentIds.length > 0 ? studentIds : [0], user.MaNguoiDung]
      );

      // 3. Fetch attendance for all profiles
      const [attendance] = await pool.query(
        `SELECT dd.*, lh.TenLop, hh.HoTen AS TenHocVien
         FROM diemdanh dd
         JOIN lophoc lh ON dd.MaLopHoc = lh.MaLopHoc
         JOIN hosohocvien hh ON dd.MaHocVien = hh.MaHocVien
         WHERE dd.MaHocVien IN (?)`,
        [studentIds.length > 0 ? studentIds : [0]]
      );

      const [schedules] = await pool.query(`
        SELECT tkb.MaLopHoc, tkb.ThuTrongTuan, bh.TenBuoi, 
               TIME_FORMAT(bh.GioBatDau, '%H:%i') AS GioBatDau, 
               TIME_FORMAT(bh.GioKetThuc, '%H:%i') AS GioKetThuc, 
               ph.TenPhong,
               u.HoTen AS TenGiangVien
        FROM thoikhoabieu tkb
        JOIN lophoc lh ON tkb.MaLopHoc = lh.MaLopHoc
        JOIN buoihoc bh ON tkb.MaBuoiHoc = bh.MaBuoiHoc
        JOIN phonghoc ph ON tkb.MaPhongHoc = ph.MaPhongHoc
        LEFT JOIN hosonhansu n ON lh.MaGiangVien = n.MaNhanSu
        LEFT JOIN nguoidung u ON n.MaNguoiDung = u.MaNguoiDung
        ORDER BY FIELD(tkb.ThuTrongTuan, 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'), bh.GioBatDau
      `);

      function formatCompactSchedule(list) {
        if (!list || list.length === 0) return 'Chưa có lịch';
        const dayShort = {
          'Thứ Hai': 'Thứ 2',
          'Thứ Ba': 'Thứ 3',
          'Thứ Tư': 'Thứ 4',
          'Thứ Năm': 'Thứ 5',
          'Thứ Sáu': 'Thứ 6',
          'Thứ Bảy': 'Thứ 7',
          'Chủ Nhật': 'CN'
        };
        const timeGroup = {};
        list.forEach(item => {
          const timeKey = `${item.GioBatDau} - ${item.GioKetThuc}`;
          if (!timeGroup[timeKey]) timeGroup[timeKey] = [];
          timeGroup[timeKey].push(dayShort[item.ThuTrongTuan] || item.ThuTrongTuan);
        });

        const parts = [];
        for (const [time, days] of Object.entries(timeGroup)) {
          if (days.length === 5 && days.includes('Thứ 2') && days.includes('Thứ 6')) {
            parts.push(`Thứ 2 - 6 (${time})`);
          } else {
            parts.push(`${days.join(', ')} (${time})`);
          }
        }
        return parts.join('; ');
      }

      // Fetch transfer counts per student profile
      const [transferCountRows] = await pool.query(
        `SELECT MaHocVien, COUNT(*) AS count 
         FROM dangkyhoc 
         WHERE MaHocVien IN (?) 
           AND (TrangThai = 'Đã chuyển lớp' 
                OR TrangThai = 'Chờ xử lý - Xin chuyển lớp' 
                OR GhiChu LIKE '%Đã chuyển sang%' 
                OR GhiChu LIKE '%Chuyển từ lớp%'
                OR GhiChu LIKE '%Xin chuyển lớp%') 
         GROUP BY MaHocVien`,
        [studentIds.length > 0 ? studentIds : [0]]
      );
      const transferMap = {};
      transferCountRows.forEach(t => {
        transferMap[t.MaHocVien] = t.count;
      });

      // Map schedules & compute progress for registeredClasses
      registeredClasses.forEach(cls => {
        const clsSchedules = schedules.filter(s => s.MaLopHoc === cls.MaLopHoc);
        cls.LichHoc = formatCompactSchedule(clsSchedules);

        const scheduleDays = [...new Set(clsSchedules.map(s => s.ThuTrongTuan))];
        const studentAtt = attendance.filter(a => a.MaLopHoc === cls.MaLopHoc && a.MaHocVien === cls.MaHocVien);
        const soBuoiDaDiemDanh = studentAtt.length;
        const tongBuoi = Number(cls.ThoiLuong || 0);

        const elapsedBySchedule = calculateElapsedSessions(cls.NgayKhaiGiang, scheduleDays, tongBuoi, cls.NgayDangKy);
        const buoiHienTai = Math.max(soBuoiDaDiemDanh, elapsedBySchedule);

        cls.TongSoBuoi = tongBuoi;
        cls.SoBuoiDaHoc = soBuoiDaDiemDanh;
        cls.BuoiHienTai = buoiHienTai;
        cls.SoBuoiConLai = Math.max(0, tongBuoi - buoiHienTai);
        cls.TienDoPercent = tongBuoi > 0 ? Math.min(100, Math.round((buoiHienTai / tongBuoi) * 100)) : 0;
        cls.SoLanChuyenLop = transferMap[cls.MaHocVien] || 0;

        const { getExamSessionsFromSyllabus } = require('../utils/syllabi');
        const examSessions = getExamSessionsFromSyllabus(cls.MaKhoaHoc, tongBuoi);
        cls.midtermSession = examSessions.midtermSession;
        cls.finalSession = examSessions.finalSession;
      });

      // Fetch grade book for all profiles
      const [grades] = await pool.query(
        `SELECT qd.*, lh.TenLop, hh.HoTen AS TenHocVien
         FROM quanlydiem qd
         JOIN lophoc lh ON qd.MaLopHoc = lh.MaLopHoc
         JOIN hosohocvien hh ON qd.MaHocVien = hh.MaHocVien
         WHERE qd.MaHocVien IN (?)`,
        [studentIds.length > 0 ? studentIds : [0]]
      );

      // Fetch exam history for all profiles
      const [examHistory] = await pool.query(
        `SELECT kq.MaKetQua, kq.MaHocVien, kq.SessionKhach, kq.MaDeThi, kq.MaLoTrinh, kq.DiemNghe, kq.DiemDoc, kq.NgayThi, bt.TenDeThi, bt.LoaiDe, hh.HoTen AS TenHocVien
         FROM ketquathi kq
         JOIN baithi bt ON kq.MaDeThi = bt.MaDeThi
         JOIN hosohocvien hh ON kq.MaHocVien = hh.MaHocVien
         WHERE kq.MaHocVien IN (?)
         ORDER BY kq.NgayThi DESC`,
        [studentIds.length > 0 ? studentIds : [0]]
      );

      // --- CẬP NHẬT TRẠNG THÁI LỚP HỌC (CHỐT SỔ TRƯỚC 1 NGÀY, DÙNG 3 TRẠNG THÁI) ---
      // 1. Tự động chuyển thành "Đã đóng"
      await pool.query(`
        UPDATE lophoc 
        SET TrangThaiLop = 'Đã đóng' 
        WHERE TrangThaiLop != 'Đã đóng'
          AND (
            (DATE(NgayKetThuc) < CURDATE())
            OR 
            (DATE(NgayKhaiGiang) <= CURDATE() AND (SELECT COUNT(*) FROM dangkyhoc dk WHERE dk.MaLopHoc = lophoc.MaLopHoc AND dk.TrangThai IN ('Thành công', 'Đang học')) = 0)
            OR
            (DATE(NgayKhaiGiang) > CURDATE() AND (SELECT COUNT(*) FROM dangkyhoc dk WHERE dk.MaLopHoc = lophoc.MaLopHoc AND dk.TrangThai IN ('Thành công', 'Đang học')) >= SiSoToiDa)
          )
      `);

      // 2. Tự động chuyển thành "Đang diễn ra"
      await pool.query(`
        UPDATE lophoc 
        SET TrangThaiLop = 'Đang diễn ra' 
        WHERE TrangThaiLop != 'Đang diễn ra'
          AND DATE(NgayKhaiGiang) <= CURDATE() 
          AND DATE(NgayKetThuc) >= CURDATE()
          AND (SELECT COUNT(*) FROM dangkyhoc dk WHERE dk.MaLopHoc = lophoc.MaLopHoc AND dk.TrangThai IN ('Thành công', 'Đang học')) > 0
      `);

      // 3. Tự động chuyển thành/giữ nguyên "Sắp mở"
      await pool.query(`
        UPDATE lophoc 
        SET TrangThaiLop = 'Sắp mở' 
        WHERE TrangThaiLop != 'Sắp mở'
          AND DATE(NgayKhaiGiang) > CURDATE() 
          AND (SELECT COUNT(*) FROM dangkyhoc dk WHERE dk.MaLopHoc = lophoc.MaLopHoc AND dk.TrangThai IN ('Thành công', 'Đang học')) < SiSoToiDa
      `);

      // Fetch classes available for registration (Chỉ hiển thị các lớp 'Sắp mở' và chưa quá hạn)
      const [availableClasses] = await pool.query(
        `SELECT lh.*, kh.TenKhoaHoc, kh.HocPhi, kh.ThoiLuong, kh.CapDo, kh.MoTa,
                (SELECT COUNT(*) FROM dangkyhoc dk WHERE dk.MaLopHoc = lh.MaLopHoc AND dk.TrangThai IN ('Thành công', 'Đang học')) AS SiSoHienTai
         FROM lophoc lh
         JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc
         WHERE lh.TrangThaiLop = 'Sắp mở'
           AND DATE(lh.NgayKhaiGiang) > CURDATE()
           AND (SELECT COUNT(*) FROM dangkyhoc dk WHERE dk.MaLopHoc = lh.MaLopHoc AND dk.TrangThai IN ('Thành công', 'Đang học')) < lh.SiSoToiDa`
      );

      availableClasses.forEach(cls => {
        const clsSchedules = schedules.filter(s => s.MaLopHoc === cls.MaLopHoc);
        cls.LichHoc = formatCompactSchedule(clsSchedules);
      });

      // 7. Fetch promotions (only active ones)
      const [promotions] = await pool.query('SELECT * FROM khuyenmai WHERE NOW() >= NgayBatDau AND DATE(NOW()) <= DATE(NgayKetThuc)');

      // 8. Fetch timetable for all student profiles (Only active/paid classes get scheduled on weekly timetable grid)
      const [timetable] = await pool.query(
        `SELECT tkb.*, lh.TenLop, ph.TenPhong, ph.ViTri, bh.TenBuoi, bh.GioBatDau, bh.GioKetThuc, 
                COALESCE(NULLIF(TRIM(hh.HoTen), ''), nd.HoTen) AS TenHocVien, hh.QuanHe, u.HoTen AS TenGiangVien
         FROM thoikhoabieu tkb
         JOIN lophoc lh ON tkb.MaLopHoc = lh.MaLopHoc
         JOIN dangkyhoc dk ON lh.MaLopHoc = dk.MaLopHoc
         JOIN hosohocvien hh ON dk.MaHocVien = hh.MaHocVien
         LEFT JOIN nguoidung nd ON hh.MaNguoiDung = nd.MaNguoiDung
         JOIN phonghoc ph ON tkb.MaPhongHoc = ph.MaPhongHoc
         JOIN buoihoc bh ON tkb.MaBuoiHoc = bh.MaBuoiHoc
         LEFT JOIN hosonhansu n ON lh.MaGiangVien = n.MaNhanSu
         LEFT JOIN nguoidung u ON n.MaNguoiDung = u.MaNguoiDung
         WHERE (dk.MaHocVien IN (?) OR dk.MaNguoiDangKy = ?) AND dk.TrangThai IN ('Thành công', 'Đang học')
         ORDER BY FIELD(tkb.ThuTrongTuan, 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'), bh.GioBatDau`,
        [studentIds, user.MaNguoiDung]
      );

      // 9. Fetch online exams
      const exams = await Exam.getAll();
      const placementResult = examHistory.find(h => h.LoaiDe === 'Đầu vào') || null;
      const hasTakenPlacementTest = !!placementResult;
      const isActiveStudent = registeredClasses.some(c => ['Thành công', 'Đang học', 'Đã hoàn thành', 'Hoàn thành', 'Đã thanh toán', 'Chờ xếp ca đợt sau', 'Chờ xử lý - Xin chuyển lớp', 'Chờ Admin duyệt ngừng học', 'Ngừng học', 'Đã ngừng học'].includes(c.TrangThai));

      // 10. LỘ TRÌNH ĐỀ XUẤT HỌC NỐI TIẾP KHI HOÀN THÀNH KHÓA (PROGRESSION ROADMAP)
      const allEnrolledCourseIds = [...new Set(registeredClasses.map(c => c.MaKhoaHoc))];

      const completedClasses = registeredClasses.filter(c =>
        ['Đã hoàn thành', 'Hoàn thành'].includes(c.TrangThai)
      );

      let recommendedCoursesData = [];
      if (allEnrolledCourseIds.length > 0) {
        const [rows] = await pool.query(
          `SELECT kh.*, 
                  (SELECT MIN(lh.NgayKhaiGiang) FROM lophoc lh WHERE lh.MaKhoaHoc = kh.MaKhoaHoc AND lh.TrangThaiLop = 'Sắp mở' AND DATE(lh.NgayKhaiGiang) > CURDATE()) AS NgayKhaiGiangGanNhat,
                  (SELECT COUNT(*) FROM lophoc lh WHERE lh.MaKhoaHoc = kh.MaKhoaHoc AND lh.TrangThaiLop = 'Sắp mở' AND DATE(lh.NgayKhaiGiang) > CURDATE()) AS SoLopSapMo
           FROM khoahoc kh
           WHERE kh.MaKhoaHoc NOT IN (?)
           ORDER BY kh.MaKhoaHoc ASC`,
          [allEnrolledCourseIds]
        );
        recommendedCoursesData = rows;
      } else {
        const [rows] = await pool.query(
          `SELECT kh.*, 
                  (SELECT MIN(lh.NgayKhaiGiang) FROM lophoc lh WHERE lh.MaKhoaHoc = kh.MaKhoaHoc AND lh.TrangThaiLop = 'Sắp mở' AND DATE(lh.NgayKhaiGiang) > CURDATE()) AS NgayKhaiGiangGanNhat,
                  (SELECT COUNT(*) FROM lophoc lh WHERE lh.MaKhoaHoc = kh.MaKhoaHoc AND lh.TrangThaiLop = 'Sắp mở' AND DATE(lh.NgayKhaiGiang) > CURDATE()) AS SoLopSapMo
           FROM khoahoc kh
           ORDER BY kh.MaKhoaHoc ASC`
        );
        recommendedCoursesData = rows;
      }
      let highestPreScore = 0;
      if (typeof grades !== 'undefined' && Array.isArray(grades)) {
        grades.forEach(g => {
          if (g.DiemCuoiKy !== null && g.DiemCuoiKy !== undefined) {
            const score = Number(g.DiemCuoiKy);
            if (score > highestPreScore) highestPreScore = score;
          }
        });
      }

      recommendedCoursesData = recommendedCoursesData.map(rc => {
        let isSuggestedSkip = false;
        let suggestedReason = '';

        if (highestPreScore >= 500 && (rc.MaKhoaHoc === 3 || (rc.CapDo && rc.CapDo.includes('600')))) {
          isSuggestedSkip = true;
          suggestedReason = `🎉 Xuất sắc! Với điểm cuối kỳ ${highestPreScore}/990 ở lớp Pre, bạn đủ năng lực học THẲNG lên khóa TOEIC B (Mục tiêu 600 - 650+) mà không cần học lại khóa A!`;
        } else if (highestPreScore >= 650 && (rc.MaKhoaHoc === 4 || (rc.CapDo && rc.CapDo.includes('750')))) {
          isSuggestedSkip = true;
          suggestedReason = `🚀 Đột phá! Điểm thi cuối kỳ của bạn đạt ${highestPreScore}/990, hệ thống đề xuất đăng ký THẲNG khóa TOEIC Luyện Đề!`;
        }

        return {
          ...rc,
          isSuggestedSkip,
          suggestedReason,
          highestPreScore
        };
      });

      res.render('student/classes', {
        user: fullUser,
        profile,
        profiles,
        registeredClasses,
        completedClasses,
        recommendedCoursesData,
        attendance,
        grades,
        examHistory,
        availableClasses,
        promotions,
        timetable,
        exams,
        hasTakenPlacementTest,
        placementResult,
        activeTab: (!isActiveStudent && req.query.tab === 'timetable') ? 'overview' : (req.query.tab || 'overview'),
        searchQuery: req.query.search || '',
        autoOpenModal: req.query.autoOpen === 'true',
        success: req.query.success || null,
        error: req.query.error || null
      });
    } catch (err) {
      console.error('Lỗi showTeacherDashboard:', err);
      res.status(500).send('Lỗi máy chủ khi tải trang giảng viên');
    }
  }

  static async submitTeacherReport(req, res) {
    let MaLopHoc = null;
    let MaHocVien = null;
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      }

      let { LoaiYeuCau, LyDoYeuCau, StudentName, ClassName } = req.body || {};
      MaLopHoc = req.body ? req.body.MaLopHoc : null;
      MaHocVien = req.body ? req.body.MaHocVien : null;
      if (Array.isArray(MaLopHoc)) MaLopHoc = MaLopHoc[0];
      if (Array.isArray(MaHocVien)) MaHocVien = MaHocVien[0];
      MaLopHoc = parseInt(MaLopHoc, 10);
      MaHocVien = parseInt(MaHocVien, 10);

      if (!MaHocVien || !MaLopHoc || isNaN(MaLopHoc) || isNaN(MaHocVien) || !LyDoYeuCau) {
        return res.redirect('/classes/dashboard?error=' + encodeURIComponent('Vui lòng điền đầy đủ thông tin báo cáo!'));
      }

      const teacherName = user.HoTen || 'Giảng viên';
      const typeStr = LoaiYeuCau || 'Báo cáo bất thường';
      const reasonStr = LyDoYeuCau.trim();

      // Validate attendance time window for Teacher Report
      const [classRows] = await pool.query('SELECT NgayKhaiGiang, NgayKetThuc, TenLop FROM lophoc WHERE MaLopHoc = ?', [MaLopHoc]);
      if (classRows.length > 0) {
        const clsInfo = classRows[0];
        const now = new Date();
        const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startDate = new Date(clsInfo.NgayKhaiGiang);
        const startDateZero = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const endDate = new Date(clsInfo.NgayKetThuc);
        const endDateZero = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        endDateZero.setHours(23, 59, 59, 999);

        if (todayZero < startDateZero || todayZero > endDateZero) {
          return res.redirect(`/classes/dashboard?tab=attendance&classId=${MaLopHoc}&error=${encodeURIComponent('Ngoài thời gian điểm danh không thể thực hiện được báo cáo admin Vui lòng quay lại sau')}`);
        }

        const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const attDayName = dayNames[now.getDay()];

        const [schedules] = await pool.query(
          `SELECT t.ThuTrongTuan, b.GioBatDau, b.GioKetThuc
           FROM thoikhoabieu t
           JOIN buoihoc b ON t.MaBuoiHoc = b.MaBuoiHoc
           WHERE t.MaLopHoc = ?`,
          [MaLopHoc]
        );

        if (schedules.length > 0) {
          const matchedDaySchedules = schedules.filter(s => s.ThuTrongTuan === attDayName);
          if (matchedDaySchedules.length === 0) {
            return res.redirect(`/classes/dashboard?tab=attendance&classId=${MaLopHoc}&error=${encodeURIComponent('Ngoài thời gian điểm danh không thể thực hiện được báo cáo admin Vui lòng quay lại sau')}`);
          }

          // Ép múi giờ hệ thống về giờ Việt Nam (Asia/Ho_Chi_Minh)
          const vnTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
          const vnDateObj = new Date(vnTimeStr);

          const currentHours = vnDateObj.getHours();
          const currentMinutes = vnDateObj.getMinutes();
          const currentTotalMins = currentHours * 60 + currentMinutes;

          // Ràng buộc: Phải sau 90 phút kể từ giờ bắt đầu ca học (startMins + 90) mới cho phép báo cáo Admin
          const validSlot = matchedDaySchedules.find(s => {
            const { allowMins } = getAllowTimeInfo(s.GioBatDau);
            const [endH, endM] = s.GioKetThuc.split(':').map(Number);
            const endMins = endH * 60 + endM;
            return currentTotalMins >= allowMins && currentTotalMins <= (endMins + 60);
          });

          if (!validSlot) {
            const notYetSlot = matchedDaySchedules.find(s => {
              const { allowMins } = getAllowTimeInfo(s.GioBatDau);
              return currentTotalMins < allowMins;
            });

            if (notYetSlot) {
              const { formattedTime } = getAllowTimeInfo(notYetSlot.GioBatDau);
              return res.redirect(`/classes/dashboard?tab=attendance&classId=${MaLopHoc}&error=${encodeURIComponent(`Buổi học chưa đủ 90 phút (bắt đầu lúc ${notYetSlot.GioBatDau.substring(0, 5)}). Vui lòng quay lại báo cáo Admin lúc ${formattedTime}.`)}`);
            }

            const scheduleTimeText = matchedDaySchedules.map(s => `${s.GioBatDau.substring(0, 5)} - ${s.GioKetThuc.substring(0, 5)}`).join(', ');
            return res.redirect(`/classes/dashboard?tab=attendance&classId=${MaLopHoc}&error=${encodeURIComponent(`Đã quá hạn thời gian báo cáo Admin cho ca học hôm nay (${scheduleTimeText}).`)}`);
          }
        }
      }

      const isDropReport = typeStr.includes('vắng') || typeStr.includes('thôi học') || typeStr.includes('Ngừng học');

      if (isDropReport) {
        // Nếu hôm nay chưa điểm danh, tự động ghi nhận điểm danh vắng mặt cho buổi hôm nay (buổi thứ 3)
        const [todayAtt] = await pool.query(
          "SELECT TrangThai FROM diemdanh WHERE MaHocVien = ? AND MaLopHoc = ? AND DATE(NgayHoc) = CURDATE()",
          [MaHocVien, MaLopHoc]
        );
        if (todayAtt.length === 0) {
          await pool.query(
            "INSERT INTO diemdanh (MaHocVien, MaLopHoc, NgayHoc, TrangThai) VALUES (?, ?, CURDATE(), 'Vắng mặt')",
            [MaHocVien, MaLopHoc]
          );
        }

        const [absRows] = await pool.query(
          "SELECT COUNT(*) AS cnt FROM diemdanh WHERE MaHocVien = ? AND MaLopHoc = ? AND (TrangThai LIKE '%Vắng%' OR TrangThai = 'Vắng mặt' OR TrangThai = 'Vắng')",
          [MaHocVien, MaLopHoc]
        );
        const absences = absRows[0] ? absRows[0].cnt : 0;
        if (absences < 3) {
          return res.redirect(`/classes/dashboard?tab=attendance&classId=${MaLopHoc}&error=` + encodeURIComponent(`Nút báo cáo thôi học/ngừng học chỉ được phép dùng khi học viên vắng từ 3 ngày trở lên! (Hiện tại học viên mới vắng ${absences} buổi).`));
        }

        const ghiChuText = `[GV ${teacherName} đề xuất ngừng học do vắng ${absences} buổi] ${reasonStr}`;
        await pool.query(
          "UPDATE dangkyhoc SET TrangThai = 'Chờ Admin duyệt ngừng học', GhiChu = ? WHERE MaHocVien = ? AND MaLopHoc = ?",
          [ghiChuText, MaHocVien, MaLopHoc]
        );
      } else {
        const ghiChuText = `[GV ${teacherName} đề xuất ${typeStr}] ${reasonStr}`;
        await pool.query(
          "UPDATE dangkyhoc SET TrangThai = ?, GhiChu = ? WHERE MaHocVien = ? AND MaLopHoc = ?",
          [`Chờ xử lý - ${typeStr}`, ghiChuText, MaHocVien, MaLopHoc]
        );
      }

      try {
        const { sendTeacherAlertMailToAdmin } = require('../utils/mailer');
        await sendTeacherAlertMailToAdmin({
          teacherName,
          studentName: StudentName || `Học viên #${MaHocVien}`,
          className: ClassName || `Lớp #${MaLopHoc}`,
          alertType: typeStr,
          reason: reasonStr
        });
      } catch (mailErr) {
        console.error('Không thể gửi mail cho admin (đã lưu báo cáo CSDL):', mailErr.message);
      }

      res.redirect(`/classes/dashboard?tab=attendance&classId=${MaLopHoc}&success=` + encodeURIComponent(`Đã gửi báo cáo "${typeStr}" đến Admin thành công! Đã chuyển đơn sang chờ Admin thẩm định & duyệt.`));
    } catch (err) {
      console.error('Lỗi khi giảng viên gửi báo cáo:', err);
      const redirectId = (typeof MaLopHoc !== 'undefined' && MaLopHoc) ? MaLopHoc : '';
      res.redirect(`/classes/dashboard?tab=attendance&classId=${redirectId}&error=` + encodeURIComponent('Lỗi máy chủ khi gửi báo cáo: ' + err.message));
    }
  }

  static async updateProfile(req, res) {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      }

      const { HoTen, SoDienThoai, NgaySinh, DiaChi } = req.body;

      // Update nguoidung (Email is read-only and cannot be changed)
      await pool.query(
        'UPDATE nguoidung SET HoTen = ?, SoDienThoai = ? WHERE MaNguoiDung = ?',
        [HoTen, SoDienThoai, user.MaNguoiDung]
      );

      // Update hosohocvien
      const dob = NgaySinh ? NgaySinh : null;
      try {
        await pool.query(
          'UPDATE hosohocvien SET NgaySinh = ?, DiaChi = ?, HoTen = ? WHERE MaNguoiDung = ?',
          [dob, DiaChi, HoTen, user.MaNguoiDung]
        );
      } catch (e) {
        await pool.query(
          'UPDATE hosohocvien SET NgaySinh = ?, DiaChi = ? WHERE MaNguoiDung = ?',
          [dob, DiaChi, user.MaNguoiDung]
        );
      }

      // Refresh session
      req.session.user.HoTen = HoTen;
      req.session.user.SoDienThoai = SoDienThoai;

      res.redirect('/classes/my-classes?success=profile_updated&tab=profile');
    } catch (err) {
      console.error(err);
      res.redirect('/classes/my-classes?error=profile_failed&tab=profile');
    }
  }

  static async studentRequestTransfer(req, res) {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      }

      const { MaDangKy, MaLopHocMoi, LyDoXinChuyenLop } = req.body;

      if (!MaDangKy || !MaLopHocMoi || !LyDoXinChuyenLop || !LyDoXinChuyenLop.trim()) {
        return res.redirect('/classes/my-classes?tab=overview&error=' + encodeURIComponent('Vui lòng chọn lớp mới và nhập lý do xin chuyển lớp!'));
      }

      // Kiểm tra đơn đăng ký thuộc về người dùng hoặc con của người dùng
      const [regRows] = await pool.query(
        `SELECT dk.*, lh.TenLop AS TenLopCu
         FROM dangkyhoc dk
         JOIN lophoc lh ON dk.MaLopHoc = lh.MaLopHoc
         JOIN hosohocvien hh ON dk.MaHocVien = hh.MaHocVien
         WHERE dk.MaDangKy = ? AND (hh.MaNguoiDung = ? OR dk.MaNguoiDangKy = ?)`,
        [MaDangKy, user.MaNguoiDung, user.MaNguoiDung]
      );

      if (regRows.length === 0) {
        return res.redirect('/classes/my-classes?tab=overview&error=' + encodeURIComponent('Không tìm thấy thông tin đơn đăng ký học!'));
      }

      const currentReg = regRows[0];
      const reasonText = LyDoXinChuyenLop.trim();

      // Ràng buộc giới hạn số lần chuyển lớp (Tối đa 2 lần)
      const [transferredRows] = await pool.query(
        `SELECT COUNT(*) AS count FROM dangkyhoc WHERE MaHocVien = ? AND (TrangThai = 'Đã chuyển lớp' OR GhiChu LIKE '%Đã chuyển sang%')`,
        [currentReg.MaHocVien]
      );
      const currentTransferCount = transferredRows[0]?.count || 0;
      if (currentTransferCount >= 2) {
        return res.redirect('/classes/my-classes?tab=overview&error=' + encodeURIComponent('Bạn đã sử dụng hết số lần xin chuyển lớp cho phép (Tối đa 2 lần). Hệ thống không thể tiếp nhận thêm yêu cầu chuyển lớp!'));
      }

      // Nếu học viên chọn 'BAO_LUU' (Chờ đợt mở lớp mới) -> Tự động đổi trạng thái sang 'Bảo lưu'
      if (MaLopHocMoi === 'BAO_LUU') {
        const ghiChuBaoLuu = `[Bảo lưu kết quả] Học viên chờ đợt mở lớp mới ngang tầm. Lý do: ${reasonText}`;
        await pool.query(
          "UPDATE dangkyhoc SET TrangThai = 'Bảo lưu', GhiChu = ? WHERE MaDangKy = ?",
          [ghiChuBaoLuu, MaDangKy]
        );

        // Gửi email thông báo cho Admin về yêu cầu Bảo lưu của Học viên
        try {
          const [stRows] = await pool.query('SELECT HoTen, SoDienThoai FROM hosohocvien WHERE MaHocVien = ?', [currentReg.MaHocVien]);
          sendStudentTransferRequestMailToAdmin({
            studentName: stRows[0]?.HoTen || user.HoTen || 'Học viên',
            studentPhone: stRows[0]?.SoDienThoai || user.SoDienThoai || '',
            oldClassName: currentReg.TenLopCu || 'Lớp cũ',
            newClassName: 'BẢO LƯU KẾT QUẢ (Chờ đợt khai giảng mới)',
            reason: reasonText,
            feeDiff: 0,
            totalSessionsPassed: 0
          }).catch(mErr => console.error('Lỗi gửi mail thông báo bảo lưu tới Admin:', mErr.message));
        } catch (e) {
          console.error('Không thể gửi mail bảo lưu cho admin:', e.message);
        }

        return res.redirect('/classes/my-classes?tab=overview&success=' + encodeURIComponent('Đã tự động chuyển trạng thái đơn đăng ký sang BẢO LƯU kết quả học tập. Trung tâm sẽ thông báo cho bạn ngay khi có đợt mở lớp mới!'));
      }

      const [newClassRows] = await pool.query('SELECT * FROM lophoc WHERE MaLopHoc = ?', [MaLopHocMoi]);
      if (newClassRows.length === 0) {
        return res.redirect('/classes/my-classes?tab=overview&error=' + encodeURIComponent('Lớp học mới không tồn tại!'));
      }
      const newClass = newClassRows[0];

      // Tính toán số buổi đã học / đã diễn ra của lớp cũ (Total_Sessions_Passed)
      const [oldClassRows] = await pool.query(
        `SELECT lh.*, kh.ThoiLuong 
         FROM lophoc lh 
         JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc 
         WHERE lh.MaLopHoc = ?`,
        [currentReg.MaLopHoc]
      );
      const oldClassInfo = oldClassRows[0] || {};

      const [oldSchedules] = await pool.query(
        `SELECT ThuTrongTuan FROM thoikhoabieu WHERE MaLopHoc = ?`,
        [currentReg.MaLopHoc]
      );
      const scheduleDays = [...new Set(oldSchedules.map(s => s.ThuTrongTuan))];

      const [attRows] = await pool.query(
        `SELECT COUNT(*) AS count FROM diemdanh WHERE MaLopHoc = ? AND MaHocVien = ?`,
        [currentReg.MaLopHoc, currentReg.MaHocVien]
      );
      const soBuoiDaDiemDanh = attRows[0]?.count || 0;
      const tongBuoi = Number(oldClassInfo.ThoiLuong || 0);

      const elapsedSessions = calculateElapsedSessions(oldClassInfo.NgayKhaiGiang, scheduleDays, tongBuoi, currentReg.NgayDangKy);
      const totalSessionsPassed = Math.max(soBuoiDaDiemDanh, elapsedSessions);

      const isLevelChangeReason = reasonText.includes('Chuyển đổi cấp độ') || reasonText.includes('Sai trình độ');
      let lateNotice = '';
      if (isLevelChangeReason && totalSessionsPassed > 2) {
        lateNotice = ` [HV vắng/phát hiện trễ >2 buổi (${totalSessionsPassed} buổi) - Cần BQL tư vấn trực tiếp]`;
      }

      const feeOld = Number(currentReg.HocPhiDaGiam || currentReg.HocPhi || 0);
      const feeNew = Number(newClass.HocPhi || 0);
      const feeDiff = Math.max(0, feeNew - feeOld);

      const feeDiffText = feeDiff > 0 ? ` (Chênh lệch học phí cần bổ sung: ${feeDiff.toLocaleString('vi-VN')} đ)` : '';
      const ghiChuText = `[HV xin chuyển sang lớp ${newClass.TenLop} (Mã #${MaLopHocMoi})]${feeDiffText}${lateNotice} Lý do: ${reasonText}`;

      // Cập nhật trạng thái thành 'Chờ xử lý - Xin chuyển lớp' và lưu lớp mới đề xuất vào GhiChu
      await pool.query(
        "UPDATE dangkyhoc SET TrangThai = 'Chờ xử lý - Xin chuyển lớp', GhiChu = ? WHERE MaDangKy = ?",
        [ghiChuText, MaDangKy]
      );

      // Gửi email thông báo trực tiếp cho Ban Quản Lý / Admin
      try {
        const [stRows] = await pool.query('SELECT HoTen, SoDienThoai FROM hosohocvien WHERE MaHocVien = ?', [currentReg.MaHocVien]);
        sendStudentTransferRequestMailToAdmin({
          studentName: stRows[0]?.HoTen || user.HoTen || 'Học viên',
          studentPhone: stRows[0]?.SoDienThoai || user.SoDienThoai || '',
          oldClassName: currentReg.TenLopCu || 'Lớp cũ',
          newClassName: `${newClass.TenLop} (${newClass.TenKhac || newClass.CapDo || 'Khóa học mới'})`,
          reason: reasonText,
          feeDiff: feeDiff,
          totalSessionsPassed: totalSessionsPassed
        }).catch(mErr => console.error('Lỗi gửi mail thông báo xin chuyển lớp tới Admin:', mErr.message));
      } catch (e) {
        console.error('Không thể gửi mail xin chuyển lớp cho admin:', e.message);
      }

      let successMsg = feeDiff > 0
        ? `Đã gửi phiếu xin chuyển sang lớp "${newClass.TenLop}"! Lưu ý: Lớp mới có chênh lệch học phí cần đóng thêm ${feeDiff.toLocaleString('vi-VN')} đ.`
        : `Đã gửi phiếu xin chuyển sang lớp "${newClass.TenLop}" thành công! Vui lòng chờ Ban Quản Lý Admin duyệt.`;

      if (isLevelChangeReason && totalSessionsPassed > 2) {
        successMsg += ` (Lớp đã diễn ra ${totalSessionsPassed} buổi > 2 buổi theo quy định. Phiếu của bạn đã được chuyển lên Ban Quản Lý Admin để thẩm định trường hợp vắng mặt và tư vấn trực tiếp).`;
      }

      res.redirect('/classes/my-classes?tab=overview&success=' + encodeURIComponent(successMsg));
    } catch (err) {
      console.error('Lỗi khi học viên xin chuyển lớp:', err);
      res.redirect('/classes/my-classes?tab=overview&error=' + encodeURIComponent('Lỗi máy chủ khi gửi yêu cầu chuyển lớp: ' + err.message));
    }
  }

  static async checkScheduleConflict(maHocVien, maLopHoc) {
    try {
      const [candidateSchedules] = await pool.query(
        `SELECT tkb.ThuTrongTuan, bh.GioBatDau, bh.GioKetThuc, lh.TenLop, lh.NgayKhaiGiang, lh.NgayKetThuc
         FROM thoikhoabieu tkb
         JOIN buoihoc bh ON tkb.MaBuoiHoc = bh.MaBuoiHoc
         JOIN lophoc lh ON tkb.MaLopHoc = lh.MaLopHoc
         WHERE tkb.MaLopHoc = ?`,
        [maLopHoc]
      );

      if (candidateSchedules.length === 0) return null;

      const [existingSchedules] = await pool.query(
        `SELECT tkb.ThuTrongTuan, bh.GioBatDau, bh.GioKetThuc, lh.TenLop, lh.NgayKhaiGiang, lh.NgayKetThuc
         FROM dangkyhoc dk
         JOIN thoikhoabieu tkb ON dk.MaLopHoc = tkb.MaLopHoc
         JOIN buoihoc bh ON tkb.MaBuoiHoc = bh.MaBuoiHoc
         JOIN lophoc lh ON tkb.MaLopHoc = lh.MaLopHoc
         WHERE dk.MaHocVien = ? 
           AND dk.TrangThai IN ('Thành công', 'Đang học', 'Chờ thanh toán', 'Chờ duyệt')
           AND dk.MaLopHoc != ?`,
        [maHocVien, maLopHoc]
      );

      for (const cand of candidateSchedules) {
        for (const exist of existingSchedules) {
          // Kiểm tra Khoảng thời gian học (Date Range Overlap)
          const candStart = cand.NgayKhaiGiang ? new Date(cand.NgayKhaiGiang) : new Date('1970-01-01');
          const candEnd = cand.NgayKetThuc ? new Date(cand.NgayKetThuc) : new Date('2099-12-31');
          const existStart = exist.NgayKhaiGiang ? new Date(exist.NgayKhaiGiang) : new Date('1970-01-01');
          const existEnd = exist.NgayKetThuc ? new Date(exist.NgayKetThuc) : new Date('2099-12-31');

          const datesOverlap = (candStart <= existEnd && candEnd >= existStart);

          // Chỉ báo xung đột khi KHOẢNG THỜI GIANG HỌC CHỒNG LẤN + TRÙNG THỨ TRONG TUẦN + TRÙNG CA HỌC
          if (datesOverlap && cand.ThuTrongTuan === exist.ThuTrongTuan) {
            const candStart = cand.GioBatDau;
            const candEnd = cand.GioKetThuc;
            const existStart = exist.GioBatDau;
            const existEnd = exist.GioKetThuc;

            if (candStart < existEnd && candEnd > existStart) {
              return {
                conflict: true,
                className: exist.TenLop,
                day: cand.ThuTrongTuan,
                time: `${candStart} - ${candEnd}`
              };
            }
          }
        }
      }
      return null;
    } catch (err) {
      console.error('Lỗi kiểm tra xung đột TKB học viên:', err);
      return null;
    }
  }

  static async checkTwoClassesScheduleConflict(maLopHoc1, maLopHoc2) {
    try {
      if (maLopHoc1 == maLopHoc2) return null;
      const [schedules1] = await pool.query(
        `SELECT tkb.ThuTrongTuan, bh.GioBatDau, bh.GioKetThuc, lh.TenLop, lh.NgayKhaiGiang, lh.NgayKetThuc
         FROM thoikhoabieu tkb
         JOIN buoihoc bh ON tkb.MaBuoiHoc = bh.MaBuoiHoc
         JOIN lophoc lh ON tkb.MaLopHoc = lh.MaLopHoc
         WHERE tkb.MaLopHoc = ?`,
        [maLopHoc1]
      );
      const [schedules2] = await pool.query(
        `SELECT tkb.ThuTrongTuan, bh.GioBatDau, bh.GioKetThuc, lh.TenLop, lh.NgayKhaiGiang, lh.NgayKetThuc
         FROM thoikhoabieu tkb
         JOIN buoihoc bh ON tkb.MaBuoiHoc = bh.MaBuoiHoc
         JOIN lophoc lh ON tkb.MaLopHoc = lh.MaLopHoc
         WHERE tkb.MaLopHoc = ?`,
        [maLopHoc2]
      );

      for (const s1 of schedules1) {
        for (const s2 of schedules2) {
          const s1Start = s1.NgayKhaiGiang ? new Date(s1.NgayKhaiGiang) : new Date('1970-01-01');
          const s1End = s1.NgayKetThuc ? new Date(s1.NgayKetThuc) : new Date('2099-12-31');
          const s2Start = s2.NgayKhaiGiang ? new Date(s2.NgayKhaiGiang) : new Date('1970-01-01');
          const s2End = s2.NgayKetThuc ? new Date(s2.NgayKetThuc) : new Date('2099-12-31');

          const datesOverlap = (s1Start <= s2End && s1End >= s2Start);

          if (datesOverlap && s1.ThuTrongTuan === s2.ThuTrongTuan) {
            const time1Start = s1.GioBatDau;
            const time1End = s1.GioKetThuc;
            const time2Start = s2.GioBatDau;
            const time2End = s2.GioKetThuc;

            if (time1Start < time2End && time1End > time2Start) {
              return {
                conflict: true,
                className1: s1.TenLop,
                className2: s2.TenLop,
                day: s1.ThuTrongTuan,
                time: `${time1Start} - ${time1End}`
              };
            }
          }
        }
      }
      return null;
    } catch (err) {
      console.error('Lỗi kiểm tra xung đột TKB 2 lớp:', err);
      return null;
    }
  }

  static async addStudentProfile(req, res) {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      }

      const { HoTen, QuanHe, NgaySinh, DiaChi, Email } = req.body;

      if (!HoTen || !HoTen.trim()) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập Họ và tên học viên' });
      }

      const dob = NgaySinh ? NgaySinh : null;
      const relation = QuanHe ? QuanHe.trim() : 'Con';
      const emailTrim = (Email && Email.trim()) ? Email.trim().toLowerCase() : null;

      let targetUserId = user.MaNguoiDung;

      // Nếu Phụ huynh nhập Email/Gmail riêng cho con -> Tự động tạo Tài khoản Đăng nhập riêng
      if (emailTrim) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailTrim)) {
          return res.status(400).json({ success: false, message: 'Định dạng Email nhập vào không hợp lệ!' });
        }

        const [existUser] = await pool.query('SELECT MaNguoiDung FROM nguoidung WHERE LOWER(Email) = ?', [emailTrim]);
        if (existUser.length > 0) {
          return res.status(400).json({ success: false, message: 'Email này đã tồn tại trên hệ thống! Vui lòng dùng Email khác.' });
        }

        const bcrypt = require('bcryptjs');
        const defaultHash = await bcrypt.hash('123456', 10);

        const [newUser] = await pool.query(
          `INSERT INTO nguoidung (HoTen, Email, SoDienThoai, MatKhau, VaiTro, TrangThaiXacThuc)
           VALUES (?, ?, ?, ?, 'Học viên', 1)`,
          [HoTen.trim(), emailTrim, user.SoDienThoai || '', defaultHash]
        );
        targetUserId = newUser.insertId;
      }

      const [result] = await pool.query(
        `INSERT INTO hosohocvien (MaNguoiDung, HoTen, QuanHe, NgaySinh, TrinhDoHienTai, DiaChi)
         VALUES (?, ?, ?, ?, 'Chưa xác định', ?)`,
        [targetUserId, HoTen.trim(), relation, dob, DiaChi || '']
      );

      let msg = `Đã thêm hồ sơ học viên (${HoTen.trim()}) thành công!`;
      if (emailTrim) {
        msg += ` Tài khoản đăng nhập riêng cho bé đã khởi tạo thành công (Email: ${emailTrim}, Mật khẩu mặc định: 123456).`;
      }

      res.json({
        success: true,
        message: msg,
        profile: {
          MaHocVien: result.insertId,
          HoTen: HoTen.trim(),
          QuanHe: relation
        }
      });
    } catch (err) {
      console.error('[ADD STUDENT PROFILE ERROR]', err);
      res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tạo hồ sơ con: ' + err.message });
    }
  }

  static async registerClass(req, res) {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      }

      if (user && user.isGoogleGuest) {
        return res.status(403).json({ success: false, requireRegister: true, message: 'Tài khoản Google chưa đăng ký thông tin cá nhân. Vui lòng đăng ký tài khoản trước khi đăng ký học.' });
      }

      const { MaHocVien, MaKhuyenMai, HocPhiDaGiam } = req.body;
      const MaLopHoc = req.body.MaLopHoc || req.body.classId;

      // Get phone check
      const [userRows] = await pool.query('SELECT SoDienThoai FROM NguoiDung WHERE MaNguoiDung = ?', [user.MaNguoiDung]);
      if (userRows.length === 0 || !userRows[0].SoDienThoai || userRows[0].SoDienThoai.trim() === '') {
        return res.status(400).json({
          success: false,
          requirePhone: true,
          message: 'Vui lòng bổ sung Số điện thoại liên lạc trước khi đăng ký lớp học.'
        });
      }

      // Verify student profile belongs to user
      const [userProfiles] = await pool.query('SELECT * FROM hosohocvien WHERE MaNguoiDung = ?', [user.MaNguoiDung]);
      if (userProfiles.length === 0) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ học viên.' });
      }

      let targetProfile = null;
      if (MaHocVien) {
        targetProfile = userProfiles.find(p => p.MaHocVien == MaHocVien);
        if (!targetProfile) {
          return res.status(403).json({ success: false, message: 'Hồ sơ học viên được chọn không hợp lệ.' });
        }
      } else {
        targetProfile = userProfiles[0];
      }

      const maHocVien = targetProfile.MaHocVien;
      const studentName = targetProfile.HoTen || user.HoTen;

      // Check schedule conflict for this student
      const conflict = await ClassController.checkScheduleConflict(maHocVien, MaLopHoc);
      if (conflict) {
        return res.status(400).json({
          success: false,
          message: `Không thể đăng ký: Lịch học của ${studentName} bị TRÙNG với lớp "${conflict.className}" (${conflict.day}, ${conflict.time}).`
        });
      }

      // Check class capacity and enrollment status
      const [clsRow] = await pool.query('SELECT SiSoToiDa, TrangThaiLop, TenLop FROM lophoc WHERE MaLopHoc = ?', [MaLopHoc]);
      if (clsRow.length === 0) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
      }
      const cls = clsRow[0];

      if (!isClassEnrollable(cls.TrangThaiLop)) {
        return res.status(400).json({
          success: false,
          message: `Lớp "${cls.TenLop}" đã khai giảng hoặc đang diễn ra, không thể đăng ký thêm.`
        });
      }

      const [cntRow] = await pool.query(
        "SELECT COUNT(*) AS Count FROM dangkyhoc WHERE MaLopHoc = ? AND TrangThai IN ('Thành công', 'Đang học')",
        [MaLopHoc]
      );
      const actualCount = cntRow[0].Count;

      if (actualCount >= cls.SiSoToiDa) {
        return res.status(400).json({ success: false, message: 'Lớp học đã đạt sĩ số tối đa, không thể đăng ký thêm.' });
      }

      // Check if this student is already registered for any class in the same course
      const [existing] = await pool.query(
        `SELECT dk.*, lh.TenLop 
         FROM dangkyhoc dk
         JOIN lophoc lh ON dk.MaLopHoc = lh.MaLopHoc
         WHERE dk.MaHocVien = ? AND lh.MaKhoaHoc = ? AND dk.TrangThai NOT IN ('Đã hủy', 'Thất bại')`,
        [maHocVien, cls.MaKhoaHoc]
      );
      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Bạn đã đăng ký lớp học này rồi!'
        });
      }

      // Insert new registration
      const finalFee = (HocPhiDaGiam !== undefined && HocPhiDaGiam !== null && HocPhiDaGiam !== '') ? HocPhiDaGiam : (cls.HocPhi || 0);
      const promoId = MaKhuyenMai ? MaKhuyenMai : null;
      const [result] = await pool.query(
        `INSERT INTO dangkyhoc (MaHocVien, MaLopHoc, MaNguoiDangKy, MaKhuyenMai, HocPhiDaGiam, TrangThai, NgayDangKy)
         VALUES (?, ?, ?, ?, ?, 'Chờ thanh toán', NOW())`,
        [maHocVien, MaLopHoc, user.MaNguoiDung, promoId, finalFee]
      );

      // Đồng bộ khởi tạo ngay bản ghi giao dịch giaodich tương ứng
      const [clsTitleRows] = await pool.query('SELECT TenLop FROM lophoc WHERE MaLopHoc = ?', [MaLopHoc]);
      const classTitleStr = clsTitleRows[0] ? clsTitleRows[0].TenLop : 'Lop hoc';
      const unaccented = classTitleStr.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
      const cleanTitle = unaccented.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
      const noiDungCK = `DK hoc lop ${cleanTitle} MaDK${result.insertId}`.substring(0, 50);

      await pool.query(
        `INSERT INTO giaodich (MaDangKy, SoTien, NoiDungChuyenKhoan, TrangThai, NgayGiaoDich)
         VALUES (?, ?, ?, 'Chờ duyệt', NOW())`,
        [result.insertId, finalFee, noiDungCK]
      );

      res.json({
        success: true,
        message: `Đăng ký lớp học cho ${studentName} thành công!`,
        registrationId: result.insertId
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
  }

  static async updatePhone(req, res) {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      }

      if (user && user.isGoogleGuest) {
        return res.status(403).json({ success: false, message: 'Vui lòng thực hiện đăng ký tài khoản học viên để cập nhật thông vịn.' });
      }

      const { SoDienThoai } = req.body;
      if (!SoDienThoai || !/^[0-9]{10}$/.test(SoDienThoai.trim())) {
        return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ (yêu cầu 10 chữ số)' });
      }

      await pool.query(
        'UPDATE NguoiDung SET SoDienThoai = ? WHERE MaNguoiDung = ?',
        [SoDienThoai.trim(), user.MaNguoiDung]
      );

      // Update session
      req.session.user.SoDienThoai = SoDienThoai.trim();
      req.session.user.isGoogleGuest = false;

      res.json({ success: true, message: 'Cập nhật số điện thoại thành công' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
    }
  }

  static async submitPayment(req, res) {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      }

      let { MaDangKy, SoTien, NoiDungChuyenKhoan, MaKhuyenMai } = req.body;

      // Convert MaDangKy to an array of IDs
      let ids = [];
      if (Array.isArray(MaDangKy)) {
        ids = MaDangKy.map(Number);
      } else if (typeof MaDangKy === 'string') {
        ids = MaDangKy.split(',').map(Number);
      } else if (typeof MaDangKy === 'number') {
        ids = [MaDangKy];
      }

      if (ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Không có đơn đăng ký nào được chọn để thanh toán.' });
      }

      // Verify registration and fetch start date + original fees
      const [registrations] = await pool.query(
        `SELECT d.*, lh.NgayKhaiGiang, COALESCE(lh.HocPhi, kh.HocPhi) AS GocHocPhi 
         FROM dangkyhoc d
         JOIN lophoc lh ON d.MaLopHoc = lh.MaLopHoc
         JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc
         JOIN hosohocvien h ON d.MaHocVien = h.MaHocVien
         WHERE d.MaDangKy IN (?) AND (d.MaNguoiDangKy = ? OR h.MaNguoiDung = ?)`,
        [ids, user.MaNguoiDung, user.MaNguoiDung]
      );

      if (registrations.length !== ids.length) {
        return res.status(403).json({ success: false, message: 'Một hoặc nhiều đơn đăng ký không thuộc tài khoản của bạn.' });
      }

      // Check server side promotion validation
      let promoId = MaKhuyenMai ? parseInt(MaKhuyenMai) : null;
      let globalDiscountPct = 0;
      let promoCode = '';

      if (promoId) {
        const [promoRows] = await pool.query(
          'SELECT * FROM khuyenmai WHERE MaKhuyenMai = ? AND NOW() BETWEEN NgayBatDau AND NgayKetThuc',
          [promoId]
        );
        if (promoRows.length > 0) {
          const promo = promoRows[0];
          globalDiscountPct = parseFloat(promo.PhanTramGiam);
          promoCode = promo.MaCode;

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // 1. Kiểm tra điều kiện COMBO20
          if (promoCode === 'COMBO20') {
            if (registrations.length < 2) {
              return res.status(400).json({ success: false, message: 'Mã COMBO20 yêu cầu đăng ký từ 2 khóa học trở lên.' });
            }
            const allValidComboDates = registrations.every(r => {
              const startDate = new Date(r.NgayKhaiGiang);
              startDate.setHours(0, 0, 0, 0);
              return Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) >= 10;
            });
            if (!allValidComboDates) {
              return res.status(400).json({ success: false, message: 'Mã COMBO20 yêu cầu TẤT CẢ các khóa học phải đăng ký trước ngày khai giảng tối thiểu 10 ngày.' });
            }
          }

          // 2. Kiểm tra điều kiện FLASHSALE15
          if (promoCode === 'FLASHSALE15') {
            const allValidFlashsaleDates = registrations.every(r => {
              const startDate = new Date(r.NgayKhaiGiang);
              startDate.setHours(0, 0, 0, 0);
              return Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) >= 10;
            });
            if (!allValidFlashsaleDates) {
              return res.status(400).json({ success: false, message: 'Mã FLASHSALE15 yêu cầu TẤT CẢ các khóa học phải đăng ký trước ngày khai giảng tối thiểu 10 ngày.' });
            }
          }

        } else {
          promoId = null; // invalid/expired
        }
      }

      // Proportional split of total payment amount based on the original fee values
      const totalOrigFee = registrations.reduce((sum, r) => sum + Number(r.HocPhiDaGiam || 0), 0);
      const todayCalc = new Date();
      todayCalc.setHours(0, 0, 0, 0);

      for (const reg of registrations) {
        // Nếu đơn đăng ký đã được thanh toán thành công (Webhook đã xử lý), KHÔNG đổi về Chờ duyệt!
        if (reg.TrangThai === 'Đang học' || reg.TrangThai === 'Thành công' || reg.TrangThai === 'Đã thanh toán') {
          console.log(`[SUBMIT PAYMENT] Skipping status update for MaDangKy #${reg.MaDangKy} because it is already active (${reg.TrangThai}).`);
          continue;
        }

        const ratio = totalOrigFee > 0 ? (Number(reg.HocPhiDaGiam || 0) / totalOrigFee) : (1 / registrations.length);
        const regPaidAmount = Math.round(SoTien * ratio);

        if (promoId) {
          // Tính toán số ngày khai giảng để quyết định xem item này có được giảm không
          let itemDiscountPct = 0;
          const startDate = new Date(reg.NgayKhaiGiang);
          startDate.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((startDate.getTime() - todayCalc.getTime()) / (1000 * 60 * 60 * 24));

          if (promoCode === 'FLASHSALE15' || promoCode === 'COMBO20') {
            if (diffDays >= 10) {
              itemDiscountPct = globalDiscountPct;
            }
          } else {
            itemDiscountPct = globalDiscountPct;
          }

          const originalFee = Number(reg.GocHocPhi || reg.HocPhiDaGiam || 0);
          const finalFee = originalFee - (originalFee * itemDiscountPct / 100);

          await pool.query(
            `UPDATE dangkyhoc SET MaKhuyenMai = ?, HocPhiDaGiam = ?, TrangThai = 'Chờ duyệt' WHERE MaDangKy = ?`,
            [promoId, finalFee, reg.MaDangKy]
          );
        } else {
          await pool.query(
            `UPDATE dangkyhoc SET TrangThai = 'Chờ duyệt' WHERE MaDangKy = ?`,
            [reg.MaDangKy]
          );
        }

        // Insert or Update pending giaodich
        const [existingPendingTx] = await pool.query(
          "SELECT MaGiaoDich FROM giaodich WHERE MaDangKy = ? AND TrangThai = 'Chờ duyệt'",
          [reg.MaDangKy]
        );
        if (existingPendingTx.length > 0) {
          await pool.query(
            `UPDATE giaodich SET SoTien = ?, NoiDungChuyenKhoan = ?, NgayGiaoDich = NOW() WHERE MaGiaoDich = ?`,
            [regPaidAmount, NoiDungChuyenKhoan, existingPendingTx[0].MaGiaoDich]
          );
        } else {
          await pool.query(
            `INSERT INTO giaodich (MaDangKy, SoTien, NoiDungChuyenKhoan, TrangThai, NgayGiaoDich)
             VALUES (?, ?, ?, 'Chờ duyệt', NOW())`,
            [reg.MaDangKy, regPaidAmount, NoiDungChuyenKhoan]
          );
        }
      }
      res.json({ success: true, message: 'Yêu cầu thanh toán đã được ghi nhận. Hệ thống đang chờ ngân hàng xác nhận giao dịch.', redirect: '/classes/my-classes?success=payment_submitted&tab=overview' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Lỗi máy chủ khi thực hiện thanh toán' });
    }
  }

  static async cancelPayment(req, res) {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      }

      let { MaDangKy, SoTien, NoiDungChuyenKhoan } = req.body;

      // Convert MaDangKy to an array of IDs
      let ids = [];
      if (Array.isArray(MaDangKy)) {
        ids = MaDangKy.map(Number);
      } else if (typeof MaDangKy === 'string') {
        ids = MaDangKy.split(',').map(Number);
      } else if (typeof MaDangKy === 'number') {
        ids = [MaDangKy];
      }

      if (ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Không có đơn đăng ký nào được chọn.' });
      }

      // Verify that this registration belongs to the student or their child/dependent profile
      const [registrations] = await pool.query(
        `SELECT d.* 
         FROM dangkyhoc d
         JOIN hosohocvien h ON d.MaHocVien = h.MaHocVien
         WHERE d.MaDangKy IN (?) AND (d.MaNguoiDangKy = ? OR h.MaNguoiDung = ?)`,
        [ids, user.MaNguoiDung, user.MaNguoiDung]
      );

      if (registrations.length !== ids.length) {
        return res.status(403).json({ success: false, message: 'Một hoặc nhiều đơn đăng ký không thuộc tài khoản của bạn.' });
      }

      for (const reg of registrations) {
        // Nếu đơn đăng ký đã được thanh toán thành công, không thay đổi
        if (reg.TrangThai === 'Đang học' || reg.TrangThai === 'Đã thanh toán') {
          console.log(`[CANCEL PAYMENT] Skipping cancel for MaDangKy #${reg.MaDangKy} because it is already paid (${reg.TrangThai}).`);
          continue;
        }

        // Giữ nguyên đơn ở trạng thái 'Chờ thanh toán' để hiển thị ở mục Lớp học đang chờ thanh toán ngoài trang Tổng quan
        await pool.query(
          `UPDATE dangkyhoc SET TrangThai = 'Chờ thanh toán' WHERE MaDangKy = ? AND TrangThai != 'Đang học'`,
          [reg.MaDangKy]
        );
      }

      res.json({ success: true, message: 'Đã đóng cửa sổ thanh toán. Đơn đăng ký vẫn được lưu trong mục Lớp học đang chờ thanh toán.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đóng cửa sổ thanh toán' });
    }
  }

  static async deleteRegistration(req, res) {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      }

      const { id } = req.params;

      const [profiles] = await pool.query('SELECT MaHocVien FROM hosohocvien WHERE MaNguoiDung = ?', [user.MaNguoiDung]);
      if (profiles.length === 0) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ học viên' });
      }
      const maHocVien = profiles[0].MaHocVien;

      const [registrations] = await pool.query(
        "SELECT * FROM dangkyhoc WHERE MaDangKy = ? AND MaHocVien = ?",
        [id, maHocVien]
      );

      if (registrations.length === 0) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đăng ký này' });
      }

      const reg = registrations[0];
      if (reg.TrangThai !== 'Chờ thanh toán' && reg.TrangThai !== 'Chờ duyệt') {
        return res.status(400).json({ success: false, message: 'Không thể hủy đơn đăng ký đã được kích hoạt hoặc hoàn tất' });
      }

      // Delete associated transactions first to prevent foreign key constraint violations
      await pool.query('DELETE FROM giaodich WHERE MaDangKy = ?', [id]);
      await pool.query('DELETE FROM dangkyhoc WHERE MaDangKy = ?', [id]);

      res.json({ success: true, message: 'Hủy đăng ký lớp học thành công' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Lỗi máy chủ khi hủy đăng ký' });
    }
  }

  static async showTeacherDashboard(req, res) {
    try {
      const user = req.session.user;
      if (!user || user.TenVaiTro !== 'Giảng viên') {
        return res.redirect('/login');
      }

      // 1. Fetch teacher profile
      const [nhansuRows] = await pool.query('SELECT * FROM hosonhansu WHERE MaNguoiDung = ?', [user.MaNguoiDung]);
      const nhansu = nhansuRows[0];
      if (!nhansu) {
        return res.status(404).send('Không tìm thấy thông tin giảng viên trong hồ sơ nhân sự.');
      }
      const maGiangVien = nhansu.MaNhanSu;

      // 2. Fetch classes taught ONLY by this teacher (Prioritize classes with registered students)
      const [classes] = await pool.query(
        `SELECT lh.*, kh.TenKhoaHoc, kh.CapDo, kh.ThoiLuong,
                (SELECT COUNT(*) FROM dangkyhoc dk WHERE dk.MaLopHoc = lh.MaLopHoc AND dk.TrangThai IN ('Thành công', 'Đang học')) AS StudentCount 
         FROM lophoc lh 
         JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc 
         WHERE lh.MaGiangVien = ? 
         ORDER BY 
           (SELECT COUNT(*) FROM dangkyhoc dk WHERE dk.MaLopHoc = lh.MaLopHoc AND dk.TrangThai IN ('Thành công', 'Đang học')) DESC,
           CASE 
             WHEN lh.TrangThaiLop IN ('Đang mở', 'Đang diễn ra', 'Đã đóng') THEN 1 
             WHEN lh.TrangThaiLop = 'Sắp mở' THEN 2 
             ELSE 3 
           END ASC, 
           lh.MaLopHoc ASC`,
        [maGiangVien]
      );
      const myClasses = classes;

      // 3. Fetch timetables for these teacher classes
      let timetables = [];
      if (myClasses.length > 0) {
        const myClassIds = myClasses.map(c => c.MaLopHoc);
        const [timetableRows] = await pool.query(
          `SELECT tkb.MaLopHoc, lh.TenLop, k.TenKhoaHoc, ph.TenPhong, ph.ViTri, bh.TenBuoi, 
                  TIME_FORMAT(bh.GioBatDau, '%H:%i') AS GioBatDau, 
                  TIME_FORMAT(bh.GioKetThuc, '%H:%i') AS GioKetThuc,
                  GROUP_CONCAT(tkb.ThuTrongTuan ORDER BY FIELD(tkb.ThuTrongTuan, 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật') SEPARATOR ', ') AS CacThu
           FROM thoikhoabieu tkb
           JOIN lophoc lh ON tkb.MaLopHoc = lh.MaLopHoc
           JOIN khoahoc k ON lh.MaKhoaHoc = k.MaKhoaHoc
           JOIN phonghoc ph ON tkb.MaPhongHoc = ph.MaPhongHoc
           JOIN buoihoc bh ON tkb.MaBuoiHoc = bh.MaBuoiHoc
           WHERE tkb.MaLopHoc IN (?)
           GROUP BY tkb.MaLopHoc, tkb.MaPhongHoc, tkb.MaBuoiHoc, lh.TenLop, k.TenKhoaHoc, ph.TenPhong, ph.ViTri, bh.TenBuoi, bh.GioBatDau, bh.GioKetThuc
           ORDER BY lh.MaLopHoc DESC`,
          [myClassIds.length > 0 ? myClassIds : [0]]
        );
        timetables = timetableRows;
      }

      // 4. Fetch students for each class
      const studentsByClass = {};
      const attendanceByClass = {};
      const gradesByClass = {};

      for (const cls of classes) {
        // Fetch ALL registered students in this class
        const [studentRows] = await pool.query(
          `SELECT nd.MaNguoiDung, COALESCE(NULLIF(TRIM(hh.HoTen), ''), nd.HoTen) AS HoTen, nd.Email, nd.SoDienThoai, hh.MaHocVien, hh.TrinhDoHienTai, dk.TrangThai, dk.MaDangKy, dk.NgayDangKy, dk.GhiChu,
                  (SELECT COUNT(*) FROM diemdanh dd WHERE dd.MaHocVien = hh.MaHocVien AND dd.MaLopHoc = ?) AS SoBuoiDaHoc,
                  kh.ThoiLuong AS TongSoBuoi
           FROM dangkyhoc dk
           JOIN hosohocvien hh ON dk.MaHocVien = hh.MaHocVien
           JOIN nguoidung nd ON hh.MaNguoiDung = nd.MaNguoiDung
           JOIN lophoc lh ON dk.MaLopHoc = lh.MaLopHoc
           JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc
           WHERE dk.MaLopHoc = ?`,
          [cls.MaLopHoc, cls.MaLopHoc]
        );

        const clsTimetables = timetables.filter(t => t.MaLopHoc === cls.MaLopHoc);
        const scheduleDays = [];
        clsTimetables.forEach(t => {
          if (t.CacThu) {
            t.CacThu.split(', ').forEach(day => {
              if (!scheduleDays.includes(day)) scheduleDays.push(day);
            });
          }
        });
        for (const s of studentRows) {
          const elapsedBySchedule = calculateElapsedSessions(cls.NgayKhaiGiang, scheduleDays, cls.ThoiLuong, s.NgayDangKy);
          s.BuoiHienTai = Math.max(s.SoBuoiDaHoc || 0, elapsedBySchedule);

          // Fetch last 3 attendance records for this student in this class
          const studentIdParam = s.MaHocVien || s.MaNguoiDung;
          const [attLogs] = await pool.query(
            `SELECT TrangThai FROM diemdanh 
             WHERE (MaHocVien = ? OR MaHocVien = ?) AND MaLopHoc = ? 
             ORDER BY DATE(NgayHoc) DESC, MaDiemDanh DESC LIMIT 3`,
            [s.MaHocVien || 0, s.MaNguoiDung || 0, cls.MaLopHoc]
          );

          let consecutiveAbsences = 0;
          for (const log of attLogs) {
            if (log.TrangThai === 'Vắng mặt' || log.TrangThai === 'Vắng') {
              consecutiveAbsences++;
            } else {
              break;
            }
          }
          s.consecutiveAbsences = consecutiveAbsences;

          // Fetch today's attendance status for this student
          const todayStr = formatDateYMD();
          const [todayAttRows] = await pool.query(
            `SELECT TrangThai FROM diemdanh 
             WHERE (MaHocVien = ? OR MaHocVien = ?) AND MaLopHoc = ? AND DATE(NgayHoc) = DATE(?)`,
            [s.MaHocVien || 0, s.MaNguoiDung || 0, cls.MaLopHoc, todayStr]
          );
          s.todayStatus = todayAttRows.length > 0 ? todayAttRows[0].TrangThai : null;

          // Fetch grade info for this student in this class
          const [gradeRows] = await pool.query(
            `SELECT DiemGiuaKy, DiemCuoiKy, NhanXetGiangVien FROM quanlydiem 
             WHERE MaHocVien = ? AND MaLopHoc = ?`,
            [s.MaHocVien, cls.MaLopHoc]
          );
          const grade = gradeRows[0] || {};
          s.DiemGiuaKy = grade.DiemGiuaKy;
          s.DiemCuoiKy = grade.DiemCuoiKy;
          s.NhanXetGiangVien = grade.NhanXetGiangVien;

          // Determine detailed status/tinhtrang
          if (s.TrangThai === 'Đã ngừng học' || s.TrangThai === 'Ngừng học') {
            s.tinhtrang = 'Ngừng học';
            s.tinhtrangBadge = 'bg-danger text-white';
            s.isBlurred = true;
          } else if (s.TrangThai === 'Đã chuyển lớp' || (s.GhiChu && s.GhiChu.includes('Đã chuyển sang lớp'))) {
            s.tinhtrang = 'Đã chuyển lớp đi';
            s.tinhtrangBadge = 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';
            s.isTransferredOut = true;
            s.isTransferred = true;
            s.isBlurred = true;
          } else if (s.GhiChu && s.GhiChu.includes('Chuyển từ lớp')) {
            s.tinhtrang = 'Mới chuyển đến';
            s.tinhtrangBadge = 'bg-info-subtle text-info-emphasis border border-info-subtle';
            s.isNewlyTransferredIn = true;
          } else if (s.TrangThai === 'Đã hoàn thành' || s.TrangThai === 'Hoàn thành' || (grade.DiemCuoiKy !== undefined && grade.DiemCuoiKy !== null && grade.NhanXetGiangVien && grade.NhanXetGiangVien.trim() !== '')) {
            s.tinhtrang = 'Đã hoàn thành khóa học';
            s.tinhtrangBadge = 'bg-success text-white';
            s.isCompleted = true;
            s.isBlurred = true;
          } else if (consecutiveAbsences >= 3) {
            s.tinhtrang = 'Nguy cơ bỏ học (Vắng 3 buổi liên tiếp)';
            s.tinhtrangBadge = 'bg-warning text-dark';
          } else {
            s.tinhtrang = 'Đang học';
            s.tinhtrangBadge = 'bg-info text-dark';
          }
        }

        studentsByClass[cls.MaLopHoc] = studentRows;

        // Fetch attendance logs for this class
        const [attRows] = await pool.query(
          `SELECT dd.*, COALESCE(NULLIF(TRIM(hh.HoTen), ''), nd.HoTen, 'Học viên') AS HoTen 
           FROM diemdanh dd 
           LEFT JOIN hosohocvien hh ON dd.MaHocVien = hh.MaHocVien
           LEFT JOIN nguoidung nd ON (hh.MaNguoiDung = nd.MaNguoiDung OR dd.MaHocVien = nd.MaNguoiDung)
           WHERE dd.MaLopHoc = ? 
           ORDER BY DATE(dd.NgayHoc) DESC, dd.MaDiemDanh DESC`,
          [cls.MaLopHoc]
        );
        console.log(`[ATTENDANCE LOGS] Class #${cls.MaLopHoc} has ${attRows.length} logs:`, attRows);
        attendanceByClass[cls.MaLopHoc] = attRows;

        // Fetch grades for this class
        const [gradeRows] = await pool.query(
          `SELECT qd.*, COALESCE(NULLIF(TRIM(hh.HoTen), ''), nd.HoTen) AS HoTen 
           FROM quanlydiem qd 
           JOIN hosohocvien hh ON qd.MaHocVien = hh.MaHocVien
           JOIN nguoidung nd ON hh.MaNguoiDung = nd.MaNguoiDung
           WHERE qd.MaLopHoc = ?`,
          [cls.MaLopHoc]
        );
        gradesByClass[cls.MaLopHoc] = gradeRows;
      }

      // 5. Fetch available exams list
      const [exams] = await pool.query('SELECT * FROM baithi');

      const { getExamSessionsFromSyllabus } = require('../utils/syllabi');

      const successMsg = req.query.success ? decodeURIComponent(String(req.query.success)) : null;
      const errorMsg = req.query.error ? decodeURIComponent(String(req.query.error)) : null;

      res.render('teacher/dashboard', {
        user,
        nhansu,
        classes,
        myClasses,
        timetables,
        studentsByClass,
        attendanceByClass,
        gradesByClass,
        exams,
        getExamSessionsFromSyllabus,
        calculateElapsedSessions,
        success: successMsg,
        error: errorMsg,
        tab: req.query.tab || 'overview'
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Lỗi máy chủ khi tải bảng điều khiển giảng viên.');
    }
  }

  static async saveAttendance(req, res) {
    let { MaLopHoc, NgayHoc, records, recordsJson } = req.body || {};
    if (Array.isArray(MaLopHoc)) MaLopHoc = MaLopHoc[0];
    MaLopHoc = parseInt(MaLopHoc, 10);

    if (recordsJson) {
      try {
        const parsed = JSON.parse(recordsJson);
        if (parsed && typeof parsed === 'object') {
          records = parsed;
        }
      } catch (e) {
        console.warn('[ATTENDANCE JSON PARSE WARNING]', e.message);
      }
    }

    records = normalizeAttendanceRecords(records);
    console.log('>>> [SAVE ATTENDANCE CALLED] <<<');
    console.log('req.body:', req.body);
    console.log('Parsed MaLopHoc:', MaLopHoc, 'NgayHoc:', NgayHoc, 'records:', records);
    try {
      const user = req.session.user;
      if (!user || user.TenVaiTro !== 'Giảng viên') {
        return res.redirect('/auth/login');
      }

      if (!MaLopHoc || isNaN(MaLopHoc)) {
        return res.redirect('/classes/dashboard?tab=attendance&error=' + encodeURIComponent('Vui lòng chọn lớp học.'));
      }

      // Validate course active date range and schedule (NgayKhaiGiang -> NgayKetThuc, Day of week, Session start time)
      const [classRows] = await pool.query('SELECT NgayKhaiGiang, NgayKetThuc, TenLop FROM lophoc WHERE MaLopHoc = ?', [MaLopHoc]);
      if (classRows.length > 0) {
        const clsInfo = classRows[0];
        const now = new Date();
        const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const attDate = new Date(NgayHoc || now);
        const attDateZero = new Date(attDate.getFullYear(), attDate.getMonth(), attDate.getDate());

        const startDate = new Date(clsInfo.NgayKhaiGiang);
        const startDateZero = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

        const endDate = new Date(clsInfo.NgayKetThuc);
        const endDateZero = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        endDateZero.setHours(23, 59, 59, 999);

        // 1. Cannot take attendance for future dates
        if (attDateZero > todayZero) {
          return res.redirect(`/classes/dashboard?tab=attendance&classId=${MaLopHoc}&error=${encodeURIComponent(`Chưa đến thời gian học: Không thể điểm danh trước cho ngày trong tương lai.`)}`);
        }

        // 2. Check if before start date
        if (attDateZero < startDateZero) {
          const startStr = startDate.toLocaleDateString('vi-VN');
          return res.redirect(`/classes/dashboard?tab=attendance&classId=${MaLopHoc}&error=${encodeURIComponent(`Chưa đến thời gian học: Lớp ${clsInfo.TenLop} chưa đến ngày khai giảng (${startStr}).`)}`);
        }

        // 3. Check if after end date
        if (attDateZero > endDateZero) {
          const endStr = endDate.toLocaleDateString('vi-VN');
          return res.redirect(`/classes/dashboard?tab=attendance&classId=${MaLopHoc}&error=${encodeURIComponent(`Không thể điểm danh: Lớp ${clsInfo.TenLop} đã kết thúc thời gian đào tạo (${endStr}).`)}`);
        }

        // 4. Check schedule (day of week & session time)
        const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const attDayName = dayNames[attDate.getDay()];

        const [schedules] = await pool.query(
          `SELECT t.ThuTrongTuan, b.GioBatDau, b.GioKetThuc
           FROM thoikhoabieu t
           JOIN buoihoc b ON t.MaBuoiHoc = b.MaBuoiHoc
           WHERE t.MaLopHoc = ?`,
          [MaLopHoc]
        );

        if (schedules.length > 0) {
          const matchedDaySchedules = schedules.filter(s => s.ThuTrongTuan === attDayName);
          if (matchedDaySchedules.length === 0) {
            return res.redirect(`/classes/dashboard?tab=attendance&classId=${MaLopHoc}&error=${encodeURIComponent(`Ngoài giờ điểm danh: Ngày ${attDate.toLocaleDateString('vi-VN')} (${attDayName}) không phải ngày có lịch học của lớp ${clsInfo.TenLop}.`)}`);
          }

          // If attendance is for TODAY, check if current time is within session hours
          const isToday = attDateZero.getTime() === todayZero.getTime();
          if (isToday) {
            // Ép múi giờ hệ thống về giờ Việt Nam (Asia/Ho_Chi_Minh)
            const vnTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
            const vnDateObj = new Date(vnTimeStr);

            const currentHours = vnDateObj.getHours();
            const currentMinutes = vnDateObj.getMinutes();
            const currentTotalMins = currentHours * 60 + currentMinutes;

            // Ràng buộc: Phải sau 90 phút kể từ giờ bắt đầu ca học (startMins + 90) mới cho phép điểm danh
            const validSlot = matchedDaySchedules.find(s => {
              const { allowMins } = getAllowTimeInfo(s.GioBatDau);
              const [endH, endM] = s.GioKetThuc.split(':').map(Number);
              const endMins = endH * 60 + endM;

              return currentTotalMins >= allowMins && currentTotalMins <= endMins;
            });

            if (!validSlot) {
              const notYetSlot = matchedDaySchedules.find(s => {
                const { allowMins } = getAllowTimeInfo(s.GioBatDau);
                return currentTotalMins < allowMins;
              });

              if (notYetSlot) {
                const { formattedTime } = getAllowTimeInfo(notYetSlot.GioBatDau);
                return res.redirect(`/classes/dashboard?tab=attendance&classId=${MaLopHoc}&error=${encodeURIComponent(`Buổi học chưa đủ 90 phút (bắt đầu lúc ${notYetSlot.GioBatDau.substring(0, 5)}). Vui lòng quay lại điểm danh lúc ${formattedTime}.`)}`);
              }

              const scheduleTimeText = matchedDaySchedules.map(s => `${s.GioBatDau.substring(0, 5)} - ${s.GioKetThuc.substring(0, 5)}`).join(', ');
              return res.redirect(`/classes/dashboard?tab=attendance&classId=${MaLopHoc}&error=${encodeURIComponent(`Đã quá hạn thời gian điểm danh cho ca học hôm nay (${scheduleTimeText}).`)}`);
            }
          }
        }
      }

      if (!records || Object.keys(records).length === 0) {
        return res.redirect(`/classes/dashboard?tab=attendance&classId=${MaLopHoc}&success=${encodeURIComponent('Không có dữ liệu điểm danh để lưu.')}`);
      }

      // Ép định dạng chuẩn YYYY-MM-DD cho MySQL tránh lỗi insert thất bại ẩn
      const targetNgayHoc = formatDateYMD(NgayHoc);

      // records is an object mapping MaHocVien or MaNguoiDung -> TrangThai ('Có mặt', 'Vắng mặt')
      let autoDroppedCount = 0;
      for (const [maHocVienKey, trangThai] of Object.entries(records)) {
        const inputId = parseInt(maHocVienKey);
        if (!inputId || isNaN(inputId)) continue;

        // Tra cứu MaHocVien (hỗ trợ cả MaHocVien và MaNguoiDung)
        let [hvCheck] = await pool.query(
          'SELECT MaHocVien FROM hosohocvien WHERE MaHocVien = ? OR MaNguoiDung = ?',
          [inputId, inputId]
        );

        // Nếu chưa có trong hosohocvien nhưng có tài khoản nguoidung -> Tự tạo hồ sơ học viên
        if (hvCheck.length === 0) {
          const [userCheck] = await pool.query('SELECT MaNguoiDung, HoTen FROM nguoidung WHERE MaNguoiDung = ?', [inputId]);
          if (userCheck.length > 0) {
            const [insertHv] = await pool.query(
              'INSERT INTO hosohocvien (MaNguoiDung, HoTen, QuanHe, TrinhDoHienTai) VALUES (?, ?, "Bản thân", "Chưa xác định")',
              [inputId, userCheck[0].HoTen || 'Học viên']
            );
            hvCheck = [{ MaHocVien: insertHv.insertId }];
          } else {
            continue;
          }
        }

        const realMaHocVien = hvCheck[0].MaHocVien;
        console.log(`[ATTENDANCE DB] Saving attendance for realMaHocVien: ${realMaHocVien}, MaLopHoc: ${MaLopHoc}, targetNgayHoc: ${targetNgayHoc}, trangThai: ${trangThai}`);

        // Check if attendance already exists
        const existingQuery = await pool.query(
          'SELECT MaDiemDanh FROM diemdanh WHERE MaHocVien = ? AND MaLopHoc = ? AND DATE(NgayHoc) = DATE(?)',
          [realMaHocVien, MaLopHoc, targetNgayHoc]
        );
        const existing = Array.isArray(existingQuery) && existingQuery[0] ? existingQuery[0] : [];

        if (existing.length > 0) {
          console.log(`[ATTENDANCE DB] Updating existing record #${existing[0].MaDiemDanh}`);
          await pool.query(
            'UPDATE diemdanh SET TrangThai = ? WHERE MaDiemDanh = ?',
            [trangThai, existing[0].MaDiemDanh]
          );
        } else {
          console.log(`[ATTENDANCE DB] Inserting new record...`);
          const [insRes] = await pool.query(
            'INSERT INTO diemdanh (MaHocVien, MaLopHoc, NgayHoc, TrangThai) VALUES (?, ?, ?, ?)',
            [realMaHocVien, MaLopHoc, targetNgayHoc, trangThai]
          );
          console.log(`[ATTENDANCE DB] Inserted record #${insRes.insertId}`);
        }
      }

      let msg = 'Đã lưu thông tin điểm danh lớp học thành công!';

      res.redirect(`/classes/dashboard?tab=attendance&classId=${MaLopHoc}&success=${encodeURIComponent(msg)}`);
    } catch (err) {
      console.error('===== SAVE ATTENDANCE ERROR =====');
      console.error('req.body:', JSON.stringify(req.body, null, 2));
      console.error('MaLopHoc:', MaLopHoc);
      console.error('NgayHoc:', NgayHoc);
      console.error('records:', records);
      console.error('Error:', err.message);
      console.error('SQL:', err.sql);
      console.error('=================================');
      const classIdParam = MaLopHoc ? `&classId=${MaLopHoc}` : '';
      res.redirect(`/classes/dashboard?tab=attendance${classIdParam}&error=${encodeURIComponent('Lỗi điểm danh lớp học: ' + err.message)}`);
    }
  }

  static async saveGrades(req, res) {
    let { MaLopHoc, grades } = req.body || {};
    if (Array.isArray(MaLopHoc)) MaLopHoc = MaLopHoc[0];
    MaLopHoc = parseInt(MaLopHoc, 10);
    try {
      const user = req.session.user;
      if (!user || user.TenVaiTro !== 'Giảng viên') {
        return res.redirect('/auth/login');
      }

      if (!MaLopHoc || isNaN(MaLopHoc)) {
        return res.redirect('/classes/dashboard?tab=grades&error=' + encodeURIComponent('Vui lòng chọn lớp học.'));
      }

      if (!grades || Object.keys(grades).length === 0) {
        return res.redirect(`/classes/dashboard?tab=grades&classId=${MaLopHoc}&success=${encodeURIComponent('Không có dữ liệu điểm để lưu.')}`);
      }

      const [lhCheck] = await pool.query(
        `SELECT lh.*, kh.ThoiLuong 
         FROM lophoc lh 
         JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc 
         WHERE lh.MaLopHoc = ?`,
        [MaLopHoc]
      );
      if (lhCheck.length === 0) {
        return res.redirect(`/classes/dashboard?tab=grades&error=${encodeURIComponent('Lớp học không tồn tại trong hệ thống.')}`);
      }

      const clsInfo = lhCheck[0];
      const tongSoBuoi = Number(clsInfo.ThoiLuong || 0);

      const [schedules] = await pool.query(
        `SELECT tkb.ThuTrongTuan FROM thoikhoabieu tkb WHERE tkb.MaLopHoc = ?`,
        [MaLopHoc]
      );
      const scheduleDays = [...new Set(schedules.map(s => s.ThuTrongTuan))];

      const elapsedSessions = calculateElapsedSessions(clsInfo.NgayKhaiGiang, scheduleDays, tongSoBuoi);

      const { getExamSessionsFromSyllabus } = require('../utils/syllabi');
      const { midtermSession, finalSession } = getExamSessionsFromSyllabus(clsInfo.MaKhoaHoc, tongSoBuoi);

      if (elapsedSessions < midtermSession) {
        return res.redirect(
          `/classes/dashboard?tab=grades&classId=${MaLopHoc}&error=` +
          encodeURIComponent(`Chưa đến thời gian nhập điểm & đánh giá: Lớp "${clsInfo.TenLop}" hiện mới học đến Buổi ${elapsedSessions}/${tongSoBuoi}. Đề cương khóa học quy định thời gian đánh giá bắt đầu từ Buổi ${midtermSession} (Bài thi Giữa kỳ).`)
        );
      }

      let autoCompletedCount = 0;
      let hasAnyGradeSaved = false;

      // grades is an object mapping MaHocVien -> { DiemGiuaKy, DiemCuoiKy, NhanXet }
      for (const [maHocVienKey, gradeData] of Object.entries(grades)) {
        const maHocVien = parseInt(maHocVienKey);
        if (!maHocVien || isNaN(maHocVien)) continue;

        // Verify student exists in hosohocvien to prevent foreign key failure
        const [hvCheck] = await pool.query('SELECT MaHocVien FROM hosohocvien WHERE MaHocVien = ?', [maHocVien]);
        if (hvCheck.length === 0) {
          console.warn(`[SAVE GRADES] MaHocVien #${maHocVien} does not exist in hosohocvien, skipping.`);
          continue;
        }

        const [existing] = await pool.query(
          'SELECT MaBangDiem, DiemGiuaKy, DiemCuoiKy, NhanXetGiangVien FROM quanlydiem WHERE MaHocVien = ? AND MaLopHoc = ?',
          [maHocVien, MaLopHoc]
        );

        const parsedGiua = parseFloat(gradeData.DiemGiuaKy);
        const parsedCuoi = parseFloat(gradeData.DiemCuoiKy);

        let finalGiua = (existing.length > 0) ? existing[0].DiemGiuaKy : null;
        let finalCuoi = (existing.length > 0) ? existing[0].DiemCuoiKy : null;
        let finalNhanXet = (existing.length > 0) ? (existing[0].NhanXetGiangVien || '') : '';

        let isRecordValidToSave = false;

        if (gradeData.DiemGiuaKy !== undefined && gradeData.DiemGiuaKy !== null && gradeData.DiemGiuaKy !== '' && !isNaN(parsedGiua)) {
          if (parsedGiua < 0 || parsedGiua > 990) {
            return res.redirect('/classes/dashboard?tab=grades&classId=' + MaLopHoc + '&error=' + encodeURIComponent('Lỗi: Điểm giữa kỳ phải nằm trong thang điểm TOEIC từ 0 đến 990!'));
          }
          finalGiua = Math.min(990, Math.max(0, parsedGiua));
          hasAnyGradeSaved = true;
          isRecordValidToSave = true;
        }
        if (gradeData.DiemCuoiKy !== undefined && gradeData.DiemCuoiKy !== null && gradeData.DiemCuoiKy !== '' && !isNaN(parsedCuoi)) {
          if (parsedCuoi < 0 || parsedCuoi > 990) {
            return res.redirect('/classes/dashboard?tab=grades&classId=' + MaLopHoc + '&error=' + encodeURIComponent('Lỗi: Điểm cuối kỳ phải nằm trong thang điểm TOEIC từ 0 đến 990!'));
          }
          finalCuoi = Math.min(990, Math.max(0, parsedCuoi));
          hasAnyGradeSaved = true;
          isRecordValidToSave = true;
        }
        if (gradeData.NhanXet !== undefined && gradeData.NhanXet !== null && gradeData.NhanXet.trim() !== '') {
          finalNhanXet = gradeData.NhanXet.trim();
          isRecordValidToSave = true;
        }

        if (isRecordValidToSave || existing.length > 0) {
          if (existing.length > 0) {
            await pool.query(
              'UPDATE quanlydiem SET DiemGiuaKy = ?, DiemCuoiKy = ?, NhanXetGiangVien = ? WHERE MaBangDiem = ?',
              [finalGiua, finalCuoi, finalNhanXet, existing[0].MaBangDiem]
            );
          } else {
            await pool.query(
              'INSERT INTO quanlydiem (MaHocVien, MaLopHoc, DiemGiuaKy, DiemCuoiKy, NhanXetGiangVien) VALUES (?, ?, ?, ?, ?)',
              [maHocVien, MaLopHoc, finalGiua, finalCuoi, finalNhanXet]
            );
          }
        }

        const [attCountRows] = await pool.query('SELECT COUNT(*) AS cnt FROM diemdanh WHERE MaHocVien = ? AND MaLopHoc = ?', [maHocVien, MaLopHoc]);
        const recordedSessions = attCountRows[0].cnt;
        const isSessionFinished = (recordedSessions >= tongSoBuoi && tongSoBuoi > 0) || (elapsedSessions >= tongSoBuoi) || (elapsedSessions >= finalSession);
        const hasGiuaKy = finalGiua !== null && finalGiua !== undefined && !isNaN(finalGiua);
        const hasCuoiKy = finalCuoi !== null && finalCuoi !== undefined && !isNaN(finalCuoi);

        if (isSessionFinished && hasGiuaKy && hasCuoiKy) {
          const [updateRes] = await pool.query(
            "UPDATE dangkyhoc SET TrangThai = 'Hoàn thành' WHERE MaHocVien = ? AND MaLopHoc = ? AND TrangThai IN ('Đang học', 'Thành công', 'Chờ thanh toán')",
            [maHocVien, MaLopHoc]
          );
          if (updateRes.affectedRows > 0) {
            autoCompletedCount++;

            // Gửi email thông báo tự động cho Học viên và Admin
            try {
              const [studentInfoRows] = await pool.query(
                `SELECT COALESCE(NULLIF(TRIM(hh.HoTen), ''), nd.HoTen) AS StudentName, nd.Email AS StudentEmail,
                        lh.TenLop, kh.TenKhoaHoc
                 FROM hosohocvien hh
                 JOIN nguoidung nd ON hh.MaNguoiDung = nd.MaNguoiDung
                 JOIN lophoc lh ON lh.MaLopHoc = ?
                 JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc
                 WHERE hh.MaHocVien = ?`,
                [MaLopHoc, maHocVien]
              );
              if (studentInfoRows.length > 0) {
                const sInfo = studentInfoRows[0];

                // 1. Gửi Email thông báo hoàn thành cho Học viên
                if (sInfo.StudentEmail) {
                  sendEnrollmentStatusMail({
                    to: sInfo.StudentEmail,
                    studentName: sInfo.StudentName,
                    className: sInfo.TenLop,
                    courseName: sInfo.TenKhoaHoc,
                    status: 'Hoàn thành'
                  }).catch(e => console.error('[MAIL STUDENT AUTO COMPLETE ERROR]', e));
                }

                // 2. Gửi Email thông báo báo cáo cho Admin
                const [adminRows] = await pool.query('SELECT Email FROM nguoidung WHERE MaVaiTro = 1 AND TrangThai = "Hoạt động"');
                const adminEmails = adminRows.map(a => a.Email).filter(Boolean);
                if (adminEmails.length > 0) {
                  const adminSubject = `[ANH NGỮ Y&V ADMIN] Thông báo: Học viên ${sInfo.StudentName} đã HOÀN THÀNH khóa học ${sInfo.TenLop}`;
                  const adminHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff;">
                      <div style="background: linear-gradient(135deg, #16a34a, #15803d); padding: 15px 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="color: #ffffff; margin: 0;">🎉 BÁO CÁO HOÀN THÀNH KHÓA HỌC (TỰ ĐỘNG)</h3>
                      </div>
                      <p style="font-size: 14px; color: #334155;">Hệ thống tự động cập nhật trạng thái học tập mới khi Giảng viên nhập điểm Cuối kỳ:</p>
                      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; border: 1px solid #e2e8f0;">
                        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0; width: 35%;">Học viên:</td><td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>${sInfo.StudentName}</strong></td></tr>
                        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Email:</td><td style="padding: 10px; border: 1px solid #e2e8f0;">${sInfo.StudentEmail}</td></tr>
                        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Lớp học:</td><td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>${sInfo.TenLop}</strong> (${sInfo.TenKhoaHoc})</td></tr>
                        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Điểm Giữa kỳ:</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #2563eb; font-weight: bold;">${finalGiua} / 990</td></tr>
                        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Điểm Cuối kỳ:</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #16a34a; font-weight: bold;">${finalCuoi} / 990</td></tr>
                        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Trạng thái mới:</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #16a34a; font-weight: bold;">Hoàn thành</td></tr>
                      </table>
                    </div>
                  `;
                  const { sendMail } = require('../utils/mailer');
                  adminEmails.forEach(email => {
                    sendMail(email, adminSubject, adminHtml).catch(e => console.error('[MAIL ADMIN AUTO COMPLETE ERROR]', e));
                  });
                }
              }
            } catch (mailErr) {
              console.error('[AUTO COMPLETE MAIL ERROR]', mailErr);
            }
          }
        }
      }

      let msg = 'Đã lưu thành công!';
      if (autoCompletedCount > 0) {
        msg = `Đã lưu thành công! Tự động cập nhật hoàn thành lớp học cho ${autoCompletedCount} học viên đủ điểm & nhận xét.`;
      }

      res.redirect(`/classes/dashboard?tab=grades&classId=${MaLopHoc}&success=${encodeURIComponent(msg)}`);
    } catch (err) {
      console.error('[SAVE GRADERS ERROR]', err);
      const classIdParam = MaLopHoc ? `&classId=${MaLopHoc}` : '';
      res.redirect(`/classes/dashboard?tab=grades${classIdParam}&error=${encodeURIComponent('Lỗi nhập điểm thi: ' + err.message)}`);
    }
  }

  static async createPracticeTest(req, res) {
    try {
      const user = req.session.user;
      if (!user || user.TenVaiTro !== 'Giảng viên') {
        return res.status(403).json({ success: false, message: 'Từ chối truy cập' });
      }

      const { TenDeThi, ThoiGianLamBai, LoaiDe, questions } = req.body;

      // Parse questions array. If questions is not present, init as empty array
      let parsedQuestions = [];
      if (questions) {
        parsedQuestions = Array.isArray(questions) ? questions : [questions];
      }

      // Check uploaded files and link them
      const files = req.files || [];

      // Create questions JSON structure
      const finalQuestions = parsedQuestions.map((q, idx) => {
        const qId = idx + 1;
        const partVal = parseInt(q.part || '1');

        let audioUrl = q.audio_url || null;
        let imageUrl = q.image_url || null;

        // Check if an audio file was uploaded for this question
        const audioFile = files.find(f => f.fieldname === `questions[${idx}][audio_file]`);
        if (audioFile) {
          audioUrl = `/uploads/${audioFile.filename}`;
        }

        // Check if an image file was uploaded for this question
        const imageFile = files.find(f => f.fieldname === `questions[${idx}][image_file]`);
        if (imageFile) {
          imageUrl = `/uploads/${imageFile.filename}`;
        }

        const options = [];
        if (partVal === 2) {
          options.push('A.', 'B.', 'C.');
        } else {
          options.push('A.', 'B.', 'C.', 'D.');
        }

        return {
          id: qId,
          part: partVal,
          question: q.question || (partVal === 1 ? 'Look at the picture and select the best statement.' : (partVal === 2 ? 'Listen and select the best response.' : 'Select the best option.')),
          options: options,
          answer: (q.answer || 'A').toUpperCase(),
          audio: audioUrl,
          image: imageUrl,
          passage: q.passage || null,
          explanation: q.explanation || null,
          script: q.script || null,
          recommendation: q.recommendation || null
        };
      });

      // Assemble whole test JSON
      const testJson = {
        title: TenDeThi,
        type: LoaiDe || 'Luyện đề',
        duration: parseInt(ThoiGianLamBai || '120'),
        audio: req.body.audio_url || null, // Header audio link
        questions: finalQuestions
      };

      // Header audio upload check
      const headerAudioFile = files.find(f => f.fieldname === 'audio_file');
      if (headerAudioFile) {
        testJson.audio = `/uploads/${headerAudioFile.filename}`;
      }

      // Save JSON file to public/json
      const fileName = `toeic_practice_${Date.now()}.json`;
      const jsonRelativePath = `json/${fileName}`;
      const jsonFullPath = path.join(__dirname, '../public', jsonRelativePath);

      fs.writeFileSync(jsonFullPath, JSON.stringify(testJson, null, 2), 'utf8');

      // Insert exam into baithi
      await pool.query(
        `INSERT INTO baithi (TenDeThi, ThoiGianLamBai, LoaiDe, DuongDanFileJSON, TrangThai) 
         VALUES (?, ?, ?, ?, 1)`,
        [TenDeThi, parseInt(ThoiGianLamBai || '120'), LoaiDe || 'Luyện đề', jsonRelativePath]
      );

      res.redirect(`/classes/dashboard?tab=practice&success=${encodeURIComponent('Tạo bài luyện tập thành công!')}`);
    } catch (err) {
      console.error(err);
      res.redirect(`/classes/dashboard?tab=practice&error=${encodeURIComponent('Lỗi tạo bài luyện tập.')}`);
    }
  }

  static async updateRegistrationStatus(req, res) {
    try {
      const user = req.session.user;
      if (!user || user.TenVaiTro !== 'Giảng viên') {
        return res.status(403).json({ success: false, message: 'Từ chối truy cập' });
      }

      const { MaDangKy, TrangThai } = req.body;
      if (!MaDangKy || !TrangThai) {
        return res.status(400).json({ success: false, message: 'Dữ liệu không đầy đủ' });
      }

      // RÀNG BUỘC CHẶT CHẼ ĐIỀU KIỆN HOÀN THÀNH KHÓA HỌC:
      // 1. Phải hoàn thành đúng/đạt số buổi của khóa học đó
      // 2. Phải có CẢ điểm Giữa kỳ, điểm Cuối kỳ VÀ Nhận xét của Giảng viên
      if (['Đã hoàn thành', 'Hoàn thành'].includes(TrangThai)) {
        const [regRow] = await pool.query(
          `SELECT dk.MaHocVien, dk.MaLopHoc, lh.TenLop, lh.NgayKhaiGiang, kh.MaKhoaHoc, kh.ThoiLuong
           FROM dangkyhoc dk
           JOIN lophoc lh ON dk.MaLopHoc = lh.MaLopHoc
           JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc
           WHERE dk.MaDangKy = ?`,
          [MaDangKy]
        );

        if (regRow.length > 0) {
          const { MaHocVien, MaLopHoc, MaKhoaHoc, ThoiLuong } = regRow[0];
          const totalSessions = Number(ThoiLuong || 26);

          const [schedules] = await pool.query(`SELECT ThuTrongTuan FROM thoikhoabieu WHERE MaLopHoc = ?`, [MaLopHoc]);
          const scheduleDays = [...new Set(schedules.map(s => s.ThuTrongTuan))];
          const elapsed = calculateElapsedSessions(regRow[0].NgayKhaiGiang, scheduleDays, totalSessions);

          const [gradeCheck] = await pool.query(
            `SELECT DiemGiuaKy, DiemCuoiKy, NhanXetGiangVien FROM quanlydiem WHERE MaHocVien = ? AND MaLopHoc = ?`,
            [MaHocVien, MaLopHoc]
          );

          const hasGiua = gradeCheck.length > 0 && gradeCheck[0].DiemGiuaKy !== null && gradeCheck[0].DiemGiuaKy !== undefined;
          const hasCuoi = gradeCheck.length > 0 && gradeCheck[0].DiemCuoiKy !== null && gradeCheck[0].DiemCuoiKy !== undefined;
          const hasNhanXet = gradeCheck.length > 0 && gradeCheck[0].NhanXetGiangVien && gradeCheck[0].NhanXetGiangVien.trim() !== '';

          // 1. Kiểm tra hoàn thành đủ số buổi của khóa
          if (elapsed < totalSessions) {
            return res.redirect(`/classes/dashboard?tab=attendance&classId=${MaLopHoc}&error=${encodeURIComponent(`Chưa đủ điều kiện hoàn thành: Lớp học chưa hoàn thành đủ số buổi của khóa học (${elapsed}/${totalSessions} buổi).`)}`);
          }

          // 2. Kiểm tra phải có cả điểm Giữa kỳ, Cuối kỳ và Nhận xét
          if (!hasGiua || !hasCuoi || !hasNhanXet) {
            const missing = [];
            if (!hasGiua) missing.push('Điểm Giữa kỳ');
            if (!hasCuoi) missing.push('Điểm Cuối kỳ');
            if (!hasNhanXet) missing.push('Nhận xét của Giảng viên');
            return res.redirect(`/classes/dashboard?tab=attendance&classId=${MaLopHoc}&error=${encodeURIComponent(`Chưa đủ điều kiện hoàn thành: Thiếu ${missing.join(', ')}.`)}`);
          }
        }
      }

      await pool.query(
        'UPDATE dangkyhoc SET TrangThai = ? WHERE MaDangKy = ?',
        [TrangThai, MaDangKy]
      );

      // Gửi mail thông báo tới học viên
      try {
        const [infoRows] = await pool.query(
          `SELECT nd.Email, hh.HoTen AS TenHocVien, l.TenLop, kh.TenKhoaHoc, d.GhiChu 
           FROM dangkyhoc d 
           JOIN lophoc l ON d.MaLopHoc = l.MaLopHoc 
           JOIN khoahoc kh ON l.MaKhoaHoc = kh.MaKhoaHoc 
           JOIN hosohocvien hh ON d.MaHocVien = hh.MaHocVien 
           JOIN nguoidung nd ON hh.MaNguoiDung = nd.MaNguoiDung 
           WHERE d.MaDangKy = ?`,
          [MaDangKy]
        );
        if (infoRows.length > 0 && infoRows[0].Email) {
          // Trích xuất lý do ngừng học từ GhiChu nếu có
          let reason = '';
          if (TrangThai === 'Ngừng học' && infoRows[0].GhiChu) {
            const ghiChuStr = infoRows[0].GhiChu.toString();
            // Trích xuất lý do từ format: "[GV/Admin ...] lý do..."
            const reasonMatch = ghiChuStr.match(/\]\s*(.+)$/);
            reason = reasonMatch ? reasonMatch[1] : ghiChuStr;
          }

          sendEnrollmentStatusMail({
            to: infoRows[0].Email,
            studentName: infoRows[0].TenHocVien,
            className: infoRows[0].TenLop,
            courseName: infoRows[0].TenKhoaHoc,
            status: TrangThai,
            reason: reason
          }).catch(mErr => console.error('Lỗi gửi mail cập nhật trạng thái:', mErr.message));
        }
      } catch (mailErr) {
        console.error('Lỗi gửi mail cập nhật trạng thái:', mailErr.message);
      }

      const [updatedReg] = await pool.query('SELECT MaLopHoc FROM dangkyhoc WHERE MaDangKy = ?', [MaDangKy]);
      const classIdParam = updatedReg.length > 0 ? `&classId=${updatedReg[0].MaLopHoc}` : '';

      res.redirect(`/classes/dashboard?tab=attendance${classIdParam}&success=${encodeURIComponent('Cập nhật trạng thái học viên thành công!')}`);
    } catch (err) {
      console.error(err);
      res.redirect(`/classes/dashboard?tab=attendance&error=${encodeURIComponent('Lỗi cập nhật trạng thái học viên.')}`);
    }
  }

  static async createVNPayPayment(req, res) {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      }

      let { MaDangKy, SoTien, MaKhuyenMai } = req.body;

      // Convert MaDangKy to array of numbers
      let ids = [];
      if (Array.isArray(MaDangKy)) {
        ids = MaDangKy.map(Number);
      } else if (typeof MaDangKy === 'string') {
        ids = MaDangKy.split(',').map(Number);
      } else if (typeof MaDangKy === 'number') {
        ids = [MaDangKy];
      }

      if (ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Không tìm thấy mã đăng ký.' });
      }

      // Verify registrations belong to student
      const [profiles] = await pool.query('SELECT MaHocVien FROM hosohocvien WHERE MaNguoiDung = ?', [user.MaNguoiDung]);
      if (profiles.length === 0) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ học viên' });
      }
      const maHocVien = profiles[0].MaHocVien;

      const [registrations] = await pool.query(
        `SELECT d.*, lh.NgayKhaiGiang, COALESCE(lh.HocPhi, kh.HocPhi) AS GocHocPhi 
         FROM dangkyhoc d
         JOIN lophoc lh ON d.MaLopHoc = lh.MaLopHoc
         JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc
         WHERE d.MaDangKy IN (?) AND d.MaHocVien = ?`,
        [ids, maHocVien]
      );
      if (registrations.length !== ids.length) {
        return res.status(403).json({ success: false, message: 'Một hoặc nhiều đơn đăng ký không hợp lệ.' });
      }

      // Calculate final fee on server
      let promoId = MaKhuyenMai ? parseInt(MaKhuyenMai) : null;
      let globalDiscountPct = 0;
      let promoCode = '';

      if (promoId) {
        const [promoRows] = await pool.query(
          'SELECT * FROM khuyenmai WHERE MaKhuyenMai = ? AND NOW() BETWEEN NgayBatDau AND NgayKetThuc',
          [promoId]
        );
        if (promoRows.length > 0) {
          const promo = promoRows[0];
          globalDiscountPct = parseFloat(promo.PhanTramGiam);
          promoCode = promo.MaCode;
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (promoCode === 'COMBO20') {
            if (registrations.length < 2) {
              return res.status(400).json({ success: false, message: 'Mã COMBO20 yêu cầu thanh toán đăng ký từ 2 lớp/khóa học trở lên.' });
            }
            const allValidComboDates = registrations.every(r => {
              const startDate = new Date(r.NgayKhaiGiang);
              startDate.setHours(0, 0, 0, 0);
              return Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) >= 10;
            });
            if (!allValidComboDates) {
              return res.status(400).json({ success: false, message: 'Mã COMBO20 yêu cầu TẤT CẢ các khóa học phải đăng ký trước ngày khai giảng tối thiểu 10 ngày.' });
            }
          }

          if (promoCode === 'FLASHSALE15') {
            const allValidFlashsaleDates = registrations.every(r => {
              const startDate = new Date(r.NgayKhaiGiang);
              startDate.setHours(0, 0, 0, 0);
              return Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) >= 10;
            });
            if (!allValidFlashsaleDates) {
              return res.status(400).json({ success: false, message: 'Mã FLASHSALE15 yêu cầu TẤT CẢ các khóa học phải đăng ký trước ngày khai giảng tối thiểu 10 ngày.' });
            }
          }
        }
      }

      // Update dangkyhoc statuses to 'Chờ duyệt' and insert/update giaodich to 'Chờ duyệt'
      const totalOrigFee = registrations.reduce((sum, r) => sum + Number(r.HocPhiDaGiam || 0), 0);
      const vnpTxnRef = `VNP_${ids.join('_')}_${Date.now()}`;
      const todayCalc = new Date();
      todayCalc.setHours(0, 0, 0, 0);

      for (const reg of registrations) {
        const ratio = totalOrigFee > 0 ? (Number(reg.HocPhiDaGiam || 0) / totalOrigFee) : (1 / registrations.length);
        const regPaidAmount = Math.round(SoTien * ratio);

        if (promoId) {
          let itemDiscountPct = 0;
          const startDate = new Date(reg.NgayKhaiGiang);
          startDate.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((startDate.getTime() - todayCalc.getTime()) / (1000 * 60 * 60 * 24));

          if (promoCode === 'FLASHSALE15' || promoCode === 'COMBO20') {
            if (diffDays >= 10) {
              itemDiscountPct = globalDiscountPct;
            }
          } else {
            itemDiscountPct = globalDiscountPct;
          }

          const originalFee = Number(reg.GocHocPhi || reg.HocPhiDaGiam || 0);
          const finalFee = originalFee - (originalFee * itemDiscountPct / 100);

          await pool.query(
            `UPDATE dangkyhoc SET MaKhuyenMai = ?, HocPhiDaGiam = ?, TrangThai = 'Chờ duyệt' WHERE MaDangKy = ?`,
            [promoId, finalFee, reg.MaDangKy]
          );
        } else {
          await pool.query(
            `UPDATE dangkyhoc SET TrangThai = 'Chờ duyệt' WHERE MaDangKy = ?`,
            [reg.MaDangKy]
          );
        }

        await pool.query(
          `INSERT INTO giaodich (MaDangKy, SoTien, NoiDungChuyenKhoan, TrangThai, NgayGiaoDich)
           VALUES (?, ?, ?, 'Chờ duyệt', NOW())`,
          [reg.MaDangKy, regPaidAmount, vnpTxnRef]
        );
      }

      // Generate VNPay URL
      const tmnCode = (process.env.VNP_TMNCODE || '2QXUIB0A').trim();
      const secretKey = (process.env.VNP_HASHSECRET || 'GETJDTYQA2VEF2964C3WGBNPYB7R9R5A').trim();
      let vnpUrl = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
      const returnUrl = process.env.VNP_RETURNURL || `http://${req.headers.host}/classes/vnpay-return`;

      let ipAddr = req.headers['x-forwarded-for'] ||
        (req.connection && req.connection.remoteAddress) ||
        (req.socket && req.socket.remoteAddress) ||
        (req.connection && req.connection.socket && req.connection.socket.remoteAddress) || '127.0.0.1';

      if (ipAddr.includes('::1') || ipAddr === '::') {
        ipAddr = '127.0.0.1';
      }
      if (ipAddr.startsWith('::ffff:')) {
        ipAddr = ipAddr.replace('::ffff:', '');
      }

      const date = new Date();
      const createDate = formatDate(date);

      let vnp_Params = {};
      vnp_Params['vnp_Version'] = '2.1.0';
      vnp_Params['vnp_Command'] = 'pay';
      vnp_Params['vnp_TmnCode'] = tmnCode;
      vnp_Params['vnp_Locale'] = 'vn';
      vnp_Params['vnp_CurrCode'] = 'VND';
      vnp_Params['vnp_TxnRef'] = vnpTxnRef;
      vnp_Params['vnp_OrderInfo'] = `Thanh toan hoc phi dang ky hoc ${ids.join('_')}`;
      vnp_Params['vnp_OrderType'] = 'other';
      vnp_Params['vnp_Amount'] = SoTien * 100;
      vnp_Params['vnp_ReturnUrl'] = returnUrl;
      vnp_Params['vnp_IpAddr'] = ipAddr;
      vnp_Params['vnp_CreateDate'] = createDate;

      // Sort and sign
      const sorted = sortObject(vnp_Params);
      const signData = Object.keys(sorted)
        .map(key => `${key}=${sorted[key]}`)
        .join('&');
      const crypto = require('crypto');
      const hmac = crypto.createHmac("sha512", secretKey);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

      const paymentUrl = `${vnpUrl}?${signData}&vnp_SecureHash=${signed}`;

      const fs = require('fs');
      fs.appendFileSync(
        path.join(__dirname, '../vnpay_debug.log'),
        JSON.stringify({
          timestamp: new Date().toISOString(),
          tmnCode,
          secretKey,
          vnp_Params,
          signData,
          signed,
          paymentUrl
        }, null, 2) + '\n\n'
      );

      console.log('=== VNPAY REQUEST PARAMS ===');
      console.log(vnp_Params);
      console.log('paymentUrl:', paymentUrl);
      console.log('============================');

      res.json({ success: true, paymentUrl });
    } catch (err) {
      console.error('VNPay payment creation error:', err);
      res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tạo giao dịch VNPay' });
    }
  }

  static async vnpayReturn(req, res) {
    try {
      let vnp_Params = req.query;
      const secureHash = vnp_Params['vnp_SecureHash'];

      delete vnp_Params['vnp_SecureHash'];
      delete vnp_Params['vnp_SecureHashType'];

      const sorted = sortObject(vnp_Params);
      const secretKey = (process.env.VNP_HASHSECRET || 'GETJDTYQA2VEF2964C3WGBNPYB7R9R5A').trim();

      const signData = Object.keys(sorted)
        .map(key => `${key}=${sorted[key]}`)
        .join('&');

      const crypto = require('crypto');
      const hmac = crypto.createHmac("sha512", secretKey);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

      if (secureHash === signed) {
        const responseCode = vnp_Params['vnp_ResponseCode'];
        const txnRef = vnp_Params['vnp_TxnRef'];
        const amount = Number(vnp_Params['vnp_Amount']) / 100;

        const match = txnRef.match(/^VNP_(.+?)_\d+$/);
        const regIdsStr = match ? match[1] : '';
        const regIds = regIdsStr.split('_').map(Number).filter(Boolean);

        if (responseCode === '00') {
          if (regIds.length > 0) {
            await pool.query(
              `UPDATE dangkyhoc SET TrangThai = 'Đang học' WHERE MaDangKy IN (?)`,
              [regIds]
            );

            await pool.query(
              `UPDATE giaodich SET TrangThai = 'Thành công' WHERE MaDangKy IN (?) AND NoiDungChuyenKhoan = ?`,
              [regIds, txnRef]
            );

            notifyAdminPaymentSuccess(regIds, {
              soTien: amount,
              noiDungChuyenKhoan: txnRef
            });

            const [hvRows] = await pool.query('SELECT DISTINCT MaHocVien FROM dangkyhoc WHERE MaDangKy IN (?)', [regIds]);
            for (const hv of hvRows) { await updateStudentProficiencyLevel(hv.MaHocVien); }
          }
          res.redirect('/classes/my-classes?success=' + encodeURIComponent('Thanh toán học phí thành công! Bạn đã trở thành Học viên chính thức.') + '&tab=overview');
        } else {
          if (regIds.length > 0) {
            await pool.query(
              `UPDATE dangkyhoc SET TrangThai = 'Đã hủy' WHERE MaDangKy IN (?)`,
              [regIds]
            );
            await pool.query(
              `UPDATE giaodich SET TrangThai = 'Thất bại' WHERE MaDangKy IN (?) AND NoiDungChuyenKhoan = ?`,
              [regIds, txnRef]
            );
          }
          res.redirect('/classes/my-classes?error=payment_failed&tab=overview');
        }
      } else {
        console.error('VNPay Signature Verification Failed');
        res.redirect('/classes/my-classes?error=invalid_signature&tab=overview');
      }
    } catch (err) {
      console.error('VNPay Return error:', err);
      const fs = require('fs');
      fs.writeFileSync(
        path.join(__dirname, '../vnpay_error.log'),
        `Timestamp: ${new Date().toISOString()}\nError: ${err.message}\nStack: ${err.stack}\n`
      );
      res.redirect('/classes/my-classes?error=system_error&tab=overview');
    }
  }

  static async vnpayIPN(req, res) {
    try {
      let vnp_Params = req.query;
      const secureHash = vnp_Params['vnp_SecureHash'];

      delete vnp_Params['vnp_SecureHash'];
      delete vnp_Params['vnp_SecureHashType'];

      const sorted = sortObject(vnp_Params);
      const secretKey = (process.env.VNP_HASHSECRET || 'GETJDTYQA2VEF2964C3WGBNPYB7R9R5A').trim();

      const signData = Object.keys(sorted)
        .map(key => `${key}=${sorted[key]}`)
        .join('&');

      const crypto = require('crypto');
      const hmac = crypto.createHmac("sha512", secretKey);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

      if (secureHash === signed) {
        const responseCode = vnp_Params['vnp_ResponseCode'];
        const txnRef = vnp_Params['vnp_TxnRef'];
        const amount = Number(vnp_Params['vnp_Amount']) / 100;

        const match = txnRef.match(/^VNP_(.+?)_\d+$/);
        const regIdsStr = match ? match[1] : '';
        const regIds = regIdsStr.split('_').map(Number).filter(Boolean);

        const [existing] = await pool.query(
          `SELECT TrangThai FROM dangkyhoc WHERE MaDangKy IN (?)`,
          [regIds]
        );
        const alreadyProcessed = existing.every(r => r.TrangThai === 'Đang học' || r.TrangThai === 'Thành công');

        if (!alreadyProcessed) {
          if (responseCode === '00') {
            if (regIds.length > 0) {
              await pool.query(
                `UPDATE dangkyhoc SET TrangThai = 'Đang học' WHERE MaDangKy IN (?)`,
                [regIds]
              );
              await pool.query(
                `UPDATE giaodich SET TrangThai = 'Thành công' WHERE MaDangKy IN (?) AND NoiDungChuyenKhoan = ?`,
                [regIds, txnRef]
              );
              notifyAdminPaymentSuccess(regIds, {
                soTien: amount,
                noiDungChuyenKhoan: txnRef
              });

              const [hvRows] = await pool.query('SELECT DISTINCT MaHocVien FROM dangkyhoc WHERE MaDangKy IN (?)', [regIds]);
              for (const hv of hvRows) { await updateStudentProficiencyLevel(hv.MaHocVien); }
            }
          } else {
            if (regIds.length > 0) {
              await pool.query(
                `UPDATE dangkyhoc SET TrangThai = 'Đã hủy' WHERE MaDangKy IN (?)`,
                [regIds]
              );
              await pool.query(
                `UPDATE giaodich SET TrangThai = 'Thất bại' WHERE MaDangKy IN (?) AND NoiDungChuyenKhoan = ?`,
                [regIds, txnRef]
              );
            }
          }
        }
        res.status(200).json({ RspCode: '00', Message: 'Success' });
      } else {
        res.status(200).json({ RspCode: '97', Message: 'Fail checksum' });
      }
    } catch (err) {
      console.error('VNPay IPN error:', err);
      res.status(200).json({ RspCode: '99', Message: 'Error' });
    }
  }

  static async updateTeacherProfile(req, res) {
    try {
      const user = req.session.user;
      if (!user || user.TenVaiTro !== 'Giảng viên') {
        return res.status(403).json({ success: false, message: 'Từ chối truy cập' });
      }

      const { HoTen, SoDienThoai, NgaySinh, DiaChi, HocVi, ChungChiNgoaiNgu, KinhNghiem } = req.body;

      // Update nguoidung
      await pool.query(
        'UPDATE nguoidung SET HoTen = ?, SoDienThoai = ? WHERE MaNguoiDung = ?',
        [HoTen ? HoTen.trim() : user.HoTen, SoDienThoai ? SoDienThoai.trim() : user.SoDienThoai, user.MaNguoiDung]
      );

      // Update hosonhansu
      const dob = NgaySinh ? NgaySinh : null;
      await pool.query(
        'UPDATE hosonhansu SET NgaySinh = ?, DiaChi = ?, HocVi = ?, ChungChiNgoaiNgu = ?, KinhNghiem = ? WHERE MaNguoiDung = ?',
        [dob, DiaChi ? DiaChi.trim() : '', HocVi ? HocVi.trim() : '', ChungChiNgoaiNgu ? ChungChiNgoaiNgu.trim() : '', KinhNghiem ? KinhNghiem.trim() : '', user.MaNguoiDung]
      );

      req.session.user.HoTen = HoTen ? HoTen.trim() : user.HoTen;
      req.session.user.SoDienThoai = SoDienThoai ? SoDienThoai.trim() : user.SoDienThoai;

      res.redirect('/classes/dashboard?tab=profile&success=' + encodeURIComponent('Cập nhật thông tin hồ sơ giảng viên thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/classes/dashboard?tab=profile&error=' + encodeURIComponent('Lỗi máy chủ khi cập nhật hồ sơ.'));
    }
  }

  static async deleteRegistration(req, res) {
    try {
      const registrationId = req.params.id;
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập.' });
      }

      // Kiểm tra bản ghi đăng ký có thuộc về user này không
      const [regRow] = await pool.query(
        `SELECT dk.MaLopHoc, dk.TrangThai FROM dangkyhoc dk
         WHERE dk.MaDangKy = ? 
           AND (dk.MaNguoiDangKy = ? OR dk.MaHocVien IN (SELECT MaHocVien FROM hosohocvien WHERE MaNguoiDung = ?))`,
        [registrationId, user.MaNguoiDung, user.MaNguoiDung]
      );

      if (regRow.length === 0) {
        return res.status(400).json({ success: false, message: 'Không tìm thấy đăng ký lớp học này.' });
      }

      // Không cho xóa nếu đã kích hoạt
      const status = regRow[0].TrangThai;
      if (['Thành công', 'Đang học', 'Hoàn thành'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Không thể xóa lớp học đã được kích hoạt.' });
      }

      // Xóa giao dịch liên quan trước (tránh lỗi khóa ngoại)
      await pool.query('DELETE FROM giaodich WHERE MaDangKy = ?', [registrationId]);

      // Xóa hoàn toàn bản ghi khỏi CSDL để không còn hiển thị trên bảng
      const [result] = await pool.query('DELETE FROM dangkyhoc WHERE MaDangKy = ?', [registrationId]);

      // Xóa khỏi giỏ hàng session
      if (req.session.cart) {
        const classId = regRow[0].MaLopHoc;
        req.session.cart = req.session.cart.filter(item => item.MaLopHoc != classId);
      }

      if (result.affectedRows > 0) {
        return res.json({ success: true, message: 'Đã xóa đăng ký lớp học thành công!' });
      } else {
        return res.status(400).json({ success: false, message: 'Không thể xóa đăng ký lớp học này.' });
      }
    } catch (err) {
      console.error('deleteRegistration error:', err);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa đăng ký.' });
    }
  }

  static async studentRequestTransfer(req, res) {
    try {
      const user = req.session.user;
      if (!user) {
        return res.redirect('/login');
      }

      const { MaDangKy, MaLopHocMoi, LyDoXinChuyenLop } = req.body;

      if (!MaDangKy) {
        return res.redirect('/classes/my-classes?error=' + encodeURIComponent('Không tìm thấy thông tin đơn đăng ký!') + '&tab=overview');
      }

      // 1. Kiểm tra đơn đăng ký thuộc về người dùng
      const [enrollRows] = await pool.query(
        `SELECT d.*, l.TenLop AS TenLopCu, l.HocPhi AS HocPhiCu, d.MaHocVien,
                COALESCE(NULLIF(TRIM(h.HoTen), ''), u.HoTen) AS TenHocVien, u.SoDienThoai
         FROM dangkyhoc d
         JOIN lophoc l ON d.MaLopHoc = l.MaLopHoc
         JOIN hosohocvien h ON d.MaHocVien = h.MaHocVien
         JOIN nguoidung u ON h.MaNguoiDung = u.MaNguoiDung
         WHERE d.MaDangKy = ? AND (d.MaNguoiDangKy = ? OR h.MaNguoiDung = ?)`,
        [MaDangKy, user.MaNguoiDung, user.MaNguoiDung]
      );

      if (enrollRows.length === 0) {
        return res.redirect('/classes/my-classes?error=' + encodeURIComponent('Phiếu đăng ký không thuộc tài khoản của bạn!') + '&tab=overview');
      }

      const enroll = enrollRows[0];

      // 2. Ràng buộc số lần xin chuyển lớp (Tối đa 2 lần) dựa trên lịch sử đăng ký của học viên
      const [transferCountRows] = await pool.query(
        `SELECT COUNT(*) AS count 
         FROM dangkyhoc 
         WHERE MaHocVien = ? 
           AND (TrangThai = 'Đã chuyển lớp' 
                OR TrangThai = 'Chờ xử lý - Xin chuyển lớp' 
                OR GhiChu LIKE '%Đã chuyển sang%' 
                OR GhiChu LIKE '%Chuyển từ lớp%'
                OR GhiChu LIKE '%Xin chuyển lớp%')`,
        [enroll.MaHocVien]
      );
      const currentTransferCount = transferCountRows[0] ? transferCountRows[0].count : 0;

      if (currentTransferCount >= 2) {
        return res.redirect('/classes/my-classes?error=' + encodeURIComponent('Học viên đã đạt giới hạn chuyển lớp tối đa (2/2 lần)! Không thể gửi thêm phiếu yêu cầu.') + '&tab=overview');
      }

      let newClassName = 'Bảo lưu kết quả chờ đợt lớp mới';
      let feeDiff = 0;

      if (MaLopHocMoi && MaLopHocMoi !== 'BAO_LUU') {
        const [newClsRows] = await pool.query('SELECT TenLop, HocPhi FROM lophoc WHERE MaLopHoc = ?', [MaLopHocMoi]);
        if (newClsRows.length > 0) {
          newClassName = newClsRows[0].TenLop;
          const oldFee = Number(enroll.HocPhiDaGiam || enroll.HocPhiCu || 0);
          const newFee = Number(newClsRows[0].HocPhi || 0);
          feeDiff = Math.max(0, newFee - oldFee);
        }
      }

      const reasonStr = LyDoXinChuyenLop ? LyDoXinChuyenLop.trim() : 'Chuyển đổi ca học / lớp học';
      const targetClassInfo = (MaLopHocMoi === 'BAO_LUU' || !MaLopHocMoi) ? 'Bảo lưu' : `Mã #${MaLopHocMoi} (${newClassName})`;
      const noteStr = `[Xin chuyển lớp -> ${targetClassInfo}] Lý do: ${reasonStr}`;

      // 3. Đếm số buổi đã học ở lớp cũ
      const [attRows] = await pool.query(
        "SELECT COUNT(*) AS cnt FROM diemdanh WHERE MaHocVien = ? AND MaLopHoc = ?",
        [enroll.MaHocVien, enroll.MaLopHoc]
      );
      const sessionsPassed = attRows[0].cnt;

      // 4. Cập nhật trạng thái đơn sang 'Chờ xử lý - Xin chuyển lớp' (Giữ nguyên MaLopHoc cũ)
      await pool.query(
        `UPDATE dangkyhoc 
         SET TrangThai = 'Chờ xử lý - Xin chuyển lớp', 
             GhiChu = ? 
         WHERE MaDangKy = ?`,
        [noteStr, MaDangKy]
      );

      // 5. Gửi EMAIL THÔNG BÁO TỚI ADMIN (yenvy27104@gmail.com)
      try {
        const { sendStudentTransferRequestMailToAdmin } = require('../utils/mailer');
        sendStudentTransferRequestMailToAdmin({
          studentName: enroll.TenHocVien,
          studentPhone: enroll.SoDienThoai || '',
          oldClassName: enroll.TenLopCu,
          newClassName,
          reason: reasonStr,
          totalSessionsPassed: sessionsPassed,
          feeDiff
        }).catch(mErr => console.error('[MAIL ADMIN TRANSFER REQUEST ERROR]', mErr.message));
      } catch (mailErr) {
        console.error('[MAIL ADMIN TRANSFER REQUEST EXCEPTION]', mailErr.message);
      }

      res.redirect('/classes/my-classes?success=' + encodeURIComponent('Đã gửi phiếu xin chuyển lớp thành công! Phiếu của bạn đã được chuyển tới Ban Quản Lý Admin để xem xét và duyệt.') + '&tab=overview');
    } catch (err) {
      console.error('[STUDENT REQUEST TRANSFER ERROR]', err);
      res.redirect('/classes/my-classes?error=' + encodeURIComponent('Có lỗi xảy ra khi gửi phiếu xin chuyển lớp: ' + err.message) + '&tab=overview');
    }
  }
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}${min}${ss}`;
}

function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      str.push(key);
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[encodeURIComponent(str[key])] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

module.exports = ClassController;