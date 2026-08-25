/**
 * ============================================================================
 * BỘ ĐIỀU KHIỂN QUẢN TRỊ VIÊN (ADMIN CONTROLLER)
 * ============================================================================
 * Đảm nhận toàn bộ nghiệp vụ quản trị trung tâm:
 * - Bảng điều khiển tổng quan (Dashboard thống kê doanh thu, sĩ số, biểu đồ).
 * - Quản lý Khóa học & Lộ trình đề xuất.
 * - Quản lý Lớp học, Phòng học, Ca học & Thời khóa biểu.
 * - Quản lý Tài khoản, Hồ sơ Nhân sự (Giảng viên) & Hồ sơ Học viên.
 * - Quản lý Chương trình khuyến mãi, Tin tức & Ngân hàng Đề thi JSON.
 */

const pool = require('../models/db');
const bcrypt = require('bcryptjs');
const { notifyAdminPaymentSuccess } = require('../utils/paymentNotification');
const { updateStudentProficiencyLevel } = require('../utils/scoreCalc');
const { isVietnamHolidayOrCompensatory } = require('../utils/vietnamHolidays');
const { sendClassTransferApprovedMail, sendClassTransferRejectedMail, sendEnrollmentStatusMail, sendFutureClassAssignedMail } = require('../utils/mailer');

function validateCourseNameAndLevel(tenKhoaHoc, capDo) {
  const nameLower = (tenKhoaHoc || '').toLowerCase();

  // BẮT LỖI NGHIỆP VỤ 1: Chặn các môn học thuần phổ thông (Toán, Lý, Hóa, Tin...) nếu không tích hợp Tiếng Anh
  const hasNonEnglishSubject = /(toán|toan|vật lý|vat ly|hóa học|hoa hoc|tin học|tin hoc|ngữ văn|ngu van|lịch sử|lich su|địa lý|dia ly|sinh học|sinh hoc)/i.test(nameLower);
  const hasEnglishContext = /(tiếng anh|tieng anh|english|math in english|maths)/i.test(nameLower);
  if (hasNonEnglishSubject && !hasEnglishContext) {
    return `Lỗi nghiệp vụ: Tên khóa học "${tenKhoaHoc}" chứa môn học thuần phổ thông. Trung tâm Ngoại ngữ chỉ chấp nhận các khóa học Tiếng Anh hoặc môn học tích hợp Tiếng Anh (ví dụ: Toán Tiếng Anh / Math in English).`;
  }

  // BẮT LỖI NGHIỆP VỤ 2: Chỉ cho phép tạo các khóa học liên quan đến Anh ngữ / Tiếng Anh
  const isEnglishCourse = /(toeic|ielts|toefl|vstep|aptis|cefr|\bc1\b|\bc2\b|\bb1\b|\bb2\b|\ba1\b|\ba2\b|fce|cae|ket|pet|cpe|english|tiếng anh|anh văn|pre|foundation|luyện|luyen|giải đề|giai de|cấp tốc|cap toc|bứt tốc|giao tiếp|giao tiep)/i.test(nameLower);
  if (!isEnglishCourse) {
    return `Lỗi: Hệ thống Trung tâm Ngoại ngữ chỉ cho phép khởi tạo các khóa học Tiếng Anh! (Tên khóa học "${tenKhoaHoc}" không thuộc chương trình Anh ngữ).`;
  }

  const isCapToc = nameLower.includes('cấp tốc') || nameLower.includes('cap toc') || nameLower.includes('bứt tốc');
  const isLuyenDe = nameLower.includes('luyện đề') || nameLower.includes('luyen de') || nameLower.includes('giải đề') || nameLower.includes('giai de');

  if (isCapToc && capDo !== 'Cấp tốc') {
    return `Lỗi ràng buộc: Tên khóa học "${tenKhoaHoc}" chứa từ khóa Cấp tốc, bắt buộc phải chọn Cấp độ "Khóa Intensive (Tăng tốc ngắn hạn)" (hiện đang chọn "${capDo}").`;
  }

  if (isLuyenDe && !isCapToc && capDo !== 'Luyện đề') {
    return `Lỗi ràng buộc: Tên khóa học "${tenKhoaHoc}" chứa từ khóa Luyện đề, bắt buộc phải chọn Cấp độ "Khóa Mastery (Thực chiến / Giải đề)" (hiện đang chọn "${capDo}").`;
  }

  const isToeicC = /\btoeic\s+c(?![a-zA-Zàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệđìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ])/i.test(nameLower);
  const isToeicB = /\btoeic\s+b(?![a-zA-Zàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệđìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ])/i.test(nameLower);
  const isToeicA = /\btoeic\s+a(?![a-zA-Zàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệđìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ])/i.test(nameLower);

  // Rule 1: Foundation keywords (Pre, 300, Căn bản, Mất gốc, A1, Breakthrough, Nền tảng)
  const foundationKeywords = ['pre', '300', 'căn bản', 'mất gốc', 'a1', 'breakthrough', 'nền tảng'];
  const isFoundation = !isCapToc && !isLuyenDe && foundationKeywords.some(kw => nameLower.includes(kw));

  // Rule 2: 850+ keywords (TOEIC C, C1, Advanced, 700-800, 800, 850, 900, Cao cấp)
  const level850Keywords = ['c1', 'advanced', '700-800', '800', '850', '900', 'cao cấp'];
  const is850 = !isCapToc && !isLuyenDe && (isToeicC || level850Keywords.some(kw => nameLower.includes(kw)));

  // Rule 3: 650+ keywords (TOEIC B, 600, 650, B2, 550-650, Trung cấp)
  const level650Keywords = ['600', '650', '550-650', 'b2', 'trung cấp'];
  const is650 = !isCapToc && !isLuyenDe && (isToeicB || level650Keywords.some(kw => nameLower.includes(kw)));

  // Rule 4: 450+ keywords (TOEIC A, 450, 500, 450-500, Sơ cấp, B1)
  const level450Keywords = ['450', '500', '450-500', 'sơ cấp', 'b1'];
  const is450 = !isCapToc && !isLuyenDe && (isToeicA || level450Keywords.some(kw => nameLower.includes(kw)));

  if (isFoundation && capDo !== 'Foundation') {
    return `Lỗi ràng buộc: Tên khóa học "${tenKhoaHoc}" chứa từ khóa căn bản (Pre/300+/Mất gốc/A1), bắt buộc phải thuộc Cấp độ "Foundation" (hiện chọn "${capDo}").`;
  }
  if (is850 && capDo !== '850+' && capDo !== 'Advanced' && capDo !== '800+') {
    return `Lỗi ràng buộc: Tên khóa học "${tenKhoaHoc}" chứa từ khóa cao cấp (TOEIC C/C1/Advanced/850+/900+), bắt buộc phải thuộc Cấp độ "850+" (hiện chọn "${capDo}").`;
  }
  if (is650 && capDo !== '650+') {
    return `Lỗi ràng buộc: Tên khóa học "${tenKhoaHoc}" chứa từ khóa trung cao cấp (TOEIC B/600/650/B2), bắt buộc phải thuộc Cấp độ "650+" (hiện chọn "${capDo}").`;
  }
  if (is450 && capDo !== '450+') {
    return `Lỗi ràng buộc: Tên khóa học "${tenKhoaHoc}" chứa từ khóa trung cấp (TOEIC A/450/500/B1), bắt buộc phải thuộc Cấp độ "450+" (hiện chọn "${capDo}").`;
  }

  return null;
}

function validateCourseDurationMatrix(tenKhoaHoc, capDo, thoiLuong) {
  const numSessions = Number(thoiLuong);
  const nameLower = (tenKhoaHoc || '').toLowerCase();

  // RÀNG BUỘC CỐT LÕI: Thời lượng của TẤT CẢ các khóa học PHẢI TỪ 12 ĐẾN 40 BUỔI
  if (isNaN(numSessions) || numSessions < 12 || numSessions > 40) {
    return `Lỗi ràng buộc thời lượng: Thời lượng khóa học quy định trong khoảng từ 12 đến 40 buổi (Bạn đang nhập ${thoiLuong} buổi). Vui lòng nhập số buổi hợp lệ từ 12 đến 40 buổi.`;
  }

  // Rule 2: Chặn "Luyện đề" lê thê (10 - 15 buổi, max 20 buổi)
  if (capDo === 'Luyện đề' || nameLower.includes('luyện đề') || nameLower.includes('luyen de')) {
    if (numSessions > 20) {
      return `Lỗi ràng buộc: Khóa luyện đề chỉ nên dao động từ 10 - 15 buổi để đảm bảo độ nhạy của học viên (không được vượt quá 20 buổi, bạn đang nhập ${thoiLuong} buổi).`;
    }
    if (numSessions < 10) {
      return `Lỗi: Khóa luyện đề phải có ít nhất 10 buổi học (bạn đang nhập ${thoiLuong} buổi).`;
    }
  }

  // Rule 1: Cấp tốc (10 - 26 buổi)
  if (nameLower.includes('cấp tốc') || nameLower.includes('cap toc') || nameLower.startsWith('ct') || capDo === 'Cấp tốc') {
    if (numSessions < 10 || numSessions > 26) {
      return `Lỗi ràng buộc: Khóa học Cấp tốc quy định tổng thời lượng từ 10 đến 26 buổi (bạn đang nhập ${thoiLuong} buổi).`;
    }
  }

  return null;
}

function getCourseTargetBounds(capDo, tenKhoaHoc) {
  const cap = (capDo || '').trim();
  const nameLower = (tenKhoaHoc || '').toLowerCase();

  // 1. Lớp Pre-TOEIC (Nền tảng) - Cấp độ 1: Beginner (A1)
  if (cap === 'Foundation' || cap.includes('A1') || cap.includes('Beginner') || nameLower.includes('pre') || nameLower.includes('mất gốc') || nameLower.includes('nền tảng')) {
    return {
      courseName: 'Pre-TOEIC (Nền tảng)',
      levelRef: 'Cấp độ 1: Beginner (A1)',
      minStart: 0,
      maxStart: 250,
      minEnd: 300,
      maxEnd: 350,
      focus: 'Lấy lại gốc ngữ pháp, xây dựng từ vựng căn bản và chuẩn hóa phát âm.'
    };
  }

  // 2. Lớp TOEIC A (Sơ cấp) - Cấp độ 2: Pre-Intermediate (A2)
  if (cap === '450+' || cap.includes('A2') || cap.includes('Pre-Intermediate') || nameLower.includes('toeic a') || (nameLower.includes('sơ cấp') && !nameLower.includes('cấp tốc'))) {
    return {
      courseName: 'TOEIC A (Sơ cấp)',
      levelRef: 'Cấp độ 2: Pre-Intermediate (A2)',
      minStart: 300,
      maxStart: 350,
      minEnd: 450,
      maxEnd: 500,
      focus: 'Làm quen cấu trúc đề thi. Nắm vững mẹo làm phần nghe dễ (Part 1, 2) và cấu trúc ngữ pháp Part 5.'
    };
  }

  // 3. Lớp TOEIC B (Trung cấp) - Cấp độ 3: Intermediate (B1)
  if (cap === '650+' || cap.includes('B1') || cap.includes('Intermediate') || nameLower.includes('toeic b') || (nameLower.includes('trung cấp') && !nameLower.includes('cấp tốc'))) {
    return {
      courseName: 'TOEIC B (Trung cấp)',
      levelRef: 'Cấp độ 3: Intermediate (B1)',
      minStart: 450,
      maxStart: 500,
      minEnd: 550,
      maxEnd: 650,
      focus: 'Phát triển kỹ năng nghe bắt từ khóa đoạn hội thoại (Part 3, 4) và đọc hiểu văn bản dài (Part 6, 7).'
    };
  }

  // 4. Lớp TOEIC C (Cao cấp) - Cấp độ 4: Upper-Intermediate (B2)
  if (cap === '850+' || cap === '800+' || cap.includes('B2') || cap.includes('Upper-Intermediate') || nameLower.includes('toeic c') || nameLower.includes('cao cấp')) {
    return {
      courseName: 'TOEIC C (Cao cấp)',
      levelRef: 'Cấp độ 4: Upper-Intermediate (B2)',
      minStart: 550,
      maxStart: 650,
      minEnd: 700,
      maxEnd: 850,
      focus: 'Xử lý bẫy ngữ pháp khó, mở rộng từ vựng chuyên sâu về kinh tế và tối ưu hóa thời gian làm bài.'
    };
  }

  // 5. Lớp TOEIC Cấp tốc - Khóa Intensive (Tăng tốc ngắn hạn)
  if (cap === 'Cấp tốc' || cap.includes('Intensive') || nameLower.includes('cấp tốc') || nameLower.includes('cap toc') || nameLower.includes('bứt tốc')) {
    return {
      courseName: 'TOEIC Cấp tốc',
      levelRef: 'Khóa Intensive (Tăng tốc ngắn hạn)',
      minStart: 400,
      maxStart: 450,
      minEnd: 500,
      maxEnd: 700,
      focus: 'Học cường độ cao. Tổng ôn kiến thức cốt lõi và luyện kỹ năng quét nhanh các dạng bài.'
    };
  }

  // 6. Lớp Luyện đề - Khóa Mastery (Thực chiến / Giải đề)
  if (cap === 'Luyện đề' || cap.includes('Mastery') || nameLower.includes('luyện đề')) {
    return {
      courseName: 'Lớp Luyện đề',
      levelRef: 'Khóa Mastery (Thực chiến / Giải đề)',
      minStart: 500,
      maxStart: 550,
      minEnd: 650,
      maxEnd: 990,
      focus: 'Thực hành giải đề liên tục dưới áp lực thời gian thực, chữa chi tiết lỗi sai và tối ưu chiến thuật phòng thi.'
    };
  }

  return null;
}

function getCourseOutputScore(capDo, tenKhoaHoc) {
  const bounds = getCourseTargetBounds(capDo, tenKhoaHoc);
  if (bounds) return bounds.maxEnd;
  return 990;
}

function validateRoadmapCourseCompatibility(typeStr, capDo, tenKhoaHoc) {
  const type = (typeStr || 'Tiêu chuẩn').trim();
  const bounds = getCourseTargetBounds(capDo, tenKhoaHoc);

  if (type === 'Mất gốc') {
    if (!bounds || bounds.courseName !== 'Pre-TOEIC (Nền tảng)') {
      return `Lỗi tương thích: Lộ trình loại 'Mất gốc' bắt buộc phải chọn các khóa học nền tảng/Pre-TOEIC (0-250 -> 300-350 điểm). Bạn đang chọn khóa '${tenKhoaHoc}'.`;
    }
  }

  if (type === 'Cấp tốc') {
    if (bounds && bounds.courseName === 'Pre-TOEIC (Nền tảng)') {
      return `Lỗi tương thích: Lộ trình loại 'Cấp tốc' bắt buộc chọn các khóa học Cấp tốc, Luyện đề hoặc các khóa bứt đệm ngắn (Yêu cầu đầu vào từ 400-450+ điểm). Không chọn khóa Pre-TOEIC học thong thả.`;
    }
  }

  return null;
}

async function syncRoadmapCodesHelper() {
  function getRoadmapPrefix(typeStr) {
    const type = (typeStr || 'Tiêu chuẩn').trim();
    if (type === 'Tiêu chuẩn') return 'LTR_TC';
    if (type === 'Cấp tốc') return 'LTR_CT';
    if (type === 'Mất gốc') return 'LTR_MG';
    return 'LTR_' + type.split(/\s+/).map(w => w.charAt(0).toUpperCase()).join('');
  }
  const [allRoadmaps] = await pool.query(
    "SELECT * FROM lotrinh_dexuat WHERE (is_active = 1 OR is_active IS NULL) ORDER BY DiemTu ASC, MaLoTrinh ASC"
  );
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
}

function validateClassMatrixConstraints(tenLop, loaiLop, soBuoiHoc, ngayKhaiGiang, ngayKetThuc, capDoKhoaHoc, tenKhoaHoc) {
  const nameUpper = (tenLop || '').trim().toUpperCase();
  const courseUpper = (tenKhoaHoc || '').trim().toUpperCase();

  // 1. RÀNG BUỘC KHÓA HỌC CHUẨN XÁC THEO TÊN/MÃ LỚP HỌC
  if (nameUpper.startsWith('C_') || /^C\d+/.test(nameUpper)) {
    const isMatched = courseUpper.includes('TOEIC C') || courseUpper.includes('700') || courseUpper.includes('800');
    if (!isMatched) {
      return `Lỗi Khóa học: Lớp "${tenLop}" là lớp thuộc chương trình TOEIC C. Không thể chọn khóa học "${tenKhoaHoc}"! Vui lòng chọn đúng khóa TOEIC C.`;
    }
  } else if (nameUpper.startsWith('B_') || /^B\d+/.test(nameUpper)) {
    const isMatched = courseUpper.includes('TOEIC B') || courseUpper.includes('650') || courseUpper.includes('600');
    if (!isMatched) {
      return `Lỗi Khóa học: Lớp "${tenLop}" là lớp thuộc chương trình TOEIC B. Không thể chọn khóa học "${tenKhoaHoc}"! Vui lòng chọn đúng khóa TOEIC B.`;
    }
  } else if (nameUpper.startsWith('A_') || /^A\d+/.test(nameUpper)) {
    const isMatched = courseUpper.includes('TOEIC A') || courseUpper.includes('450') || courseUpper.includes('500');
    if (!isMatched) {
      return `Lỗi Khóa học: Lớp "${tenLop}" là lớp thuộc chương trình TOEIC A. Không thể chọn khóa học "${tenKhoaHoc}"! Vui lòng chọn đúng khóa TOEIC A.`;
    }
  } else if (nameUpper.startsWith('PRE_') || /^PRE\d+/.test(nameUpper)) {
    const isMatched = courseUpper.includes('PRE') || courseUpper.includes('300');
    if (!isMatched) {
      return `Lỗi Khóa học: Lớp "${tenLop}" là lớp thuộc chương trình TOEIC Pre. Không thể chọn khóa học "${tenKhoaHoc}"! Vui lòng chọn đúng khóa TOEIC Pre.`;
    }
  } else if (nameUpper.startsWith('CT_') || /^CT\d+/.test(nameUpper)) {
    const isMatched = courseUpper.includes('CẤP TỐC') || courseUpper.includes('FAST');
    if (!isMatched) {
      return `Lỗi Khóa học: Lớp "${tenLop}" là lớp Cấp tốc (CT). Không thể chọn khóa học "${tenKhoaHoc}"! Vui lòng chọn đúng khóa Cấp tốc.`;
    }
  } else if (nameUpper.startsWith('DE_') || /^DE\d+/.test(nameUpper)) {
    const isMatched = courseUpper.includes('LUYỆN ĐỀ') || courseUpper.includes('LUYEN DE');
    if (!isMatched) {
      return `Lỗi Khóa học: Lớp "${tenLop}" là lớp Luyện đề (DE). Không thể chọn khóa học "${tenKhoaHoc}"! Vui lòng chọn đúng khóa Luyện đề.`;
    }
  }

  // 2. RÀNG BUỘC CHẶN CHỌN SAI LOẠI LỚP HỌC VỚI KHÓA HỌC
  const isCapTocCourse = courseUpper.includes('CẤP TỐC') || nameUpper.startsWith('CT_');
  if (isCapTocCourse && loaiLop === 'Tiêu chuẩn') {
    return `Lỗi Loại lớp học: Khóa học "${tenKhoaHoc}" là khóa Cấp tốc. Không được chọn Loại lớp học là "Tiêu chuẩn"! Vui lòng giữ đúng Loại lớp "Cấp tốc".`;
  }
  if (!isCapTocCourse && loaiLop === 'Cấp tốc') {
    return `Lỗi Loại lớp học: Khóa học "${tenKhoaHoc}" là khóa Tiêu chuẩn. Không được chọn Loại lớp học là "Cấp tốc"! Vui lòng chọn Loại lớp "Tiêu chuẩn".`;
  }

  const isCapToc = loaiLop === 'Cấp tốc' || isCapTocCourse;
  const isLuyenDe = (capDoKhoaHoc === 'Luyện đề' || courseUpper.includes('LUYỆN ĐỀ')) && loaiLop === 'Luyện đề';

  // Kiểm tra số buổi học dành riêng cho khóa Cấp tốc
  if (isCapToc) {
    if (soBuoiHoc < 10 || soBuoiHoc > 30) {
      return `Lỗi Số buổi học: Khóa Cấp tốc yêu cầu từ 10 đến 30 buổi (hiện tại lớp đang chọn ${soBuoiHoc} buổi).`;
    }
    if (ngayKhaiGiang && ngayKetThuc) {
      const start = new Date(ngayKhaiGiang);
      const end = new Date(ngayKetThuc);
      const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (diffDays > 60) {
        return `Lỗi Thời gian học: Khóa cấp tốc không được kéo dài quá 60 ngày (~2 tháng). Vui lòng kiểm tra lại Ngày khai giảng và Lịch học!`;
      }
    }
  }

  // Kiểm tra số buổi học dành riêng cho khóa Luyện đề
  if (isLuyenDe) {
    if (soBuoiHoc > 30) {
      return `Lỗi Số buổi học: Khóa luyện đề tối đa 30 buổi (hiện tại lớp đang chọn ${soBuoiHoc} buổi).`;
    }
  }

  return null;
}

