/**
 * ============================================================================
 * TIỆN ÍCH THÔNG BÁO THANH TOÁN QUA EMAIL (PAYMENT NOTIFICATION UTILITY)
 * ============================================================================
 * Tự động gửi Email kép khi học viên hoàn tất thanh toán thành công:
 * 1. Email 1: Thông báo cho Admin (kèm chi tiết danh sách học viên ghi danh & tổng tiền).
 * 2. Email 2: Email xác nhận gửi cho Học viên (kèm lời chúc mừng, mã kích hoạt tài khoản & hướng dẫn học).
 */

const pool = require('../models/db');
const { sendMail } = require('./mailer');

const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'yenvy27104@gmail.com';

async function fetchEnrollmentDetails(maDangKyIds) {
  const ids = Array.isArray(maDangKyIds) ? maDangKyIds : [maDangKyIds];
  if (ids.length === 0) return [];

  const [rows] = await pool.query(
    `SELECT dk.MaDangKy, dk.HocPhiDaGiam, dk.NgayDangKy, dk.TrangThai,
            hv.MaHocVien, hv.HoTen AS TenHocVien, hv.QuanHe,
            nd.HoTen AS TenNguoiDangKy, nd.Email, nd.SoDienThoai,
            lh.TenLop, lh.NgayKhaiGiang,
            kh.TenKhoaHoc, kh.CapDo, kh.HocPhi
     FROM dangkyhoc dk
     JOIN hosohocvien hv ON dk.MaHocVien = hv.MaHocVien
     JOIN nguoidung nd ON hv.MaNguoiDung = nd.MaNguoiDung
     JOIN lophoc lh ON dk.MaLopHoc = lh.MaLopHoc
     JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc
     WHERE dk.MaDangKy IN (?)`,
    [ids]
  );
  return rows;
}

