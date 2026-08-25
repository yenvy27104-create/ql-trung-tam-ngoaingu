

const pool = require('../models/db');

async function main() {
  const arg = (process.argv[2] || 'setup').toLowerCase();

  console.log('========================================================================');
  console.log('🧪 GIẢ LẬP LỘ TRÌNH HỌC NỐI TIẾP & MỞ KHÓA TỰ ĐỘNG (PROGRESSION DEMO)');
  console.log('========================================================================\n');

  try {

    let [stRows] = await pool.query("SELECT h.MaHocVien, h.HoTen, h.MaNguoiDung FROM hosohocvien h WHERE h.HoTen LIKE '%Hoa%' LIMIT 1");
    if (stRows.length === 0) {
      [stRows] = await pool.query("SELECT MaHocVien, HoTen, MaNguoiDung FROM hosohocvien LIMIT 1");
    }
    const student = stRows[0];
    if (!student) {
      console.log('❌ Không tìm thấy hồ sơ học viên trong CSDL.');
      process.exit(1);
    }

    const hId = student.MaHocVien;
    const uId = student.MaNguoiDung;
    console.log(`👤 HỌC VIÊN DEMO: ${student.HoTen} (Mã HV: ${hId}, MaNguoiDung: ${uId})\n`);


    const [clsA] = await pool.query("SELECT MaLopHoc, TenLop FROM lophoc WHERE TenLop LIKE '%A_101%' LIMIT 1");
    const [clsB] = await pool.query("SELECT MaLopHoc, TenLop FROM lophoc WHERE TenLop LIKE '%B_101%' LIMIT 1");
    const [clsCT] = await pool.query("SELECT MaLopHoc, TenLop FROM lophoc WHERE TenLop LIKE '%CT_101%' OR TenLop LIKE '%DE_101%' LIMIT 1");

    const idA = clsA[0] ? clsA[0].MaLopHoc : 2;
    const idB = clsB[0] ? clsB[0].MaLopHoc : 3;
    const idCT = clsCT[0] ? clsCT[0].MaLopHoc : 5;

    if (arg === 'setup') {
     
      await pool.query("DELETE FROM dangkyhoc WHERE MaHocVien = ? AND MaLopHoc IN (?, ?, ?)", [hId, idA, idB, idCT]);

   
      await pool.query(
        "INSERT INTO dangkyhoc (MaHocVien, MaLopHoc, MaNguoiDangKy, NgayDangKy, TrangThai, HocPhiDaGiam, GhiChu) VALUES (?, ?, ?, NOW(), 'Đang học', 1000, 'Đăng ký khóa A')",
        [hId, idA, uId]
      );

      await pool.query(
        "INSERT INTO dangkyhoc (MaHocVien, MaLopHoc, MaNguoiDangKy, NgayDangKy, TrangThai, HocPhiDaGiam, GhiChu) VALUES (?, ?, ?, NOW(), 'Đang học', 1000, 'Đăng ký giữ chỗ khóa B')",
        [hId, idB, uId]
      );


      await pool.query(
        "INSERT INTO dangkyhoc (MaHocVien, MaLopHoc, MaNguoiDangKy, NgayDangKy, TrangThai, HocPhiDaGiam, GhiChu) VALUES (?, ?, ?, NOW(), 'Đang học', 1000, 'Đăng ký giữ chỗ khóa Cấp tốc')",
        [hId, idCT, uId]
      );

      console.log('✅ ĐÃ THIẾT LẬP ĐĂNG KÝ 3 KHÓA HỌC CÙNG LÚC THÀNH CÔNG:');
      console.log(`   1. Khóa A (Lớp ${clsA[0]?.TenLop || 'A_101'}): Trạng thái -> ĐANG HỌC`);
      console.log(`   2. Khóa B (Lớp ${clsB[0]?.TenLop || 'B_101'}): Trạng thái -> 🔒 GIỮ CHỖ (Chờ hoàn thành Khóa A)`);
      console.log(`   3. Khóa C (Lớp ${clsCT[0]?.TenLop || 'DE_101'}): Trạng thái -> 🔒 GIỮ CHỖ (Chờ hoàn thành Khóa A)`);
      console.log('\n👉 Bây giờ bạn tải lại trang Học viên, Khóa B và C sẽ hiển thị nhãn "🔒 Giữ chỗ"!');
      console.log('👉 Khi muốn demo Hoàn thành Khóa A để tự động MỞ KHÓA B & C, chạy tiếp lệnh:');
      console.log('   node scripts/simulate_progression_test.js completeA\n');

    } else if (arg === 'completea') {

      await pool.query("DELETE FROM quanlydiem WHERE MaHocVien = ? AND MaLopHoc = ?", [hId, idA]);
      await pool.query(
        "INSERT INTO quanlydiem (MaHocVien, MaLopHoc, DiemGiuaKy, DiemCuoiKy, NhanXetGiangVien) VALUES (?, ?, 8.0, 8.5, 'Học viên hoàn thành xuất sắc khóa học')",
        [hId, idA]
      );

      await pool.query("UPDATE dangkyhoc SET TrangThai = 'Hoàn thành' WHERE MaHocVien = ? AND MaLopHoc = ?", [hId, idA]);

      console.log('🎉 ĐÃ NHẬP ĐIỂM CUỐI KỲ (8.5 ĐIỂM - ĐẠT) & ĐÁNH DẤU HOÀN THÀNH KHÓA A!');
      console.log('🚀 TỰ ĐỘNG MỞ KHÓA TẤT CẢ CÁC KHÓA GIỮ CHỖ TIẾP THEO (KHÓA B & CẤP TỐC)!');
      console.log('\n👉 Bạn tải lại trang Học viên (F5), Khóa A chuyển sang "Hoàn thành", Khóa B & Cấp tốc tự động mở khóa bài học!');

    } else if (arg === 'reset') {
  
      await pool.query("DELETE FROM dangkyhoc WHERE MaHocVien = ? AND MaLopHoc IN (?, ?, ?)", [hId, idA, idB, idCT]);
      await pool.query("DELETE FROM quanlydiem WHERE MaHocVien = ? AND MaLopHoc = ?", [hId, idA]);
      console.log('🧹 ĐÃ DỌN DẸP SẠCH BẢN GHI DEMO LỘ TRÌNH.');
    }

    console.log('========================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi script lộ trình:', err.message);
    process.exit(1);
  }
}

main();