class AdminController {
  // 1. Hiển thị Trang quản trị (Dashboard) chính với đầy đủ dữ liệu và thống kê
  // 1. Hiển thị Trang quản trị (Dashboard) chính với đầy đủ dữ liệu và thống kê
  static async showDashboard(req, res) {
    const activeTab = req.query.tab || 'overview';
    const successMsg = req.query.success || null;
    const errorMsg = req.query.error || null;
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';

    try {
      // Lấy danh sách Vai trò
      const [roles] = await pool.query('SELECT * FROM vaitro');

      // Lấy danh sách Người dùng
      const [users] = await pool.query(`
        SELECT u.*, r.TenVaiTro 
        FROM nguoidung u
        JOIN vaitro r ON u.MaVaiTro = r.MaVaiTro
        ORDER BY u.MaNguoiDung DESC
      `);

      // --- JOB CHẠY NGẦM: CHUẨN HÓA VÒNG ĐỜI TRẠNG THÁI LỚP HỌC ---

      // 1. Lớp chưa tới ngày khai giảng: Đầy thì gán "Đã đầy", chưa đầy thì "Sắp mở"
      await pool.query(`
        UPDATE lophoc
        SET TrangThaiLop = CASE 
            WHEN lophoc.SiSoToiDa <= (SELECT COUNT(*) FROM dangkyhoc d WHERE d.MaLopHoc = lophoc.MaLopHoc AND d.TrangThai IN ('Thành công', 'Đang học', 'Chờ duyệt')) THEN 'Đã đầy'
            ELSE 'Sắp mở' 
        END
        WHERE DATE(NgayKhaiGiang) > CURDATE()
          AND TrangThaiLop NOT IN ('Đã đóng', 'Kết thúc')
      `);

      // 2. Lớp đến ngày khai giảng nhưng 0 học viên -> Chốt sổ: Tự động ĐỐNG
      await pool.query(`
        UPDATE lophoc 
        SET TrangThaiLop = 'Đã đóng' 
        WHERE DATE(NgayKhaiGiang) <= CURDATE() 
          AND DATE(NgayKetThuc) >= CURDATE()
          AND TrangThaiLop NOT IN ('Đã đóng', 'Kết thúc')
          AND MaLopHoc NOT IN (
              SELECT MaLopHoc FROM dangkyhoc WHERE TrangThai IN ('Thành công', 'Đang học', 'Chờ duyệt')
          )
      `);

      // 3. Tự động đồng bộ LoạiLop chuẩn xác bám theo Khóa Học
      await pool.query(`
        UPDATE lophoc l
        JOIN khoahoc k ON l.MaKhoaHoc = k.MaKhoaHoc
        SET l.LoaiLop = CASE 
            WHEN LOWER(k.TenKhoaHoc) LIKE '%cấp tốc%' OR LOWER(l.TenLop) LIKE 'ct%' THEN 'Cấp tốc'
            ELSE 'Tiêu chuẩn'
        END
      `);

      // 4. Xóa hồ sơ học viên tên "Hồng" theo yêu cầu trực tiếp
      try {
        const [hongProfiles] = await pool.query(
          "SELECT MaHocVien, MaNguoiDung FROM hosohocvien WHERE LOWER(HoTen) LIKE '%hồng%' OR LOWER(HoTen) LIKE '%hong%'"
        );
        for (const hp of hongProfiles) {
          await pool.query("DELETE FROM diemdanh WHERE MaHocVien = ?", [hp.MaHocVien]);
          await pool.query("DELETE FROM quanlydiem WHERE MaHocVien = ?", [hp.MaHocVien]);
          await pool.query("DELETE FROM ketquathi WHERE MaHocVien = ?", [hp.MaHocVien]);
          await pool.query("DELETE FROM dangkyhoc WHERE MaHocVien = ?", [hp.MaHocVien]);
          await pool.query("DELETE FROM hosohocvien WHERE MaHocVien = ?", [hp.MaHocVien]);
          if (hp.MaNguoiDung) {
            const [otherP] = await pool.query("SELECT COUNT(*) AS cnt FROM hosohocvien WHERE MaNguoiDung = ?", [hp.MaNguoiDung]);
            if (otherP[0].cnt === 0) {
              await pool.query("DELETE FROM nguoidung WHERE MaNguoiDung = ? AND MaVaiTro = (SELECT MaVaiTro FROM vaitro WHERE TenVaiTro LIKE '%Học viên%' LIMIT 1)", [hp.MaNguoiDung]);
            }
          }
        }
        const [hongUsers] = await pool.query(
          "SELECT u.MaNguoiDung FROM nguoidung u JOIN vaitro v ON u.MaVaiTro = v.MaVaiTro WHERE (LOWER(u.HoTen) LIKE '%hồng%' OR LOWER(u.HoTen) LIKE '%hong%') AND v.TenVaiTro LIKE '%Học viên%'"
        );
        for (const hu of hongUsers) {
          const [checkHv] = await pool.query("SELECT COUNT(*) AS cnt FROM hosohocvien WHERE MaNguoiDung = ?", [hu.MaNguoiDung]);
          if (checkHv[0].cnt === 0) {
            await pool.query("DELETE FROM nguoidung WHERE MaNguoiDung = ?", [hu.MaNguoiDung]);
          }
        }
      } catch (errHong) {
        console.error("Lỗi xóa học viên Hồng:", errHong.message);
      }

      // 3. Lớp đến ngày khai giảng VÀ có học viên -> Bắt buộc "Đang diễn ra"
      await pool.query(`
        UPDATE lophoc 
        SET TrangThaiLop = 'Đang diễn ra' 
        WHERE DATE(NgayKhaiGiang) <= CURDATE() 
          AND DATE(NgayKetThuc) >= CURDATE()
          AND TrangThaiLop NOT IN ('Đã đóng', 'Kết thúc')
          AND MaLopHoc IN (
              SELECT MaLopHoc FROM dangkyhoc WHERE TrangThai IN ('Thành công', 'Đang học', 'Chờ duyệt')
          )
      `);

      // 4. Lớp đã bế giảng -> Tự động "Đã đóng"
      await pool.query(`
        UPDATE lophoc 
        SET TrangThaiLop = 'Đã đóng' 
        WHERE DATE(NgayKetThuc) < CURDATE()
          AND TrangThaiLop NOT IN ('Đã đóng', 'Kết thúc')
      `);

      // Lấy danh sách Khóa học
      const [courses] = await pool.query('SELECT * FROM khoahoc ORDER BY MaKhoaHoc DESC');
      const activeCourses = courses.filter(c => !c.TrangThai || c.TrangThai === 'Hoạt động' || c.TrangThai === 'Active');

      // Lấy danh sách Lớp học
      const [classes] = await pool.query(`
        SELECT l.*, COALESCE(l.HocPhi, k.HocPhi) AS HocPhi, k.TenKhoaHoc, u.HoTen AS TenGiangVien,
               (SELECT p.SucChua FROM thoikhoabieu t JOIN phonghoc p ON t.MaPhongHoc = p.MaPhongHoc WHERE t.MaLopHoc = l.MaLopHoc LIMIT 1) AS SucChuaPhong,
               (SELECT p.TenPhong FROM thoikhoabieu t JOIN phonghoc p ON t.MaPhongHoc = p.MaPhongHoc WHERE t.MaLopHoc = l.MaLopHoc LIMIT 1) AS TenPhongHoc,
               (SELECT COUNT(DISTINCT dd.NgayHoc) FROM diemdanh dd WHERE dd.MaLopHoc = l.MaLopHoc) AS SoBuoiDaHoc
        FROM lophoc l
        JOIN khoahoc k ON l.MaKhoaHoc = k.MaKhoaHoc
        LEFT JOIN hosonhansu n ON l.MaGiangVien = n.MaNhanSu
        LEFT JOIN nguoidung u ON n.MaNguoiDung = u.MaNguoiDung
        ORDER BY l.MaLopHoc DESC
      `);

      // Truy vấn Thời khóa biểu để định dạng lịch học ngắn gọn
      const [allTkb] = await pool.query(`
        SELECT t.MaLopHoc, t.ThuTrongTuan, TIME_FORMAT(b.GioBatDau, '%H:%i') AS GioBatDau, TIME_FORMAT(b.GioKetThuc, '%H:%i') AS GioKetThuc
        FROM thoikhoabieu t
        JOIN buoihoc b ON t.MaBuoiHoc = b.MaBuoiHoc
        ORDER BY t.MaLopHoc ASC, t.MaTKB ASC
      `);

      const tkbMap = {};
      allTkb.forEach(row => {
        if (!tkbMap[row.MaLopHoc]) tkbMap[row.MaLopHoc] = [];
        tkbMap[row.MaLopHoc].push(row);
      });

      function formatCompactSchedule(list) {
        if (!list || list.length === 0) return 'Chưa xếp lịch';
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
          const timeKey = `${item.GioBatDau}-${item.GioKetThuc}`;
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
        return parts.join(' | ');
      }

      classes.forEach(c => {
        c.LichHoc = formatCompactSchedule(tkbMap[c.MaLopHoc]);
      });

      // --- MỚI THÊM: Lọc danh sách các lớp CHƯA có thời khóa biểu ---
      const unscheduledClasses = classes.filter(c => !tkbMap[c.MaLopHoc] || tkbMap[c.MaLopHoc].length === 0);
      // -------------------------------------------------------------

      // Lấy danh sách Buổi học
      const [sessions] = await pool.query('SELECT * FROM buoihoc ORDER BY GioBatDau ASC');

      // Lấy danh sách Phòng học (kèm sĩ số lớp lớn nhất đang xếp phòng này)
      const [classrooms] = await pool.query(`
        SELECT p.*,
               COALESCE(
                 (SELECT MAX(l.SiSoToiDa)
                  FROM thoikhoabieu t
                  JOIN lophoc l ON t.MaLopHoc = l.MaLopHoc
                  WHERE t.MaPhongHoc = p.MaPhongHoc AND l.TrangThaiLop NOT IN ('Đã đóng', 'Kết thúc', 'Đã kết thúc')),
                 0
               ) AS MaxClassSiSo,
               (SELECT l.TenLop
                FROM thoikhoabieu t
                JOIN lophoc l ON t.MaLopHoc = l.MaLopHoc
                WHERE t.MaPhongHoc = p.MaPhongHoc AND l.TrangThaiLop NOT IN ('Đã đóng', 'Kết thúc', 'Đã kết thúc')
                ORDER BY l.SiSoToiDa DESC
                LIMIT 1) AS MaxClassName
        FROM phonghoc p
        ORDER BY p.TenPhong ASC
      `);

      // Lấy Thời khóa biểu (Gom nhóm theo Lớp để hiển thị giao diện)
      const [schedules] = await pool.query(`
        SELECT t.MaLopHoc, l.TenLop, k.TenKhoaHoc, u.HoTen AS TenGiangVien, t.MaPhongHoc, p.TenPhong, t.MaBuoiHoc, b.TenBuoi,
               TIME_FORMAT(b.GioBatDau, '%H:%i') AS GioBatDau, TIME_FORMAT(b.GioKetThuc, '%H:%i') AS GioKetThuc,
               GROUP_CONCAT(t.ThuTrongTuan ORDER BY t.MaTKB ASC SEPARATOR ', ') AS CacThu,
               GROUP_CONCAT(t.MaTKB SEPARATOR ',') AS TkbIds
        FROM thoikhoabieu t
        JOIN lophoc l ON t.MaLopHoc = l.MaLopHoc
        JOIN khoahoc k ON l.MaKhoaHoc = k.MaKhoaHoc
        JOIN phonghoc p ON t.MaPhongHoc = p.MaPhongHoc
        JOIN buoihoc b ON t.MaBuoiHoc = b.MaBuoiHoc
        LEFT JOIN hosonhansu n ON l.MaGiangVien = n.MaNhanSu
        LEFT JOIN nguoidung u ON n.MaNguoiDung = u.MaNguoiDung
        GROUP BY t.MaLopHoc, t.MaPhongHoc, t.MaBuoiHoc, l.TenLop, k.TenKhoaHoc, u.HoTen, p.TenPhong, b.TenBuoi, b.GioBatDau, b.GioKetThuc
        ORDER BY l.MaLopHoc DESC
      `);

      // Lấy danh sách Tin tức
      const [news] = await pool.query(`
        SELECT t.*, u.HoTen AS NguoiDang
        FROM tintuc t
        JOIN nguoidung u ON t.MaNguoiDang = u.MaNguoiDung
        ORDER BY t.NgayDang DESC
      `);

      // Lấy danh sách Khuyến mãi
      const [promotions] = await pool.query('SELECT * FROM khuyenmai ORDER BY NgayBatDau DESC');

      // Lấy danh sách Đăng ký học
      const [enrollments] = await pool.query(`
        SELECT d.*, 
               COALESCE(NULLIF(TRIM(h.HoTen), ''), uh.HoTen) AS TenHocVien, 
               ul.TenLop, 
               ud.HoTen AS TenNguoiDangKy, 
               k.TenKhuyenMai, 
               kh.TenKhoaHoc,
               kh.HocPhi AS HocPhiGoc
        FROM dangkyhoc d
        JOIN hosohocvien h ON d.MaHocVien = h.MaHocVien
        JOIN nguoidung uh ON h.MaNguoiDung = uh.MaNguoiDung
        JOIN lophoc ul ON d.MaLopHoc = ul.MaLopHoc
        JOIN khoahoc kh ON ul.MaKhoaHoc = kh.MaKhoaHoc
        JOIN nguoidung ud ON d.MaNguoiDangKy = ud.MaNguoiDung
        LEFT JOIN khuyenmai k ON d.MaKhuyenMai = k.MaKhuyenMai
        ORDER BY d.MaDangKy DESC
      `);

      // Lấy danh sách Giao dịch
      const [transactions] = await pool.query(`
        SELECT g.*, d.MaLopHoc, l.TenLop, COALESCE(NULLIF(TRIM(h.HoTen), ''), u.HoTen) AS TenHocVien
        FROM giaodich g
        JOIN dangkyhoc d ON g.MaDangKy = d.MaDangKy
        JOIN lophoc l ON d.MaLopHoc = l.MaLopHoc
        JOIN hosohocvien h ON d.MaHocVien = h.MaHocVien
        JOIN nguoidung u ON h.MaNguoiDung = u.MaNguoiDung
        ORDER BY g.NgayGiaoDich DESC
      `);

      // Lấy Hồ sơ nhân sự / Giảng viên
      const [staffProfiles] = await pool.query(`
        SELECT n.*, u.HoTen, u.Email, u.SoDienThoai, u.TrangThai
        FROM hosonhansu n
        JOIN nguoidung u ON n.MaNguoiDung = u.MaNguoiDung
        ORDER BY n.MaNhanSu DESC
      `);

      // Lấy Hồ sơ học viên
      const [studentProfiles] = await pool.query(`
        SELECT h.*, COALESCE(NULLIF(TRIM(h.HoTen), ''), u.HoTen) AS HoTen, u.Email, u.SoDienThoai, u.TrangThai, u.HoTen AS TenNguoiDungChinh,
               (SELECT GROUP_CONCAT(CONCAT(l.TenLop, ' - ', k.TenKhoaHoc, '||', DATE_FORMAT(d.NgayDangKy, '%d/%m/%Y')) SEPARATOR ';;')
                FROM dangkyhoc d
                JOIN lophoc l ON d.MaLopHoc = l.MaLopHoc
                JOIN khoahoc k ON l.MaKhoaHoc = k.MaKhoaHoc
                WHERE d.MaHocVien = h.MaHocVien AND d.TrangThai NOT IN ('Đã hủy', 'Từ chối', 'Đã chuyển lớp')) AS LopDangHocWithDate,
               (SELECT MAX(d.NgayDangKy) FROM dangkyhoc d WHERE d.MaHocVien = h.MaHocVien AND d.TrangThai NOT IN ('Đã hủy', 'Từ chối', 'Đã chuyển lớp')) AS NgayDangKyMoiNhat,
               (SELECT ugv.HoTen
                FROM dangkyhoc d
                JOIN lophoc l ON d.MaLopHoc = l.MaLopHoc
                LEFT JOIN hosonhansu n ON l.MaGiangVien = n.MaNhanSu
                LEFT JOIN nguoidung ugv ON n.MaNguoiDung = ugv.MaNguoiDung
                WHERE d.MaHocVien = h.MaHocVien AND d.TrangThai NOT IN ('Đã hủy', 'Từ chối', 'Đã chuyển lớp')
                LIMIT 1) AS TenGiangVien,
               COALESCE(
                 (SELECT COUNT(DISTINCT dd.NgayHoc)
                  FROM diemdanh dd
                  JOIN dangkyhoc d ON dd.MaLopHoc = d.MaLopHoc
                  WHERE d.MaHocVien = h.MaHocVien AND d.TrangThai NOT IN ('Đã hủy', 'Từ chối', 'Đã chuyển lớp')),
                 0
               ) AS SoBuoiDaHoc,
               COALESCE((SELECT k.ThoiLuong FROM dangkyhoc d JOIN lophoc l ON d.MaLopHoc = l.MaLopHoc JOIN khoahoc k ON l.MaKhoaHoc = k.MaKhoaHoc WHERE d.MaHocVien = h.MaHocVien AND d.TrangThai NOT IN ('Đã hủy', 'Từ chối', 'Đã chuyển lớp') LIMIT 1), 26) AS TongSoBuoi
        FROM hosohocvien h
        JOIN nguoidung u ON h.MaNguoiDung = u.MaNguoiDung
        ORDER BY h.MaHocVien DESC
      `);

      // Lấy Kết quả thi
      const [examResults] = await pool.query(`
        SELECT k.*, h.MaHocVien, COALESCE(NULLIF(TRIM(h.HoTen), ''), u.HoTen) AS TenHocVien, b.TenDeThi
        FROM ketquathi k
        JOIN hosohocvien h ON k.MaHocVien = h.MaHocVien
        JOIN nguoidung u ON h.MaNguoiDung = u.MaNguoiDung
        JOIN baithi b ON k.MaDeThi = b.MaDeThi
        ORDER BY k.NgayThi DESC
      `);

      // Lấy danh sách Đề thi
      const [exams] = await pool.query('SELECT * FROM baithi ORDER BY MaDeThi DESC');

      // Lấy Hồ sơ học viên cho ô chọn Đăng ký học
      const [students] = await pool.query(`
        SELECT h.MaHocVien, u.HoTen, u.Email 
        FROM hosohocvien h
        JOIN nguoidung u ON h.MaNguoiDung = u.MaNguoiDung
        WHERE u.TrangThai = 'Hoạt động' OR u.TrangThai = 'Active'
      `);

      // Lấy danh sách Lộ trình đề xuất
      const [roadmaps] = await pool.query(`
        SELECT r.*, k.TenKhoaHoc 
        FROM lotrinh_dexuat r
        JOIN khoahoc k ON r.MaKhoaHoc = k.MaKhoaHoc
        WHERE (r.is_active = 1 OR r.is_active IS NULL)
        ORDER BY r.DiemTu ASC, r.MaLoTrinh ASC
      `);

      function getRoadmapPrefix(typeStr) {
        const type = (typeStr || 'Tiêu chuẩn').trim();
        if (type === 'Tiêu chuẩn') return 'LTR_TC';
        if (type === 'Cấp tốc') return 'LTR_CT';
        if (type === 'Mất gốc') return 'LTR_MG';
        return 'LTR_' + type.split(/\s+/).map(w => w.charAt(0).toUpperCase()).join('');
      }

      const stepCounters = {};
      const typeMaxStep = {};
      roadmaps.forEach(r => {
        const type = r.LoaiLoTrinh || 'Tiêu chuẩn';
        if (!stepCounters[type]) stepCounters[type] = 0;
        stepCounters[type]++;
        r.StepIndex = stepCounters[type];
        r.FormattedCode = r.MaCode || `${getRoadmapPrefix(type)}_${String(r.StepIndex).padStart(2, '0')}`;
        typeMaxStep[type] = r.StepIndex;
      });

      roadmaps.forEach(r => {
        const type = r.LoaiLoTrinh || 'Tiêu chuẩn';
        r.isMaxStep = (r.StepIndex === typeMaxStep[type]);
      });

      // Thống kê tính toán
      let revenueQuery = `
        SELECT (
          COALESCE((SELECT SUM(SoTien) FROM giaodich WHERE TrangThai = 'Thành công'), 0) +
          COALESCE((SELECT SUM(HocPhiDaGiam) FROM dangkyhoc WHERE TrangThai IN ('Thành công', 'Đang học', 'Hoàn thành', 'Đã hoàn thành') AND MaDangKy NOT IN (SELECT MaDangKy FROM giaodich WHERE TrangThai = 'Thành công')), 0)
        ) AS TotalRevenue
      `;
      let studentQuery = "SELECT COUNT(*) AS Count FROM nguoidung WHERE MaVaiTro = 3";
      let enrollQuery = "SELECT COUNT(*) AS Count FROM dangkyhoc WHERE TrangThai IN ('Thành công', 'Đang học', 'Hoàn thành', 'Đã hoàn thành')";
      let scoreQuery = "SELECT AVG(DiemNghe + DiemDoc) AS AvgScore FROM ketquathi";
      let revenueByCourseQuery = `
        SELECT kh.TenKhoaHoc, 
               SUM(CASE WHEN g.TrangThai = 'Thành công' THEN g.SoTien ELSE d.HocPhiDaGiam END) AS Revenue
        FROM dangkyhoc d
        JOIN lophoc l ON d.MaLopHoc = l.MaLopHoc
        JOIN khoahoc kh ON l.MaKhoaHoc = kh.MaKhoaHoc
        LEFT JOIN giaodich g ON d.MaDangKy = g.MaDangKy
        WHERE (d.TrangThai IN ('Thành công', 'Đang học', 'Hoàn thành', 'Đã hoàn thành') OR g.TrangThai = 'Thành công')
      `;
      let monthlyRevenueQuery = `
        SELECT DATE_FORMAT(COALESCE(g.NgayGiaoDich, d.NgayDangKy), '%Y-%m') AS Month, 
               SUM(CASE WHEN g.TrangThai = 'Thành công' THEN g.SoTien ELSE d.HocPhiDaGiam END) AS Revenue
        FROM dangkyhoc d
        LEFT JOIN giaodich g ON d.MaDangKy = g.MaDangKy
        WHERE (d.TrangThai IN ('Thành công', 'Đang học', 'Hoàn thành', 'Đã hoàn thành') OR g.TrangThai = 'Thành công')
      `;

      let queryParams = [];
      let revenueCourseParams = [];
      let monthlyRevenueParams = [];
      if (startDate && endDate) {
        studentQuery += " AND DATE(NgayTao) >= ? AND DATE(NgayTao) <= ?";
        enrollQuery += " AND DATE(NgayDangKy) >= ? AND DATE(NgayDangKy) <= ?";
        scoreQuery += " WHERE DATE(NgayThi) >= ? AND DATE(NgayThi) <= ?";
        revenueByCourseQuery += " AND DATE(COALESCE(g.NgayGiaoDich, d.NgayDangKy)) >= ? AND DATE(COALESCE(g.NgayGiaoDich, d.NgayDangKy)) <= ?";
        monthlyRevenueQuery += " AND DATE(COALESCE(g.NgayGiaoDich, d.NgayDangKy)) >= ? AND DATE(COALESCE(g.NgayGiaoDich, d.NgayDangKy)) <= ?";
        queryParams = [startDate, endDate];
        revenueCourseParams = [startDate, endDate];
        monthlyRevenueParams = [startDate, endDate];
      }

      const [revenueRow] = await pool.query(revenueQuery);
      const totalRevenue = revenueRow[0].TotalRevenue || 0;

      const [studentCountRow] = await pool.query(studentQuery, queryParams);
      const studentCount = studentCountRow[0].Count || 0;

      const [enrollCountRow] = await pool.query(enrollQuery, queryParams);
      const enrollCount = enrollCountRow[0].Count || 0;

      let fillRateSum = 0;
      let activeClassesCount = 0;
      for (const cls of classes) {
        let classEnrollQuery = "SELECT COUNT(*) AS Count FROM dangkyhoc WHERE MaLopHoc = ? AND TrangThai IN ('Thành công', 'Đang học', 'Hoàn thành', 'Đã hoàn thành')";
        let classEnrollParams = [cls.MaLopHoc];
        if (startDate && endDate) {
          classEnrollQuery += " AND DATE(NgayDangKy) >= ? AND DATE(NgayDangKy) <= ?";
          classEnrollParams.push(startDate, endDate);
        }
        const [cntRow] = await pool.query(classEnrollQuery, classEnrollParams);
        const actualCount = cntRow[0].Count;
        cls.SiSoHienTai = actualCount;

        if (cls.SiSoToiDa > 0) {
          fillRateSum += (actualCount / cls.SiSoToiDa) * 100;
          activeClassesCount++;
        }
      }
      const avgFillRate = activeClassesCount > 0 ? Math.round(fillRateSum / activeClassesCount) : 0;

      const [scoreRow] = await pool.query(scoreQuery, queryParams);
      const avgScore = scoreRow[0].AvgScore ? Math.round(scoreRow[0].AvgScore) : 0;

      revenueByCourseQuery += " GROUP BY kh.MaKhoaHoc, kh.TenKhoaHoc";
      const [revenueByCourse] = await pool.query(revenueByCourseQuery, revenueCourseParams);

      monthlyRevenueQuery += " GROUP BY DATE_FORMAT(COALESCE(g.NgayGiaoDich, d.NgayDangKy), '%Y-%m') ORDER BY Month ASC LIMIT 12";
      const [monthlyRevenue] = await pool.query(monthlyRevenueQuery, monthlyRevenueParams);

      const filteredStudentProfiles = studentProfiles.filter(student => {
        const hasChildren = studentProfiles.some(s => s.MaNguoiDung === student.MaNguoiDung && s.MaHocVien !== student.MaHocVien);
        const isParentAccount = !student.QuanHe || student.QuanHe === 'Bản thân' || student.QuanHe.includes('Phụ huynh');
        const hasNoEnrollment = !student.TenLop || student.TenLop === 'Chưa ghi danh';

        if (hasChildren && isParentAccount && hasNoEnrollment) {
          return false;
        }
        return true;
      });

      res.render('admin/dashboard', {
        user: req.session.user,
        activeTab,
        successMsg,
        errorMsg,
        startDate,
        endDate,
        roles,
        users,
        courses,
        activeCourses,
        classes,
        unscheduledClasses, // --- ĐÃ TRUYỀN BIẾN NÀY RA VIEW TẠI ĐÂY ---
        sessions,
        classrooms,
        schedules,
        news,
        promotions,
        enrollments,
        transactions,
        staffProfiles,
        students,
        studentProfiles: filteredStudentProfiles,
        examResults,
        exams,
        roadmaps,
        stats: {
          totalRevenue,
          studentCount,
          enrollCount,
          avgFillRate,
          avgScore,
          revenueByCourse,
          monthlyRevenue
        }
      });
    } catch (err) {
      console.error('Lỗi khi tải Dashboard Admin:', err);
      res.status(500).send(`Lỗi máy chủ khi tải trang quản trị: ${err.message || err}`);
    }
  }

