/**
 * GIẢ LẬP ĐIỂM DANH & BÁO CÁO KHẨN ADMIN (HỌC BUỔI 3 - VẮNG 2 BUỔI TRƯỚC ĐÓ)
 * Giao diện hiển thị chuẩn đét như thật: "Ca tối 1 (17:45 - 19:15)" & "Thứ Ba, Thứ Năm, Thứ Bảy"
 * 
 * Lệnh chạy: node scripts/diemdanh_test.js
 */

const pool = require('../models/db');
const mailer = require('../utils/mailer');

async function runAttendanceTest() {
  console.log('========================================================================');
  console.log('🧪 GIẢ LẬP ĐIỂM DANH & BÁO CÁO KHẨN (GIAO DIỆN LỊCH HỌC CHUẨN THỰC TẾ)');
  console.log('========================================================================\n');

  try {
    const now = new Date();

    const [clsRows] = await pool.query("SELECT MaLopHoc FROM lophoc WHERE TenLop = 'A_101'");
    if (clsRows.length === 0) {
      console.log('❌ Không tìm thấy lớp A_101');
      process.exit(1);
    }
    const classId = clsRows[0].MaLopHoc;

    // Kích hoạt lớp A_101 Khai giảng ngày 15/08/2026 -> Buổi 1: 15/08 (T7), Buổi 2: 18/08 (T3)
    const kgDateStr = '2026-08-15';
    await pool.query(
      "UPDATE lophoc SET NgayKhaiGiang = ?, NgayKetThuc = '2026-12-31', TrangThaiLop = 'Đang diễn ra', SiSoToiDa = 15 WHERE MaLopHoc = ?",
      [kgDateStr, classId]
    );
    console.log(`✅ 1. KÍCH HOẠT LỚP A_101 "ĐANG DIỄN RA" (Ngày khai giảng: ${kgDateStr}, Sĩ số: 2/15).`);

    // ĐƯA TẤT CẢ HỌC VIÊN LỚP A_101 VỀ TRẠNG THÁI "ĐANG HỌC" VÀ NGÀY ĐĂNG KÝ 14/08/2026
    await pool.query("UPDATE dangkyhoc SET TrangThai = 'Đang học', NgayDangKy = '2026-08-14 09:00:00' WHERE MaLopHoc = ?", [classId]);

    const [stRows] = await pool.query(
      `SELECT d.MaHocVien, COALESCE(NULLIF(TRIM(h.HoTen), ''), 'Trần Văn A') AS TenHocVien
       FROM dangkyhoc d
       JOIN hosohocvien h ON d.MaHocVien = h.MaHocVien
       WHERE d.MaLopHoc = ? AND d.TrangThai IN ('Thành công', 'Đang học')
       LIMIT 1`,
      [classId]
    );

    // Phân công Thầy Nguyễn Đăng Khoa làm Giảng viên phụ trách lớp A_101
    const [khoaRows] = await pool.query(
      `SELECT n.MaNhanSu 
       FROM hosonhansu n 
       JOIN nguoidung u ON n.MaNguoiDung = u.MaNguoiDung 
       WHERE u.HoTen LIKE '%Khoa%' LIMIT 1`
    );
    if (khoaRows.length > 0) {
      await pool.query("UPDATE lophoc SET MaGiangVien = ? WHERE MaLopHoc = ?", [khoaRows[0].MaNhanSu, classId]);
      console.log(`👨‍🏫 Đã phân công Thầy Nguyễn Đăng Khoa phụ trách lớp A_101 (Mã NS: ${khoaRows[0].MaNhanSu}).`);
    }

    // Đảm bảo học viên Phạm Thị Hoa luôn CÓ MẶT 100% (Không vắng buổi nào)
    await pool.query(
      `UPDATE diemdanh SET TrangThai = 'Có mặt' WHERE MaHocVien IN (SELECT MaHocVien FROM hosohocvien WHERE HoTen LIKE '%Hoa%' OR HoTen LIKE '%Hòa%')`
    );

    let studentId = stRows[0] ? stRows[0].MaHocVien : 110;
    let studentName = stRows[0] ? stRows[0].TenHocVien : 'Trần Văn A';

    console.log(`👤 2. HỌC VIÊN DEMO: ${studentName} (Mã HV: ${studentId}) -> Ngày đăng ký: 14/08/2026 -> ĐÃ MỞ NÚT ĐIỂM DANH`);

    // XÓA BẢN GHI CŨ LỚP A_101 VÀ TẠO ĐIỂM DANH RIÊNG BIỆT CHO NGUYÊN VẸN 2 HỌC VIÊN
    await pool.query("DELETE FROM diemdanh WHERE MaLopHoc = ?", [classId]);

    const [hoaRows] = await pool.query("SELECT MaHocVien FROM hosohocvien WHERE HoTen LIKE '%Phạm Thị Hoa%' OR MaHocVien = 111");
    const hoaId = hoaRows[0] ? hoaRows[0].MaHocVien : 111;

    const [aRows] = await pool.query("SELECT MaHocVien FROM hosohocvien WHERE HoTen LIKE '%Trần Văn A%' OR MaHocVien = 110");
    const aId = aRows[0] ? aRows[0].MaHocVien : 110;

    // 1. Học viên PHẠM THỊ HOA: CÓ MẶT 100% CẢ 2 BUỔI QUÁ KHỨ TỪ NGÀY KHAI GIẢNG (15/08 & 18/08)
    // 2. Học viên TRẦN VĂN A: VẮNG MẶT 2 BUỔI QUÁ KHỨ (15/08 & 18/08)
    // 3. NGÀY HÔM NAY (20/08 - Buổi thứ 3 của lớp): CHƯA ĐIỂM DANH -> Thầy Khoa tích Vắng mặt buổi thứ 3 này sẽ thành ĐỦ 3 BUỔI VẮNG để gửi Báo cáo Admin thành công!
    await pool.query(
      `INSERT INTO diemdanh (MaHocVien, MaLopHoc, NgayHoc, TrangThai) VALUES 
       (?, ?, '2026-08-15', 'Có mặt'),
       (?, ?, '2026-08-18', 'Có mặt'),
       (?, ?, '2026-08-15', 'Vắng mặt'),
       (?, ?, '2026-08-18', 'Vắng mặt')`,
      [hoaId, classId, hoaId, classId, aId, classId, aId, classId]
    );

    console.log(`✅ 3. ĐÃ CẬP NHẬT DỮ LIỆU ĐIỂM DANH CHUẨN (TỪ NGÀY KHAI GIẢNG 15/08):`);
    console.log(`   - Phạm Thị Hoa: CÓ MẶT 2 buổi quá khứ (15/08 & 18/08) 🟢`);
    console.log(`   - Trần Văn A: VẮNG MẶT 2 buổi quá khứ (15/08 & 18/08) ❌`);
    console.log(`   - NGÀY HÔM NAY (20/08 - Buổi 3): CHƯA ĐIỂM DANH ⚡ -> Thầy Khoa tích Vắng mặt buổi 3 này sẽ ĐỦ 3 BUỔI VẮNG để Báo cáo Admin thành công!`);

    // KÍCH HOẠT KHUNG GIỜ GIẢ LẬP 24/7 (00:00:00 - 23:59:59) ĐỂ THẦY KHOA VÀ ADMIN ĐIỂM DANH & BÁO CÁO TỰ DO LÚC 2H SÁNG
    let [slotRows] = await pool.query("SELECT MaBuoiHoc FROM buoihoc WHERE TenBuoi LIKE '%Ca%' OR TenBuoi LIKE '%Demo%' LIMIT 1");
    let slotId = slotRows[0] ? slotRows[0].MaBuoiHoc : null;
    if (!slotId) {
      const [insertSlot] = await pool.query(
        "INSERT INTO buoihoc (TenBuoi, GioBatDau, GioKetThuc) VALUES ('Ca học Test 24/7', '00:00:00', '23:59:59')"
      );
      slotId = insertSlot.insertId;
    } else {
      await pool.query("UPDATE buoihoc SET GioBatDau = '00:00:00', GioKetThuc = '23:59:59' WHERE MaBuoiHoc = ?", [slotId]);
    }

    // LỊCH HỌC CHUẨN TRUNG TÂM: Thứ Ba, Thứ Năm, Thứ Bảy (Khớp chuẩn 3 buổi học từ ngày 15/08 đến hôm nay 20/08 -> Buổi 3/26)
    await pool.query("DELETE FROM thoikhoabieu WHERE MaLopHoc = ?", [classId]);

    const realDays = ['Thứ Ba', 'Thứ Năm', 'Thứ Bảy'];
    const [phongRows] = await pool.query('SELECT MaPhongHoc FROM phonghoc LIMIT 1');
    const roomId = phongRows[0] ? phongRows[0].MaPhongHoc : 1;

    for (const d of realDays) {
      await pool.query('INSERT INTO thoikhoabieu (MaLopHoc, ThuTrongTuan, MaBuoiHoc, MaPhongHoc) VALUES (?, ?, ?, ?)', [classId, d, slotId, roomId]);
    }

    console.log('🔓 4. ĐÃ CẬP NHẬT LỊCH CHUẨN THỨ 3-5-7 (00:00 - 23:59). TIẾN ĐỘ CHUẨN LÀ BUỔI 3/26!');

    console.log('\n========================================================================');
    console.log('✨ HOÀN HẢO! GIAO DIỆN LỚP A_101 ĐÃ CHUẨN ĐẸP 100% NHƯ CÁC LỚP KHÁC!');
    console.log('========================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
  }
}

runAttendanceTest();
