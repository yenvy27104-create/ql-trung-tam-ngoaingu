const pool = require('../models/db');

async function main() {
  try {
    // 1. Get a valid user ID (admin/staff) to associate as MaNguoiDang
    const [users] = await pool.query('SELECT MaNguoiDung FROM nguoidung ORDER BY MaNguoiDung ASC LIMIT 1');
    const adminId = users.length > 0 ? users[0].MaNguoiDung : 1;

    // 2. Clear old news
    await pool.query('DELETE FROM tintuc');
    
    // 3. Reset auto-increment
    await pool.query('ALTER TABLE tintuc AUTO_INCREMENT = 1');

    // 4. Insert the 3 matching articles
    await pool.query(`
      INSERT INTO tintuc (MaTinTuc, TieuDe, TomTat, NoiDung, HinhAnh, NgayDang, MaNguoiDang) VALUES
      (1, ?, ?, ?, ?, NOW(), ?),
      (2, ?, ?, ?, ?, NOW(), ?),
      (3, ?, ?, ?, ?, NOW(), ?)
    `, [
      'Cập nhật format TOEIC mới nhất năm 2026',
      'Những thay đổi quan trọng về cấu trúc đề thi TOEIC mà các thí sinh cần biết để đạt điểm cao.',
      'Tìm hiểu chi tiết cấu trúc đề thi TOEIC mới nhất với mô tả chi tiết từng Part từ 1 đến 7 và mẹo phân bổ thời gian.',
      '/images/Cap_Nhat_Fomat.png',
      adminId,
      
      'Mẹo làm bài Toeic Listening bứt phá điểm số',
      '5 chiến thuật nghe bắt từ khóa đỉnh cao giúp bạn bứt phá tối đa điểm số TOEIC Listening.',
      'Chiến thuật 1: Tận dụng thời gian vàng (Golden Time) để phán đoán trước... Chiến thuật 2: Đoán từ loại của đáp án...',
      '/images/Meo copy.png',
      adminId,
      
      'Kho 100 từ vựng TOEIC chủ đề văn phòng hay gặp',
      'Tổng hợp đầy đủ chức vụ, phòng ban, phúc lợi, văn phòng phẩm và mẫu câu giao tiếp văn phòng hay gặp.',
      'Kho từ vựng Tiếng Anh chủ đề Văn phòng & Công việc (Office & Corporate) với âm thanh phát âm và thanh tìm kiếm trực tuyến...',
      '/images/Kho_Tu_Vung.png',
      adminId
    ]);

    console.log('Successfully reset news table with homepage matching articles!');
    process.exit(0);
  } catch (err) {
    console.error('Error resetting news table:', err);
    process.exit(1);
  }
}

main();