function buildPaymentNotificationHtml(enrollments, paymentInfo = {}) {
  const student = enrollments[0];
  const { soTien, noiDungChuyenKhoan } = paymentInfo;
  const ngayThanhToan = new Date().toLocaleString('vi-VN');
  const isOverflow = enrollments.some(e => e.TrangThai === 'Chờ xếp ca đợt sau');

  const courseRows = enrollments.map((e) => `
    <tr>
      <td style="padding:8px 12px;border:1px solid #e0e0e0;">${e.TenKhoaHoc}</td>
      <td style="padding:8px 12px;border:1px solid #e0e0e0;">${e.TenLop}</td>
      <td style="padding:8px 12px;border:1px solid #e0e0e0;">
        <strong style="color:#2c3e50;">${e.TenHocVien}</strong>
        ${e.QuanHe ? `<br><span style="color:#7f8c8d;font-size:11px;">(${e.QuanHe})</span>` : ''}
      </td>
      <td style="padding:8px 12px;border:1px solid #e0e0e0;">${e.CapDo || '—'}</td>
      <td style="padding:8px 12px;border:1px solid #e0e0e0;text-align:right;">${Number(e.HocPhiDaGiam || e.HocPhi || 0).toLocaleString('vi-VN')} đ</td>
    </tr>
  `).join('');

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
      <div style="background:${isOverflow ? '#d35400' : '#1a252f'};color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;font-size:18px;">${isOverflow ? '⚠️ THÔNG BÁO CẦN XỬ LÝ: LỚP HỌC ĐÃ ĐẦY' : 'Thông báo thanh toán khóa học'}</h2>
        <p style="margin:6px 0 0;opacity:0.95;font-size:13px;">${isOverflow ? 'Học viên đã chuyển tiền nhưng lớp đã hết slot (Chuyển sang Chờ xếp ca đợt sau)' : 'Học viên đã hoàn tất thanh toán học phí'}</p>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
        ${isOverflow ? `
          <div style="background:#fdf2e9;border-left:4px solid #e67e22;padding:12px 16px;margin-bottom:20px;border-radius:4px;">
            <strong style="color:#d35400;font-size:14px;">📌 Yêu cầu xử lý từ Admin:</strong>
            <p style="margin:4px 0 0;font-size:13px;color:#555;">
              Học viên <strong>${student.TenNguoiDangKy || student.TenHocVien}</strong> đã chuyển tiền thành công (${Number(soTien || 0).toLocaleString('vi-VN')} đ), tuy nhiên lớp <strong>${student.TenLop}</strong> đã vừa nhận đủ sĩ số tối đa trước đó.
              <br>👉 Đơn đăng ký đã tự động được xếp vào danh sách <strong>"Chờ xếp ca đợt sau"</strong>. Vui lòng liên hệ học viên để xếp lớp ca mới hoặc làm thủ tục hoàn tiền.
            </p>
          </div>
        ` : ''}

        <h3 style="margin:0 0 12px;font-size:15px;color:#3498db;">Thông tin tài khoản đăng ký</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px;">
          <tr><td style="padding:6px 0;color:#666;width:140px;">Người thanh toán:</td><td style="padding:6px 0;font-weight:bold;">${student.TenNguoiDangKy || student.TenHocVien}</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Email liên hệ:</td><td style="padding:6px 0;">${student.Email || '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Số điện thoại:</td><td style="padding:6px 0;">${student.SoDienThoai || '—'}</td></tr>
        </table>

        <h3 style="margin:0 0 12px;font-size:15px;color:#3498db;">Chi tiết khóa học & Học viên ghi danh</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;">
          <thead>
            <tr style="background:#f5f7fa;">
              <th style="padding:8px 12px;border:1px solid #e0e0e0;text-align:left;">Khóa học</th>
              <th style="padding:8px 12px;border:1px solid #e0e0e0;text-align:left;">Lớp</th>
              <th style="padding:8px 12px;border:1px solid #e0e0e0;text-align:left;">Học viên</th>
              <th style="padding:8px 12px;border:1px solid #e0e0e0;text-align:left;">Cấp độ</th>
              <th style="padding:8px 12px;border:1px solid #e0e0e0;text-align:right;">Học phí</th>
            </tr>
          </thead>
          <tbody>${courseRows}</tbody>
        </table>

        <h3 style="margin:0 0 12px;font-size:15px;color:#3498db;">Thông tin thanh toán</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${soTien ? `<tr><td style="padding:6px 0;color:#666;width:140px;">Số tiền đã nhận:</td><td style="padding:6px 0;font-weight:bold;color:#27ae60;">${Number(soTien).toLocaleString('vi-VN')} đ</td></tr>` : ''}
          ${noiDungChuyenKhoan ? `<tr><td style="padding:6px 0;color:#666;">Nội dung CK:</td><td style="padding:6px 0;">${noiDungChuyenKhoan}</td></tr>` : ''}
          <tr><td style="padding:6px 0;color:#666;">Thời gian:</td><td style="padding:6px 0;">${ngayThanhToan}</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Trạng thái đơn:</td><td style="padding:6px 0;"><strong style="color:${isOverflow ? '#d35400' : '#27ae60'};">${isOverflow ? 'Đã nhận tiền - Chờ xếp ca đợt sau (Lớp đầy)' : 'Thành công'}</strong></td></tr>
        </table>
      </div>
      <p style="text-align:center;font-size:12px;color:#999;margin-top:16px;">Email tự động từ Hệ thống Quản lý Đào tạo</p>
    </div>
  `;
}

function buildStudentPaymentNotificationHtml(enrollments, paymentInfo = {}) {
  const student = enrollments[0];
  const { soTien, noiDungChuyenKhoan } = paymentInfo;
  const ngayThanhToan = new Date().toLocaleString('vi-VN');

  const isOverflow = enrollments.some(e => e.TrangThai === 'Chờ xếp ca đợt sau');
  const studentListText = [...new Set(enrollments.map(e => `${e.TenHocVien}${e.QuanHe ? ` (${e.QuanHe})` : ''}`))].join(', ');

  const courseRows = enrollments.map((e) => `
    <tr>
      <td style="padding:8px 12px;border:1px solid #e0e0e0;">${e.TenKhoaHoc}</td>
      <td style="padding:8px 12px;border:1px solid #e0e0e0;">${e.TenLop}</td>
      <td style="padding:8px 12px;border:1px solid #e0e0e0;">
        <strong style="color:#2c3e50;">${e.TenHocVien}</strong>
        ${e.QuanHe ? `<br><span style="color:#7f8c8d;font-size:11px;">(${e.QuanHe})</span>` : ''}
      </td>
      <td style="padding:8px 12px;border:1px solid #e0e0e0;text-align:center;">${e.NgayKhaiGiang ? new Date(e.NgayKhaiGiang).toLocaleDateString('vi-VN') : '—'}</td>
      <td style="padding:8px 12px;border:1px solid #e0e0e0;text-align:right;">${Number(e.HocPhiDaGiam || e.HocPhi || 0).toLocaleString('vi-VN')} đ</td>
    </tr>
  `).join('');

  if (isOverflow) {
    return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
      <div style="background:#e67e22;color:#fff;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
        <h2 style="margin:0;font-size:20px;font-weight:bold;">XÁC NHẬN THANH TOÁN - CHỜ XẾP CA ĐỢT SAU</h2>
        <p style="margin:8px 0 0;opacity:0.95;font-size:14px;">Anh Ngữ Y&V đã nhận thành công khoản học phí của bạn</p>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;line-height:1.6;">
        <p>Xin chào <strong>${student.TenNguoiDangKy || student.TenHocVien}</strong>,</p>
        <p>Hệ thống xin xác nhận đã nhận thành công số tiền học phí <strong>${Number(soTien || 0).toLocaleString('vi-VN')} đ</strong> cho học viên: <strong>${studentListText}</strong>.</p>
        <p style="background:#fff8e1;padding:12px;border-left:4px solid #f39c12;border-radius:4px;font-size:13.5px;">
          ⚠️ <strong>Lưu ý về lớp học:</strong> Do lớp học đăng ký đã nhận đủ sĩ số tối đa trước thời điểm giao dịch hoàn tất, đơn của bạn đã được hệ thống ghi nhận ưu tiên xếp vào danh sách <strong>CHỜ XẾP CA ĐỢT SAU</strong>.
        </p>

        <h3 style="margin:20px 0 10px;font-size:15px;color:#d35400;border-bottom:1px solid #eee;padding-bottom:6px;">Danh sách đơn đăng ký chờ xếp ca</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;">
          <thead>
            <tr style="background:#f5f7fa;">
              <th style="padding:8px 12px;border:1px solid #e0e0e0;text-align:left;">Khóa học</th>
              <th style="padding:8px 12px;border:1px solid #e0e0e0;text-align:left;">Lớp</th>
              <th style="padding:8px 12px;border:1px solid #e0e0e0;text-align:left;">Học viên</th>
              <th style="padding:8px 12px;border:1px solid #e0e0e0;text-align:center;">Khai giảng</th>
              <th style="padding:8px 12px;border:1px solid #e0e0e0;text-align:right;">Học phí</th>
            </tr>
          </thead>
          <tbody>${courseRows}</tbody>
        </table>

        <div style="background:#f8f9fa;padding:15px;border-radius:6px;font-size:13px;border-left:4px solid #e67e22;margin-top:20px;">
          <strong>Bước tiếp theo:</strong>
          <ul style="margin:8px 0 0;padding-left:20px;">
            <li>Khoản học phí của bạn được bảo lưu an toàn trên hệ thống.</li>
            <li>Ban Quản Lý trung tâm sẽ chủ động gọi điện liên hệ trong 24h để xếp ca học mới hoặc làm thủ tục hoàn tiền theo nguyện vọng của bạn.</li>
          </ul>
        </div>

        <div style="margin-top:30px;border-top:1px solid #eee;padding-top:15px;font-size:13px;color:#666;">
          <strong>Anh Ngữ Y&V Center</strong><br>
          Hotline: 0994.796.334<br>
          Địa chỉ: Trường Đại Học Công Nghệ Sài Gòn (STU)
        </div>
      </div>
      <p style="text-align:center;font-size:12px;color:#999;margin-top:16px;">Đây là email tự động, vui lòng không phản hồi email này.</p>
    </div>
    `;
  }

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
      <div style="background:#2c3e50;color:#fff;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
        <h2 style="margin:0;font-size:20px;font-weight:bold;">ĐĂNG KÝ HỌC THÀNH CÔNG</h2>
        <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">Anh Ngữ Y&V chúc mừng bạn đã chính thức tham gia khóa học</p>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;line-height:1.6;">
        <p>Xin chào <strong>${student.TenNguoiDangKy || student.TenHocVien}</strong>,</p>
        <p>Hệ thống học vụ trực tuyến của Anh Ngữ Y&V xin xác nhận đã nhận được khoản thanh toán học phí và kích hoạt thành công quyền học tập cho học viên: <strong>${studentListText}</strong>.</p>

        <h3 style="margin:20px 0 10px;font-size:15px;color:#3498db;border-bottom:1px solid #eee;padding-bottom:6px;">Danh sách khóa học & Học viên ghi danh</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;">
          <thead>
            <tr style="background:#f5f7fa;">
              <th style="padding:8px 12px;border:1px solid #e0e0e0;text-align:left;">Khóa học</th>
              <th style="padding:8px 12px;border:1px solid #e0e0e0;text-align:left;">Lớp</th>
              <th style="padding:8px 12px;border:1px solid #e0e0e0;text-align:left;">Học viên ghi danh</th>
              <th style="padding:8px 12px;border:1px solid #e0e0e0;text-align:center;">Khai giảng</th>
              <th style="padding:8px 12px;border:1px solid #e0e0e0;text-align:right;">Học phí</th>
            </tr>
          </thead>
          <tbody>${courseRows}</tbody>
        </table>

        <h3 style="margin:20px 0 10px;font-size:15px;color:#3498db;border-bottom:1px solid #eee;padding-bottom:6px;">Chi tiết thanh toán</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
          ${soTien ? `<tr><td style="padding:6px 0;color:#666;width:140px;">Số tiền đã đóng:</td><td style="padding:6px 0;font-weight:bold;color:#27ae60;">${Number(soTien).toLocaleString('vi-VN')} đ</td></tr>` : ''}
          ${noiDungChuyenKhoan ? `<tr><td style="padding:6px 0;color:#666;">Nội dung:</td><td style="padding:6px 0;">${noiDungChuyenKhoan}</td></tr>` : ''}
          <tr><td style="padding:6px 0;color:#666;">Thời gian thanh toán:</td><td style="padding:6px 0;">${ngayThanhToan}</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Trạng thái tài khoản:</td><td style="padding:6px 0;"><span style="background:#2ecc71;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold;">ĐÃ KÍCH HOẠT HỌC VIÊN CHÍNH THỨC</span></td></tr>
        </table>

        <div style="background:#f8f9fa;padding:15px;border-radius:6px;font-size:13px;border-left:4px solid #3498db;margin-top:20px;">
          <strong>Hướng dẫn học tập:</strong>
          <ul style="margin:8px 0 0;padding-left:20px;">
            <li>Đăng nhập vào tài khoản học tập trên website trung tâm.</li>
            <li>Truy cập mục "Lớp của tôi" hoặc "Thời khóa biểu" để xem chi tiết lịch học của từng học viên.</li>
            <li>Kho luyện đề thi thử TOEIC VIP đã được mở khóa tự động để ôn tập trực tuyến.</li>
          </ul>
        </div>

        <p style="margin-top:24px;">Chúc các học viên có một trải nghiệm học tập tuyệt vời và sớm đạt được mục tiêu TOEIC mong muốn!</p>
        
        <div style="margin-top:30px;border-top:1px solid #eee;padding-top:15px;font-size:13px;color:#666;">
          <strong>Anh Ngữ Y&V Center</strong><br>
          Hotline: 0994.796.334<br>
          Địa chỉ: 180 CAO LỖ,PHƯỜNG CHÁNH HƯNG,TP.HCM
        </div>
      </div>
      <p style="text-align:center;font-size:12px;color:#999;margin-top:16px;">Đây là email tự động, vui lòng không phản hồi email này.</p>
    </div>
  `;
}

async function notifyAdminPaymentSuccess(maDangKyIds, paymentInfo = {}) {
  try {
    const enrollments = await fetchEnrollmentDetails(maDangKyIds);
    if (enrollments.length === 0) return;

    const isOverflow = enrollments.some(e => e.TrangThai === 'Chờ xếp ca đợt sau');
    const studentName = enrollments[0].TenNguoiDangKy || enrollments[0].TenHocVien || 'Học viên';
    const courseNames = [...new Set(enrollments.map((e) => e.TenKhoaHoc))].join(', ');
    const adminSubject = isOverflow 
      ? `[CẦN XỬ LÝ - LỚP ĐẦY] ${studentName} đã nộp tiền đợt Chờ xếp ca (${courseNames})`
      : `[Thanh toán mới] ${studentName} đã đăng ký khóa ${courseNames}`;
    const adminHtml = buildPaymentNotificationHtml(enrollments, paymentInfo);

    const studentEmail = enrollments[0].Email;
    const studentSubject = isOverflow
      ? `[Anh Ngữ Y&V] Xác nhận thanh toán - Đơn đăng ký đang chờ xếp ca đợt sau`
      : `[Anh Ngữ Y&V] Xác nhận thanh toán & Kích hoạt khóa học thành công`;
    const studentHtml = buildStudentPaymentNotificationHtml(enrollments, paymentInfo);

    const mailPromises = [
      sendMail(ADMIN_NOTIFY_EMAIL, adminSubject, adminHtml).then(() => {
        console.log(`[Payment Notify] ✅ Mail kép 1: Đã gửi thông báo tới Admin: ${ADMIN_NOTIFY_EMAIL}`);
      }).catch(err => console.error(`[Payment Notify] ❌ Lỗi gửi mail Admin:`, err.message))
    ];

    if (studentEmail) {
      mailPromises.push(
        sendMail(studentEmail, studentSubject, studentHtml).then(() => {
          console.log(`[Payment Notify] ✅ Mail kép 2: Đã gửi xác nhận tới Học viên: ${studentEmail}`);
        }).catch(err => console.error(`[Payment Notify] ❌ Lỗi gửi mail Học viên (${studentEmail}):`, err.message))
      );
    }

    await Promise.allSettled(mailPromises);

  } catch (err) {
    console.error('[Payment Notify] Lỗi tổng quát gửi email thông báo:', err.message);
  }
}

module.exports = { notifyAdminPaymentSuccess };