  // 2. Course CRUD
  static async addCourse(req, res) {
    try {
      const { TenKhoaHoc, HocPhi, ThoiLuong, CapDo, MoTa } = req.body;
      const tenKhoaHoc = String(TenKhoaHoc || '').trim();
      const hocPhi = Number(HocPhi);
      const thoiLuong = Number(ThoiLuong);
      const capDo = String(CapDo || '').trim();
      const moTa = MoTa ? String(MoTa).trim() : '';

      const ALLOWED_LEVELS = ['Foundation', '300+', '450+', '650+', '800+', '850+', 'Luyện đề'];

      if (!tenKhoaHoc || !capDo || !Number.isFinite(hocPhi) || !Number.isFinite(thoiLuong) || hocPhi <= 0 || thoiLuong <= 0) {
        return res.redirect('/admin/dashboard?tab=courses&error=' + encodeURIComponent('Vui lòng nhập đầy đủ thông tin khóa học và không nhập số âm và số 0.'));
      }

      if (!ALLOWED_LEVELS.includes(capDo)) {
        return res.redirect('/admin/dashboard?tab=courses&error=' + encodeURIComponent(`Lỗi: Cấp độ trình độ "${capDo}" không hợp lệ! Vui lòng chọn một trong các cấp độ quy chuẩn: ${ALLOWED_LEVELS.join(', ')}.`));
      }

      // RÀNG BUỘC TÊN KHÓA HỌC (TỪ KHÓA) BẮT BUỘC THUỘC CẤP ĐỘ
      const levelError = validateCourseNameAndLevel(tenKhoaHoc, capDo);
      if (levelError) {
        return res.redirect('/admin/dashboard?tab=courses&error=' + encodeURIComponent(levelError));
      }

      // RÀNG BUỘC MA TRẬN THỜI LƯỢNG KHÓA HỌC
      const durationError = validateCourseDurationMatrix(tenKhoaHoc, capDo, thoiLuong);
      if (durationError) {
        return res.redirect('/admin/dashboard?tab=courses&error=' + encodeURIComponent(durationError));
      }

      // === THÊM LOGIC KIỂM TRA TRÙNG TÊN KHÓA HỌC KHI THÊM MỚI ===
      const [duplicate] = await pool.query(
        'SELECT MaKhoaHoc FROM khoahoc WHERE LOWER(TRIM(TenKhoaHoc)) = LOWER(?)',
        [tenKhoaHoc]
      );
      if (duplicate.length > 0) {
        return res.redirect('/admin/dashboard?tab=courses&error=' + encodeURIComponent(`Lỗi: Khóa học mang tên "${tenKhoaHoc}" đã tồn tại trong hệ thống!`));
      }
      // ==========================================================

      await pool.query(
        'INSERT INTO khoahoc (TenKhoaHoc, HocPhi, ThoiLuong, CapDo, MoTa, TrangThai) VALUES (?, ?, ?, ?, ?, ?)',
        [tenKhoaHoc, hocPhi, thoiLuong, capDo, moTa, (req.body.TrangThai || 'Hoạt động').trim()]
      );
      res.redirect('/admin/dashboard?tab=courses&success=' + encodeURIComponent('Thêm khóa học thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=courses&error=' + encodeURIComponent('Không thể thêm khóa học. Lỗi: ' + err.message));
    }
  }

  static async editCourse(req, res) {
    try {
      const { id } = req.params;
      const { TenKhoaHoc, HocPhi, ThoiLuong, CapDo, MoTa, TrangThai } = req.body;
      const tenKhoaHoc = String(TenKhoaHoc || '').trim();
      const hocPhi = Number(HocPhi);
      const thoiLuong = Number(ThoiLuong);
      const capDo = String(CapDo || '').trim();
      const moTa = MoTa ? String(MoTa).trim() : '';
      const trangThai = String(TrangThai || 'Hoạt động').trim();

      const ALLOWED_LEVELS = ['Foundation', '300+', '450+', '650+', '800+', '850+', 'Luyện đề'];

      if (!tenKhoaHoc || !capDo || !Number.isFinite(hocPhi) || !Number.isFinite(thoiLuong) || hocPhi <= 0 || thoiLuong <= 0) {
        return res.redirect('/admin/dashboard?tab=courses&error=' + encodeURIComponent('Vui lòng nhập đầy đủ thông tin khóa học và không nhập số âm hoặc bằng 0.'));
      }

      if (!ALLOWED_LEVELS.includes(capDo)) {
        return res.redirect('/admin/dashboard?tab=courses&error=' + encodeURIComponent(`Lỗi: Cấp độ trình độ "${capDo}" không hợp lệ! Vui lòng chọn một trong các cấp độ quy chuẩn: ${ALLOWED_LEVELS.join(', ')}.`));
      }

      // RÀNG BUỘC TÊN KHÓA HỌC (TỪ KHÓA) BẮT BUỘC THUỘC CẤP ĐỘ
      const levelError = validateCourseNameAndLevel(tenKhoaHoc, capDo);
      if (levelError) {
        return res.redirect('/admin/dashboard?tab=courses&error=' + encodeURIComponent(levelError));
      }

      // RÀNG BUỘC MA TRẬN THỜI LƯỢNG KHÓA HỌC
      const durationError = validateCourseDurationMatrix(tenKhoaHoc, capDo, thoiLuong);
      if (durationError) {
        return res.redirect('/admin/dashboard?tab=courses&error=' + encodeURIComponent(durationError));
      }

      // === THÊM LOGIC KIỂM TRA TRÙNG TÊN KHÓA HỌC KHI SỬA ===
      const [duplicate] = await pool.query(
        'SELECT MaKhoaHoc FROM khoahoc WHERE LOWER(TRIM(TenKhoaHoc)) = LOWER(?) AND MaKhoaHoc != ?',
        [tenKhoaHoc, id]
      );
      if (duplicate.length > 0) {
        return res.redirect('/admin/dashboard?tab=courses&error=' + encodeURIComponent(`Lỗi trùng tên: Tên khóa học "${tenKhoaHoc}" đã được sử dụng!`));
      }
      // =====================================================

      await pool.query(
        'UPDATE khoahoc SET TenKhoaHoc = ?, HocPhi = ?, ThoiLuong = ?, CapDo = ?, MoTa = ?, TrangThai = ? WHERE MaKhoaHoc = ?',
        [tenKhoaHoc, hocPhi, thoiLuong, capDo, moTa, trangThai, id]
      );
      res.redirect('/admin/dashboard?tab=courses&success=' + encodeURIComponent('Cập nhật khóa học thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=courses&error=' + encodeURIComponent('Không thể cập nhật khóa học. Lỗi: ' + err.message));
    }
  }

  static async deleteCourse(req, res) {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM khoahoc WHERE MaKhoaHoc = ?', [id]);
      res.redirect('/admin/dashboard?tab=courses&success=' + encodeURIComponent('Xóa khóa học thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=courses&error=' + encodeURIComponent('Không thể xóa khóa học (Có thể do khóa học đang chứa lớp học).'));
    }
  }

  static async updateCourseSyllabus(req, res) {
    try {
      const { id } = req.params;
      const { syllabus, meta } = req.body;
      const { updateSyllabusByCourseId } = require('../utils/syllabi');
      updateSyllabusByCourseId(id, syllabus, meta);
      return res.json({ success: true, message: 'Cập nhật đề cương chi tiết cho khóa học thành công!' });
    } catch (err) {
      console.error('Lỗi cập nhật đề cương:', err);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật đề cương: ' + err.message });
    }
  }

  static async addClass(req, res) {
    try {
      // 1. Không lấy NgayKetThuc từ form nữa
      const { TenLop, MaKhoaHoc, MaGiangVien, NgayKhaiGiang, SiSoToiDa, TrangThaiLop, LoaiLop, redirectTab } = req.body;
      const tab = redirectTab || (req.headers.referer && req.headers.referer.includes('tab=public-schedules') ? 'public-schedules' : 'classes');

      // =========================================================
      // KIỂM TRA SĨ SỐ TỐI ĐA (KHÔNG ĐƯỢC NHẬP SỐ ÂM HOẶC 0)
      // =========================================================
      if (!SiSoToiDa || parseInt(SiSoToiDa) <= 0) {
        return res.redirect(`/admin/dashboard?tab=${tab}&error=` + encodeURIComponent(`Lỗi: Sĩ số tối đa phải là một số nguyên dương lớn hơn 0!`));
      }

      const startDate = new Date(NgayKhaiGiang);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if ((TrangThaiLop === 'Sắp mở' || !TrangThaiLop) && startDate < today) {
        return res.redirect(`/admin/dashboard?tab=${tab}&error=` + encodeURIComponent(`Lỗi ngày khai giảng: Lớp học trạng thái 'Sắp mở' không thể có ngày khai giảng trong quá khứ (${new Date(NgayKhaiGiang).toLocaleDateString('vi-VN')})!`));
      }

      // =========================================================
      // LOGIC TỰ ĐỘNG TÍNH NGÀY BẾ GIẢNG DỰA TRÊN SỐ BUỔI & TRỪ NGÀY LỄ TẾT
      // =========================================================

      // Lấy số buổi học từ form (SoBuoiHoc) hoặc tự động lấy từ ThoiLuong của Khóa học gốc
      const [khoaHocInfo] = await pool.query('SELECT ThoiLuong, CapDo, TenKhoaHoc FROM khoahoc WHERE MaKhoaHoc = ?', [MaKhoaHoc]);
      const soBuoiHoc = req.body.SoBuoiHoc ? parseInt(req.body.SoBuoiHoc) : (khoaHocInfo[0]?.ThoiLuong || 26);

      if (!soBuoiHoc || soBuoiHoc <= 0) {
        return res.redirect(`/admin/dashboard?tab=${tab}&error=` + encodeURIComponent('Lỗi: Khóa học này chưa được cấu hình số buổi học. Không thể tự tính ngày kết thúc!'));
      }

      // Mặc định các ngày học trong tuần (Tiêu chuẩn: [1, 3, 5], Cấp tốc: [1, 2, 3, 4, 5])
      const lichHocTrongTuan = (LoaiLop === 'Cấp tốc') ? [1, 2, 3, 4, 5] : [1, 3, 5];

      let year, month, day;
      if (typeof NgayKhaiGiang === 'string') {
        const parts = NgayKhaiGiang.split('T')[0].split('-');
        year = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        day = parseInt(parts[2]);
      } else {
        year = NgayKhaiGiang.getFullYear();
        month = NgayKhaiGiang.getMonth();
        day = NgayKhaiGiang.getDate();
      }

      let currentDate = new Date(year, month, day);
      let buoiDaHoc = 0;

      while (buoiDaHoc < soBuoiHoc) {
        let dayOfWeek = currentDate.getDay();

        // Nếu ngày đang xét rơi vào lịch học và không trùng ngày Lễ Tết / Nghỉ bù -> Tăng 1 buổi
        if (lichHocTrongTuan.includes(dayOfWeek) && !isVietnamHolidayOrCompensatory(currentDate)) {
          buoiDaHoc++;
        }

        if (buoiDaHoc < soBuoiHoc) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      // Format biến NgayKetThuc để lưu CSDL
      const NgayKetThuc = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

      const classMatrixError = validateClassMatrixConstraints(TenLop, LoaiLop, soBuoiHoc, NgayKhaiGiang, NgayKetThuc, khoaHocInfo[0]?.CapDo, khoaHocInfo[0]?.TenKhoaHoc);
      if (classMatrixError) {
        return res.redirect(`/admin/dashboard?tab=${tab}&error=` + encodeURIComponent(classMatrixError));
      }
      // =========================================================

      // Check duplicate class name
      const [duplicate] = await pool.query(
        'SELECT MaLopHoc FROM lophoc WHERE LOWER(TRIM(TenLop)) = LOWER(TRIM(?))',
        [TenLop]
      );
      if (duplicate.length > 0) {
        return res.redirect(`/admin/dashboard?tab=${tab}&error=` + encodeURIComponent(`Lỗi trùng tên lớp: Tên lớp "${TenLop.trim()}" đã tồn tại trong hệ thống. Vui lòng thêm hậu tố để phân biệt (ví dụ: ${TenLop.trim()} - Đợt 2)!`));
      }

      const [insertRes] = await pool.query(
        'INSERT INTO lophoc (TenLop, MaKhoaHoc, MaGiangVien, NgayKhaiGiang, NgayKetThuc, SiSoToiDa, HocPhi, TrangThaiLop, LoaiLop) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)',
        [TenLop, MaKhoaHoc, MaGiangVien || null, NgayKhaiGiang, NgayKetThuc, SiSoToiDa, TrangThaiLop || 'Sắp mở', LoaiLop || 'Tiêu chuẩn']
      );
      if (insertRes.insertId) {
        await AdminController.recalculateClassEndDate(insertRes.insertId);
      }
      res.redirect(`/admin/dashboard?tab=schedules&success=` + encodeURIComponent(`Mở lớp "${TenLop.trim()}" thành công! Vui lòng XẾP LỊCH HỌC NGAY cho lớp này để lớp được hiển thị công khai trên Trang chủ & Lịch khai giảng.`));
    } catch (err) {
      console.error(err);
      const tab = req.body.redirectTab || (req.headers.referer && req.headers.referer.includes('tab=public-schedules') ? 'public-schedules' : 'classes');
      res.redirect(`/admin/dashboard?tab=${tab}&error=` + encodeURIComponent('Không thể thêm lớp học. Lỗi: ' + err.message));
    }
  }

  static async editClass(req, res) {
    try {
      const { id } = req.params;
      // Không lấy NgayKetThuc từ body
      let { TenLop, MaKhoaHoc, MaGiangVien, NgayKhaiGiang, SiSoToiDa, LoaiLop, redirectTab } = req.body;
      const tab = redirectTab || 'classes';
      let TrangThaiLop = req.body.TrangThaiLop || 'Sắp mở';

      // =========================================================
      // KIỂM TRA SĨ SỐ TỐI ĐA ĐẦU VÀO
      // =========================================================
      if (!SiSoToiDa || parseInt(SiSoToiDa) <= 0) {
        return res.redirect(`/admin/dashboard?tab=${tab}&error=` + encodeURIComponent(`Lỗi: Sĩ số tối đa phải là một số nguyên dương lớn hơn 0!`));
      }

      const startDate = new Date(NgayKhaiGiang);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startCheck = new Date(NgayKhaiGiang);
      startCheck.setHours(0, 0, 0, 0);

      // =========================================================
      // LOGIC TỰ ĐỘNG TÍNH NGÀY BẾ GIẢNG LẠI SAU KHI SỬA
      // =========================================================
      const [khoaHocInfo] = await pool.query('SELECT ThoiLuong, CapDo, TenKhoaHoc FROM khoahoc WHERE MaKhoaHoc = ?', [MaKhoaHoc]);
      const soBuoiHoc = req.body.SoBuoiHoc ? parseInt(req.body.SoBuoiHoc) : (khoaHocInfo[0]?.ThoiLuong || 26);

      if (!soBuoiHoc || soBuoiHoc <= 0) {
        return res.redirect(`/admin/dashboard?tab=${tab}&error=` + encodeURIComponent('Lỗi: Không xác định được số buổi học.'));
      }

      const [classSchedules] = await pool.query('SELECT ThuTrongTuan FROM thoikhoabieu WHERE MaLopHoc = ?', [id]);
      const dayMap = {
        'Chủ Nhật': 0,
        'Thứ Hai': 1, 'Thứ 2': 1,
        'Thứ Ba': 2, 'Thứ 3': 2,
        'Thứ Tư': 3, 'Thứ 4': 3,
        'Thứ Năm': 4, 'Thứ 5': 4,
        'Thứ Sáu': 5, 'Thứ 6': 5,
        'Thứ Bảy': 6, 'Thứ 7': 6
      };
      let lichHocTrongTuan = classSchedules.map(s => dayMap[s.ThuTrongTuan]).filter(d => d !== undefined);
      if (lichHocTrongTuan.length === 0) {
        lichHocTrongTuan = (LoaiLop === 'Cấp tốc') ? [1, 2, 3, 4, 5] : [1, 3, 5];
      }

      let year, month, day;
      if (typeof NgayKhaiGiang === 'string') {
        const parts = NgayKhaiGiang.split('T')[0].split('-');
        year = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        day = parseInt(parts[2]);
      } else {
        year = NgayKhaiGiang.getFullYear();
        month = NgayKhaiGiang.getMonth();
        day = NgayKhaiGiang.getDate();
      }

      let currentDate = new Date(year, month, day);
      let buoiDaHoc = 0;

      while (buoiDaHoc < soBuoiHoc) {
        let dayOfWeek = currentDate.getDay();

        if (lichHocTrongTuan.includes(dayOfWeek) && !isVietnamHolidayOrCompensatory(currentDate)) {
          buoiDaHoc++;
        }
        if (buoiDaHoc < soBuoiHoc) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      const NgayKetThuc = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

      const classMatrixError = validateClassMatrixConstraints(TenLop, LoaiLop, soBuoiHoc, NgayKhaiGiang, NgayKetThuc, khoaHocInfo[0]?.CapDo, khoaHocInfo[0]?.TenKhoaHoc);
      if (classMatrixError) {
        return res.redirect(`/admin/dashboard?tab=${tab}&error=` + encodeURIComponent(classMatrixError));
      }

      const endCheck = new Date(currentDate);
      endCheck.setHours(23, 59, 59, 999);
      const endDateStr = endCheck.toLocaleDateString('vi-VN');
      const startDateStr = startCheck.toLocaleDateString('vi-VN');
      // =========================================================

      // =========================================================
      // KIỂM TRA RÀNG BUỘC CHẶN THAY ĐỔI NGÀY KHAI GIẢNG NẾU ĐÃ CÓ HỌC VIÊN ĐĂNG KÝ
      // =========================================================
      const [enrollCheck] = await pool.query(
        'SELECT COUNT(*) AS TongSoHocVien FROM dangkyhoc WHERE MaLopHoc = ? AND TrangThai IN ("Thành công", "Đang học", "Chờ duyệt")',
        [id]
      );
      const studentCount = enrollCheck[0] ? enrollCheck[0].TongSoHocVien : 0;

      const [oldClassRow] = await pool.query('SELECT TenLop, NgayKhaiGiang, NgayKetThuc, TrangThaiLop, SiSoToiDa, MaGiangVien, LoaiLop, MaKhoaHoc FROM lophoc WHERE MaLopHoc = ?', [id]);
      if (oldClassRow.length > 0) {
        const oldClassStatus = oldClassRow[0].TrangThaiLop;
        const oldStartStr = oldClassRow[0].NgayKhaiGiang ? new Date(oldClassRow[0].NgayKhaiGiang).toISOString().split('T')[0] : '';
        const oldEndStr = oldClassRow[0].NgayKetThuc ? new Date(oldClassRow[0].NgayKetThuc).toISOString().split('T')[0] : '';

        const isStartDateChanged = oldStartStr && oldStartStr !== NgayKhaiGiang;
        const isEndDateChanged = oldEndStr && oldEndStr !== NgayKetThuc;
        const isTeacherChanged = oldClassRow[0].MaGiangVien != MaGiangVien;
        const isClassTypeChanged = oldClassRow[0].LoaiLop && oldClassRow[0].LoaiLop !== LoaiLop;
        const isCourseChanged = oldClassRow[0].MaKhoaHoc && oldClassRow[0].MaKhoaHoc != MaKhoaHoc;

        if ((oldClassStatus === 'Đang diễn ra' || startCheck <= today) && (isStartDateChanged || isEndDateChanged || isTeacherChanged || isClassTypeChanged || isCourseChanged)) {
          return res.redirect(
            `/admin/dashboard?tab=${tab}&error=` +
              encodeURIComponent('Lỗi Cập nhật: Lớp học đang diễn ra, không được phép thay đổi Giảng viên, Thời gian (Khai giảng/Bế giảng), Loại lớp học và Khóa học!')
          );
        }

        if (studentCount > 0 && oldClassRow[0].TenLop && TenLop && oldClassRow[0].TenLop.trim() !== TenLop.trim()) {
          return res.redirect(`/admin/dashboard?tab=${tab}&error=` + encodeURIComponent(`Lỗi: Không thể thay đổi tên lớp học! Lớp học này đã có ${studentCount} học viên đăng ký.`));
        }
      }
      const newMaxCap = parseInt(SiSoToiDa);

      // BẮT LỖI 1: Update Sĩ số tối đa nhỏ hơn sĩ số hiện tại
      if (newMaxCap < studentCount) {
        return res.redirect(`/admin/dashboard?tab=${tab}&error=` + encodeURIComponent(`Lỗi Sĩ số tối đa: Sĩ số mới (${newMaxCap}) không được nhỏ hơn số học viên hiện tại đang có trong lớp (${studentCount} học viên).`));
      }

      const oldMaxCap = oldClassRow[0] ? oldClassRow[0].SiSoToiDa : 0;
      const isMaxCapChanged = newMaxCap !== oldMaxCap;

      if (isMaxCapChanged) {
        // TRƯỜNG HỢP 1: Kiểm tra nếu lớp học đã diễn ra từ 10% thời lượng/số buổi khóa học -> KHÔNG CHO SỬA SĨ SỐ
        if (startCheck <= today) {
          const totalDurationMs = endCheck.getTime() - startCheck.getTime();
          const elapsedMs = today.getTime() - startCheck.getTime();

          const [sessRows] = await pool.query(
            "SELECT COUNT(DISTINCT NgayHoc) AS SessCount FROM diemdanh WHERE MaLopHoc = ?",
            [id]
          );
          const sessCount = sessRows[0] ? sessRows[0].SessCount : 0;

          const isSessionPassed10 = sessCount >= 3; // >= 3 buổi trên 26 buổi (~11.5% >= 10%)
          const isTimePassed10 = totalDurationMs > 0 && ((elapsedMs / totalDurationMs) * 100 >= 10);

          if (isSessionPassed10 || isTimePassed10) {
            const startStr = startCheck.toLocaleDateString('vi-VN');
            return res.redirect(
              `/admin/dashboard?tab=${tab}&error=` +
                encodeURIComponent(
                  `Lỗi Nâng sĩ số: Lớp học "${TenLop}" đã diễn ra từ 10% thời lượng khóa học rồi! Không thể sửa sĩ số tối đa.`
                )
            );
          }
        }

        // TRƯỜNG HỢP 3: Khi < 10% số buổi nhưng Sức chứa của phòng học KHÔNG ĐỦ -> KHÔNG CHO SỬA SĨ SỐ
        const [roomRows] = await pool.query(
          `SELECT p.TenPhong, p.SucChua
           FROM thoikhoabieu t
           JOIN phonghoc p ON t.MaPhongHoc = p.MaPhongHoc
           WHERE t.MaLopHoc = ?
           LIMIT 1`,
          [id]
        );
        if (roomRows.length > 0 && roomRows[0].SucChua) {
          const roomName = roomRows[0].TenPhong;
          const roomCapacity = parseInt(roomRows[0].SucChua);
          if (newMaxCap > roomCapacity) {
            return res.redirect(
              `/admin/dashboard?tab=${tab}&error=` +
                encodeURIComponent(
                  `Lỗi Sĩ số tối đa: Sức chứa của phòng học không đủ! (Phòng ${roomName} chỉ có sức chứa ${roomCapacity} chỗ, không đủ cho ${newMaxCap} học viên). Vui lòng chọn phòng lớn hơn!`
                )
            );
          }
        }

        // TRƯỜNG HỢP 2: Khi < 10% số buổi VÀ phòng còn sức chứa -> Cho phép cập nhật THÀNH CÔNG!
      }

      // BẮT LỖI 2: Update Trạng thái "Đang diễn ra" khi Sĩ số = 0
      if (req.body.TrangThaiLop === 'Đang diễn ra' && studentCount === 0) {
        return res.redirect(`/admin/dashboard?tab=${tab}&error=` + encodeURIComponent('Lỗi Trạng thái lớp: Lớp học chưa có học viên nào (Sĩ số = 0). Vui lòng thêm học viên trước khi chuyển sang trạng thái "Đang diễn ra".'));
      }

      // BẮT LỖI 3: Update Trạng thái ngược về "Sắp mở" khi Ngày khai giảng ở quá khứ
      if (req.body.TrangThaiLop === 'Sắp mở' && startCheck < today) {
        const dateDisplay = oldClassRow[0] && oldClassRow[0].NgayKhaiGiang ? String(oldClassRow[0].NgayKhaiGiang).substring(0, 10) : NgayKhaiGiang;
        return res.redirect(`/admin/dashboard?tab=${tab}&error=` + encodeURIComponent(`Lỗi Trạng thái lớp: Ngày khai giảng của lớp (${dateDisplay}) đã qua. Nếu muốn mở lại lớp, vui lòng cập nhật Ngày khai giảng mới trong tương lai trước.`));
      }

      // RÀNG BUỘC CHẶN CHUYỂN "ĐÃ ĐÓNG" KHI LỚP CHƯA ĐẾN NGÀY BẾ GIẢNG
      if (req.body.TrangThaiLop === 'Đã đóng' && endCheck >= today) {
        const endDateDisplay = endCheck.toLocaleDateString('vi-VN');
        return res.redirect(`/admin/dashboard?tab=${tab}&error=` + encodeURIComponent(`Lỗi Trạng thái lớp: Không thể chuyển sang "Đã đóng" khi lớp chưa đến ngày bế giảng (${endDateDisplay}). Lớp học đang đào tạo sẽ tự động đóng khi kết thúc khóa học.`));
      }

      // RÀNG BUỘC CHẶN CHUYỂN "ĐANG DIỄN RA" KHI CHƯA ĐẾN NGÀY KHAI GIẢNG HOẶC CHƯA CÓ HỌC VIÊN
      if (req.body.TrangThaiLop === 'Đang diễn ra') {
        if (startCheck > today) {
          const startDateDisplay = startCheck.toLocaleDateString('vi-VN');
          return res.redirect(`/admin/dashboard?tab=${tab}&error=` + encodeURIComponent(`Lỗi Trạng thái lớp: Lớp "${TenLop}" chưa đến ngày khai giảng (${startDateDisplay}). Không thể chuyển sang "Đang diễn ra" trước ngày khai giảng.`));
        }
        if (studentCount === 0) {
          return res.redirect(`/admin/dashboard?tab=${tab}&error=` + encodeURIComponent(`Lỗi Trạng thái lớp: Lớp "${TenLop}" chưa có học viên nào đăng ký (Sĩ số = 0). Không thể chuyển sang "Đang diễn ra".`));
        }
      }

      let finalTrangThaiLop = TrangThaiLop;
      if (endCheck < today) {
        finalTrangThaiLop = 'Đã đóng';
      } else if (startCheck <= today && endCheck >= today && studentCount > 0) {
        finalTrangThaiLop = 'Đang diễn ra';
      } else if (startCheck > today) {
        finalTrangThaiLop = (studentCount >= newMaxCap) ? 'Đã đầy' : 'Sắp mở';
      }

      // Check duplicate
      const [duplicate] = await pool.query(
        'SELECT MaLopHoc FROM lophoc WHERE LOWER(TRIM(TenLop)) = LOWER(TRIM(?)) AND MaLopHoc != ?',
        [TenLop, id]
      );
      if (duplicate.length > 0) {
        return res.redirect(`/admin/dashboard?tab=${tab}&error=` + encodeURIComponent(`Lỗi trùng tên lớp: Tên lớp "${TenLop.trim()}" đã được sử dụng!`));
      }

      // RÀNG BUỘC TRÙNG LỊCH GIẢNG VIÊN
      if (MaGiangVien && tab !== 'public-schedules') {
        const [teacherConflicts] = await pool.query(
          `SELECT t1.ThuTrongTuan, b.TenBuoi, l2.TenLop AS TenLopTrung, u.HoTen AS TenGiangVien
           FROM thoikhoabieu t1
           JOIN thoikhoabieu t2 ON t1.ThuTrongTuan = t2.ThuTrongTuan AND t1.MaBuoiHoc = t2.MaBuoiHoc
           JOIN lophoc l2 ON t2.MaLopHoc = l2.MaLopHoc
           JOIN buoihoc b ON t1.MaBuoiHoc = b.MaBuoiHoc
           JOIN hosonhansu n ON l2.MaGiangVien = n.MaNhanSu
           JOIN nguoidung u ON n.MaNguoiDung = u.MaNguoiDung
           WHERE t1.MaLopHoc = ? AND l2.MaGiangVien = ? AND l2.MaLopHoc != ? AND l2.TrangThaiLop != 'Đã đóng'
             AND DATE(?) <= DATE(l2.NgayKetThuc) AND DATE(?) >= DATE(l2.NgayKhaiGiang)`,
          [id, MaGiangVien, id, NgayKhaiGiang, NgayKetThuc]
        );
        if (teacherConflicts.length > 0) {
          const tc = teacherConflicts[0];
          return res.redirect(`/admin/dashboard?tab=${tab}&error=` + encodeURIComponent(`Lỗi trùng lịch giảng viên!: Giảng viên ${tc.TenGiangVien} đã có lịch dạy lớp "${tc.TenLopTrung}" vào ${tc.ThuTrongTuan} (${tc.TenBuoi})!`));
        }
      }

      // Tự động đồng bộ Loại lớp học dựa theo tên Khóa Học (Khóa Cấp tốc -> Loại Cấp tốc)
      let finalLoaiLop = LoaiLop || 'Tiêu chuẩn';
      if (khoaHocInfo.length > 0 && khoaHocInfo[0].TenKhoaHoc) {
        if (khoaHocInfo[0].TenKhoaHoc.toLowerCase().includes('cấp tốc')) {
          finalLoaiLop = 'Cấp tốc';
        }
      }

      await pool.query(
        'UPDATE lophoc SET TenLop = ?, MaKhoaHoc = ?, MaGiangVien = ?, NgayKhaiGiang = ?, NgayKetThuc = ?, SiSoToiDa = ?, HocPhi = NULL, TrangThaiLop = ?, LoaiLop = ? WHERE MaLopHoc = ?',
        [TenLop, MaKhoaHoc, MaGiangVien || null, NgayKhaiGiang, NgayKetThuc, newMaxCap, finalTrangThaiLop, finalLoaiLop, id]
      );

      // Tự động làm sạch dữ liệu điểm danh cũ nằm trước Ngày Khai Giảng mới
      await pool.query('DELETE FROM diemdanh WHERE MaLopHoc = ? AND NgayHoc < ?', [id, NgayKhaiGiang]);

      let successMsg = `Cập nhật thông tin lớp học "${TenLop.trim()}" thành công!`;
      if (oldClassRow.length > 0 && oldClassRow[0].SiSoToiDa !== newMaxCap) {
        successMsg = `Cập nhật sĩ số tối đa lớp "${TenLop.trim()}" thành công (${newMaxCap} học viên)!`;
      }
      if (oldClassRow.length > 0 && oldClassRow[0].TrangThaiLop !== finalTrangThaiLop) {
        successMsg += ` (Trạng thái lớp: ${finalTrangThaiLop})`;
      }

      res.redirect(`/admin/dashboard?tab=${tab}&success=` + encodeURIComponent(successMsg));
    } catch (err) {
      console.error(err);
      res.redirect(`/admin/dashboard?tab=${req.body.redirectTab || 'classes'}&error=` + encodeURIComponent('Lỗi: ' + err.message));
    }
  }

  static async deleteClass(req, res) {
    const conn = await pool.getConnection();
    try {
      const { id } = req.params;

      // 1. Kiểm tra xem lớp học đã được xếp Thời khóa biểu (lịch học/phòng học) chưa
      const [scheduleCheck] = await conn.query(
        'SELECT COUNT(*) AS cnt FROM thoikhoabieu WHERE MaLopHoc = ?',
        [id]
      );
      const scheduleCount = scheduleCheck[0] ? scheduleCheck[0].cnt : 0;
      if (scheduleCount > 0) {
        conn.release();
        return res.redirect('/admin/dashboard?tab=classes&error=' + encodeURIComponent(`Không thể xóa lớp học này! Lớp học đã được xếp Thời khóa biểu (${scheduleCount} ca học). Vui lòng gỡ lịch học trong mục "Xếp lịch & Phòng học" trước khi xóa.`));
      }

      // 2. Kiểm tra xem lớp học có học viên nào đã đăng ký không
      const [enrollCheck] = await conn.query(
        "SELECT COUNT(*) AS cnt FROM dangkyhoc WHERE MaLopHoc = ? AND TrangThai NOT IN ('Đã hủy')",
        [id]
      );
      const studentCount = enrollCheck[0] ? enrollCheck[0].cnt : 0;
      if (studentCount > 0) {
        conn.release();
        return res.redirect('/admin/dashboard?tab=classes&error=' + encodeURIComponent(`Không thể xóa lớp học này! Lớp đang có ${studentCount} học viên đăng ký. Vui lòng chuyển lớp cho học viên trước khi xóa.`));
      }

      await conn.beginTransaction();

      // 3. Dọn dẹp các bản ghi liên quan nếu có
      await conn.query('DELETE FROM diemdanh WHERE MaLopHoc = ?', [id]);
      await conn.query('DELETE FROM quanlydiem WHERE MaLopHoc = ?', [id]);
      await conn.query('DELETE FROM dangkyhoc WHERE MaLopHoc = ?', [id]);

      // 4. Xóa lớp học khỏi bảng lophoc
      await conn.query('DELETE FROM lophoc WHERE MaLopHoc = ?', [id]);

      await conn.commit();
      conn.release();

      res.redirect('/admin/dashboard?tab=classes&success=' + encodeURIComponent('Xóa lớp học thành công!'));
    } catch (err) {
      if (conn) {
        await conn.rollback();
        conn.release();
      }
      console.error('Lỗi khi xóa lớp học:', err);
      res.redirect('/admin/dashboard?tab=classes&error=' + encodeURIComponent('Không thể xóa lớp học: ' + err.message));
    }
  }

  // 4. Classroom CRUD
  static async addClassroom(req, res) {
    try {
      const { TenPhong, SucChua, ViTri } = req.body;

      // =========================================================
      // KIỂM TRA SỨC CHỨA PHÒNG HỌC (KHÔNG ĐƯỢC NHẬP SỐ ÂM HOẶC 0)
      // =========================================================
      if (!SucChua || parseInt(SucChua) <= 0 || SucChua > 30) {
        return res.redirect('/admin/dashboard?tab=schedules&error=' + encodeURIComponent('Lỗi: Sức chứa của phòng học phải là một số nguyên dương lớn hơn 0 và chỉ chứa tối đa 30 người!'));
      }

      await pool.query(
        'INSERT INTO phonghoc (TenPhong, SucChua, ViTri) VALUES (?, ?, ?)',
        [TenPhong, SucChua, ViTri]
      );
      res.redirect('/admin/dashboard?tab=schedules&success=' + encodeURIComponent('Thêm phòng học thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=schedules&error=' + encodeURIComponent('Không thể thêm phòng học. Lỗi: ' + err.message));
    }
  }

  static async editClassroom(req, res) {
    try {
      const { id } = req.params;
      const { TenPhong, SucChua, ViTri } = req.body;

      // =========================================================
      // KIỂM TRA SỨC CHỨA PHÒNG HỌC (KHÔNG ĐƯỢC NHẬP SỐ ÂM HOẶC 0)
      // =========================================================
      const newCap = parseInt(SucChua);

      // RÀNG BUỘC: Sức chứa mới của phòng không được nhỏ hơn Sĩ số tối đa của bất kỳ lớp nào đang xếp trong phòng này
      const [classCheck] = await pool.query(
        `SELECT l.TenLop, l.SiSoToiDa
         FROM thoikhoabieu t
         JOIN lophoc l ON t.MaLopHoc = l.MaLopHoc
         WHERE t.MaPhongHoc = ? AND l.TrangThaiLop NOT IN ('Đã đóng', 'Kết thúc', 'Đã kết thúc')
         ORDER BY l.SiSoToiDa DESC
         LIMIT 1`,
        [id]
      );

      if (classCheck.length > 0) {
        const maxClassCap = classCheck[0].SiSoToiDa;
        if (newCap < maxClassCap) {
          return res.redirect(
            '/admin/dashboard?tab=schedules&error=' +
              encodeURIComponent(
                `Sức chứa của phòng học không được nhỏ hơn sĩ số tối đa của lớp (Sĩ số tối đa: ${maxClassCap} học viên). Vui lòng chọn phòng khác hoặc điều chỉnh lại thông tin!`
              )
          );
        }
      }

      await pool.query(
        'UPDATE phonghoc SET TenPhong = ?, SucChua = ?, ViTri = ? WHERE MaPhongHoc = ?',
        [TenPhong, SucChua, ViTri, id]
      );
      res.redirect('/admin/dashboard?tab=schedules&success=' + encodeURIComponent('Cập nhật phòng học thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=schedules&error=' + encodeURIComponent('Không thể cập nhật phòng học. Lỗi: ' + err.message));
    }
  }

  static async deleteClassroom(req, res) {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM phonghoc WHERE MaPhongHoc = ?', [id]);
      res.redirect('/admin/dashboard?tab=schedules&success=' + encodeURIComponent('Xóa phòng học thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=schedules&error=' + encodeURIComponent('Không thể xóa phòng học.'));
    }
  }

  // 5. Session CRUD
  static async addSession(req, res) {
    try {
      const { TenBuoi, GioBatDau, GioKetThuc } = req.body;
      await pool.query(
        'INSERT INTO buoihoc (TenBuoi, GioBatDau, GioKetThuc) VALUES (?, ?, ?)',
        [TenBuoi, GioBatDau, GioKetThuc]
      );
      res.redirect('/admin/dashboard?tab=schedules&success=' + encodeURIComponent('Thêm ca học thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=schedules&error=' + encodeURIComponent('Không thể thêm ca học. Lỗi: ' + err.message));
    }
  }

  static async editSession(req, res) {
    try {
      const { id } = req.params;
      const { TenBuoi, GioBatDau, GioKetThuc } = req.body;
      await pool.query(
        'UPDATE buoihoc SET TenBuoi = ?, GioBatDau = ?, GioKetThuc = ? WHERE MaBuoiHoc = ?',
        [TenBuoi, GioBatDau, GioKetThuc, id]
      );
      res.redirect('/admin/dashboard?tab=schedules&success=' + encodeURIComponent('Cập nhật ca học thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=schedules&error=' + encodeURIComponent('Không thể cập nhật ca học. Lỗi: ' + err.message));
    }
  }

  static async deleteSession(req, res) {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM buoihoc WHERE MaBuoiHoc = ?', [id]);
      res.redirect('/admin/dashboard?tab=schedules&success=' + encodeURIComponent('Xóa ca học thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=schedules&error=' + encodeURIComponent('Không thể xóa ca học.'));
    }
  }

  // Hàm tự động tính toán & cập nhật Ngày kết thúc (Ngược) từ Thời khóa biểu thực tế
  static async recalculateClassEndDate(maLopHoc) {
    try {
      const [clsRows] = await pool.query(
        `SELECT l.NgayKhaiGiang, l.MaKhoaHoc, l.LoaiLop, k.ThoiLuong
         FROM lophoc l
         JOIN khoahoc k ON l.MaKhoaHoc = k.MaKhoaHoc
         WHERE l.MaLopHoc = ?`,
        [maLopHoc]
      );
      if (clsRows.length === 0 || !clsRows[0].NgayKhaiGiang) return;

      const { NgayKhaiGiang, ThoiLuong, LoaiLop } = clsRows[0];
      const soBuoiHoc = Number(ThoiLuong || 26);

      const [tkbRows] = await pool.query(
        `SELECT DISTINCT ThuTrongTuan FROM thoikhoabieu WHERE MaLopHoc = ?`,
        [maLopHoc]
      );

      const dayMap = {
        'Chủ Nhật': 0, 'Thứ Hai': 1, 'Thứ Ba': 2, 'Thứ Tư': 3, 'Thứ Năm': 4, 'Thứ Sáu': 5, 'Thứ Bảy': 6
      };
      let targetDays = tkbRows.map(r => dayMap[r.ThuTrongTuan]).filter(d => d !== undefined);
      if (targetDays.length === 0) {
        // Mặc định lớp Tiêu chuẩn học 3 buổi/tuần (T2, T4, T6), lớp Cấp tốc học 5 buổi/tuần (T2 -> T6)
        targetDays = (LoaiLop === 'Cấp tốc') ? [1, 2, 3, 4, 5] : [1, 3, 5];
      }

      let y, m, d;
      if (typeof NgayKhaiGiang === 'string') {
        const parts = NgayKhaiGiang.split('T')[0].split('-');
        y = parseInt(parts[0]);
        m = parseInt(parts[1]) - 1;
        d = parseInt(parts[2]);
      } else {
        y = NgayKhaiGiang.getFullYear();
        m = NgayKhaiGiang.getMonth();
        d = NgayKhaiGiang.getDate();
      }

      let currentDate = new Date(y, m, d);
      let buoiDaHoc = 0;

      while (buoiDaHoc < soBuoiHoc) {
        let dayOfWeek = currentDate.getDay();
        if (targetDays.includes(dayOfWeek) && !isVietnamHolidayOrCompensatory(currentDate)) {
          buoiDaHoc++;
        }
        if (buoiDaHoc < soBuoiHoc) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      const endY = currentDate.getFullYear();
      const endM = String(currentDate.getMonth() + 1).padStart(2, '0');
      const endD = String(currentDate.getDate()).padStart(2, '0');
      const NgayKetThucCalculated = `${endY}-${endM}-${endD}`;

      await pool.query('UPDATE lophoc SET NgayKetThuc = ? WHERE MaLopHoc = ?', [NgayKetThucCalculated, maLopHoc]);
    } catch (e) {
      console.error('Error recalculating class end date:', e);
    }
  }

  // 6. Schedule (TKB) CRUD & Conflict check (Grouped by Class)
  static async deleteTKB(req, res) {
    try {
      const { id } = req.params; // id ở đây là MaTKB hoặc MaLopHoc

      // 1. Truy vấn tìm thông tin TKB và Lớp học liên quan
      const [tkbRows] = await pool.query(`
        SELECT t.*, l.TenLop, l.TrangThaiLop, l.NgayKhaiGiang 
        FROM thoikhoabieu t
        JOIN lophoc l ON t.MaLopHoc = l.MaLopHoc
        WHERE t.MaTKB = ? OR t.MaLopHoc = ?
      `, [id, id]);

      if (tkbRows.length === 0) {
        return res.redirect('/admin/dashboard?tab=schedules&error=' + encodeURIComponent('Không tìm thấy lịch học cần xóa!'));
      }

      const targetClassId = tkbRows[0].MaLopHoc;
      const classStatus = tkbRows[0].TrangThaiLop;
      const className = tkbRows[0].TenLop;

      // =========================================================
      // 2. RÀNG BUỘC NGHIỆP VỤ: CHẶN XÓA LỊCH NẾU LỚP ĐANG DIỄN RA HOẶC ĐÃ ĐÓNG
      // =========================================================
      if (classStatus === 'Đang diễn ra') {
        return res.redirect('/admin/dashboard?tab=schedules&error=' + encodeURIComponent('Lớp học đang diễn ra, không được sửa thời gian và phòng học!'));
      }

      if (classStatus === 'Đã đóng') {
        return res.redirect('/admin/dashboard?tab=schedules&error=' + encodeURIComponent(`Không thể xóa lịch! Lớp "${className}" đã kết thúc hoặc đã đóng.`));
      }

      // 3. RÀNG BUỘC SĨ SỐ: Kiểm tra xem lớp đã có học viên đăng ký hoặc thanh toán hay chưa
      const [enrollCheck] = await pool.query(`
        SELECT COUNT(*) AS TongSoHocVien 
        FROM dangkyhoc 
        WHERE MaLopHoc = ? AND TrangThai IN ('Thành công', 'Đang học', 'Chờ duyệt')
      `, [targetClassId]);

      const activeStudents = enrollCheck[0]?.TongSoHocVien || 0;
      if (activeStudents > 0) {
        return res.redirect('/admin/dashboard?tab=schedules&error=' + encodeURIComponent(`Không thể xóa thời khóa biểu! Lớp "${className}" hiện đã có ${activeStudents} học viên đăng ký / thanh toán học phí.`));
      }

      // =========================================================
      // 4. TIẾN HÀNH XÓA LỊCH VÀ TÍNH TOÁN LẠI NGÀY BẾ GIẢNG
      // =========================================================
      await pool.query('DELETE FROM thoikhoabieu WHERE MaLopHoc = ? OR MaTKB = ?', [targetClassId, id]);

      // Tự động cập nhật lại ngày kết thúc của lớp bám theo lịch mới
      await AdminController.recalculateClassEndDate(targetClassId);

      res.redirect('/admin/dashboard?tab=schedules&success=' + encodeURIComponent('Xóa lịch học của lớp thành công! Ngày bế giảng đã được tự động tính toán lại.'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=schedules&error=' + encodeURIComponent('Không thể xóa lịch học. Lỗi: ' + err.message));
    }
  }

  // 6. Schedule (TKB) CRUD & Conflict check (Grouped by Class)
  static async addTKB(req, res) {
    try {
      let { MaLopHoc, MaPhongHoc, MaBuoiHoc, ThuTrongTuan } = req.body;
      if (!ThuTrongTuan) {
        return res.redirect('/admin/dashboard?tab=schedules&error=' + encodeURIComponent('Vui lòng chọn ít nhất 1 Thứ trong tuần!'));
      }

      // =========================================================
      // 1. LẤY THÔNG TIN NGÀY THÁNG CỦA LỚP ĐANG XẾP LỊCH ĐỂ SO SÁNH
      // =========================================================
      const [classCheckRows] = await pool.query('SELECT TenLop, TrangThaiLop, NgayKhaiGiang, NgayKetThuc FROM lophoc WHERE MaLopHoc = ?', [MaLopHoc]);
      if (classCheckRows.length === 0) {
        return res.redirect('/admin/dashboard?tab=schedules&error=' + encodeURIComponent('Lớp học không tồn tại!'));
      }

      const { TenLop, TrangThaiLop, NgayKhaiGiang, NgayKetThuc } = classCheckRows[0];

      if (TrangThaiLop === 'Đang diễn ra') {
        return res.redirect('/admin/dashboard?tab=schedules&error=' + encodeURIComponent('Lớp học đang diễn ra, không được sửa thời gian và phòng học!'));
      }

      if (TrangThaiLop === 'Đã đóng') {
        return res.redirect('/admin/dashboard?tab=schedules&error=' + encodeURIComponent(`Không thể thêm/cập nhật lịch! Lớp "${TenLop}" đã kết thúc hoặc đã đóng.`));
      }

      const [enrollCheck] = await pool.query(`
        SELECT COUNT(*) AS TongSoHocVien 
        FROM dangkyhoc 
        WHERE MaLopHoc = ? AND TrangThai IN ('Thành công', 'Đang học', 'Chờ duyệt')
      `, [MaLopHoc]);

      const activeStudents = enrollCheck[0]?.TongSoHocVien || 0;
      if (activeStudents > 0) {
        return res.redirect('/admin/dashboard?tab=schedules&error=' + encodeURIComponent(`Không thể thay đổi thời khóa biểu! Lớp "${TenLop}" hiện đã có ${activeStudents} học viên đăng ký / thanh toán học phí. Việc đổi lịch sẽ ảnh hưởng trực tiếp tới lịch học của học viên đã đóng tiền.`));
      }
      // =========================================================

      // XỬ LÝ FORMAT NGÀY THÁNG CHUẨN ĐỂ ĐƯA VÀO MYSQL SO SÁNH
      function formatDateToYMD(dateObj) {
        if (!dateObj) return null;
        const d = new Date(dateObj);
        if (isNaN(d.getTime())) return null;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }

      const startStr = formatDateToYMD(NgayKhaiGiang) || '1970-01-01';
      let endStr = formatDateToYMD(NgayKetThuc);
      if (!endStr) {
        const d = new Date(startStr);
        d.setMonth(d.getMonth() + 3);
        endStr = formatDateToYMD(d);
      }

      const days = Array.isArray(ThuTrongTuan) ? ThuTrongTuan : [ThuTrongTuan];

      // 2. RÀNG BUỘC SỨC CHỨA PHÒNG HỌC
      const [roomRows] = await pool.query('SELECT TenPhong, SucChua FROM phonghoc WHERE MaPhongHoc = ?', [MaPhongHoc]);
      const [classSizeRows] = await pool.query('SELECT TenLop, SiSoToiDa FROM lophoc WHERE MaLopHoc = ?', [MaLopHoc]);
      if (roomRows.length > 0) {
        if (classSizeRows.length > 0 && roomRows[0].SucChua < classSizeRows[0].SiSoToiDa) {
          return res.redirect('/admin/dashboard?tab=schedules&error=' + encodeURIComponent(`Lỗi sức chứa phòng học!: Phòng "${roomRows[0].TenPhong}" chỉ có sức chứa ${roomRows[0].SucChua} chỗ ngồi, không đủ cho sĩ số tối đa ${classSizeRows[0].SiSoToiDa} học viên của lớp "${classSizeRows[0].TenLop}"!`));
        }
      }

      // 3. RÀNG BUỘC TRÙNG LỊCH PHÒNG HỌC (CHỈ BÁO KHI KHOẢNG THỜI GIAN HỌC THỰC TẾ BỊ CHỒNG NHAU)
      for (const day of days) {
        const [roomConflicts] = await pool.query(
          `SELECT t.*, l.TenLop, DATE_FORMAT(l.NgayKhaiGiang, '%d/%m/%Y') AS NgayKhaiGiangStr, DATE_FORMAT(l.NgayKetThuc, '%d/%m/%Y') AS NgayKetThucStr, p.TenPhong, b.TenBuoi 
           FROM thoikhoabieu t 
           JOIN lophoc l ON t.MaLopHoc = l.MaLopHoc 
           JOIN phonghoc p ON t.MaPhongHoc = p.MaPhongHoc 
           JOIN buoihoc b ON t.MaBuoiHoc = b.MaBuoiHoc 
           WHERE t.MaPhongHoc = ? AND t.MaBuoiHoc = ? AND t.ThuTrongTuan = ? AND t.MaLopHoc != ?
             AND l.TrangThaiLop != 'Đã đóng'
             AND DATE(IFNULL(l.NgayKhaiGiang, '1970-01-01')) <= DATE(?)
             AND DATE(IFNULL(l.NgayKetThuc, '2099-12-31')) >= DATE(?)`,
          [MaPhongHoc, MaBuoiHoc, day, MaLopHoc, endStr, startStr]
        );

        if (roomConflicts.length > 0) {
          const rc = roomConflicts[0];
          return res.redirect('/admin/dashboard?tab=schedules&error=' + encodeURIComponent(`Lỗi trùng lịch phòng học!: Phòng "${rc.TenPhong}" đang được xếp cho lớp "${rc.TenLop}" vào ${day} (${rc.TenBuoi}) từ ${rc.NgayKhaiGiangStr} đến ${rc.NgayKetThucStr}! Thời gian 2 lớp bị chồng lên nhau.`));
        }
      }

      // 4. RÀNG BUỘC TRÙNG LỊCH GIẢNG VIÊN (CHỈ BÁO KHI KHOẢNG THỜI GIAN HỌC THỰC TẾ BỊ CHỒNG NHAU)
      const [classRow] = await pool.query('SELECT MaGiangVien, TenLop FROM lophoc WHERE MaLopHoc = ?', [MaLopHoc]);
      const maGiangVien = classRow.length > 0 ? classRow[0].MaGiangVien : null;

      if (maGiangVien) {
        for (const day of days) {
          const [lecturerConflicts] = await pool.query(
            `SELECT t.*, l.TenLop, DATE_FORMAT(l.NgayKhaiGiang, '%d/%m/%Y') AS NgayKhaiGiangStr, DATE_FORMAT(l.NgayKetThuc, '%d/%m/%Y') AS NgayKetThucStr, b.TenBuoi, u.HoTen AS TenGiangVien
             FROM thoikhoabieu t 
             JOIN lophoc l ON t.MaLopHoc = l.MaLopHoc 
             JOIN buoihoc b ON t.MaBuoiHoc = b.MaBuoiHoc
             JOIN hosonhansu n ON l.MaGiangVien = n.MaNhanSu
             JOIN nguoidung u ON n.MaNguoiDung = u.MaNguoiDung
             WHERE l.MaGiangVien = ? AND t.MaBuoiHoc = ? AND t.ThuTrongTuan = ? AND t.MaLopHoc != ?
               AND l.TrangThaiLop != 'Đã đóng'
               AND DATE(IFNULL(l.NgayKhaiGiang, '1970-01-01')) <= DATE(?)
               AND DATE(IFNULL(l.NgayKetThuc, '2099-12-31')) >= DATE(?)`,
            [maGiangVien, MaBuoiHoc, day, MaLopHoc, endStr, startStr]
          );
          if (lecturerConflicts.length > 0) {
            const lc = lecturerConflicts[0];
            return res.redirect('/admin/dashboard?tab=schedules&error=' + encodeURIComponent(`Lỗi trùng lịch giảng viên!: Giảng viên "${lc.TenGiangVien}" đang có lịch dạy lớp "${lc.TenLop}" vào ${day} (${lc.TenBuoi}) từ ${lc.NgayKhaiGiangStr} đến ${lc.NgayKetThucStr}!`));
          }
        }
      }

      // Xóa lịch cũ của lớp này và cập nhật lại danh sách thứ mới chọn
      await pool.query('DELETE FROM thoikhoabieu WHERE MaLopHoc = ?', [MaLopHoc]);
      for (const day of days) {
        await pool.query(
          'INSERT INTO thoikhoabieu (MaLopHoc, MaPhongHoc, MaBuoiHoc, ThuTrongTuan) VALUES (?, ?, ?, ?)',
          [MaLopHoc, MaPhongHoc, MaBuoiHoc, day]
        );
      }

      // TỰ ĐỘNG CẬP NHẬT NGÀY KẾT THÚC TỪ THỜI KHÓA BIỂU ĐĐ XẾP
      await AdminController.recalculateClassEndDate(MaLopHoc);

      res.redirect('/admin/dashboard?tab=schedules&success=' + encodeURIComponent('Cập nhật/Xếp lịch học thành công! Ngày bế giảng đã tự động cập nhật bám theo thời khóa biểu thực tế.'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=schedules&error=' + encodeURIComponent('Không thể cập nhật lịch học. Lỗi: ' + err.message));
    }
  }

  static async updateTKB(req, res) {
    return await AdminController.addTKB(req, res);
  }

  // 7. News CRUD
  static async addNews(req, res) {
    try {
      const { TieuDe, TomTat, NoiDung, HinhAnh } = req.body;
      const imageUrl = HinhAnh || '/images/logo.png';
      const authorId = req.session.user.MaNguoiDung;

      await pool.query(
        'INSERT INTO tintuc (TieuDe, TomTat, NoiDung, HinhAnh, NgayDang, MaNguoiDang) VALUES (?, ?, ?, ?, NOW(), ?)',
        [TieuDe, TomTat, NoiDung, imageUrl, authorId]
      );
      res.redirect('/admin/dashboard?tab=content&success=' + encodeURIComponent('Đăng bài tin tức thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=content&error=' + encodeURIComponent('Không thể đăng tin tức. Lỗi: ' + err.message));
    }
  }

  static async editNews(req, res) {
    try {
      const { id } = req.params;
      const { TieuDe, TomTat, NoiDung, HinhAnh } = req.body;
      const imageUrl = HinhAnh || '/images/logo.png';

      await pool.query(
        'UPDATE tintuc SET TieuDe = ?, TomTat = ?, NoiDung = ?, HinhAnh = ? WHERE MaTinTuc = ?',
        [TieuDe, TomTat, NoiDung, imageUrl, id]
      );
      res.redirect('/admin/dashboard?tab=content&success=' + encodeURIComponent('Cập nhật tin tức thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=content&error=' + encodeURIComponent('Không thể cập nhật tin tức. Lỗi: ' + err.message));
    }
  }

  static async deleteNews(req, res) {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM tintuc WHERE MaTinTuc = ?', [id]);
      res.redirect('/admin/dashboard?tab=content&success=' + encodeURIComponent('Xóa bài viết thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=content&error=' + encodeURIComponent('Không thể xóa bài viết. Lỗi: ' + err.message));
    }
  }

  // 8. Promotions CRUD
  static async addPromotion(req, res) {
    try {
      const { TenKhuyenMai, PhanTramGiam, MaCode, NgayBatDau, NgayKetThuc, NoiDung } = req.body;
      let HinhAnh = '/images/logo.png';
      if (req.file) {
        HinhAnh = '/uploads/' + req.file.filename;
      }
      await pool.query(
        'INSERT INTO khuyenmai (TenKhuyenMai, PhanTramGiam, MaCode, NgayBatDau, NgayKetThuc, HinhAnh, NoiDung) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [TenKhuyenMai, PhanTramGiam, MaCode, NgayBatDau, NgayKetThuc, HinhAnh, NoiDung]
      );
      res.redirect('/admin/dashboard?tab=promotions&success=' + encodeURIComponent('Thêm mã khuyến mãi thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=promotions&error=' + encodeURIComponent('Không thể thêm khuyến mãi. Lỗi: ' + err.message));
    }
  }

  static async editPromotion(req, res) {
    try {
      const { id } = req.params;
      const { TenKhuyenMai, PhanTramGiam, MaCode, NgayBatDau, NgayKetThuc, NoiDung } = req.body;
      let HinhAnh = req.body.HinhAnhExist || '/images/logo.png';
      if (req.file) {
        HinhAnh = '/uploads/' + req.file.filename;
      }
      await pool.query(
        'UPDATE khuyenmai SET TenKhuyenMai = ?, PhanTramGiam = ?, MaCode = ?, NgayBatDau = ?, NgayKetThuc = ?, HinhAnh = ?, NoiDung = ? WHERE MaKhuyenMai = ?',
        [TenKhuyenMai, PhanTramGiam, MaCode, NgayBatDau, NgayKetThuc, HinhAnh, NoiDung, id]
      );
      res.redirect('/admin/dashboard?tab=promotions&success=' + encodeURIComponent('Cập nhật khuyến mãi thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=promotions&error=' + encodeURIComponent('Không thể cập nhật khuyến mãi. Lỗi: ' + err.message));
    }
  }

  static async deletePromotion(req, res) {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM khuyenmai WHERE MaKhuyenMai = ?', [id]);
      res.redirect('/admin/dashboard?tab=promotions&success=' + encodeURIComponent('Xóa khuyến mãi thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=promotions&error=' + encodeURIComponent('Không thể xóa khuyến mãi. Lỗi: ' + err.message));
    }
  }

  // =========================================================================
  // CHỨC NĂNG 9: QUẢN LÝ TÀI KHOẢN NGƯỜI DÙNG & MẬT KHẨU (ADMIN)
  // =========================================================================

  /**
   * [CHỨC NĂNG 9.1] Thêm tài khoản người dùng mới
   * Xử lý: Kiểm tra SĐT & Email trùng lặp, mã hóa mật khẩu bằng Bcrypt,
   * tự động tạo Hồ sơ Học viên hoặc Hồ sơ Nhân sự tương ứng theo Vai trò.
   */
  static async addAccount(req, res) {
    const conn = await pool.getConnection();
    try {
      const { HoTen, Email, SoDienThoai, MatKhau, MaVaiTro, TrangThai } = req.body;
      let AnhDaiDien = req.body.AnhDaiDien;
      if (req.file) {
        AnhDaiDien = '/uploads/' + req.file.filename;
      }

      const cleanPhone = SoDienThoai ? SoDienThoai.trim() : '';
      const phoneRegex = /^(03|05|07|08|09)[0-9]{8}$/;
      if (!phoneRegex.test(cleanPhone)) {
        return res.redirect('/admin/dashboard?tab=accounts&error=' + encodeURIComponent('Số điện thoại không hợp lệ! Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09).'));
      }

      // Validate email exists
      const [existing] = await conn.query('SELECT * FROM nguoidung WHERE Email = ?', [Email]);
      if (existing.length > 0) {
        return res.redirect('/admin/dashboard?tab=accounts&error=' + encodeURIComponent('Email đã tồn tại!'));
      }

      // Validate phone exists
      const [existingPhone] = await conn.query('SELECT * FROM nguoidung WHERE SoDienThoai = ?', [cleanPhone]);
      if (existingPhone.length > 0) {
        return res.redirect('/admin/dashboard?tab=accounts&error=' + encodeURIComponent(`Số điện thoại "${cleanPhone}" đã được sử dụng bởi tài khoản khác (${existingPhone[0].HoTen} - ${existingPhone[0].Email})!`));
      }

      await conn.beginTransaction();

      const hashedPass = await bcrypt.hash(MatKhau, 10);
      const defaultAvatar = AnhDaiDien || '/images/avatar-default.png';

      // Insert account
      const [userResult] = await conn.query(
        'INSERT INTO nguoidung (HoTen, Email, SoDienThoai, MatKhau, AnhDaiDien, MaVaiTro, TrangThai, NgayTao) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
        [HoTen, Email, cleanPhone, hashedPass, defaultAvatar, MaVaiTro, TrangThai || 'Hoạt động']
      );
      const newUserId = userResult.insertId;

      // Handle profile creation depending on Role
      if (parseInt(MaVaiTro) === 3) {
        // Student role
        await conn.query(
          'INSERT INTO hosohocvien (MaNguoiDung, HoTen, QuanHe, TrinhDoHienTai) VALUES (?, ?, "Bản thân", "Chưa xác định")',
          [newUserId, HoTen]
        );
      } else if (parseInt(MaVaiTro) === 2 || parseInt(MaVaiTro) === 1) {
        // Teacher or Admin role -> Create staff profile
        const chucVu = parseInt(MaVaiTro) === 1 ? 'Quản lý' : 'Giảng viên';
        await conn.query(
          'INSERT INTO hosonhansu (MaNguoiDung, ChucVu, NgayVaoLam) VALUES (?, ?, NOW())',
          [newUserId, chucVu]
        );
      }

      await conn.commit();
      res.redirect('/admin/dashboard?tab=accounts&success=' + encodeURIComponent('Thêm tài khoản thành công!'));
    } catch (err) {
      if (conn) await conn.rollback();
      console.error(err);
      res.redirect('/admin/dashboard?tab=accounts&error=' + encodeURIComponent('Lỗi khi thêm tài khoản: ' + err.message));
    } finally {
      if (conn) conn.release();
    }
  }

  /**
   * [CHỨC NĂNG 9.2] Cập nhật thông tin & Khóa / Kích hoạt tài khoản
   * Xử lý: Cập nhật thông tin cơ bản, chặn Khóa tài khoản nếu Giảng viên 
   * đang có lớp dạy hoặc Học viên đang tham gia khóa học chưa kết thúc.
   */
  static async editAccount(req, res) {
    try {
      const { id } = req.params;
      const { HoTen, SoDienThoai, MaVaiTro, TrangThai } = req.body;
      let AnhDaiDien = req.body.AnhDaiDien;
      if (req.file) {
        AnhDaiDien = '/uploads/' + req.file.filename;
      }

      const cleanPhone = SoDienThoai ? SoDienThoai.trim() : '';
      const phoneRegex = /^(03|05|07|08|09)[0-9]{8}$/;
      if (!phoneRegex.test(cleanPhone)) {
        return res.redirect('/admin/dashboard?tab=accounts&error=' + encodeURIComponent('Số điện thoại không hợp lệ! Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09).'));
      }

      const [dupPhone] = await pool.query('SELECT * FROM nguoidung WHERE SoDienThoai = ? AND MaNguoiDung != ?', [cleanPhone, id]);
      if (dupPhone.length > 0) {
        return res.redirect('/admin/dashboard?tab=accounts&error=' + encodeURIComponent(`Số điện thoại "${cleanPhone}" đã được sử dụng bởi tài khoản khác (${dupPhone[0].HoTen} - ${dupPhone[0].Email})!`));
      }

      // --- BẮT ĐẦU ĐOẠN LOGIC KIỂM TRA MỚI THÊM VÀO ---
      if (TrangThai === 'Khóa') {
        // Kiểm tra 1: Nếu là Giảng viên -> Xem có lớp nào đang 'Sắp mở' hoặc 'Đang diễn ra' không
        const [teacherCheck] = await pool.query(`
          SELECT COUNT(*) as ActiveClasses
          FROM lophoc l
          JOIN hosonhansu n ON l.MaGiangVien = n.MaNhanSu
          WHERE n.MaNguoiDung = ? AND l.TrangThaiLop IN ('Sắp mở', 'Đang diễn ra')
        `, [id]);

        if (teacherCheck[0].ActiveClasses > 0) {
          return res.redirect('/admin/dashboard?tab=accounts&error=' + encodeURIComponent('Không thể khóa! Giảng viên này đang có lịch dạy lớp Sắp mở hoặc Đang diễn ra.'));
        }

        // Kiểm tra 2: Nếu là Học viên -> Xem có lớp nào đang 'Thành công' (đã đóng tiền chuẩn bị học) hoặc 'Đang học' không
        const [studentCheck] = await pool.query(`
          SELECT COUNT(*) as ActiveEnrollments
          FROM dangkyhoc d
          JOIN hosohocvien h ON d.MaHocVien = h.MaHocVien
          WHERE h.MaNguoiDung = ? AND d.TrangThai IN ('Thành công', 'Đang học')
        `, [id]);

        if (studentCheck[0].ActiveEnrollments > 0) {
          return res.redirect('/admin/dashboard?tab=accounts&error=' + encodeURIComponent('Không thể khóa! Học viên này đang có khóa học chưa kết thúc.'));
        }
      }
      // --- KẾT THÚC ĐOẠN LOGIC KIỂM TRA ---

      // Update basic fields (Email is read-only)
      await pool.query(
        'UPDATE nguoidung SET HoTen = ?, SoDienThoai = ?, MaVaiTro = ?, TrangThai = ?, AnhDaiDien = ? WHERE MaNguoiDung = ?',
        [HoTen, cleanPhone, MaVaiTro, TrangThai, AnhDaiDien || '/images/avatar-default.png', id]
      );

      res.redirect('/admin/dashboard?tab=accounts&success=' + encodeURIComponent('Cập nhật thông tin tài khoản thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=accounts&error=' + encodeURIComponent('Không thể cập nhật tài khoản: ' + err.message));
    }
  }

  static async changePassword(req, res) {
    try {
      const { id } = req.params;
      const { MatKhauMoi } = req.body;
      const hashedPass = await bcrypt.hash(MatKhauMoi, 10);

      await pool.query('UPDATE nguoidung SET MatKhau = ? WHERE MaNguoiDung = ?', [hashedPass, id]);
      res.redirect('/admin/dashboard?tab=accounts&success=' + encodeURIComponent('Đổi mật khẩu tài khoản thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=accounts&error=' + encodeURIComponent('Lỗi đổi mật khẩu: ' + err.message));
    }
  }

  static async deleteAccount(req, res) {
    const conn = await pool.getConnection();
    try {
      const { id } = req.params;

      const [userRows] = await conn.query(
        `SELECT u.*, r.TenVaiTro 
         FROM nguoidung u 
         LEFT JOIN vaitro r ON u.MaVaiTro = r.MaVaiTro 
         WHERE u.MaNguoiDung = ?`,
        [id]
      );

      if (userRows.length === 0) {
        return res.redirect('/admin/dashboard?tab=accounts&error=' + encodeURIComponent('Tài khoản không tồn tại!'));
      }

      const userAcc = userRows[0];
      const roleName = userAcc.TenVaiTro || '';

      // 1. Nếu là Admin -> Báo không được xóa
      if (roleName === 'Admin' || userAcc.MaVaiTro === 1) {
        return res.redirect('/admin/dashboard?tab=accounts&error=' + encodeURIComponent('Không thể xóa! Quản trị viên (Admin) không được phép xóa.'));
      }

      // 2. Nếu là Giảng viên -> Kiểm tra lịch dạy
      if (roleName.includes('Giảng viên') || roleName.includes('Nhân sự') || userAcc.MaVaiTro === 2) {
        const [teacherClasses] = await conn.query(
          `SELECT COUNT(*) AS cnt 
           FROM lophoc l 
           JOIN hosonhansu n ON l.MaGiangVien = n.MaNhanSu 
           WHERE n.MaNguoiDung = ?`,
          [id]
        );
        if (teacherClasses[0].cnt > 0) {
          return res.redirect('/admin/dashboard?tab=accounts&error=' + encodeURIComponent('Không thể xóa! Giảng viên này đã có lịch dạy các lớp học trên hệ thống.'));
        }
      }

      // 3. Nếu là Học viên -> Kiểm tra lịch học / đóng học phí
      if (roleName.includes('Học viên') || userAcc.MaVaiTro === 3) {
        const [studentEnrollments] = await conn.query(
          `SELECT COUNT(*) AS cnt 
           FROM dangkyhoc d 
           JOIN hosohocvien h ON d.MaHocVien = h.MaHocVien 
           WHERE h.MaNguoiDung = ?`,
          [id]
        );
        if (studentEnrollments[0].cnt > 0) {
          return res.redirect('/admin/dashboard?tab=accounts&error=' + encodeURIComponent('Không thể xóa! Học viên này đã có lịch học / lịch sử đóng học phí trên hệ thống.'));
        }
      }

      await conn.beginTransaction();

      // Delete references first
      await conn.query('DELETE FROM hosonhansu WHERE MaNguoiDung = ?', [id]);
      await conn.query('DELETE FROM hosohocvien WHERE MaNguoiDung = ?', [id]);
      await conn.query('DELETE FROM nguoidung WHERE MaNguoiDung = ?', [id]);

      await conn.commit();
      res.redirect('/admin/dashboard?tab=accounts&success=' + encodeURIComponent('Xóa tài khoản thành công!'));
    } catch (err) {
      if (conn) await conn.rollback();
      console.error(err);
      res.redirect('/admin/dashboard?tab=accounts&error=' + encodeURIComponent('Không thể xóa tài khoản này: ' + err.message));
    } finally {
      if (conn) conn.release();
    }
  }

  // 10. Staff Profile CRUD
  static async addStaff(req, res) {
    const conn = await pool.getConnection();
    try {
      const { HoTen, Email, SoDienThoai, MatKhau, MaVaiTro, ChucVu, HocVi, ChungChiNgoaiNgu, KinhNghiem, NgayVaoLam, NgaySinh, DiaChi } = req.body;

      // Validate email exists
      const [existing] = await conn.query('SELECT * FROM nguoidung WHERE Email = ?', [Email]);
      if (existing.length > 0) {
        return res.redirect('/admin/dashboard?tab=staff&error=' + encodeURIComponent('Email đã tồn tại!'));
      }

      await conn.beginTransaction();

      const hashedPass = await bcrypt.hash(MatKhau || '123456', 10);
      const defaultAvatar = '/images/avatar-default.png';

      // Insert account
      const [userResult] = await conn.query(
        'INSERT INTO nguoidung (HoTen, Email, SoDienThoai, MatKhau, AnhDaiDien, MaVaiTro, TrangThai, NgayTao) VALUES (?, ?, ?, ?, ?, ?, "Hoạt động", NOW())',
        [HoTen, Email, SoDienThoai, hashedPass, defaultAvatar, MaVaiTro || 2]
      );
      const newUserId = userResult.insertId;

      // Insert staff profile
      await conn.query(
        `INSERT INTO hosonhansu (MaNguoiDung, ChucVu, HocVi, ChungChiNgoaiNgu, KinhNghiem, NgayVaoLam, NgaySinh, DiaChi) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newUserId, ChucVu || 'Giảng viên', HocVi || null, ChungChiNgoaiNgu || null, KinhNghiem || null, NgayVaoLam || null, NgaySinh || null, DiaChi || '']
      );

      await conn.commit();
      res.redirect('/admin/dashboard?tab=staff&success=' + encodeURIComponent('Thêm nhân sự mới thành công!'));
    } catch (err) {
      if (conn) await conn.rollback();
      console.error(err);
      res.redirect('/admin/dashboard?tab=staff&error=' + encodeURIComponent('Lỗi khi thêm nhân sự: ' + err.message));
    } finally {
      if (conn) conn.release();
    }
  }

  static async editStaffProfile(req, res) {
    try {
      const { id } = req.params; // MaNhanSu
      const { ChucVu, HocVi, ChungChiNgoaiNgu, KinhNghiem, NgayVaoLam, NgaySinh, DiaChi } = req.body;

      await pool.query(
        `UPDATE hosonhansu 
         SET ChucVu = ?, HocVi = ?, ChungChiNgoaiNgu = ?, KinhNghiem = ?, NgayVaoLam = ?, NgaySinh = ?, DiaChi = ? 
         WHERE MaNhanSu = ?`,
        [
          ChucVu || 'Giảng viên',
          HocVi || null,
          ChungChiNgoaiNgu || null,
          KinhNghiem || null,
          NgayVaoLam || null,
          NgaySinh || null,
          DiaChi || '',
          id
        ]
      );
      res.redirect('/admin/dashboard?tab=staff&success=' + encodeURIComponent('Cập nhật hồ sơ nhân sự thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=staff&error=' + encodeURIComponent('Không thể cập nhật hồ sơ. Lỗi: ' + err.message));
    }
  }

  static async deleteStaff(req, res) {
    const conn = await pool.getConnection();
    try {
      const { id } = req.params; // MaNhanSu

      // Find user id first
      const [profileRow] = await conn.query('SELECT MaNguoiDung FROM hosonhansu WHERE MaNhanSu = ?', [id]);
      if (profileRow.length === 0) {
        return res.redirect('/admin/dashboard?tab=staff&error=' + encodeURIComponent('Nhân sự không tồn tại!'));
      }
      const userId = profileRow[0].MaNguoiDung;
      // Kiểm tra xem giảng viên có đang được phân công giảng dạy lớp học nào chưa kết thúc hay không
      const [activeClasses] = await conn.query(
        `SELECT TenLop, TrangThaiLop 
         FROM lophoc 
         WHERE MaGiangVien = ? AND TrangThaiLop IN ('Sắp mở', 'Sắp khai giảng', 'Đang diễn ra')`,
        [id]
      );

      if (activeClasses.length > 0) {
        return res.redirect('/admin/dashboard?tab=staff&error=' + encodeURIComponent('Không thể xóa! Giảng viên này đã có lịch dạy các lớp học trên hệ thống.'));
      }

      await conn.beginTransaction();

      // Đổi giảng viên về NULL ở các lớp đã đóng/kết thúc lịch sử
      await conn.query('UPDATE lophoc SET MaGiangVien = NULL WHERE MaGiangVien = ?', [id]);

      // Delete staff profile
      await conn.query('DELETE FROM hosonhansu WHERE MaNhanSu = ?', [id]);

      // Delete user account
      await conn.query('DELETE FROM nguoidung WHERE MaNguoiDung = ?', [userId]);

      await conn.commit();
      res.redirect('/admin/dashboard?tab=staff&success=' + encodeURIComponent('Xóa nhân sự thành công!'));
    } catch (err) {
      if (conn) await conn.rollback();
      console.error(err);
      res.redirect('/admin/dashboard?tab=staff&error=' + encodeURIComponent('Không thể xóa nhân sự này. Lỗi: ' + err.message));
    } finally {
      if (conn) conn.release();
    }
  }

  // 11. Enrollment & Registration management
  static async addEnrollment(req, res) {
    try {
      const { MaHocVien, MaLopHoc, MaKhuyenMai, StudentLevel } = req.body;

      if (!MaHocVien || !MaLopHoc) {
        return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Vui lòng chọn đầy đủ Học viên và Lớp học!'));
      }

      // 1. Check if student already enrolled in class (Unique constraint)
      const [existing] = await pool.query(
        "SELECT * FROM dangkyhoc WHERE MaHocVien = ? AND MaLopHoc = ? AND TrangThai != 'Đã hủy'",
        [MaHocVien, MaLopHoc]
      );
      if (existing.length > 0) {
        return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Học viên đã đăng ký lớp học này trước đó!'));
      }

      // 2. Check class capacity limit & Student level matching
      const [clsRow] = await pool.query(
        'SELECT l.*, k.TenKhoaHoc, k.CapDo FROM lophoc l LEFT JOIN khoahoc k ON l.MaKhoaHoc = k.MaKhoaHoc WHERE l.MaLopHoc = ?',
        [MaLopHoc]
      );
      const cls = clsRow[0];

      const getProfGroup = (textStr) => {
        const text = (textStr || '').trim().toLowerCase();
        if (text.includes('mất gốc') || text.includes('0-200') || text.includes('foundation') || text.includes('300') || text.includes('pre')) return 'LEVEL_FOUNDATION_300';
        if (text.includes('trung cấp') || text.includes('cơ bản') || text.includes('450') || text.includes('500') || text.includes('toeic a') || text.includes('cấp tốc') || text.includes('cap toc')) return 'LEVEL_INTERMEDIATE_450';
        if (text.includes('650') || text.includes('600') || text.includes('700') || text.includes('800') || text.includes('nâng cao') || text.includes('luyện đề') || text.includes('luyen de') || text.includes('toeic c')) return 'LEVEL_ADVANCED_650';
        return text;
      };

      if (StudentLevel && cls) {
        const studentGroup = getProfGroup(StudentLevel);
        const classGroup = getProfGroup(`${cls.CapDo || ''} ${cls.TenKhoaHoc || ''}`);

        if (studentGroup !== classGroup && req.body.AllowLevelMismatch !== 'true') {
          return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent(`Từ chối xếp lớp: Trình độ hiện tại của học viên (${StudentLevel}) KHÔNG PHÙ HỢP với trình độ của lớp ${cls.TenLop} (Trình độ: ${cls.CapDo || 'Khác'}). Vui lòng chọn đúng lớp theo trình độ!`));
        }
      }

      // KIỂM TRA ĐIỂM TEST THỰC TẾ CỦA HỌC VIÊN KHI GHI DANH LỚP
      const examRes = await pool.query(
        "SELECT (DiemNghe + DiemDoc) AS TotalScore FROM ketquathi WHERE MaHocVien = ? ORDER BY NgayThi DESC LIMIT 1",
        [MaHocVien]
      );
      const examRows = (examRes && Array.isArray(examRes[0])) ? examRes[0] : [];
      const studentTestScore = (examRows && examRows.length > 0) ? examRows[0].TotalScore : null;
      const targetBounds = getCourseTargetBounds(cls.CapDo, cls.TenKhoaHoc);

      if (studentTestScore !== null && targetBounds && req.body.AllowScoreMismatch !== 'true') {
        if (studentTestScore < targetBounds.minStart) {
          return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent(`Từ chối ghi danh: Học viên đạt ${studentTestScore} điểm thi đầu vào, không đủ mốc điểm đầu vào tối thiểu (${targetBounds.minStart} điểm) của lớp "${cls.TenLop}" (${targetBounds.courseName}).`));
        }
      }

      const [cntRow] = await pool.query(
        "SELECT COUNT(*) AS Count FROM dangkyhoc WHERE MaLopHoc = ? AND TrangThai = 'Thành công'",
        [MaLopHoc]
      );
      const actualCount = cntRow[0].Count;

      if (actualCount >= cls.SiSoToiDa) {
        return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent(`❌ Thêm học viên thất bại: Lớp học đã đạt mức sĩ số tối đa (${actualCount}/${cls.SiSoToiDa}). Không thể ghi danh thêm học viên vào lớp này.`));
      }

      // RÀNG BUỘC 3.1: Khóa đăng ký mới
      if (cls.TrangThaiLop === 'Đã đóng' || cls.TrangThaiLop === 'Kết thúc' || cls.TrangThaiLop === 'Đã kết thúc') {
        return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('🔒 Lớp học đã đóng (kết thúc hoặc bị hủy). Hệ thống không nhận thêm học viên vào lớp này.'));
      }

      // RÀNG BUỘC ĐĂNG KÝ TRỄ: Khi Admin ghi danh/đăng ký giùm học viên vào lớp đang học ("Đang diễn ra")
      if (cls.TrangThaiLop === 'Đang diễn ra' || (cls.NgayKhaiGiang && new Date(cls.NgayKhaiGiang) <= new Date())) {
        const startDate = new Date(cls.NgayKhaiGiang);
        const endDate = new Date(cls.NgayKetThuc);
        const now = new Date();

        const totalDurationMs = endDate.getTime() - startDate.getTime();
        const elapsedMs = now.getTime() - startDate.getTime();

        if (totalDurationMs > 0 && elapsedMs > 0) {
          const percentElapsed = (elapsedMs / totalDurationMs) * 100;
          if (percentElapsed > 10) {
            const startStr = startDate.toLocaleDateString('vi-VN');
            const pctStr = percentElapsed.toFixed(1);
            return res.redirect(
              '/admin/dashboard?tab=enrollments&error=' +
                encodeURIComponent(
                  `Lỗi Đăng ký trễ: Lớp "${cls.TenLop}" đã khai giảng từ ngày ${startStr} và đã diễn ra được ${pctStr}% thời lượng khóa học (vượt quá mốc cho phép 10%). Không thể ghi danh thêm học viên đăng ký trễ vào lớp này!`
                )
            );
          }
        }
      }

      // 3. Fetch Class fee
      const [feeRow] = await pool.query(
        'SELECT COALESCE(l.HocPhi, k.HocPhi) AS HocPhi FROM lophoc l JOIN khoahoc k ON l.MaKhoaHoc = k.MaKhoaHoc WHERE l.MaLopHoc = ?',
        [MaLopHoc]
      );
      const baseFee = feeRow.length > 0 ? parseFloat(feeRow[0].HocPhi) : 0;

      // 4. Calculate price with promo code if valid
      let finalFee = baseFee;
      let promoId = null;
      if (MaKhuyenMai) {
        const [promoRow] = await pool.query(
          'SELECT * FROM khuyenmai WHERE MaKhuyenMai = ? AND NOW() BETWEEN NgayBatDau AND NgayKetThuc',
          [MaKhuyenMai]
        );
        if (promoRow.length > 0) {
          promoId = promoRow[0].MaKhuyenMai;
          const discountPct = parseFloat(promoRow[0].PhanTramGiam);
          finalFee = baseFee - (baseFee * discountPct / 100);
        }
      }

      // Insert enrollment
      const [insResult] = await pool.query(
        `INSERT INTO dangkyhoc (MaHocVien, MaLopHoc, MaNguoiDangKy, MaKhuyenMai, HocPhiDaGiam, NgayDangKy, TrangThai) 
         VALUES (?, ?, ?, ?, ?, NOW(), 'Thành công')`,
        [MaHocVien, MaLopHoc, req.session.user.MaNguoiDung, promoId, finalFee]
      );

      // Tự động khởi tạo chứng từ thanh toán tiền mặt tại quầy
      await pool.query(
        `INSERT INTO giaodich (MaDangKy, SoTien, NgayGiaoDich, NoiDungChuyenKhoan, TrangThai)
         VALUES (?, ?, NOW(), ?, 'Thành công')`,
        [insResult.insertId, finalFee, `Thu tiền mặt trực tiếp tại quầy trung tâm (Admin ID #${req.session.user.MaNguoiDung})`]
      );

      res.redirect('/admin/dashboard?tab=enrollments&success=' + encodeURIComponent('Ghi danh học viên vào lớp và xác nhận thu tiền mặt thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Không thể ghi danh học viên: ' + err.message));
    }
  }

  static async transferStudentClass(req, res) {
    try {
      const { MaDangKy, MaLopHocMoi, LyDoChuyenLop } = req.body;

      const [enrollRows] = await pool.query(
        'SELECT d.*, l.TenLop, l.MaKhoaHoc, kh.CapDo FROM dangkyhoc d JOIN lophoc l ON d.MaLopHoc = l.MaLopHoc LEFT JOIN khoahoc kh ON l.MaKhoaHoc = kh.MaKhoaHoc WHERE d.MaDangKy = ?',
        [MaDangKy]
      );
      if (enrollRows.length === 0) {
        return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Không tìm thấy đơn đăng ký!'));
      }
      const enroll = enrollRows[0];
      const oldClassId = enroll.MaLopHoc;
      const oldClassName = enroll.TenLop;
      const maHocVien = enroll.MaHocVien;

      if (oldClassId == MaLopHocMoi) {
        return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Học viên đã ở trong lớp này rồi!'));
      }

      const [newClsRow] = await pool.query(
        'SELECT lh.*, kh.CapDo FROM lophoc lh LEFT JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc WHERE lh.MaLopHoc = ?',
        [MaLopHocMoi]
      );
      if (newClsRow.length === 0) {
        return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Lớp học mới không tồn tại!'));
      }
      const newCls = newClsRow[0];

      // RÀNG BUỘC THÔNG MINH TRÌNH ĐỘ MỤC TIÊU:
      // Ưu tiên chuẩn hóa dựa trên cột CapDo trong CSDL trước, chỉ dùng TenKhoaHoc khi CapDo trống
      const getProficiencyGroup = (capDo, courseName) => {
        const cap = (capDo || '').trim().toLowerCase();
        if (cap) {
          if (cap.includes('foundation') || cap.includes('300') || cap.includes('pre')) return 'LEVEL_FOUNDATION_300';
          if (cap.includes('trung cấp') || cap.includes('cơ bản') || cap.includes('450') || cap.includes('500')) return 'LEVEL_INTERMEDIATE_450';
          if (cap.includes('650') || cap.includes('600') || cap.includes('700') || cap.includes('800')) return 'LEVEL_ADVANCED_650';
          return cap;
        }

        const text = (courseName || '').trim().toLowerCase();
        if (text.includes('foundation') || text.includes('300') || text.includes('pre')) return 'LEVEL_FOUNDATION_300';
        if (text.includes('trung cấp') || text.includes('cơ bản') || text.includes('450') || text.includes('500') || text.includes('toeic a') || text.includes('cấp tốc') || text.includes('cap toc')) return 'LEVEL_INTERMEDIATE_450';
        if (text.includes('650') || text.includes('600') || text.includes('700') || text.includes('800') || text.includes('luyện đề') || text.includes('luyen de') || text.includes('toeic c')) return 'LEVEL_ADVANCED_650';
        return text;
      };

      if (enroll && newCls) {
        const oldGroup = getProficiencyGroup(enroll.CapDo, enroll.TenKhoaHoc || enroll.TenLop);
        const newGroup = getProficiencyGroup(newCls.CapDo, newCls.TenKhoaHoc || newCls.TenLop);
        const isSameCourse = String(enroll.MaKhoaHoc) === String(newCls.MaKhoaHoc);
        const isSameLevelGroup = oldGroup === newGroup;

        // KIỂM TRA ĐIỂM TEST THỰC TẾ VỚI THANG ĐIỂM ĐẦU VÀO CỦA KHÓA MỚI
        const examRes = await pool.query(
          "SELECT (DiemNghe + DiemDoc) AS TotalScore FROM ketquathi WHERE MaHocVien = ? ORDER BY NgayThi DESC LIMIT 1",
          [maHocVien]
        );
        const examRows = (examRes && Array.isArray(examRes[0])) ? examRes[0] : [];
        const studentScore = (examRows && examRows.length > 0) ? examRows[0].TotalScore : null;
        const newBounds = getCourseTargetBounds(newCls.CapDo, newCls.TenKhoaHoc);

        if (studentScore !== null && newBounds && req.body.AllowScoreMismatch !== 'true') {
          if (studentScore < newBounds.minStart) {
            return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent(`Từ chối chuyển lớp: Học viên chỉ đạt ${studentScore} điểm thi đầu vào, không đủ điều kiện mốc điểm đầu vào tối thiểu (${newBounds.minStart} điểm) để vào lớp "${newCls.TenLop}" (${newBounds.courseName}).`));
          }
        }

        const isLevelChangeReason = (LyDoChuyenLop && (LyDoChuyenLop.includes('Chuyển đổi cấp độ') || LyDoChuyenLop.includes('Sai trình độ')));
        if (!isSameCourse && !isSameLevelGroup && req.body.AllowLevelMismatch !== 'true' && !isLevelChangeReason) {
          return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent(`Từ chối chuyển lớp: Lớp mới "${newCls.TenLop}" (Cấp độ: ${newCls.CapDo || 'Khác'}) KHÔNG PHÙ HỢP TRÌNH ĐỘ MỤC TIÊU với lớp gốc "${oldClassName}" (Cấp độ: ${enroll.CapDo || 'Khác'}).`));
        }
      }

      const [cntRow] = await pool.query(
        "SELECT COUNT(*) AS Count FROM dangkyhoc WHERE MaLopHoc = ? AND TrangThai IN ('Thành công', 'Đang học')",
        [MaLopHocMoi]
      );
      if (cntRow[0].Count >= newCls.SiSoToiDa) {
        return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent(`Không thể chuyển: Lớp "${newCls.TenLop}" đã đạt sĩ số tối đa (${newCls.SiSoToiDa} học viên)!`));
      }

      const ClassController = require('./classController');
      const conflict = await ClassController.checkScheduleConflict(maHocVien, MaLopHocMoi);
      if (conflict) {
        return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent(`Không thể chuyển lớp: Lịch học mới bị TRÙNG với lớp "${conflict.className}" (${conflict.day}, ${conflict.time}).`));
      }

      const reasonStr = (LyDoChuyenLop && LyDoChuyenLop.trim()) ? LyDoChuyenLop.trim() : 'Theo nguyện vọng cá nhân';
      const feeOld = Number(enroll.HocPhiDaGiam || enroll.HocPhi || 0);
      const feeNew = Number(newCls.HocPhi || 0);
      const feeDiff = Math.max(0, feeNew - feeOld);

      const isDiff = feeDiff > 0;
      const targetStatus = isDiff ? 'Chờ thanh toán' : 'Đang học';
      const feeDiffMsg = isDiff ? ` (Chênh lệch học phí cần nộp bổ sung: ${feeDiff.toLocaleString('vi-VN')} đ)` : '';

      const oldNote = `Đã chuyển sang lớp ${newCls.TenLop}${feeDiffMsg} (Lý do: ${reasonStr})`;
      const newNote = `Chuyển từ lớp ${oldClassName}${feeDiffMsg} (Lý do: ${reasonStr})`;

      // 1. Đơn ở lớp cũ giữ nguyên bản ghi nhưng đánh dấu trạng thái 'Đã chuyển lớp'
      await pool.query(
        "UPDATE dangkyhoc SET TrangThai = 'Đã chuyển lớp', GhiChu = ? WHERE MaDangKy = ?",
        [oldNote, MaDangKy]
      );

      // 2. Tạo bản ghi đăng ký mới ở lớp mới
      const [stRows] = await pool.query('SELECT MaNguoiDung FROM hosohocvien WHERE MaHocVien = ?', [maHocVien]);
      const studentUserId = stRows[0]?.MaNguoiDung || enroll.MaNguoiDangKy || maHocVien;

      await pool.query(
        `INSERT INTO dangkyhoc (MaHocVien, MaLopHoc, NgayDangKy, HocPhiDaGiam, MaKhuyenMai, MaNguoiDangKy, GhiChu, TrangThai) 
         VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)`,
        [
          maHocVien,
          MaLopHocMoi,
          isDiff ? feeDiff : (enroll.HocPhiDaGiam || feeNew),
          enroll.MaKhuyenMai || null,
          studentUserId,
          newNote,
          targetStatus
        ]
      );

      const successMsg = isDiff
        ? `Đã chuyển học viên từ lớp "${oldClassName}" sang lớp "${newCls.TenLop}". Lớp mới có chênh lệch học phí cần đóng thêm ${feeDiff.toLocaleString('vi-VN')} đ (Đơn ở trạng thái Chờ thanh toán).`
        : `Đã chuyển học viên từ lớp "${oldClassName}" sang lớp "${newCls.TenLop}" thành công!`;

      // Gửi mail thông báo duyệt chuyển lớp tới học viên
      try {
        const [uRows] = await pool.query(
          `SELECT nd.Email, hh.HoTen AS TenHocVien FROM hosohocvien hh JOIN nguoidung nd ON hh.MaNguoiDung = nd.MaNguoiDung WHERE hh.MaHocVien = ?`,
          [maHocVien]
        );
        if (uRows.length > 0 && uRows[0].Email) {
          sendClassTransferApprovedMail({
            to: uRows[0].Email,
            studentName: uRows[0].TenHocVien,
            oldClassName,
            newClassName: newCls.TenLop,
            feeDiff: isDiff ? feeDiff : 0
          }).catch(mErr => console.error('Lỗi gửi mail duyệt chuyển lớp:', mErr.message));
        }
      } catch (mailErr) {
        console.error('Lỗi gửi mail duyệt chuyển lớp:', mailErr.message);
      }

      res.redirect('/admin/dashboard?tab=enrollments&success=' + encodeURIComponent(successMsg));
    } catch (err) {
      console.error('Lỗi chuyển lớp học viên:', err);
      res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Không thể chuyển lớp: ' + err.message));
    }
  }

  static async approveClassTransfer(req, res) {
    try {
      const { id } = req.params;
      const { MaLopHocMoi } = req.body;

      const [enrollRows] = await pool.query(
        'SELECT d.*, l.TenLop FROM dangkyhoc d JOIN lophoc l ON d.MaLopHoc = l.MaLopHoc WHERE d.MaDangKy = ?',
        [id]
      );
      if (enrollRows.length === 0) {
        return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Không tìm thấy đơn xin chuyển lớp!'));
      }
      const enroll = enrollRows[0];

      let targetClassId = MaLopHocMoi;
      if (!targetClassId && enroll.GhiChu) {
        const match = enroll.GhiChu.match(/Mã\s*#(\d+)/i);
        if (match) targetClassId = match[1];
      }

      if (!targetClassId) {
        return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Không xác định được lớp học mới cần chuyển tới!'));
      }

      req.body.MaDangKy = id;
      req.body.MaLopHocMoi = targetClassId;

      let extractedReason = '';
      if (enroll.GhiChu && enroll.GhiChu.includes('Lý do:')) {
        extractedReason = enroll.GhiChu.substring(enroll.GhiChu.indexOf('Lý do:') + 6).trim();
      }
      req.body.LyDoChuyenLop = req.body.LyDoChuyenLop || extractedReason || `Duyệt phiếu xin chuyển lớp của Học viên`;

      return AdminController.transferStudentClass(req, res);
    } catch (err) {
      console.error('Lỗi khi Admin duyệt chuyển lớp:', err);
      res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Không thể duyệt chuyển lớp: ' + err.message));
    }
  }

  static async rejectClassTransfer(req, res) {
    try {
      const { id } = req.params;
      const { LyDoTuChoi, TrangThaiSauTuChoi } = req.body;

      const rejectReason = (LyDoTuChoi && LyDoTuChoi.trim()) ? LyDoTuChoi.trim() : 'Chưa đủ điều kiện hoặc lớp mới đã đầy';
      const noteStr = `[Từ chối chuyển lớp] Lý do: ${rejectReason}`;

      let targetStatus = TrangThaiSauTuChoi;
      if (!targetStatus) {
        const lower = rejectReason.toLowerCase();
        if (lower.includes('bảo lưu') || lower.includes('đợi') || lower.includes('đợt mới') || lower.includes('ngang nhau')) {
          targetStatus = 'Bảo lưu';
        } else {
          targetStatus = 'Đang học';
        }
      }

      await pool.query(
        "UPDATE dangkyhoc SET TrangThai = ?, GhiChu = ? WHERE MaDangKy = ?",
        [targetStatus, noteStr, id]
      );

      // Gửi mail thông báo từ chối chuyển lớp tới học viên
      try {
        const [uRows] = await pool.query(
          `SELECT nd.Email, hh.HoTen AS TenHocVien, l.TenLop FROM dangkyhoc d JOIN lophoc l ON d.MaLopHoc = l.MaLopHoc JOIN hosohocvien hh ON d.MaHocVien = hh.MaHocVien JOIN nguoidung nd ON hh.MaNguoiDung = nd.MaNguoiDung WHERE d.MaDangKy = ?`,
          [id]
        );
        if (uRows.length > 0 && uRows[0].Email) {
          sendClassTransferRejectedMail({
            to: uRows[0].Email,
            studentName: uRows[0].TenHocVien,
            oldClassName: uRows[0].TenLop,
            reason: rejectReason,
            newStatus: targetStatus
          }).catch(mErr => console.error('Lỗi gửi mail từ chối chuyển lớp:', mErr.message));
        }
      } catch (mailErr) {
        console.error('Lỗi gửi mail từ chối chuyển lớp:', mailErr.message);
      }

      res.redirect('/admin/dashboard?tab=enrollments&success=' + encodeURIComponent(`Đã từ chối phiếu xin chuyển lớp và cập nhật trạng thái đơn sang "${targetStatus}".`));
    } catch (err) {
      console.error('Lỗi khi từ chối chuyển lớp:', err);
      res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Không thể từ chối: ' + err.message));
    }
  }

  static async editEnrollmentStatus(req, res) {
    const conn = await pool.getConnection();
    try {
      const { id } = req.params;
      const { TrangThai } = req.body;

      await conn.beginTransaction();

      const [enrollRows] = await conn.query('SELECT * FROM dangkyhoc WHERE MaDangKy = ?', [id]);
      if (enrollRows.length === 0) {
        return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Đơn đăng ký không tồn tại!'));
      }
      const enroll = enrollRows[0];

      const [successfulTxs] = await conn.query(
        "SELECT * FROM giaodich WHERE MaDangKy = ? AND TrangThai = 'Thành công'",
        [id]
      );
      const isPaid = successfulTxs.length > 0 || ['Thành công', 'Đang học', 'Hoàn thành', 'Đã hoàn thành'].includes(enroll.TrangThai);

      // Nếu đơn đã thanh toán thành công mà Admin muốn đổi sang 'Đã hủy' -> CHẶN HOÀN TOÀN
      if (TrangThai === 'Đã hủy' && isPaid) {
        return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Không thể hủy đơn đăng ký này! Đơn đã phát sinh giao dịch thanh toán thành công.'));
      }

      const validTransitionsMap = {
        'Chờ thanh toán': ['Đang học', 'Thành công', 'Đã hủy', 'Chờ thanh toán'],
        'Chờ duyệt': ['Đang học', 'Thành công', 'Đã hủy', 'Chờ duyệt'],
        'Chờ xử lý - Xin chuyển lớp': ['Đang học', 'Đã chuyển lớp', 'Chờ xử lý - Xin chuyển lớp'],
        'Thành công': ['Đang học', 'Bảo lưu', 'Ngừng học', 'Hoàn thành', 'Thành công'],
        'Đang học': ['Bảo lưu', 'Ngừng học', 'Hoàn thành', 'Đang học'],
        'Bảo lưu': ['Đang học', 'Ngừng học', 'Bảo lưu'],
        'Ngừng học': ['Đang học', 'Ngừng học'],
        'Hoàn thành': ['Hoàn thành', 'Đang học'],
        'Đã hoàn thành': ['Hoàn thành', 'Đang học'],
        'Đã hủy': ['Chờ thanh toán', 'Đang học', 'Đã hủy']
      };

      const currentStatus = enroll.TrangThai || 'Chờ thanh toán';
      const allowedNext = validTransitionsMap[currentStatus] || ['Đang học', 'Bảo lưu', 'Ngừng học', 'Hoàn thành', 'Đã hủy'];

      if (!allowedNext.includes(TrangThai)) {
        return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent(`Không thể chuyển trạng thái từ "${currentStatus}" sang "${TrangThai}". Vui lòng tuân thủ quy trình xử lý đơn hàng.`));
      }

      // 1. Ràng buộc sang 'Ngừng học': Phải vắng >= 3 buổi
      if (['Ngừng học', 'Đã ngừng học'].includes(TrangThai)) {
        const [absRows] = await conn.query(
          "SELECT COUNT(*) AS cnt FROM diemdanh WHERE MaHocVien = ? AND MaLopHoc = ? AND TrangThai = 'Vắng mặt'",
          [enroll.MaHocVien, enroll.MaLopHoc]
        );
        const absences = absRows[0].cnt;
        if (absences < 3) {
          return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent(`Không thể chuyển sang 'Ngừng học'! Học viên chưa đủ điều kiện vắng từ 3 ngày trở lên (Hiện mới vắng ${absences} buổi).`));
        }
      }

      // 2. Ràng buộc sang 'Hoàn thành': Phải đủ số buổi VÀ có điểm giữa kỳ + cuối kỳ
      if (['Hoàn thành', 'Đã hoàn thành'].includes(TrangThai)) {
        const [classRows] = await conn.query(
          "SELECT kh.ThoiLuong, lh.NgayKhaiGiang FROM lophoc lh JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc WHERE lh.MaLopHoc = ?",
          [enroll.MaLopHoc]
        );
        const totalCourseSessions = classRows.length > 0 ? Number(classRows[0].ThoiLuong || 0) : 0;

        const [attRows] = await conn.query(
          "SELECT COUNT(*) AS cnt FROM diemdanh WHERE MaHocVien = ? AND MaLopHoc = ?",
          [enroll.MaHocVien, enroll.MaLopHoc]
        );
        const attCount = attRows[0].cnt;

        const [tkbRows] = await conn.query(
          "SELECT DISTINCT ThuTrongTuan FROM thoikhoabieu WHERE MaLopHoc = ?",
          [enroll.MaLopHoc]
        );
        const scheduleDays = tkbRows.map(r => r.ThuTrongTuan);

        let elapsedSessions = 0;
        if (classRows.length > 0 && classRows[0].NgayKhaiGiang && scheduleDays.length > 0) {
          const dayMap = { 'Chủ Nhật': 0, 'Thứ Hai': 1, 'Thứ Ba': 2, 'Thứ Tư': 3, 'Thứ Năm': 4, 'Thứ Sáu': 5, 'Thứ Bảy': 6 };
          const targetDays = scheduleDays.map(d => dayMap[d]).filter(d => d !== undefined);
          if (targetDays.length > 0) {
            let count = 0;
            let curr = new Date(classRows[0].NgayKhaiGiang);
            curr.setHours(0, 0, 0, 0);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            while (curr <= now) {
              if (targetDays.includes(curr.getDay())) {
                count++;
                if (totalCourseSessions && count >= totalCourseSessions) break;
              }
              curr.setDate(curr.getDate() + 1);
            }
            elapsedSessions = totalCourseSessions ? Math.min(count, totalCourseSessions) : count;
          }
        }

        const recordedSessions = Math.max(attCount, elapsedSessions);

        const [gradeRows] = await conn.query(
          "SELECT DiemGiuaKy, DiemCuoiKy FROM quanlydiem WHERE MaHocVien = ? AND MaLopHoc = ?",
          [enroll.MaHocVien, enroll.MaLopHoc]
        );
        const hasGiuaKy = gradeRows.length > 0 && gradeRows[0].DiemGiuaKy !== null && gradeRows[0].DiemGiuaKy !== undefined;
        const hasCuoiKy = gradeRows.length > 0 && gradeRows[0].DiemCuoiKy !== null && gradeRows[0].DiemCuoiKy !== undefined;
        const isFinishedSessions = recordedSessions >= totalCourseSessions && totalCourseSessions > 0;

        if (!isFinishedSessions || !hasGiuaKy || !hasCuoiKy) {
          return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent(`Không thể chuyển sang 'Hoàn thành'! Học viên chưa thỏa mãn 3 điều kiện: Học đủ ${recordedSessions}/${totalCourseSessions} buổi, Điểm giữa kỳ (${hasGiuaKy ? 'Có' : 'Chưa'}), Điểm cuối kỳ (${hasCuoiKy ? 'Có' : 'Chưa'}).`));
        }
      }

      // 3. Ràng buộc sang 'Bảo lưu': Cho phép Admin cập nhật khi học viên gửi yêu cầu online HOẶC liên hệ bảo lưu trực tiếp tại quầy
      if (TrangThai === 'Bảo lưu') {
        const hasTransferRequest = (enroll.TrangThai && (enroll.TrangThai.includes('Xin chuyển') || enroll.TrangThai.includes('Bảo lưu'))) || (enroll.GhiChu && (enroll.GhiChu.includes('Xin chuyển') || enroll.GhiChu.includes('Từ chối chuyển') || enroll.GhiChu.includes('Bảo lưu')));

        // Nếu không có phiếu online và không có xác nhận từ Admin tại quầy -> nhắc nhở ghi nhận lý do
        if (!hasTransferRequest && !req.body.LyDo && req.body.DirectAdminBaoLuu !== 'true') {
          // Ghi nhận bảo lưu trực tiếp tại quầy thành công
        }
      }

      let enrollmentPrice = enroll?.HocPhiDaGiam || 0;
      const targetStatus = (TrangThai === 'Thành công') ? 'Đang học' : TrangThai;

      // Xử lý lý do ngừng học từ form
      let ghiChuUpdate = {};
      if (targetStatus === 'Ngừng học' && req.body.LyDo) {
        const adminName = req.session.user?.HoTen || 'Admin';
        ghiChuUpdate.GhiChu = `[Admin ${adminName}] ${req.body.LyDo}`;
      }

      // Update status for main registration (và GhiChu nếu có)
      if (Object.keys(ghiChuUpdate).length > 0) {
        await conn.query('UPDATE dangkyhoc SET TrangThai = ?, GhiChu = ? WHERE MaDangKy = ?', [targetStatus, ghiChuUpdate.GhiChu, id]);
      } else {
        await conn.query('UPDATE dangkyhoc SET TrangThai = ? WHERE MaDangKy = ?', [targetStatus, id]);
      }

      // If status is 'Thành công' or 'Đang học', handle transactions
      if (['Thành công', 'Đang học'].includes(TrangThai)) {
        const [existingTx] = await conn.query('SELECT * FROM giaodich WHERE MaDangKy = ?', [id]);
        if (!existingTx || existingTx.length === 0) {
          await conn.query(
            `INSERT INTO giaodich (MaDangKy, SoTien, NgayGiaoDich, NoiDungChuyenKhoan, TrangThai) 
             VALUES (?, ?, NOW(), ?, 'Thành công')`,
            [id, enrollmentPrice, `MANUAL_APPROVE_DK${id}`]
          );
        } else {
          await conn.query(
            `UPDATE giaodich SET TrangThai = 'Thành công' WHERE MaDangKy = ? AND TrangThai = 'Chờ duyệt'`,
            [id]
          );

          // Nếu có giao dịch cùng mã đợt (NoiDungChuyenKhoan), tự động duyệt tất cả các lớp trong cùng đợt đó
          const memo = existingTx[0]?.NoiDungChuyenKhoan;
          if (memo) {
            const [siblingTxs] = await conn.query(
              "SELECT DISTINCT MaDangKy FROM giaodich WHERE NoiDungChuyenKhoan = ? AND MaDangKy != ?",
              [memo, id]
            );
            if (siblingTxs && siblingTxs.length > 0) {
              const siblingIds = siblingTxs.map(t => t.MaDangKy);
              await conn.query('UPDATE dangkyhoc SET TrangThai = ? WHERE MaDangKy IN (?)', [targetStatus, siblingIds]);
              await conn.query("UPDATE giaodich SET TrangThai = 'Thành công' WHERE MaDangKy IN (?)", [siblingIds]);
            }
          }
        }
      }

      await conn.commit();

      if (['Thành công', 'Đang học', 'Hoàn thành'].includes(TrangThai) && enroll && enroll.MaHocVien) {
        await updateStudentProficiencyLevel(enroll.MaHocVien);
      }

      if (['Thành công', 'Đang học'].includes(TrangThai)) {
        notifyAdminPaymentSuccess([parseInt(id, 10)], {
          soTien: enrollmentPrice,
          noiDungChuyenKhoan: `DUYET_ADMIN_DK${id}`
        });
      }

      // Gửi mail thông báo cập nhật trạng thái đơn học tới học viên
      try {
        const [infoRows] = await pool.query(
          `SELECT nd.Email, hh.HoTen AS TenHocVien, l.TenLop, kh.TenKhoaHoc, d.GhiChu 
           FROM dangkyhoc d 
           JOIN lophoc l ON d.MaLopHoc = l.MaLopHoc 
           JOIN khoahoc kh ON l.MaKhoaHoc = kh.MaKhoaHoc 
           JOIN hosohocvien hh ON d.MaHocVien = hh.MaHocVien 
           JOIN nguoidung nd ON hh.MaNguoiDung = nd.MaNguoiDung 
           WHERE d.MaDangKy = ?`,
          [id]
        );
        if (infoRows.length > 0 && infoRows[0].Email) {
          // Trích xuất lý do ngừng học từ GhiChu nếu có
          let reason = '';
          if (targetStatus === 'Ngừng học' && infoRows[0].GhiChu) {
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
            status: targetStatus,
            reason: reason
          }).catch(mErr => console.error('Lỗi gửi mail cập nhật trạng thái:', mErr.message));
        }
      } catch (mailErr) {
        console.error('Lỗi gửi mail cập nhật trạng thái:', mailErr.message);
      }

      res.redirect('/admin/dashboard?tab=enrollments&success=' + encodeURIComponent('Cập nhật trạng thái đơn đăng ký học thành công!'));
    } catch (err) {
      if (conn) await conn.rollback();
      console.error(err);
      res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Không thể cập nhật trạng thái đơn: ' + err.message));
    } finally {
      if (conn) conn.release();
    }
  }

  static async deleteEnrollment(req, res) {
    const conn = await pool.getConnection();
    try {
      const { id } = req.params;
      await conn.beginTransaction();

      // 1. Kiểm tra thông tin đơn đăng ký
      const [enrollRows] = await conn.query('SELECT * FROM dangkyhoc WHERE MaDangKy = ?', [id]);
      if (enrollRows.length === 0) {
        return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Đơn đăng ký không tồn tại!'));
      }
      const enroll = enrollRows[0];

      // 2. Kiểm tra lịch sử giao dịch đã thanh toán thành công
      const [successfulTxs] = await conn.query(
        "SELECT * FROM giaodich WHERE MaDangKy = ? AND TrangThai = 'Thành công'",
        [id]
      );

      const isPaid = successfulTxs.length > 0 || ['Thành công', 'Đang học', 'Hoàn thành', 'Đã hoàn thành'].includes(enroll.TrangThai);

      if (isPaid) {
        // ĐƠN ĐÃ THANH TOÁN THÀNH CÔNG -> CHẶN KHÔNG CHO XÓA VÀ HỦY
        return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Không thể xóa hoặc hủy đơn đăng ký này! Đơn đã phát sinh giao dịch thanh toán thành công.'));
      }

      // ĐƠN MỚI ĐĂNG KÝ / CHỜ THANH TOÁN / CHƯA THANH TOÁN / ĐÃ HỦY THANH TOÁN -> ĐƯỢC PHÉP XÓA VÀ HỦY
      await conn.query('DELETE FROM giaodich WHERE MaDangKy = ?', [id]);
      await conn.query('DELETE FROM dangkyhoc WHERE MaDangKy = ?', [id]);
      await conn.commit();
      res.redirect('/admin/dashboard?tab=enrollments&success=' + encodeURIComponent('Đã xóa hoàn toàn đơn ghi danh chưa thanh toán khỏi hệ thống!'));
    } catch (err) {
      if (conn) await conn.rollback();
      console.error(err);
      res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Lỗi khi xử lý đơn ghi danh: ' + err.message));
    } finally {
      if (conn) conn.release();
    }
  }

  // 12. Transaction management
  static async addTransaction(req, res) {
    try {
      const { MaDangKy, SoTien, NoiDungChuyenKhoan, TrangThai } = req.body;

      await pool.query(
        'INSERT INTO giaodich (MaDangKy, SoTien, NgayGiaoDich, NoiDungChuyenKhoan, TrangThai) VALUES (?, ?, NOW(), ?, ?)',
        [MaDangKy, SoTien, NoiDungChuyenKhoan, TrangThai || 'Thành công']
      );

      // If transaction is marked success, update enrollment status too
      if (TrangThai === 'Thành công') {
        await pool.query(
          "UPDATE dangkyhoc SET TrangThai = 'Thành công' WHERE MaDangKy = ?",
          [MaDangKy]
        );
        const [dkRow] = await pool.query('SELECT MaHocVien FROM dangkyhoc WHERE MaDangKy = ?', [MaDangKy]);
        if (dkRow.length > 0 && dkRow[0].MaHocVien) {
          await updateStudentProficiencyLevel(dkRow[0].MaHocVien);
        }
        notifyAdminPaymentSuccess([parseInt(MaDangKy, 10)], {
          soTien: SoTien,
          noiDungChuyenKhoan: NoiDungChuyenKhoan
        });
      }

      res.redirect('/admin/dashboard?tab=enrollments&success=' + encodeURIComponent('Thêm giao dịch thanh toán thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Không thể tạo giao dịch. Lỗi: ' + err.message));
    }
  }

  static async deleteTransaction(req, res) {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM giaodich WHERE MaGiaoDich = ?', [id]);
      res.redirect('/admin/dashboard?tab=enrollments&success=' + encodeURIComponent('Xóa giao dịch thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Không thể xóa giao dịch. Lỗi: ' + err.message));
    }
  }

  static async editStudentProfile(req, res) {
    try {
      const { id } = req.params; // MaHocVien
      const { NgaySinh, DiaChi, TrinhDoHienTai } = req.body;

      const [targetProfile] = await pool.query('SELECT MaNguoiDung FROM hosohocvien WHERE MaHocVien = ?', [id]);

      await pool.query(
        `UPDATE hosohocvien h
         LEFT JOIN nguoidung u ON h.MaNguoiDung = u.MaNguoiDung
         SET h.NgaySinh = ?, h.DiaChi = ?, h.TrinhDoHienTai = ?,
             h.HoTen = COALESCE(NULLIF(TRIM(h.HoTen), ''), u.HoTen),
             h.QuanHe = COALESCE(NULLIF(TRIM(h.QuanHe), ''), 'Bản thân')
         WHERE h.MaHocVien = ?`,
        [NgaySinh || null, DiaChi, TrinhDoHienTai, id]
      );

      // Đồng bộ địa chỉ sang tất cả hồ sơ con thuộc cùng tài khoản Phụ huynh nếu có
      if (targetProfile.length > 0 && DiaChi && DiaChi.trim()) {
        await pool.query(
          `UPDATE hosohocvien 
           SET DiaChi = ? 
           WHERE MaNguoiDung = ? AND (DiaChi IS NULL OR TRIM(DiaChi) = '' OR DiaChi = 'Chưa chọn khu vực')`,
          [DiaChi.trim(), targetProfile[0].MaNguoiDung]
        );
      }

      res.redirect('/admin/dashboard?tab=students&success=' + encodeURIComponent('Cập nhật hồ sơ học viên thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=students&error=' + encodeURIComponent('Không thể cập nhật hồ sơ học viên. Lỗi: ' + err.message));
    }
  }

  // 14. Student Add & Delete
  static async addStudent(req, res) {
    const conn = await pool.getConnection();
    try {
      const { HoTen, Email, SoDienThoai, MatKhau, NgaySinh, DiaChi, TrinhDoHienTai } = req.body;

      // Validate email exists
      const [existing] = await conn.query('SELECT * FROM nguoidung WHERE Email = ?', [Email]);
      if (existing.length > 0) {
        return res.redirect('/admin/dashboard?tab=students&error=' + encodeURIComponent('Email đã tồn tại!'));
      }

      await conn.beginTransaction();

      const hashedPass = await bcrypt.hash(MatKhau || '123456', 10);
      const defaultAvatar = '/images/avatar-default.png';

      // Insert user
      const [userResult] = await conn.query(
        'INSERT INTO nguoidung (HoTen, Email, SoDienThoai, MatKhau, AnhDaiDien, MaVaiTro, TrangThai, NgayTao) VALUES (?, ?, ?, ?, ?, 3, "Hoạt động", NOW())',
        [HoTen, Email, SoDienThoai, hashedPass, defaultAvatar]
      );
      const newUserId = userResult.insertId;

      // Insert student profile
      await conn.query(
        'INSERT INTO hosohocvien (MaNguoiDung, HoTen, QuanHe, NgaySinh, DiaChi, TrinhDoHienTai) VALUES (?, ?, "Bản thân", ?, ?, ?)',
        [newUserId, HoTen ? HoTen.trim() : null, NgaySinh || null, DiaChi || null, TrinhDoHienTai || 'Chưa xác định']
      );

      await conn.commit();
      res.redirect('/admin/dashboard?tab=students&success=' + encodeURIComponent('Thêm học viên mới thành công!'));
    } catch (err) {
      if (conn) await conn.rollback();
      console.error(err);
      res.redirect('/admin/dashboard?tab=students&error=' + encodeURIComponent('Lỗi khi thêm học viên: ' + err.message));
    } finally {
      if (conn) conn.release();
    }
  }

  static async deleteStudent(req, res) {
    const conn = await pool.getConnection();
    try {
      const { id } = req.params; // MaHocVien

      // 1. Tìm thông tin hồ sơ
      const [profileRow] = await conn.query('SELECT MaNguoiDung FROM hosohocvien WHERE MaHocVien = ?', [id]);
      if (profileRow.length === 0) {
        return res.redirect('/admin/dashboard?tab=students&error=' + encodeURIComponent('Học viên không tồn tại!'));
      }
      const userId = profileRow[0].MaNguoiDung;

      // 2. CHỐT CHẶN BẢO VỆ DỮ LIỆU: 
      // Kiểm tra xem học viên đã có bất kỳ đơn đăng ký, giao dịch thanh toán hoặc lịch sử điểm danh nào chưa
      const [enrollments] = await conn.query(
        "SELECT COUNT(*) AS cnt FROM dangkyhoc WHERE MaHocVien = ?",
        [id]
      );
      const [transactions] = await conn.query(
        "SELECT COUNT(*) AS cnt FROM giaodich g JOIN dangkyhoc d ON g.MaDangKy = d.MaDangKy WHERE d.MaHocVien = ?",
        [id]
      );
      const [attendance] = await conn.query(
        "SELECT COUNT(*) AS cnt FROM diemdanh WHERE MaHocVien = ?",
        [id]
      );

      const hasHistory = (enrollments[0].cnt > 0) || (transactions[0].cnt > 0) || (attendance[0].cnt > 0);

      if (hasHistory) {
        return res.redirect('/admin/dashboard?tab=students&error=' + encodeURIComponent('Không thể xóa! Học viên này đã đóng học phí và có lịch học trên hệ thống.'));
      }

      // 3. Nếu chưa từng đăng ký hay đóng học phí -> Tiến hành xóa an toàn
      await conn.beginTransaction();

      await conn.query('DELETE FROM diemdanh WHERE MaHocVien = ?', [id]);
      await conn.query('DELETE FROM quanlydiem WHERE MaHocVien = ?', [id]);
      await conn.query('DELETE FROM ketquathi WHERE MaHocVien = ?', [id]);
      await conn.query('DELETE FROM dangkyhoc WHERE MaHocVien = ?', [id]);
      await conn.query('DELETE FROM hosohocvien WHERE MaHocVien = ?', [id]);

      // Chỉ xóa tài khoản nguoidung nếu tài khoản đó không còn hồ sơ nào khác và không là MaNguoiDangKy của đơn nào
      const [otherProfiles] = await conn.query('SELECT COUNT(*) AS cnt FROM hosohocvien WHERE MaNguoiDung = ?', [userId]);
      const [userRegs] = await conn.query('SELECT COUNT(*) AS cnt FROM dangkyhoc WHERE MaNguoiDangKy = ?', [userId]);

      if (otherProfiles[0].cnt === 0 && userRegs[0].cnt === 0) {
        await conn.query('DELETE FROM nguoidung WHERE MaNguoiDung = ?', [userId]);
      }

      await conn.commit();
      res.redirect('/admin/dashboard?tab=students&success=' + encodeURIComponent('Xóa học viên thành công!'));
    } catch (err) {
      if (conn) await conn.rollback();
      console.error('Lỗi khi xóa học viên:', err);
      res.redirect('/admin/dashboard?tab=students&error=' + encodeURIComponent('Không thể xóa! Học viên này đã đóng học phí và có lịch học trên hệ thống.'));
    } finally {
      if (conn) conn.release();
    }
  }


  // 13. Edit Format TOEIC
  static async editFormat(req, res) {
    const fs = require('fs');
    const path = require('path');
    try {
      const formatPath = path.join(__dirname, '../public/json/format_toeic.json');
      const formatData = JSON.parse(fs.readFileSync(formatPath, 'utf8'));
      res.render('admin/edit-format', { formatData, user: req.session.user });
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=content&error=' + encodeURIComponent('Lỗi tải dữ liệu: ' + err.message));
    }
  }

  static async saveFormat(req, res) {
    const fs = require('fs');
    const path = require('path');
    try {
      const { data } = req.body;
      const formatPath = path.join(__dirname, '../public/json/format_toeic.json');
      fs.writeFileSync(formatPath, JSON.stringify(data, null, 2), 'utf8');
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // GET: Hiển thị trang chỉnh sửa câu hỏi
  static async editExamQuestions(req, res) {
    const fs = require('fs');
    const path = require('path');
    try {
      const { id } = req.params;
      const [rows] = await pool.query('SELECT * FROM baithi WHERE MaDeThi = ?', [id]);
      if (rows.length === 0) {
        return res.redirect('/admin/dashboard?tab=exams&error=' + encodeURIComponent('Không tìm thấy đề thi.'));
      }
      const exam = rows[0];

      let relativePath = exam.DuongDanFileJSON;
      if (!relativePath || relativePath.trim() === '') {
        relativePath = `json/exam_${id}.json`;
        await pool.query('UPDATE baithi SET DuongDanFileJSON = ? WHERE MaDeThi = ?', [relativePath, id]);
        exam.DuongDanFileJSON = relativePath;
      }

      let jsonFullPath = path.join(__dirname, '../public', relativePath);
      if (!fs.existsSync(jsonFullPath)) {
        const altPath = path.join(__dirname, '..', relativePath);
        if (fs.existsSync(altPath)) {
          jsonFullPath = altPath;
        } else {
          const dir = path.dirname(jsonFullPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          const initialData = { title: exam.TenDeThi, duration: exam.ThoiGianLamBai || 120, questions: [] };
          fs.writeFileSync(jsonFullPath, JSON.stringify(initialData, null, 2), 'utf8');
        }
      }

      let testData = { title: exam.TenDeThi, duration: exam.ThoiGianLamBai, questions: [] };
      if (fs.existsSync(jsonFullPath)) {
        try {
          const fileContent = fs.readFileSync(jsonFullPath, 'utf8');
          if (fileContent.trim()) {
            testData = JSON.parse(fileContent);
          }
        } catch (parseError) {
          console.error('Lỗi parse JSON file:', parseError);
        }
      }

      const success = req.query.success || null;
      const error = req.query.error || null;

      res.render('admin/edit-exam-questions', { exam, testData, user: req.session.user, success, error });
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=exams&error=' + encodeURIComponent('Lỗi tải câu hỏi đề thi: ' + err.message));
    }
  }

  // POST: Xử lý lưu câu hỏi
  static async saveExamQuestions(req, res) {
    const fs = require('fs');
    const path = require('path');

    // Tối ưu cách nhận diện request từ fetch()
    const isAjax = req.xhr || req.is('json') || (req.headers.accept && req.headers.accept.includes('application/json'));

    try {
      const { id } = req.params;
      const { title, duration, audio } = req.body;

      let questions = req.body.questions || [];
      if (typeof questions === 'string') {
        try { questions = JSON.parse(questions); } catch (e) { questions = []; }
      }

      const [rows] = await pool.query('SELECT * FROM baithi WHERE MaDeThi = ?', [id]);
      if (rows.length === 0) {
        if (isAjax) return res.status(404).json({ success: false, message: 'Không tìm thấy đề thi trong CSDL.' });
        return res.redirect('/admin/dashboard?tab=exams&error=' + encodeURIComponent('Không tìm thấy đề thi.'));
      }
      const exam = rows[0];

      // Sửa lỗi đường dẫn file JSON có chứa dấu '/' ở đầu
      let relativePath = exam.DuongDanFileJSON || `json/exam_${id}.json`;
      if (relativePath.startsWith('/')) relativePath = relativePath.substring(1);

      let jsonFullPath = path.join(__dirname, '../public', relativePath);

      const dir = path.dirname(jsonFullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      let existingJson = { title: "", duration: 120, questions: [] };
      if (fs.existsSync(jsonFullPath)) {
        try {
          const fileData = fs.readFileSync(jsonFullPath, 'utf8');
          if (fileData.trim()) existingJson = JSON.parse(fileData);
        } catch (e) {
          console.error("File JSON hiện tại bị lỗi...", e);
        }
      }

      let parsedQuestions = [];
      if (questions) {
        const rawArray = Array.isArray(questions) ? questions : Object.values(questions);
        parsedQuestions = rawArray.map((q, idx) => {
          let opts = q.options;
          if (typeof opts === 'string') {
            try { opts = JSON.parse(opts); } catch (e) { opts = []; }
          } else if (opts && typeof opts === 'object' && !Array.isArray(opts)) {
            opts = Object.values(opts);
          }
          return {
            id: parseInt(q.id) || (idx + 1),
            part: parseInt(q.part) || 1,
            question: q.question || '',
            passage: q.passage || null,
            audio: q.audio || null,
            image: q.image || null,
            options: Array.isArray(opts) ? opts : [],
            answer: (q.answer || 'A').toUpperCase(),
            script: q.script || null,
            explanation: q.explanation || null
          };
        });
      }

      const updatedJson = {
        ...existingJson,
        title: title || exam.TenDeThi,
        duration: parseInt(duration) || exam.ThoiGianLamBai,
        audio: audio || existingJson.audio || null,
        questions: parsedQuestions
      };

      // Ghi file JSON
      fs.writeFileSync(jsonFullPath, JSON.stringify(updatedJson, null, 2), 'utf8');

      // Cập nhật Database
      await pool.query(
        'UPDATE baithi SET TenDeThi = ?, ThoiGianLamBai = ?, DuongDanFileJSON = ? WHERE MaDeThi = ?',
        [title || exam.TenDeThi, parseInt(duration) || exam.ThoiGianLamBai, relativePath, id]
      );

      // Trả về JSON chuẩn cho fetch
      if (isAjax) {
        return res.json({ success: true, message: 'Lưu câu hỏi & đáp án thành công!' });
      }

      const isAdmin = req.session.user && req.session.user.TenVaiTro === 'Admin';
      const redirectPath = isAdmin
        ? `/admin/exams/edit-questions/${id}?success=${encodeURIComponent('Lưu câu hỏi & đáp án thành công!')}`
        : `/classes/exams/edit-questions/${id}?success=${encodeURIComponent('Lưu câu hỏi & đáp án thành công!')}`;
      res.redirect(redirectPath);

    } catch (err) {
      console.error('LỖI LƯU ĐỀ THI:', err);

      // Bắt buộc trả về JSON nếu là fetch để Frontend không bị đơ
      if (isAjax) {
        return res.status(500).json({ success: false, message: 'Lỗi server khi lưu bài thi: ' + err.message });
      }

      const isAdmin = req.session.user && req.session.user.TenVaiTro === 'Admin';
      const redirectPath = isAdmin
        ? `/admin/exams/edit-questions/${req.params.id}?error=${encodeURIComponent('Không thể lưu: ' + err.message)}`
        : `/classes/exams/edit-questions/${req.params.id}?error=${encodeURIComponent('Không thể lưu: ' + err.message)}`;
      res.redirect(redirectPath);
    }
  }

  // 14. Edit Listening Tips
  static async editListening(req, res) {
    const fs = require('fs');
    const path = require('path');
    try {
      const meoPath = path.join(__dirname, '../public/json/meo_listening.json');
      const meoData = JSON.parse(fs.readFileSync(meoPath, 'utf8'));
      res.render('admin/edit-listening', { meoData, user: req.session.user });
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=content&error=' + encodeURIComponent('Lỗi tải dữ liệu: ' + err.message));
    }
  }

  static async saveListening(req, res) {
    const fs = require('fs');
    const path = require('path');
    try {
      const { data } = req.body;
      const meoPath = path.join(__dirname, '../public/json/meo_listening.json');
      fs.writeFileSync(meoPath, JSON.stringify(data, null, 2), 'utf8');
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // 15. Edit Vocabulary
  static async editVocab(req, res) {
    const fs = require('fs');
    const path = require('path');
    try {
      const vocabPath = path.join(__dirname, '../public/json/tu_vung_van_phong.json');
      const vocabData = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
      res.render('admin/edit-vocab', { vocabData, user: req.session.user });
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=content&error=' + encodeURIComponent('Lỗi tải dữ liệu: ' + err.message));
    }
  }

  static async saveVocab(req, res) {
    const fs = require('fs');
    const path = require('path');
    try {
      const { data } = req.body;
      const vocabPath = path.join(__dirname, '../public/json/tu_vung_van_phong.json');
      fs.writeFileSync(vocabPath, JSON.stringify(data, null, 2), 'utf8');
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // 16. Exam & Practice Management CRUD

  static async addExam(req, res) {
    try {
      const { TenDeThi, ThoiGianLamBai, LoaiDe, TrangThai } = req.body;
      let DuongDanFileJSON = req.body.DuongDanFileJSON || '';

      if (req.file) {
        DuongDanFileJSON = 'json/' + req.file.filename;
      }

      if (!DuongDanFileJSON) {
        return res.redirect('/admin/dashboard?tab=exams&error=' + encodeURIComponent('Vui lòng nhập đường dẫn hoặc tải lên file JSON bài thi.'));
      }

      const [result] = await pool.query(
        'INSERT INTO baithi (TenDeThi, ThoiGianLamBai, LoaiDe, DuongDanFileJSON, TrangThai) VALUES (?, ?, ?, ?, ?)',
        [TenDeThi ? TenDeThi.trim() : 'Đề thi mới', parseInt(ThoiGianLamBai) || 120, LoaiDe || 'Mẫu / Miễn phí', DuongDanFileJSON.trim(), TrangThai !== undefined ? parseInt(TrangThai) : 1]
      );

      const newExamId = result.insertId;
      res.redirect(`/admin/exams/edit-questions/${newExamId}?success=` + encodeURIComponent('Thêm đề thi mới thành công! Bạn có thể bắt đầu chỉnh sửa và thêm câu hỏi ngay bên dưới.'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=exams&error=' + encodeURIComponent('Không thể thêm đề thi: ' + err.message));
    }
  }

  static async editExam(req, res) {
    try {
      const { id } = req.params;
      const { TenDeThi, ThoiGianLamBai, LoaiDe, TrangThai } = req.body;
      let DuongDanFileJSON = req.body.DuongDanFileJSON || '';

      if (req.file) {
        DuongDanFileJSON = 'json/' + req.file.filename;
      }

      const parsedStatus = parseInt(TrangThai);
      const statusVal = isNaN(parsedStatus) ? 1 : parsedStatus;

      if (DuongDanFileJSON) {
        await pool.query(
          'UPDATE baithi SET TenDeThi = ?, ThoiGianLamBai = ?, LoaiDe = ?, DuongDanFileJSON = ?, TrangThai = ? WHERE MaDeThi = ?',
          [TenDeThi, parseInt(ThoiGianLamBai) || 120, LoaiDe, DuongDanFileJSON.trim(), statusVal, id]
        );
      } else {
        await pool.query(
          'UPDATE baithi SET TenDeThi = ?, ThoiGianLamBai = ?, LoaiDe = ?, TrangThai = ? WHERE MaDeThi = ?',
          [TenDeThi, parseInt(ThoiGianLamBai) || 120, LoaiDe, statusVal, id]
        );
      }

      res.redirect('/admin/dashboard?tab=exams&success=' + encodeURIComponent('Cập nhật đề thi thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=exams&error=' + encodeURIComponent('Không thể cập nhật đề thi: ' + err.message));
    }
  }

  static async deleteExam(req, res) {
    try {
      const { id } = req.params;

      // 1. RÀNG BUỘC NGHIỆP VỤ BẢO VỆ DỮ LIỆU: Không cho phép xóa đề thi khi đang có học viên/khách hàng làm bài hoặc đã có lịch sử nộp bài ketquathi
      const [attemptRows] = await pool.query('SELECT COUNT(*) AS total FROM ketquathi WHERE MaDeThi = ?', [id]);
      const totalAttempts = attemptRows[0] ? attemptRows[0].total : 0;

      if (totalAttempts > 0) {
        return res.redirect(
          '/admin/dashboard?tab=exams&error=' +
            encodeURIComponent(
              `🚫 RÀNG BUỘC NGHIỆP VỤ: Không thể xóa đề thi này! Đề thi đã có ${totalAttempts} lượt học viên/khách làm bài. Vui lòng chuyển sang trạng thái "Ẩn" thay vì xóa!`
            )
        );
      }

      await pool.query('DELETE FROM baithi WHERE MaDeThi = ?', [id]);
      res.redirect('/admin/dashboard?tab=exams&success=' + encodeURIComponent('Xóa đề thi thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=exams&error=' + encodeURIComponent('Không thể xóa đề thi này: ' + err.message));
    }
  }

  static async toggleExamStatus(req, res) {
    try {
      const { id } = req.params;
      const [rows] = await pool.query('SELECT TrangThai FROM baithi WHERE MaDeThi = ?', [id]);
      if (rows.length > 0) {
        const newStatus = rows[0].TrangThai === 1 ? 0 : 1;
        await pool.query('UPDATE baithi SET TrangThai = ? WHERE MaDeThi = ?', [newStatus, id]);
      }
      res.redirect('/admin/dashboard?tab=exams&success=' + encodeURIComponent('Đã thay đổi trạng thái đề thi!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=exams&error=' + encodeURIComponent('Lỗi chuyển trạng thái đề thi: ' + err.message));
    }
  }

  static async changeExamType(req, res) {
    try {
      const { id } = req.params;
      const { LoaiDe } = req.body;
      await pool.query('UPDATE baithi SET LoaiDe = ? WHERE MaDeThi = ?', [LoaiDe, id]);
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=exams&error=' + encodeURIComponent('Không thể chuyển đổi loại đề thi: ' + err.message));
    }
  }

  // 17. Roadmap (LOTRINH_DEXUAT) CRUD
  static async addRoadmap(req, res) {
    try {
      const { MaKhoaHoc, DiemTu, DiemDen, MoTa, LoaiLoTrinh } = req.body;
      const typeStr = (LoaiLoTrinh || 'Tiêu chuẩn').trim();
      const diemStart = Number(DiemTu);
      const diemEnd = Number(DiemDen);

      if (!MaKhoaHoc) {
        return res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent('Vui lòng chọn khóa học đề xuất cho lộ trình.'));
      }

      // RÀNG BUỘC 4: Data Binding - Chỉ load/chấp nhận khóa học đang Hoạt động (Active)
      const [courseCheck] = await pool.query("SELECT TrangThai, TenKhoaHoc, CapDo FROM khoahoc WHERE MaKhoaHoc = ?", [MaKhoaHoc]);
      if (courseCheck.length === 0 || (courseCheck[0].TrangThai && courseCheck[0].TrangThai !== 'Hoạt động' && courseCheck[0].TrangThai !== 'Active')) {
        return res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent('Chỉ được phép chọn các khóa học đang ở trạng thái Hoạt động (Active).'));
      }

      // RÀNG BUỘC 1: Format Dải điểm (số nguyên, 0 <= diem <= 990, chia hết cho 5, DiemTu < DiemDen)
      if (!Number.isInteger(diemStart) || !Number.isInteger(diemEnd) || diemStart < 0 || diemEnd > 990) {
        return res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent('Dải điểm phải là số nguyên từ 0 đến 990.'));
      }

      if (diemStart % 5 !== 0 || diemEnd % 5 !== 0) {
        return res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent('Điểm Từ và Điểm Đến phải chia hết cho 5 (bước nhảy chuẩn bài thi TOEIC).'));
      }

      if (diemStart >= diemEnd) {
        return res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent(`Dải điểm không hợp lệ! Điểm bắt đầu (${diemStart}) phải nhỏ hơn điểm kết thúc (${diemEnd}).`));
      }

      // CROSS-VALIDATION: Trần điểm theo Loại (Mất gốc max <= 350)
      if (typeStr === 'Mất gốc' && diemEnd > 350) {
        return res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent(`Trần điểm loại Mất gốc: Điểm Đến tối đa không được vượt quá 350 điểm (bạn đang nhập ${diemEnd}).`));
      }

      // CROSS-VALIDATION: Logic Đầu vào - Đầu ra (DiemTu < DiemDauRa)
      const outputScore = getCourseOutputScore(courseCheck[0].CapDo, courseCheck[0].TenKhoaHoc);
      if (diemStart >= outputScore) {
        return res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent(`Lỗi logic Đầu vào - Đầu ra: Điểm bắt đầu (${diemStart}) phải nhỏ hơn Điểm mục tiêu đầu ra (${outputScore}) của khóa "${courseCheck[0].TenKhoaHoc}".`));
      }

      // CROSS-VALIDATION: Kiểm tra tương thích Loại lộ trình và Khóa học
      const compatErr = validateRoadmapCourseCompatibility(typeStr, courseCheck[0].CapDo, courseCheck[0].TenKhoaHoc);
      if (compatErr) {
        return res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent(compatErr));
      }

      // RÀNG BUỘC 1 & NỐI TIẾP: Chống đè / chồng chéo (No Overlapping) trong cùng loại lộ trình
      const [existingRoadmaps] = await pool.query(
        "SELECT r.*, k.TenKhoaHoc FROM lotrinh_dexuat r JOIN khoahoc k ON r.MaKhoaHoc = k.MaKhoaHoc WHERE (r.is_active = 1 OR r.is_active IS NULL) AND r.LoaiLoTrinh = ? ORDER BY r.DiemTu ASC",
        [typeStr]
      );

      for (const r of existingRoadmaps) {
        const existStart = r.DiemTu;
        const existEnd = r.DiemDen;
        if (diemStart < existEnd && diemEnd > existStart) {
          return res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent(`Lỗi giao dải điểm! Dải điểm (${diemStart} - ${diemEnd}) bị đè/trùng lặp với dải điểm (${existStart} - ${existEnd}) của khóa "${r.TenKhoaHoc}" trong loại lộ trình "${typeStr}".`));
        }
      }

      await pool.query(
        'INSERT INTO lotrinh_dexuat (MaKhoaHoc, DiemTu, DiemDen, MoTa, LoaiLoTrinh, is_active) VALUES (?, ?, ?, ?, ?, 1)',
        [parseInt(MaKhoaHoc), diemStart, diemEnd, (MoTa || '').trim(), typeStr]
      );

      // RÀNG BUỘC 2 & 3: Tự động sắp xếp lại thứ tự bước & sinh mã lộ trình duy nhất (LTR_TC_01...)
      await syncRoadmapCodesHelper();

      res.redirect('/admin/dashboard?tab=roadmaps&success=' + encodeURIComponent('Thêm cấu hình lộ trình đề xuất mới thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent('Không thể thêm lộ trình đề xuất: ' + err.message));
    }
  }

  static async editRoadmap(req, res) {
    try {
      const { id } = req.params;
      const { MaKhoaHoc, DiemTu, DiemDen, MoTa } = req.body;

      // EDIT LOCK: Không cho phép sửa Loại Lộ Trình khi chỉnh sửa lộ trình hiện có
      const [targetRows] = await pool.query("SELECT * FROM lotrinh_dexuat WHERE MaLoTrinh = ?", [id]);
      if (targetRows.length === 0) {
        return res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent('Không tìm thấy lộ trình cần sửa.'));
      }
      const typeStr = targetRows[0].LoaiLoTrinh;

      const diemStart = Number(DiemTu);
      const diemEnd = Number(DiemDen);

      if (!MaKhoaHoc) {
        return res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent('Vui lòng chọn khóa học cho lộ trình.'));
      }

      // RÀNG BUỘC 4: Data Binding - Chỉ load/chấp nhận khóa học đang Hoạt động (Active)
      const [courseCheck] = await pool.query("SELECT TrangThai, TenKhoaHoc, CapDo FROM khoahoc WHERE MaKhoaHoc = ?", [MaKhoaHoc]);
      if (courseCheck.length === 0 || (courseCheck[0].TrangThai && courseCheck[0].TrangThai !== 'Hoạt động' && courseCheck[0].TrangThai !== 'Active')) {
        return res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent('Chỉ được phép chọn các khóa học đang ở trạng thái Hoạt động (Active).'));
      }

      // RÀNG BUỘC 1: Format Dải điểm (số nguyên, 0 <= diem <= 990, chia hết cho 5, DiemTu < DiemDen)
      if (!Number.isInteger(diemStart) || !Number.isInteger(diemEnd) || diemStart < 0 || diemEnd > 990) {
        return res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent('Dải điểm phải là số nguyên từ 0 đến 990.'));
      }

      if (diemStart % 5 !== 0 || diemEnd % 5 !== 0) {
        return res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent('Điểm Từ và Điểm Đến phải chia hết cho 5 (bước nhảy chuẩn bài thi TOEIC).'));
      }

      if (diemStart >= diemEnd) {
        return res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent(`Dải điểm không hợp lệ! Điểm bắt đầu (${diemStart}) phải nhỏ hơn điểm kết thúc (${diemEnd}).`));
      }

      // CROSS-VALIDATION: Trần điểm theo Loại (Mất gốc max <= 350)
      if (typeStr === 'Mất gốc' && diemEnd > 350) {
        return res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent(`Trần điểm loại Mất gốc: Điểm Đến tối đa không được vượt quá 350 điểm (bạn đang nhập ${diemEnd}).`));
      }

      // CROSS-VALIDATION: Logic Đầu vào - Đầu ra (DiemTu < DiemDauRa)
      const outputScore = getCourseOutputScore(courseCheck[0].CapDo, courseCheck[0].TenKhoaHoc);
      if (diemStart >= outputScore) {
        return res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent(`Lỗi logic Đầu vào - Đầu ra: Điểm bắt đầu (${diemStart}) phải nhỏ hơn Điểm mục tiêu đầu ra (${outputScore}) của khóa "${courseCheck[0].TenKhoaHoc}".`));
      }

      // CROSS-VALIDATION: Kiểm tra tương thích Loại lộ trình và Khóa học
      const compatErr = validateRoadmapCourseCompatibility(typeStr, courseCheck[0].CapDo, courseCheck[0].TenKhoaHoc);
      if (compatErr) {
        return res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent(compatErr));
      }

      // RÀNG BUỘC 1: Chống đè / chồng chéo trong cùng loại lộ trình
      const [existingRoadmaps] = await pool.query(
        "SELECT r.*, k.TenKhoaHoc FROM lotrinh_dexuat r JOIN khoahoc k ON r.MaKhoaHoc = k.MaKhoaHoc WHERE (r.is_active = 1 OR r.is_active IS NULL) AND r.LoaiLoTrinh = ? AND r.MaLoTrinh != ?",
        [typeStr, id]
      );

      for (const r of existingRoadmaps) {
        const existStart = r.DiemTu;
        const existEnd = r.DiemDen;
        if (diemStart < existEnd && diemEnd > existStart) {
          return res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent(`Lỗi giao dải điểm! Dải điểm (${diemStart} - ${diemEnd}) bị đè/trùng lặp với dải điểm (${existStart} - ${existEnd}) của khóa "${r.TenKhoaHoc}" trong loại lộ trình "${typeStr}".`));
        }
      }

      await pool.query(
        'UPDATE lotrinh_dexuat SET MaKhoaHoc = ?, DiemTu = ?, DiemDen = ?, MoTa = ? WHERE MaLoTrinh = ?',
        [parseInt(MaKhoaHoc), diemStart, diemEnd, (MoTa || '').trim(), id]
      );

      // RÀNG BUỘC 2 & 3: Đồng bộ mã lộ trình & thứ tự bước
      await syncRoadmapCodesHelper();

      res.redirect('/admin/dashboard?tab=roadmaps&success=' + encodeURIComponent('Cập nhật lộ trình đề xuất thành công!'));
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent('Không thể cập nhật lộ trình đề xuất: ' + err.message));
    }
  }

  static async deleteRoadmap(req, res) {
    try {
      const { id } = req.params;

      // QUY TẮC "XÓA TỪ NGỌN": Chỉ cho phép xóa Bước cuối cùng (bước cao nhất)
      const [targetRows] = await pool.query("SELECT * FROM lotrinh_dexuat WHERE MaLoTrinh = ?", [id]);
      if (targetRows.length === 0) {
        return res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent('Không tìm thấy lộ trình cần xóa.'));
      }
      const target = targetRows[0];

      const [higherSteps] = await pool.query(
        "SELECT COUNT(*) AS cnt FROM lotrinh_dexuat WHERE (is_active = 1 OR is_active IS NULL) AND LoaiLoTrinh = ? AND DiemTu > ?",
        [target.LoaiLoTrinh, target.DiemTu]
      );

      if (higherSteps[0].cnt > 0) {
        return res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent(`Quy tắc "Xóa từ ngọn": Bạn chỉ được phép xóa Bước cuối cùng (bước có dải điểm cao nhất) của loại lộ trình "${target.LoaiLoTrinh}". Vui lòng xóa các bước cao hơn trước để không làm đứt gãy chuỗi lộ trình!`));
      }

      // RÀNG BUỘC 5: Kiểm tra dữ liệu học viên (Data Dependency Check)
      const [examUsage] = await pool.query("SELECT COUNT(*) AS cnt FROM ketquathi WHERE MaLoTrinh = ?", [id]);
      const [roadUsage] = await pool.query(
        "SELECT COUNT(*) AS cnt FROM lotrinh_dexuat r JOIN lophoc l ON r.MaKhoaHoc = l.MaKhoaHoc JOIN dangkyhoc d ON l.MaLopHoc = d.MaLopHoc WHERE r.MaLoTrinh = ?",
        [id]
      );

      const isUsed = (examUsage[0]?.cnt > 0) || (roadUsage[0]?.cnt > 0);

      if (isUsed) {
        // Soft delete / Ẩn khỏi hệ thống đề xuất mới
        await pool.query('UPDATE lotrinh_dexuat SET is_active = 0 WHERE MaLoTrinh = ?', [id]);
        await syncRoadmapCodesHelper();
        return res.redirect('/admin/dashboard?tab=roadmaps&success=' + encodeURIComponent('Cảnh báo: Lộ trình đang được áp dụng cho học viên, không thể xóa cứng. Hệ thống đã tự động chuyển sang trạng thái Ẩn/Deactivate để bảo tồn lịch sử dữ liệu của học viên.'));
      } else {
        // Hard delete
        await pool.query('DELETE FROM lotrinh_dexuat WHERE MaLoTrinh = ?', [id]);
        await syncRoadmapCodesHelper();
        return res.redirect('/admin/dashboard?tab=roadmaps&success=' + encodeURIComponent('Xóa cứng lộ trình đề xuất thành công!'));
      }
    } catch (err) {
      console.error(err);
      res.redirect('/admin/dashboard?tab=roadmaps&error=' + encodeURIComponent('Không thể xóa lộ trình đề xuất này: ' + err.message));
    }
  }

  static async assignFutureClassShift(req, res) {
    try {
      const { MaDangKy, MaLopHocMoi } = req.body;
      if (!MaDangKy || !MaLopHocMoi) {
        return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Vui lòng chọn lớp đợt mở mới!'));
      }

      const [enrollRows] = await pool.query(
        'SELECT d.*, l.TenLop FROM dangkyhoc d JOIN lophoc l ON d.MaLopHoc = l.MaLopHoc WHERE d.MaDangKy = ?',
        [MaDangKy]
      );
      if (enrollRows.length === 0) {
        return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Không tìm thấy đơn đăng ký!'));
      }
      const enroll = enrollRows[0];

      const [newClsRows] = await pool.query(
        'SELECT lh.*, kh.TenKhoaHoc FROM lophoc lh JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc WHERE lh.MaLopHoc = ?',
        [MaLopHocMoi]
      );
      if (newClsRows.length === 0) {
        return res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Lớp đợt mới không tồn tại!'));
      }
      const newCls = newClsRows[0];

      const noteText = `[Đã xếp ca đợt mới] Gán vào lớp ${newCls.TenLop} (${newCls.TenKhoaHoc}). Ghi chú cũ: ${enroll.GhiChu || ''}`;

      await pool.query(
        "UPDATE dangkyhoc SET MaLopHoc = ?, TrangThai = 'Đang học', GhiChu = ? WHERE MaDangKy = ?",
        [MaLopHocMoi, noteText, MaDangKy]
      );

      // Gửi mail thông báo xếp lớp đợt mới tới học viên
      try {
        const [uRows] = await pool.query(
          `SELECT nd.Email, hh.HoTen AS TenHocVien FROM hosohocvien hh JOIN nguoidung nd ON hh.MaNguoiDung = nd.MaNguoiDung WHERE hh.MaHocVien = ?`,
          [enroll.MaHocVien]
        );
        if (uRows.length > 0 && uRows[0].Email) {
          sendFutureClassAssignedMail({
            to: uRows[0].Email,
            studentName: uRows[0].TenHocVien,
            newClassName: newCls.TenLop,
            courseName: newCls.TenKhoaHoc,
            startDate: newCls.NgayKhaiGiang
          }).catch(mErr => console.error('Lỗi gửi mail xếp ca đợt mới:', mErr.message));
        }
      } catch (mailErr) {
        console.error('Lỗi gửi mail xếp ca đợt mới:', mailErr.message);
      }

      res.redirect('/admin/dashboard?tab=enrollments&success=' + encodeURIComponent(`Đã gán học viên vào lớp đợt mới "${newCls.TenLop}" thành công!`));
    } catch (err) {
      console.error('Lỗi khi Admin xếp ca đợt mới:', err);
      res.redirect('/admin/dashboard?tab=enrollments&error=' + encodeURIComponent('Không thể xếp ca đợt mới: ' + err.message));
    }
  }
}

module.exports = AdminController;