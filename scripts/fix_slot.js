const pool = require('../models/db');

async function fixSlot() {
  try {
    const [cls] = await pool.query("SELECT MaLopHoc FROM lophoc WHERE TenLop = 'A_101'");
    if (cls.length === 0) {
      console.log('Class A_101 not found');
      process.exit(1);
    }
    const classId = cls[0].MaLopHoc;

    // Fix buoihoc entry with 00:00:00 or Demo
    await pool.query(
      "UPDATE buoihoc SET TenBuoi = 'Ca sáng 1', GioBatDau = '07:30:00', GioKetThuc = '09:00:00' WHERE TenBuoi LIKE '%Demo%' OR GioBatDau = '00:00:00'"
    );

    // Find or get slotId for Ca sáng 1
    let [bRows] = await pool.query("SELECT MaBuoiHoc FROM buoihoc WHERE TenBuoi = 'Ca sáng 1' OR (GioBatDau = '07:30:00' AND GioKetThuc = '09:00:00') LIMIT 1");
    let slotId;
    if (bRows.length > 0) {
      slotId = bRows[0].MaBuoiHoc;
    } else {
      const [ins] = await pool.query("INSERT INTO buoihoc (TenBuoi, GioBatDau, GioKetThuc) VALUES ('Ca sáng 1', '07:30:00', '09:00:00')");
      slotId = ins.insertId;
    }

    // Update time table for class A_101
    await pool.query("UPDATE thoikhoabieu SET MaBuoiHoc = ? WHERE MaLopHoc = ?", [slotId, classId]);

    console.log(`✅ Thành công! Đã chuyển ca học lớp A_101 về: Ca sáng 1 (07:30 - 09:00) - Slot #${slotId}`);
    process.exit(0);
  } catch (err) {
    console.error('Lỗi:', err.message);
    process.exit(1);
  }
}

fixSlot();
