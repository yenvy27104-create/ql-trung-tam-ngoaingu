const pool = require('../models/db');

async function fixAttendanceAllStudents() {
  try {
    const [cls] = await pool.query("SELECT MaLopHoc FROM lophoc WHERE TenLop = 'A_101'");
    if (cls.length === 0) {
      console.log('Không tìm thấy lớp A_101');
      process.exit(1);
    }
    const classId = cls[0].MaLopHoc;

    // Lấy tất cả học viên thuộc lớp A_101
    const [students] = await pool.query(
      "SELECT DISTINCT MaHocVien FROM dangkyhoc WHERE MaLopHoc = ? AND TrangThai NOT IN ('Đã hủy', 'Từ chối')",
      [classId]
    );

    console.log(`Tìm thấy ${students.length} học viên trong lớp A_101:`, students.map(s => s.MaHocVien));

    // Xóa điểm danh cũ của lớp A_101
    await pool.query("DELETE FROM diemdanh WHERE MaLopHoc = ?", [classId]);

    // Thêm điểm danh cho TẤT CẢ học viên trong lớp A_101 cho 2 buổi: 15/08/2026 và 18/08/2026
    const dates = [
      { date: '2026-08-15', status: 'Có mặt' },
      { date: '2026-08-18', status: 'Vắng mặt' }
    ];

    for (const s of students) {
      for (const d of dates) {
        await pool.query(
          "INSERT INTO diemdanh (MaHocVien, MaLopHoc, NgayHoc, TrangThai) VALUES (?, ?, ?, ?)",
          [s.MaHocVien, classId, d.date, d.status]
        );
      }
    }

    console.log(`✅ Đã đồng bộ dữ liệu điểm danh 2 buổi cho TẤT CẢ ${students.length} học viên lớp A_101 thành công!`);
    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi đồng bộ điểm danh:', err.message);
    process.exit(1);
  }
}

fixAttendanceAllStudents();
