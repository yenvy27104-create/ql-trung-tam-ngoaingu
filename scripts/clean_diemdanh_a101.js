const pool = require('../models/db');

async function cleanDiemDanhA101() {
  try {
    const [cls] = await pool.query("SELECT MaLopHoc FROM lophoc WHERE TenLop = 'A_101'");
    if (cls.length === 0) {
      console.log('Không tìm thấy lớp A_101');
      process.exit(1);
    }
    const classId = cls[0].MaLopHoc;

    // Xóa toàn bộ bản ghi điểm danh của A_101
    await pool.query("DELETE FROM diemdanh WHERE MaLopHoc = ?", [classId]);

    // Lấy mã học viên
    const [hvRows] = await pool.query("SELECT d.MaHocVien FROM dangkyhoc d WHERE d.MaLopHoc = ? LIMIT 1", [classId]);
    const studentId = hvRows[0] ? hvRows[0].MaHocVien : 1;

    // Chèn đúng 2 buổi hợp lệ: 15/08/2026 (Thứ 7) và 18/08/2026 (Thứ 3)
    await pool.query(
      `INSERT INTO diemdanh (MaHocVien, MaLopHoc, NgayHoc, TrangThai) VALUES 
       (?, ?, '2026-08-15', 'Vắng mặt'),
       (?, ?, '2026-08-18', 'Vắng mặt')`,
      [studentId, classId, studentId, classId]
    );

    const [rows] = await pool.query("SELECT * FROM diemdanh WHERE MaLopHoc = ? ORDER BY NgayHoc ASC", [classId]);
    console.log(`✅ Đã cập nhật đúng 2 buổi học chuẩn lịch 3-5-7 cho lớp A_101 (Tổng: ${rows.length} buổi):`);
    rows.forEach(r => {
      const dStr = r.NgayHoc ? String(r.NgayHoc).substring(0, 10) : '';
      console.log(`   - Ngày: ${dStr} | Trạng thái: ${r.TrangThai}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi xóa điểm danh thừa:', err.message);
    process.exit(1);
  }
}

cleanDiemDanhA101();
