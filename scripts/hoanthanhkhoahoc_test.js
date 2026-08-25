/**
 * TEST GIẢ LẬP: HOÀN THÀNH KHÓA HỌC CHO HỌC VIÊN PHẠM THỊ HOA
 * - Phạm Thị Hoa có mặt 100% tất cả các buổi (đủ 25 buổi quá khứ + buổi 26 hôm nay).
 * - Phân công Thầy Nguyễn Đăng Khoa dạy lớp A_101 và mở khóa 24/7.
 * - Thầy Khoa vào điểm danh, nhập điểm thi cuối kỳ, ghi nhận xét và bấm Báo cáo Admin / Đề xuất Hoàn thành khóa học.
 * - Admin vào duyệt đơn -> Học viên Phạm Thị Hoa chính thức ĐÃ HOÀN THÀNH KHÓA HỌC.
 * 
 * Lệnh chạy: node scripts/hoanthanhkhoahoc_test.js
 */

const pool = require('../models/db');

async function runCourseCompletionTest() {
  console.log('========================================================================');
  console.log('🎓 GIẢ LẬP TEST: HOÀN THÀNH KHÓA HỌC CHO HỌC VIÊN PHẠM THỊ HOA');
  console.log('========================================================================\n');

  try {
    const [clsRows] = await pool.query("SELECT MaLopHoc FROM lophoc WHERE TenLop = 'A_101'");
    if (clsRows.length === 0) {
      console.log('❌ Không tìm thấy lớp A_101');
      process.exit(1);
    }
    const classId = clsRows[0].MaLopHoc;

    // 1. Phân công Thầy Nguyễn Đăng Khoa dạy lớp A_101 và đặt ngày khai giảng 18/06/2026 (Thứ 3-5-7 để hôm nay 20/08 đúng chuẩn Buổi 26/26)
    const [khoaRows] = await pool.query(
      `SELECT n.MaNhanSu 
       FROM hosonhansu n 
       JOIN nguoidung u ON n.MaNguoiDung = u.MaNguoiDung 
       WHERE u.HoTen LIKE '%Khoa%' LIMIT 1`
    );
    const teacherId = khoaRows[0] ? khoaRows[0].MaNhanSu : null;

    await pool.query(
      "UPDATE lophoc SET NgayKhaiGiang = '2026-06-18', NgayKetThuc = '2026-12-31', TrangThaiLop = 'Đang diễn ra', SiSoToiDa = 15, MaGiangVien = ? WHERE MaLopHoc = ?",
      [teacherId, classId]
    );
    console.log(`✅ 1. ĐÃ KÍCH HOẠT LỚP A_101 ĐẠT ĐÚNG BUỔI 26/26 HÔM NAY (Giảng viên: Thầy Nguyễn Đăng Khoa).`);

    // 2. Tìm học viên Phạm Thị Hoa
    const [hoaRows] = await pool.query("SELECT MaHocVien, HoTen FROM hosohocvien WHERE HoTen LIKE '%Phạm Thị Hoa%' OR MaHocVien = 111");
    const hoaId = hoaRows[0] ? hoaRows[0].MaHocVien : 111;
    const hoaName = hoaRows[0] ? hoaRows[0].HoTen : 'Phạm Thị Hoa';

    // Đưa Phạm Thị Hoa về trạng thái "Đang học" lớp A_101 (Khóa A) để làm thủ tục hoàn thành Khóa A
    await pool.query(
      "UPDATE dangkyhoc SET TrangThai = 'Đang học', GhiChu = NULL, NgayDangKy = '2026-05-25 09:00:00' WHERE MaHocVien = ? AND MaLopHoc = ?",
      [hoaId, classId]
    );

    // Đăng ký đồng thời Khóa B (B_101) cho Phạm Thị Hoa
    const [courseB] = await pool.query("SELECT MaKhoaHoc FROM khoahoc WHERE TenKhoaHoc LIKE '%TOEIC B%' OR MaKhoaHoc = 3 LIMIT 1");
    const kBId = courseB[0] ? courseB[0].MaKhoaHoc : 3;
    let [classBRows] = await pool.query("SELECT MaLopHoc FROM lophoc WHERE TenLop = 'B_101' OR MaKhoaHoc = ? LIMIT 1", [kBId]);
    let classBId = classBRows[0] ? classBRows[0].MaLopHoc : null;
    if (!classBId) {
      const [insB] = await pool.query("INSERT INTO lophoc (TenLop, MaKhoaHoc, NgayKhaiGiang, NgayKetThuc, TrangThaiLop, SiSoToiDa) VALUES ('B_101', ?, '2026-09-01', '2026-12-31', 'Đang diễn ra', 15)", [kBId]);
      classBId = insB.insertId;
    }

    const noteText = 'Đăng ký giữ chỗ đợt sớm (Chờ hoàn thành Khóa A)';
    const [regB] = await pool.query("SELECT * FROM dangkyhoc WHERE MaHocVien = ? AND MaLopHoc = ?", [hoaId, classBId]);
    if (regB.length === 0) {
      await pool.query("INSERT INTO dangkyhoc (MaHocVien, MaLopHoc, NgayDangKy, TrangThai, HocPhiDaGiam, GhiChu) VALUES (?, ?, '2026-08-18 09:00:00', 'Đang học', 1000, ?)", [hoaId, classBId, noteText]);
    } else {
      await pool.query("UPDATE dangkyhoc SET TrangThai = 'Đang học', NgayDangKy = '2026-08-18 09:00:00', GhiChu = ? WHERE MaHocVien = ? AND MaLopHoc = ?", [noteText, hoaId, classBId]);
    }

    // Cài đặt sẵn Điểm Giữa Kỳ = 400 cho Phạm Thị Hoa (Để ô Điểm Giữa Kỳ bị mờ/khóa read-only, ô Điểm Cuối Kỳ bỏ trống để Thầy Khoa tự nhập)
    const [existingScore] = await pool.query("SELECT MaBangDiem FROM quanlydiem WHERE MaHocVien = ? AND MaLopHoc = ?", [hoaId, classId]);
    if (existingScore.length > 0) {
      await pool.query(
        "UPDATE quanlydiem SET DiemGiuaKy = 400, DiemCuoiKy = NULL, NhanXetGiangVien = NULL WHERE MaHocVien = ? AND MaLopHoc = ?",
        [hoaId, classId]
      );
    } else {
      await pool.query(
        "INSERT INTO quanlydiem (MaHocVien, MaLopHoc, DiemGiuaKy, DiemCuoiKy, NhanXetGiangVien) VALUES (?, ?, 400, NULL, NULL)",
        [hoaId, classId]
      );
    }

    console.log(`👤 2. HỌC VIÊN PHẠM THỊ HOA (Mã HV: ${hoaId}) -> ĐANG HỌC KHÓA A (Lớp A_101 - Buổi 26/26) & ĐÃ CÀI ĐẶT SẴN ĐIỂM GIỮA KỲ = 400 (Ô MỜ KHOÁ).`);

    // 3. Xóa dữ liệu điểm danh cũ và chèn 25 buổi quá khứ CÓ MẶT 100% cho Phạm Thị Hoa
    await pool.query("DELETE FROM diemdanh WHERE MaLopHoc = ?", [classId]);

    // Tạo 25 buổi quá khứ (Thứ 3-5-7 từ 18/06/2026 đến 18/08/2026) Có mặt 100%
    const past25Dates = [
      '2026-06-18', '2026-06-20', '2026-06-23', '2026-06-25', '2026-06-27', '2026-06-30',
      '2026-07-02', '2026-07-04', '2026-07-07', '2026-07-09', '2026-07-11', '2026-07-14',
      '2026-07-16', '2026-07-18', '2026-07-21', '2026-07-23', '2026-07-25', '2026-07-28',
      '2026-07-30', '2026-08-01', '2026-08-04', '2026-08-06', '2026-08-08', '2026-08-11', '2026-08-13', '2026-08-15', '2026-08-18'
    ];

    for (const dStr of past25Dates) {
      await pool.query("INSERT INTO diemdanh (MaHocVien, MaLopHoc, NgayHoc, TrangThai) VALUES (?, ?, ?, 'Có mặt')", [hoaId, classId, dStr]);
    }
    console.log(`✅ 3. ĐÃ TẠO 25 BUỔI ĐIỂM DANH QUÁ KHỨ CÓ MẶT 100% CHO PHẠM THỊ HOA 🟢`);
    console.log(`   - BUỔI THỨ 26 (HÔM NAY 20/08): CHƯA ĐIỂM DANH ⚡ -> Để Thầy Khoa vào tự tay điểm danh và bấm Báo cáo Admin!`);

    // 4. Mở khóa 24/7 khung giờ cho Thầy Khoa & Admin test tự do
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

    await pool.query("DELETE FROM thoikhoabieu WHERE MaLopHoc = ?", [classId]);
    const real3Days = ['Thứ Ba', 'Thứ Năm', 'Thứ Bảy'];
    for (const d of real3Days) {
      await pool.query('INSERT INTO thoikhoabieu (MaLopHoc, ThuTrongTuan, MaBuoiHoc, MaPhongHoc) VALUES (?, ?, ?, 1)', [classId, d, slotId]);
    }

    console.log('\n========================================================================');
    console.log('✨ SẴN SÀNG TEST HOÀN THÀNH KHÓA HỌC 100%!');
    console.log('📌 BƯỚC 1: Đăng nhập Thầy Khoa -> Mở tab "Nhập điểm thi" (tab=grades) -> Gõ Điểm cuối kỳ (ví dụ: 850) & Nhận xét -> Click "Lưu điểm thi"!');
    console.log('📌 BƯỚC 2: Mở tab "Điểm danh" (tab=attendance) -> Tích "Có mặt" cho Phạm Thị Hoa buổi 26 hôm nay!');
    console.log('📌 BƯỚC 3: Bấm nút "Báo cáo Admin" -> Chọn "🎓 Đề xuất Hoàn thành khóa học" -> Click Gửi!');
    console.log('📌 BƯỚC 4: Đăng nhập Admin -> Mở Admin Dashboard -> Phê duyệt đơn -> Phạm Thị Hoa hoàn thành Khóa A & NHẢY LÊN KHÓA B!');
    console.log('========================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi giả lập hoàn thành khóa học:', err);
    process.exit(1);
  }
}

runCourseCompletionTest();
