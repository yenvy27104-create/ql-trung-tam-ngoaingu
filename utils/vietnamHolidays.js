/**
 * ============================================================================
 * UTILITY QUẢN LÝ NGÀY NGHỈ LỄ & NGHỈ BÙ VIỆT NAM (VIETNAM HOLIDAYS UTILITY)
 * ============================================================================
 * Xử lý chính xác các quy định nghỉ lễ theo Luật Lao động Việt Nam & Đặc thù Trung tâm Ngoại ngữ:
 * 1. Các ngày lễ Dương lịch cố định: Tết Dương lịch (1/1), 30/4, 1/5, Quốc khánh (2/9 & 3/9).
 * 2. Các ngày lễ Âm lịch (Tết Nguyên Đán kéo dài 10-12 ngày, Giỗ Tổ Hùng Vương 10/3 Âm lịch).
 * 3. Quy tắc NGHỈ BÙ tự động: Nếu ngày lễ trùng vào Thứ 7 hoặc Chủ Nhật, tự động chuyển
 *    ngày nghỉ bù sang ngày làm việc tiếp theo (Thứ 2, Thứ 3).
 */

const LUNAR_HOLIDAYS_BY_YEAR = {
  2025: {
    tetStart: '2025-01-25', // 26 Âm lịch Chạp
    tetEnd: '2025-02-05',   // Mùng 8 Âm lịch Tháng Giêng (12 ngày)
    gioTo: '2025-04-07'     // 10/3 Âm lịch
  },
  2026: {
    tetStart: '2026-02-14', // 27 Âm lịch Chạp
    tetEnd: '2026-02-24',   // Mùng 7 Âm lịch Tháng Giêng (11 ngày)
    gioTo: '2026-04-26'     // 10/3 Âm lịch (Chủ Nhật) -> Nghỉ bù Thứ 2 (27/04)
  },
  2027: {
    tetStart: '2027-02-03', // 27 Âm lịch Chạp
    tetEnd: '2027-02-14',   // Mùng 7 Âm lịch Tháng Giêng (12 ngày)
    gioTo: '2027-04-16'     // 10/3 Âm lịch
  },
  2028: {
    tetStart: '2028-01-22', // 26 Âm lịch Chạp
    tetEnd: '2028-02-02',   // Mùng 8 Âm lịch Tháng Giêng (12 ngày)
    gioTo: '2028-04-04'     // 10/3 Âm lịch
  },
  2029: {
    tetStart: '2029-02-09', // 26 Âm lịch Chạp
    tetEnd: '2029-02-20',   // Mùng 8 Âm lịch Tháng Giêng (12 ngày)
    gioTo: '2029-04-23'     // 10/3 Âm lịch
  },
  2030: {
    tetStart: '2030-01-29', // 26 Âm lịch Chạp
    tetEnd: '2030-02-09',   // Mùng 8 Âm lịch Tháng Giêng (12 ngày)
    gioTo: '2030-04-12'     // 10/3 Âm lịch
  }
};

// Cache kết quả nghỉ lễ theo năm để tối ưu hiệu năng
const holidaysCacheByYear = {};

/**
 * Lấy danh sách toàn bộ ngày lễ & ngày nghỉ bù của một năm
 * @param {number} year - Năm cần lấy
 * @returns {Set<string>} Tập hợp các ngày YYYY-MM-DD được nghỉ
 */
