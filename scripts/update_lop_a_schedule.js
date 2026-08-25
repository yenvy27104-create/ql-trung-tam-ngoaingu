/**
 * SCRIPT CẬP NHẬT THỜI KHÓA BIỂU & CA HỌC CHO LỚP A / KHÓA A
 * Ca sáng 1: 08:00 - 09:30
 * Lịch học: 3, 5, 7 (Thứ Ba, Thứ Năm, Thứ Bảy)
 */

const pool = require('../models/db');

async function updateLopASchedule() {
  console.log('========================================================================');
  console.log('🔄 ĐANG CẬP NHẬT LỊCH HỌC LỚP A SANG CA SÁNG 1 (08:00 - 09:30) THỨ 3, 5, 7');
  console.log('========================================================================\n');

  try {
    // 1. Cập nhật / tạo slot Ca sáng 1 (07:30 - 09:00)
    let [slotRows] = await pool.query("SELECT MaBuoiHoc FROM buoihoc WHERE TenBuoi = 'Ca sáng 1' OR TenBuoi LIKE '%sáng 1%' OR TenBuoi LIKE '%sáng%' LIMIT 1");
    let slotId = slotRows[0] ? slotRows[0].MaBuoiHoc : null;

    if (!slotId) {
      const [ins] = await pool.query("INSERT INTO buoihoc (TenBuoi, GioBatDau, GioKetThuc) VALUES ('Ca sáng 1', '07:30:00', '09:00:00')");
      slotId = ins.insertId;
      console.log(`✅ Đã tạo mới 'Ca sáng 1' (07:30 - 09:00) với MaBuoiHoc = ${slotId}`);
    } else {
      await pool.query("UPDATE buoihoc SET TenBuoi = 'Ca sáng 1', GioBatDau = '07:30:00', GioKetThuc = '09:00:00' WHERE MaBuoiHoc = ?", [slotId]);
      console.log(`✅ Đã cập nhật 'Ca sáng 1' thành 07:30:00 - 09:00:00 (MaBuoiHoc = ${slotId})`);
    }

    // 2. Tìm các lớp học thuộc khóa A (TenLop chứa 'A' hoặc 'A_101' hoặc liên quan TOEIC A)
    const [classes] = await pool.query("SELECT MaLopHoc, TenLop FROM lophoc WHERE TenLop LIKE '%A%' OR MaKhoaHoc = 2");
    
    if (classes.length === 0) {
      console.log('⚠️ Không tìm thấy lớp học nào thuộc Khóa A');
    } else {
      const [phongRows] = await pool.query('SELECT MaPhongHoc FROM phonghoc LIMIT 1');
      const roomId = phongRows[0] ? phongRows[0].MaPhongHoc : 1;
      const days = ['Thứ Ba', 'Thứ Năm', 'Thứ Bảy'];

      for (const cls of classes) {
        // Xóa TKB cũ
        await pool.query("DELETE FROM thoikhoabieu WHERE MaLopHoc = ?", [cls.MaLopHoc]);

        // Thêm TKB mới 3, 5, 7 Ca sáng 1
        for (const d of days) {
          await pool.query(
            "INSERT INTO thoikhoabieu (MaLopHoc, ThuTrongTuan, MaBuoiHoc, MaPhongHoc) VALUES (?, ?, ?, ?)",
            [cls.MaLopHoc, d, slotId, roomId]
          );
        }
        console.log(`✅ Đã gán lịch học Thứ 3, 5, 7 (Ca sáng 1) cho lớp: ${cls.TenLop} (ID: ${cls.MaLopHoc})`);
      }
    }

    console.log('\n========================================================================');
    console.log('✨ HOÀN TẤT CẬP NHẬT LỊCH HỌC LỚP A THÀNH THỨ 3-5-7 (08:00 - 09:30)!');
    console.log('========================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
  }
}

updateLopASchedule();
