/**
 * TẬP TIN GIẢ LẬP DỮ LIỆU DEMO BÁO CÁO HỌC VIÊN VẮNG MẶT (CHÈN SẴN 2 BUỔI VẮNG TRONG QUÁ KHỨ)
 * Phục vụ buổi Bảo vệ Hội đồng (20/08/2026)
 * 
 * Học viên đã vắng 2 buổi trong CSDL -> Ngày 20/8 bạn trực tiếp điểm danh Vắng mặt buổi thứ 3 trước mặt Hội đồng để đủ 3 buổi!
 * 
 * Lệnh chạy: node scripts/simulate_attendance_test.js
 */

const pool = require('../models/db');
const mailer = require('../utils/mailer');

async function runSimulation() {
  console.log('========================================================================');
  console.log('🧪 CHƯƠNG TRÌNH KHỞI TẠO DỮ LIỆU DEMO: CHÈN SẴN 2 BUỔI VẮNG QUÁ KHỨ');
  console.log('========================================================================\n');

  try {
    const now = new Date();

    // 1. Lấy thông tin lớp A_101
    const [clsRows] = await pool.query("SELECT MaLopHoc, TenLop FROM lophoc WHERE TenLop = 'A_101'");
    if (clsRows.length === 0) {
      console.log('❌ Không tìm thấy lớp A_101');
      process.exit(1);
    }
    const classId = clsRows[0].MaLopHoc;

    // 2. Kích hoạt lớp A_101 Đang diễn ra từ ngày 15/08/2026
    const kgDateStr = '2026-08-15';
    await pool.query(
      "UPDATE lophoc SET NgayKhaiGiang = ?, NgayKetThuc = '2026-12-31', TrangThaiLop = 'Đang diễn ra' WHERE MaLopHoc = ?",
      [kgDateStr, classId]
    );
    console.log(`✅ 1. KÍCH HOẠT LỚP A_101 "ĐANG DIỄN RA" (Ngày bắt đầu: ${kgDateStr}).`);

    // 3. Tìm học viên trong lớp A_101 và cập nhật Ngày đăng ký là 14/08/2026
    await pool.query("UPDATE dangkyhoc SET TrangThai = 'Đang học', NgayDangKy = '2026-08-14 09:00:00' WHERE MaLopHoc = ?", [classId]);

    const [stRows] = await pool.query(
      `SELECT d.MaHocVien, COALESCE(NULLIF(TRIM(h.HoTen), ''), 'Trần Văn A') AS TenHocVien
       FROM dangkyhoc d
       JOIN hosohocvien h ON d.MaHocVien = h.MaHocVien
       WHERE d.MaLopHoc = ? AND d.TrangThai IN ('Thành công', 'Đang học')
       LIMIT 1`,
      [classId]
    );

    let studentId = stRows[0] ? stRows[0].MaHocVien : null;
    let studentName = stRows[0] ? stRows[0].TenHocVien : 'Trần Văn A';

    if (!studentId) {
      const [allSt] = await pool.query("SELECT MaHocVien, HoTen FROM hosohocvien LIMIT 1");
      if (allSt.length > 0) {
        studentId = allSt[0].MaHocVien;
        studentName = allSt[0].HoTen;
        const [regEx] = await pool.query("SELECT * FROM dangkyhoc WHERE MaHocVien = ? AND MaLopHoc = ?", [studentId, classId]);
        if (regEx.length === 0) {
          await pool.query(
            "INSERT INTO dangkyhoc (MaHocVien, MaLopHoc, NgayDangKy, TrangThai, HocPhiDaGiam) VALUES (?, ?, '2026-08-14 09:00:00', 'Đang học', 1000)",
            [studentId, classId]
          );
        } else {
          await pool.query("UPDATE dangkyhoc SET TrangThai = 'Đang học', NgayDangKy = '2026-08-14 09:00:00' WHERE MaHocVien = ? AND MaLopHoc = ?", [studentId, classId]);
        }
      }
    }

    console.log(`👤 2. HỌC VIÊN THỬ NGHIỆM TRONG LỚP A_101: ${studentName} (Mã HV: ${studentId}) -> Ngày đăng ký: 14/08/2026`);

    // 4. Xóa dữ liệu điểm danh cũ của học viên và CHÈN ĐÚNG 2 BẢN GHI VẮNG MẶT QUÁ KHỨ (15/08 và 18/08)
    await pool.query("DELETE FROM diemdanh WHERE MaLopHoc = ? AND MaHocVien = ?", [classId, studentId]);

    const pastDate1 = '2026-08-15';
    const pastDate2 = '2026-08-18';

    await pool.query(
      `INSERT INTO diemdanh (MaHocVien, MaLopHoc, NgayHoc, TrangThai) VALUES 
       (?, ?, ?, 'Vắng mặt'),
       (?, ?, ?, 'Vắng mặt')`,
      [
        studentId, classId, pastDate1,
        studentId, classId, pastDate2
      ]
    );

    console.log(`❌ 3. ĐÃ TỰ ĐỘNG CHÈN ĐÚNG 2 BẢN GHI VẮNG MẶT VÀO CSDL CHO HỌC VIÊN ${studentName}:`);
    console.log(`   - Buổi 1 (${pastDate1} - Thứ 7): Vắng mặt`);
    console.log(`   - Buổi 2 (${pastDate2} - Thứ 3): Vắng mặt`);
    console.log(`   ➔ ĐÃ CÓ 2 BUỔI VẮNG. NGÀY 20/8 BẠN TRỰC TIẾP ĐIỂM DANH VẮNG MẶT BUỔI 3 ĐỂ ĐỦ 3 BUỔI VẮNG!\n`);

    // 5. Cấu hình Ca học 24/7 cho ngày 20/8 để Giảng viên thao tác điểm danh không bị khóa
    let [slotRows] = await pool.query("SELECT MaBuoiHoc FROM buoihoc WHERE TenBuoi = 'Ca sáng 1' OR (GioBatDau = '07:30:00' AND GioKetThuc = '09:00:00') LIMIT 1");
    let slotId = slotRows[0] ? slotRows[0].MaBuoiHoc : null;
    if (!slotId) {
      const [insertSlot] = await pool.query(
        "INSERT INTO buoihoc (TenBuoi, GioBatDau, GioKetThuc) VALUES ('Ca sáng 1', '07:30:00', '09:00:00')"
      );
      slotId = insertSlot.insertId;
    } else {
      await pool.query("UPDATE buoihoc SET TenBuoi = 'Ca sáng 1', GioBatDau = '07:30:00', GioKetThuc = '09:00:00' WHERE MaBuoiHoc = ?", [slotId]);
    }

    const days = ['Thứ Ba', 'Thứ Năm', 'Thứ Bảy'];
    const [phongRows] = await pool.query('SELECT MaPhongHoc FROM phonghoc LIMIT 1');
    const roomId = phongRows[0] ? phongRows[0].MaPhongHoc : 1;

    for (const d of days) {
      const [ex] = await pool.query('SELECT * FROM thoikhoabieu WHERE MaLopHoc = ? AND ThuTrongTuan = ?', [classId, d]);
      if (ex.length === 0) {
        await pool.query(
          'INSERT INTO thoikhoabieu (MaLopHoc, ThuTrongTuan, MaBuoiHoc, MaPhongHoc) VALUES (?, ?, ?, ?)',
          [classId, d, slotId, roomId]
        );
      } else {
        await pool.query(
          'UPDATE thoikhoabieu SET MaBuoiHoc = ? WHERE MaLopHoc = ? AND ThuTrongTuan = ?',
          [slotId, classId, d]
        );
      }
    }
    console.log('🔓 4. MỞ KHÓA ĐIỂM DANH CA HỌC 24/7 THỜI KHÓA BIỂU.');

    console.log('🔓 5. ĐÃ CẤU HÌNH THỜI KHÓA BIỂU DÀNH CHO LỚP A_101');

    console.log('\n========================================================================');
    console.log('✨ SẴN SÀNG! CSDL ĐÃ CÓ 2 BUỔI VẮNG. NGÀY 20/8 BẠN ĐIỂM DANH BUỔI 3 TRỰC TIẾP!');
    console.log('========================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi script giả lập:', err.message);
    process.exit(1);
  }
}

runSimulation();
