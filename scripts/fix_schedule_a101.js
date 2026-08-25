const pool = require('../models/db');

async function fixScheduleA101() {
  try {
    const [cls] = await pool.query("SELECT MaLopHoc FROM lophoc WHERE TenLop = 'A_101'");
    if (cls.length === 0) {
      console.log('Không tìm thấy lớp A_101');
      process.exit(1);
    }
    const classId = cls[0].MaLopHoc;

    // Lấy hoặc khởi tạo Ca sáng 1 (07:30 - 09:00)
    let [bRows] = await pool.query("SELECT MaBuoiHoc FROM buoihoc WHERE TenBuoi = 'Ca sáng 1' OR (GioBatDau = '07:30:00' AND GioKetThuc = '09:00:00') LIMIT 1");
    let slotId;
    if (bRows.length > 0) {
      slotId = bRows[0].MaBuoiHoc;
      await pool.query("UPDATE buoihoc SET TenBuoi = 'Ca sáng 1', GioBatDau = '07:30:00', GioKetThuc = '09:00:00' WHERE MaBuoiHoc = ?", [slotId]);
    } else {
      const [ins] = await pool.query("INSERT INTO buoihoc (TenBuoi, GioBatDau, GioKetThuc) VALUES ('Ca sáng 1', '07:30:00', '09:00:00')");
      slotId = ins.insertId;
    }

    // Lấy mã phòng học
    const [phongRows] = await pool.query('SELECT MaPhongHoc FROM phonghoc LIMIT 1');
    const roomId = phongRows[0] ? phongRows[0].MaPhongHoc : 1;

    // Xóa toàn bộ thời khóa biểu cũ của A_101
    await pool.query("DELETE FROM thoikhoabieu WHERE MaLopHoc = ?", [classId]);

    // Thêm thời khóa biểu mới: Thứ Ba, Thứ Năm, Thứ Bảy (3, 5, 7) - Ca sáng 1 (07:30 - 09:00)
    const days357 = ['Thứ Ba', 'Thứ Năm', 'Thứ Bảy'];
    for (const day of days357) {
      await pool.query(
        "INSERT INTO thoikhoabieu (MaLopHoc, ThuTrongTuan, MaBuoiHoc, MaPhongHoc) VALUES (?, ?, ?, ?)",
        [classId, day, slotId, roomId]
      );
    }

    console.log(`✅ Đã cập nhật thành công lịch học lớp A_101: Thứ 3, Thứ 5, Thứ 7 - Ca sáng 1 (07:30 - 09:00)!`);
    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi sửa lịch học A_101:', err.message);
    process.exit(1);
  }
}

fixScheduleA101();
