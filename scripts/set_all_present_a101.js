const pool = require('../models/db');

async function setAllPresentA101() {
  try {
    const [cls] = await pool.query("SELECT MaLopHoc FROM lophoc WHERE TenLop = 'A_101'");
    if (cls.length === 0) {
      console.log('Không tìm thấy lớp A_101');
      process.exit(1);
    }
    const classId = cls[0].MaLopHoc;

    // Cập nhật tất cả bản ghi điểm danh của lớp A_101 thành 'Có mặt'
    await pool.query("UPDATE diemdanh SET TrangThai = 'Có mặt' WHERE MaLopHoc = ?", [classId]);

    const [rows] = await pool.query(
      "SELECT d.NgayHoc, d.TrangThai, u.HoTen FROM diemdanh d JOIN hosohocvien h ON d.MaHocVien = h.MaHocVien JOIN nguoidung u ON h.MaNguoiDung = u.MaNguoiDung WHERE d.MaLopHoc = ? ORDER BY d.NgayHoc ASC, u.HoTen ASC",
      [classId]
    );

    console.log(`✅ Đã chuyển tất cả ${rows.length} lượt điểm danh của lớp A_101 thành CÓ MẶT:`);
    rows.forEach(r => {
      const dStr = r.NgayHoc ? String(r.NgayHoc).substring(0, 10) : '';
      console.log(`   - Học viên: ${r.HoTen} | Ngày: ${dStr} | Trạng thái: ${r.TrangThai}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi cập nhật điểm danh:', err.message);
    process.exit(1);
  }
}

setAllPresentA101();