function getVietnamHolidaysForYear(year) {
  if (holidaysCacheByYear[year]) {
    return holidaysCacheByYear[year];
  }

  const holidays = new Set();

  // 1. Ngày lễ Dương lịch cố định hàng năm
  holidays.add(`${year}-01-01`); // Tết Dương lịch (1/1)
  holidays.add(`${year}-04-30`); // Ngày Chiến thắng (30/4)
  holidays.add(`${year}-05-01`); // Ngày Quốc tế Lao động (1/5)
  holidays.add(`${year}-09-02`); // Ngày Quốc khánh (2/9)
  holidays.add(`${year}-09-03`); // Ngày Quốc khánh (3/9)

  // 2. Ngày lễ Âm lịch
  const lunar = LUNAR_HOLIDAYS_BY_YEAR[year];
  if (lunar) {
    // Đợt nghỉ Tết Nguyên Đán kéo dài 10 - 12 ngày
    const partsStart = lunar.tetStart.split('-');
    let cur = new Date(parseInt(partsStart[0]), parseInt(partsStart[1]) - 1, parseInt(partsStart[2]));
    
    const partsEnd = lunar.tetEnd.split('-');
    const tetEnd = new Date(parseInt(partsEnd[0]), parseInt(partsEnd[1]) - 1, parseInt(partsEnd[2]));

    while (cur <= tetEnd) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      holidays.add(`${y}-${m}-${d}`);
      cur.setDate(cur.getDate() + 1);
    }

    // Giỗ Tổ Hùng Vương (10/3 Âm lịch)
    holidays.add(lunar.gioTo);
  }

  // 3. Quy tắc NGHỈ BÙ tự động (Compensatory Holidays)
  // Nếu ngày lễ trùng vào Thứ 7 (6) hoặc Chủ Nhật (0), tự động gán ngày làm việc tiếp theo làm Ngày Nghỉ Bù
  const sortedHolidays = Array.from(holidays).sort();
  const finalHolidays = new Set(holidays);

  sortedHolidays.forEach(hDateStr => {
    // Bỏ qua các ngày thuộc chuỗi nghỉ Tết Nguyên Đán (vì đã nghỉ trọn gói 10-12 ngày bao gồm cả T7, CN)
    if (lunar && hDateStr >= lunar.tetStart && hDateStr <= lunar.tetEnd) {
      return;
    }

    const parts = hDateStr.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dayOfWeek = d.getDay(); // 0: Chủ Nhật, 6: Thứ Bảy

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Tìm ngày làm việc tiếp theo (Thứ 2, Thứ 3...) chưa phải là ngày lễ để gán Nghỉ Bù
      let comp = new Date(d);
      comp.setDate(comp.getDate() + 1);

      while (true) {
        const y = comp.getFullYear();
        const m = String(comp.getMonth() + 1).padStart(2, '0');
        const day = String(comp.getDate()).padStart(2, '0');
        const cStr = `${y}-${m}-${day}`;
        const cDayOfWeek = comp.getDay();

        // Ngày nghỉ bù phải là ngày làm việc (không trùng T7, CN) và chưa nằm trong danh sách ngày lễ
        if (cDayOfWeek !== 0 && cDayOfWeek !== 6 && !finalHolidays.has(cStr)) {
          finalHolidays.add(cStr);
          break;
        }
        comp.setDate(comp.getDate() + 1);
      }
    }
  });

  holidaysCacheByYear[year] = finalHolidays;
  return finalHolidays;
}

/**
 * Kiểm tra một ngày bất kỳ có phải là Ngày Nghỉ Lễ hoặc Ngày Nghỉ Bù hay không
 * @param {Date|string} dInput - Ngày cần kiểm tra (Đối tượng Date hoặc chuỗi 'YYYY-MM-DD')
 * @returns {boolean} true nếu là ngày lễ/nghỉ bù
 */
function isVietnamHolidayOrCompensatory(dInput) {
  let dateObj;
  if (!dInput) return false;

  if (typeof dInput === 'string') {
    const dStr = dInput.split('T')[0];
    const parts = dStr.split('-');
    dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  } else {
    dateObj = new Date(dInput.getFullYear(), dInput.getMonth(), dInput.getDate());
  }

  if (isNaN(dateObj.getTime())) return false;

  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const holidaysSet = getVietnamHolidaysForYear(yyyy);
  return holidaysSet.has(dateStr);
}

module.exports = {
  isVietnamHolidayOrCompensatory,
  getVietnamHolidaysForYear
};
