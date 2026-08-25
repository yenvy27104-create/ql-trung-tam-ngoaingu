/**
 * KHÔI PHỤC SẠCH SẼ TẤT CẢ DỮ LIỆU TEST VỀ BAN ĐẦU
 * Lệnh chạy: node scripts/reset_tatca.js
 */

const pool = require('../models/db');

async function resetAllTestData() {
  console.log('========================================================================');
  console.log('🔄 CHƯƠNG TRÌNH KHÔI PHỤC TẤT CẢ DỮ LIỆU BAN ĐẦU (RESET TẤT CẢ)');
  console.log('========================================================================\n');

  try {
    const [clsRows] = await pool.query("SELECT MaLopHoc FROM lophoc WHERE TenLop = 'A_101'");
    if (clsRows.length > 0) {
      const classId = clsRows[0].MaLopHoc;
      await pool.query(
        "UPDATE lophoc SET NgayKhaiGiang = '2026-08-19', NgayKetThuc = '2026-10-20', TrangThaiLop = 'Sắp mở' WHERE MaLopHoc = ?",
        [classId]
      );
      const [delAtt] = await pool.query("DELETE FROM diemdanh WHERE MaLopHoc = ?", [classId]);
      const [delGrades] = await pool.query("DELETE FROM quanlydiem WHERE MaLopHoc = ?", [classId]);
      await pool.query("UPDATE dangkyhoc SET TrangThai = 'Đang học' WHERE MaLopHoc = ?", [classId]);
      console.log(`✅ 1. ĐÃ KHÔI PHỤC LỚP A_101 VỀ "SẮP MỞ", XÓA ${delAtt.affectedRows} ĐIỂM DANH TEST, XÓA BẢNG ĐIỂM VÀ ĐẶT TRẠNG THÁI HỌC VIÊN VỀ "ĐANG HỌC".`);
    }

    const [slots] = await pool.query("SELECT MaBuoiHoc FROM buoihoc WHERE TenBuoi = 'Ca Demo Bảo Vệ 24/7'");
    if (slots.length > 0) {
      const slotIds = slots.map(s => s.MaBuoiHoc);
      await pool.query("DELETE FROM thoikhoabieu WHERE MaBuoiHoc IN (?)", [slotIds]);
      await pool.query("DELETE FROM buoihoc WHERE MaBuoiHoc IN (?)", [slotIds]);
      console.log('✅ 2. ĐÃ XÓA CA HỌC DEMO 24/7.');
    }

    // Gán lại thời khóa biểu chuẩn cho A_101: Thứ 3, 5, 7 Ca sáng 1 (07:30 - 09:00)
    if (clsRows.length > 0) {
      const classId = clsRows[0].MaLopHoc;
      let [slotRows] = await pool.query("SELECT MaBuoiHoc FROM buoihoc WHERE TenBuoi = 'Ca sáng 1' OR TenBuoi LIKE '%sáng%' LIMIT 1");
      let slotId = slotRows[0] ? slotRows[0].MaBuoiHoc : 1;
      const [phongRows] = await pool.query('SELECT MaPhongHoc FROM phonghoc LIMIT 1');
      const roomId = phongRows[0] ? phongRows[0].MaPhongHoc : 1;

      await pool.query("DELETE FROM thoikhoabieu WHERE MaLopHoc = ?", [classId]);
      const days = ['Thứ Ba', 'Thứ Năm', 'Thứ Bảy'];
      for (const d of days) {
        await pool.query('INSERT INTO thoikhoabieu (MaLopHoc, ThuTrongTuan, MaBuoiHoc, MaPhongHoc) VALUES (?, ?, ?, ?)', [classId, d, slotId, roomId]);
      }
      console.log('✅ 3. ĐÃ KHÔI PHỤC LỊCH HỌC LỚP A_101 VỀ CHUẨN THỨ 3 - 5 - 7 (CA SÁNG 1: 07:30 - 09:00).');
    }

    console.log('\n========================================================================');
    console.log('✨ CSDL ĐÃ ĐƯỢC KHÔI PHỤC BAN ĐẦU 100%!');
    console.log('========================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi khôi phục:', err.message);
    process.exit(1);
  }
}

resetAllTestData();
