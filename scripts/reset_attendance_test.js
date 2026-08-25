
const pool = require('../models/db');

async function resetTestData() {
  console.log('========================================================================');
  console.log('🔄 CHƯƠNG TRÌNH KHÔI PHỤC DỮ LIỆU BAN ĐẦU (RESET TEST)');
  console.log('========================================================================\n');

  try {
   
    const [clsRows] = await pool.query("SELECT MaLopHoc FROM lophoc WHERE TenLop = 'A_101'");
    if (clsRows.length === 0) {
      console.log('❌ Không tìm thấy lớp A_101');
      process.exit(1);
    }
    const classId = clsRows[0].MaLopHoc;

  
    await pool.query(
      "UPDATE lophoc SET NgayKhaiGiang = '2026-08-19', NgayKetThuc = '2026-10-20', TrangThaiLop = 'Sắp mở' WHERE MaLopHoc = ?",
      [classId]
    );
    console.log('✅ 1. ĐÃ KHÔI PHỤC LỚP A_101 VỀ LỚP "SẮP MỞ" (Ngày khai giảng: 19/08/2026).');

 
    const [delAtt] = await pool.query("DELETE FROM diemdanh WHERE MaLopHoc = ?", [classId]);
    console.log(`✅ 2. ĐÃ XÓA SẠCH ${delAtt.affectedRows} BẢN GHI ĐIỂM DANH THỬ NGHIỆM KHỎI CSDL.`);


    const [slots] = await pool.query("SELECT MaBuoiHoc FROM buoihoc WHERE TenBuoi = 'Ca Demo Bảo Vệ 24/7'");
    if (slots.length > 0) {
      const slotIds = slots.map(s => s.MaBuoiHoc);
      await pool.query("DELETE FROM thoikhoabieu WHERE MaBuoiHoc IN (?)", [slotIds]);
      await pool.query("DELETE FROM buoihoc WHERE MaBuoiHoc IN (?)", [slotIds]);
    }
    console.log('✅ 3. ĐÃ XÓA CA HỌC DEMO 24/7 KHỎI CSDL.');

    console.log('\n========================================================================');
    console.log('✨ HOÀN TẤT KHÔI PHỤC! CSDL ĐÃ TRỞ VỀ TRẠNG THÁI SẠCH BAN ĐẦU 100%!');
    console.log('========================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi khi khôi phục dữ liệu:', err.message);
    process.exit(1);
  }
}

resetTestData();
