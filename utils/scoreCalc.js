/**
 * ============================================================================
 * TIỆN ÍCH TÍNH ĐIỂM THI & CẬP NHẬT TRÌNH ĐỘ HỌC VIÊN (SCORE CALC & PROFICIENCY)
 * ============================================================================
 * Hàm tiện ích xử lý quy đổi điểm thi trắc nghiệm và đánh giá xếp loại trình độ:
 * - Quy đổi số câu đúng sang điểm bài thi TOEIC.
 * - Quy đổi điểm IELTS sang TOEIC và đề xuất cấp độ lớp học tương ứng.
 * - Tự động cập nhật Trình độ hiện tại (TrinhDoHienTai) của học viên dựa trên khóa học đã thanh toán hoặc điểm thi đầu vào.
 */

const pool = require('../models/db');

async function updateStudentProficiencyLevel(maHocVien) {
  if (!maHocVien) return null;
  try {
    let newLevel = null;

    // 1. Ưu tiên kiểm tra cấp độ/mục tiêu khóa học từ các lớp học đã thanh toán thành công / đang học
    const [classRows] = await pool.query(
      `SELECT kh.CapDo, kh.TenKhoaHoc 
       FROM dangkyhoc dk 
       JOIN lophoc lh ON dk.MaLopHoc = lh.MaLopHoc 
       JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc 
       WHERE dk.MaHocVien = ? AND dk.TrangThai IN ('Thành công', 'Đang học', 'Hoàn thành') 
       ORDER BY dk.MaDangKy DESC LIMIT 1`,
      [maHocVien]
    );

    if (classRows.length > 0) {
      const capdo = classRows[0].CapDo || '';
      const tenKhoaHoc = classRows[0].TenKhoaHoc || '';
      const combined = `${capdo} ${tenKhoaHoc}`.toLowerCase();

      if (combined.includes('foundation') || combined.includes('300')) {
        newLevel = 'Mất gốc (0-200)';
      } else if (combined.includes('450') || combined.includes('500')) {
        newLevel = 'Cơ bản (200-450)';
      } else if (combined.includes('650') || combined.includes('600')) {
        newLevel = 'Trung cấp (450-650)';
      } else if (combined.includes('850') || combined.includes('750') || combined.includes('cấp tốc')) {
        newLevel = 'Nâng cao (650-850)';
      } else {
        if (capdo === 'Foundation') newLevel = 'Mất gốc (0-200)';
        else if (capdo === '450+') newLevel = 'Cơ bản (200-450)';
        else if (capdo === '650+') newLevel = 'Trung cấp (450-650)';
        else newLevel = capdo || tenKhoaHoc;
      }
    } else {
      // 2. Nếu chưa có khóa học nào thanh toán thành công, fallback sử dụng bài test đầu vào mới nhất
      const [examRows] = await pool.query(
        `SELECT (DiemNghe + DiemDoc) as TotalScore 
         FROM ketquathi 
         WHERE MaHocVien = ? 
         ORDER BY NgayThi DESC LIMIT 1`,
        [maHocVien]
      );

      if (examRows.length > 0) {
        const score = Number(examRows[0].TotalScore || 0);
        if (score <= 200) {
          newLevel = 'Mất gốc (0-200)';
        } else if (score <= 450) {
          newLevel = 'Cơ bản (200-450)';
        } else if (score <= 650) {
          newLevel = 'Trung cấp (450-650)';
        } else if (score <= 850) {
          newLevel = 'Nâng cao (650-850)';
        } else {
          newLevel = 'Cao cấp VIP (850-990)';
        }
      }
    }

    if (newLevel) {
      await pool.query(
        'UPDATE hosohocvien SET TrinhDoHienTai = ? WHERE MaHocVien = ?',
        [newLevel, maHocVien]
      );
    }
    return newLevel;
  } catch (err) {
    console.error('Lỗi khi tự động cập nhật trình độ học viên:', err);
    return null;
  }
}

/**
 * Quy đổi điểm IELTS (thang 0 - 9.0) sang điểm TOEIC tương đương (thang 0 - 990) theo chuẩn quốc tế ETS / CEFR.
 */
function convertIeltsToToeicScore(ieltsBand) {
  const band = parseFloat(ieltsBand) || 0;
  if (band <= 3.0) return 200;
  if (band <= 4.0) return 350;
  if (band <= 5.0) return 450;
  if (band <= 6.0) return 600;
  if (band <= 7.0) return 750;
  if (band <= 8.0) return 880;
  return 990;
}

/**
 * Quy đổi điểm IELTS sang Trình độ hiện tại và đề xuất xếp lớp phù hợp.
 */
function convertIeltsToProficiencyLevel(ieltsBand) {
  const toeicScore = convertIeltsToToeicScore(ieltsBand);
  if (toeicScore <= 200) return 'Mất gốc (0-200)';
  if (toeicScore <= 450) return 'Cơ bản (200-450)';
  if (toeicScore <= 650) return 'Trung cấp (450-650)';
  if (toeicScore <= 850) return 'Nâng cao (650-850)';
  return 'Cao cấp VIP (850-990)';
}

module.exports = {
  calculateScore: (correctAnswersCount) => {
    return correctAnswersCount * 5;
  },
  convertIeltsToToeicScore,
  convertIeltsToProficiencyLevel,
  updateStudentProficiencyLevel
};
