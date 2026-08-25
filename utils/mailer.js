/**
 * ============================================================================
 * TIỆN ÍCH GỬI EMAIL (MAILER UTILITY)
 * ============================================================================
 * Sử dụng Nodemailer gửi Email giao dịch, thông báo và mã xác thực OTP.
 * - Hỗ trợ gửi email qua Gmail SMTP.
 * - Tự động ghi mã OTP ra console nếu chưa cấu hình tài khoản Gmail hoặc gặp lỗi kết nối (Fallback mode).
 */

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || ''
  }
});

const sendMail = async (to, subject, htmlContent) => {
  // Trích xuất mã OTP để ghi log dự phòng (Fallback Logging)
  const otpMatch = htmlContent.match(/<span[^>]*>\s*(\d{6})\s*<\/span>/) || htmlContent.match(/(\d{6})/);
  const otpCode = otpMatch ? otpMatch[1] : 'Mã không rõ';

  // Nếu chưa cấu hình EMAIL_USER hoặc EMAIL_PASS trong file .env thì ghi log ra Console
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('\n========================= [MAIL MOCK] =========================');
    console.log(`Gửi tới: ${to}`);
    console.log(`Tiêu đề: ${subject}`);
    console.log(`MÃ OTP XÁC THỰC: ${otpCode}`);
    console.log('===============================================================\n');
    return true;
  }

  try {
    const mailOptions = {
      from: `"Anh Ngữ Y&V" <${process.env.EMAIL_USER || ''}>`,
      to: to,
      subject: subject,
      html: htmlContent
    };
    await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Gửi Email thành công tới: ${to}`);
    return true;
  } catch (error) {
    console.error('Lỗi gửi mail SMTP (Gmail):', error.message || error);
    console.log('\n========================= [FALLBACK OTP LOG] =========================');
    console.log(`Gửi tới: ${to}`);
    console.log(`Tiêu đề: ${subject}`);
    console.log(`MÃ OTP HỆ THỐNG XÁC THỰC: ${otpCode}`);
    console.log('======================================================================\n');
    return true;
  }
};

const sendTeacherAlertMailToAdmin = async ({ teacherName, studentName, className, alertType, reason }) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'yenvy27104@gmail.com';
  const subject = `[CẢNH BÁO TỪ GIẢNG VIÊN] Yêu cầu xử lý học viên: ${studentName} (${className})`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="background: #ef4444; padding: 12px 18px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #ffffff; margin: 0; font-size: 1.2rem;">
          🚨 BÁO CÁO CẦN XỬ LÝ TỪ GIẢNG VIÊN
        </h3>
      </div>
      <p style="font-size: 15px; color: #334155;">Kính gửi <strong>Phòng Đào Tạo / Admin</strong>,</p>
      <p style="font-size: 14px; color: #475569;">Giảng viên <strong>${teacherName}</strong> vừa gửi một báo cáo yêu cầu hỗ trợ xử lý học viên với thông tin chi tiết như sau:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; border: 1px solid #e2e8f0;">
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0; width: 35%;">Học viên:</td><td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>${studentName}</strong></td></tr>
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Lớp học:</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #2563eb; font-weight: bold;">${className}</td></tr>
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Loại yêu cầu:</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #dc2626; font-weight: bold;">${alertType}</td></tr>
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Lý do của Giảng viên:</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #1e293b;">${reason}</td></tr>
      </table>

      <div style="margin-top: 25px; text-align: center;">
        <a href="http://localhost:3000/admin/dashboard?tab=enrollments" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
          🔗 Mở Admin Dashboard Để Duyệt Yêu Cầu
        </a>
      </div>
    </div>
  `;

  return await sendMail(adminEmail, subject, htmlContent);
};

const sendStudentTransferRequestMailToAdmin = async ({ studentName, studentPhone, oldClassName, newClassName, reason, feeDiff = 0, totalSessionsPassed = 0 }) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'yenvy27104@gmail.com';
  const subject = `[YÊU CẦU CHUYỂN LỚP] Học viên ${studentName} xin chuyển từ ${oldClassName} sang ${newClassName}`;
  const feeDiffStr = feeDiff > 0 ? `${Number(feeDiff).toLocaleString('vi-VN')} đ (Phát sinh chênh lệch cần đóng bổ sung)` : '0 đ (Không chênh lệch)';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="background: #2563eb; padding: 14px 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #ffffff; margin: 0; font-size: 1.2rem;">
          🔄 THÔNG BÁO YÊU CẦU CHUYỂN LỚP MỚI
        </h3>
      </div>
      <p style="font-size: 15px; color: #334155;">Kính gửi <strong>Ban Quản Lý / Admin</strong>,</p>
      <p style="font-size: 14px; color: #475569;">Hệ thống vừa ghi nhận phiếu xin chuyển lớp từ học viên <strong>${studentName}</strong>. Thông tin chi tiết như sau:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; border: 1px solid #e2e8f0;">
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0; width: 38%;">Học viên:</td><td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>${studentName}</strong> ${studentPhone ? `(${studentPhone})` : ''}</td></tr>
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Lớp hiện tại (Lớp cũ):</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #dc2626; font-weight: bold;">${oldClassName}</td></tr>
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Lớp nguyện vọng (Lớp mới):</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #16a34a; font-weight: bold;">${newClassName}</td></tr>
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Số buổi đã diễn ra (Lớp cũ):</td><td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>${totalSessionsPassed} buổi</strong> ${totalSessionsPassed > 2 ? '<span style="color: #dc2626; font-weight: bold;">(> 2 buổi - Cần BQL thẩm định & tư vấn trực tiếp)</span>' : ''}</td></tr>
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Chênh lệch học phí:</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #d97706; font-weight: bold;">${feeDiffStr}</td></tr>
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Lý do xin chuyển:</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #1e293b;">${reason}</td></tr>
      </table>

      <div style="margin-top: 25px; text-align: center;">
        <a href="http://localhost:3000/admin/dashboard?tab=enrollments" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
          🔗 Mở Admin Dashboard Để Duyệt Đơn Chuyển Lớp
        </a>
      </div>
    </div>
  `;

  return await sendMail(adminEmail, subject, htmlContent);
};

const sendClassTransferApprovedMail = async ({ to, studentName, oldClassName, newClassName, feeDiff = 0 }) => {
  const subject = `[ANH NGỮ Y&V] Thông báo duyệt thành công yêu cầu chuyển lớp - Học viên ${studentName}`;
  const feeDiffText = feeDiff > 0 
    ? `${Number(feeDiff).toLocaleString('vi-VN')} đ (Đơn chuyển về trạng thái Chờ thanh toán phần chênh lệch)` 
    : '0 đ (Không phát sinh chênh lệch học phí)';
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 16px 20px; border-radius: 10px; margin-bottom: 20px;">
        <h3 style="color: #ffffff; margin: 0; font-size: 1.25rem;">
          🎉 YÊU CẦU CHUYỂN LỚP ĐÃ ĐƯỢC DUYỆT
        </h3>
      </div>
      <p style="font-size: 15px; color: #334155;">Xin chào <strong>${studentName}</strong>,</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Ban Quản Lý Trung tâm Anh ngữ Y&V xin thông báo: Yêu cầu chuyển lớp của bạn đã được Quản trị viên <strong>chấp thuận thành công</strong>. Thông tin chi tiết chuyển lớp như sau:
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; border: 1px solid #e2e8f0;">
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0; width: 38%;">Học viên:</td><td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>${studentName}</strong></td></tr>
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Lớp cũ:</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #dc2626; font-weight: bold;">${oldClassName}</td></tr>
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Lớp mới chính thức:</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #16a34a; font-weight: bold;">${newClassName}</td></tr>
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Chênh lệch học phí:</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #d97706; font-weight: bold;">${feeDiffText}</td></tr>
      </table>

      <p style="font-size: 13px; color: #64748b; margin-top: 15px; font-style: italic;">
        * Vui lòng truy cập Bảng điều khiển cá nhân để xem thời khóa biểu chi tiết của lớp học mới.
      </p>

      <div style="margin-top: 25px; text-align: center;">
        <a href="http://localhost:3000/classes/my-classes" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
          📚 Xem Lớp Học & Thời Khóa Biểu Mới
        </a>
      </div>
    </div>
  `;

  return await sendMail(to, subject, htmlContent);
};

const sendClassTransferRejectedMail = async ({ to, studentName, oldClassName, reason, newStatus }) => {
  const subject = `[ANH NGỮ Y&V] Thông báo kết quả xử lý yêu cầu chuyển lớp - Học viên ${studentName}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #d97706, #b45309); padding: 16px 20px; border-radius: 10px; margin-bottom: 20px;">
        <h3 style="color: #ffffff; margin: 0; font-size: 1.25rem;">
          ℹ️ THÔNG BÁO XỬ LÝ YÊU CẦU CHUYỂN LỚP
        </h3>
      </div>
      <p style="font-size: 15px; color: #334155;">Xin chào <strong>${studentName}</strong>,</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Ban Quản Lý Trung tâm Anh ngữ Y&V xin thông báo về phiếu xin chuyển lớp khỏi lớp <strong>${oldClassName}</strong> của bạn:
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; border: 1px solid #e2e8f0;">
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0; width: 38%;">Học viên:</td><td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>${studentName}</strong></td></tr>
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Lớp hiện tại:</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #2563eb; font-weight: bold;">${oldClassName}</td></tr>
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Lý do phản hồi:</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #dc2626;">${reason}</td></tr>
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Trạng thái cập nhật:</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #059669; font-weight: bold;">${newStatus}</td></tr>
      </table>

      <p style="font-size: 13px; color: #64748b; margin-top: 15px; line-height: 1.5;">
        Nếu bạn có thắc mắc hoặc cần tư vấn thêm về lịch học, xin vui lòng liên hệ với bộ phận Giáo vụ để được hỗ trợ trực tiếp.
      </p>

      <div style="margin-top: 25px; text-align: center;">
        <a href="http://localhost:3000/classes/my-classes" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px;">
          🔗 Kiểm Tra Hồ Sơ Học Viên
        </a>
      </div>
    </div>
  `;

  return await sendMail(to, subject, htmlContent);
};

const sendEnrollmentStatusMail = async ({ to, studentName, className, courseName, status, reason = '' }) => {
  let title = `CẬP NHẬT TRẠNG THÁI HỌC TẬP`;
  let headerBg = `linear-gradient(135deg, #2563eb, #1d4ed8)`;
  let statusColor = `#2563eb`;
  let desc = `Trạng thái đăng ký học của bạn tại lớp <strong>${className}</strong> (${courseName}) đã được cập nhật thành <strong>${status}</strong>.`;
  let showReason = false;

  if (status === 'Bảo lưu') {
    title = `PAUSE / BẢO LƯU KẾT QUẢ HỌC TẬP`;
    headerBg = `linear-gradient(135deg, #d97706, #b45309)`;
    statusColor = `#d97706`;
    desc = `Hệ thống ghi nhận trạng thái <strong>BẢO LƯU</strong> cho bạn tại lớp <strong>${className}</strong> (${courseName}). Hồ sơ và học phí của bạn sẽ được bảo lưu trọn vẹn trên hệ thống, bạn sẽ được ưu tiên xếp ca ngay khi có lớp mở mới cùng cấp độ.`;
  } else if (status.includes('Chờ ca học') || status.includes('Chờ xếp ca') || status.includes('đợt sau')) {
    title = `⏳ THÔNG BÁO CHỜ XẾP CA HỌC ĐỢT SAU`;
    headerBg = `linear-gradient(135deg, #0284c7, #0369a1)`;
    statusColor = `#0284c7`;
    desc = `Ban Quản Lý Anh Ngữ Y&V xin thông báo: Đơn đăng ký học lớp <strong>${className}</strong> (${courseName}) của bạn hiện đang ở trạng thái <strong>CHỜ XẾP CA HỌC ĐỢT SAU</strong>.<br><br>📌 <strong>Thông tin bảo lưu giữ chỗ:</strong> Toàn bộ hồ sơ đăng ký, suất học và ưu đãi học phí của bạn đã được hệ thống bảo lưu an toàn 100%. Trung tâm sẽ chủ động liên hệ thông báo lịch xếp ca mở lớp đợt tiếp theo tới bạn sớm nhất.`;
  } else if (status === 'Ngừng học') {
    title = `THÔNG BÁO TRẠNG THÁI NGỪNG HỌC`;
    headerBg = `linear-gradient(135deg, #dc2626, #991b1b)`;
    statusColor = `#dc2626`;
    desc = `Hồ sơ lớp <strong>${className}</strong> (${courseName}) của bạn đã được cập nhật sang trạng thái <strong>NGỪNG HỌC</strong>.`;
    showReason = true;
  } else if (status === 'Hoàn thành' || status === 'Đã hoàn thành') {
    title = `🎉 CHÚC MỪNG HOÀN THÀNH KHÓA HỌC`;
    headerBg = `linear-gradient(135deg, #16a34a, #15803d)`;
    statusColor = `#16a34a`;
    desc = `Chúc mừng bạn đã hoàn tất toàn bộ chương trình học của lớp <strong>${className}</strong> (${courseName}). Cảm ơn bạn đã đồng hành cùng Anh Ngữ Y&V!`;
  }

  const subject = `[ANH NGỮ Y&V] Thông báo cập nhật trạng thái lớp ${className}: ${status}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; margin: 0 auto;">
      <div style="background: ${headerBg}; padding: 16px 20px; border-radius: 10px; margin-bottom: 20px;">
        <h3 style="color: #ffffff; margin: 0; font-size: 1.25rem;">
          ${title}
        </h3>
      </div>
      <p style="font-size: 15px; color: #334155;">Kính gửi <strong>${studentName}</strong>,</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        ${desc}
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; border: 1px solid #e2e8f0;">
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0; width: 38%;">Học viên:</td><td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>${studentName}</strong></td></tr>
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Khóa học:</td><td style="padding: 10px; border: 1px solid #e2e8f0;">${courseName || ''}</td></tr>
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Lớp học:</td><td style="padding: 10px; border: 1px solid #e2e8f0;">${className || ''}</td></tr>
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Trạng thái mới:</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: ${statusColor}; font-weight: bold;">${status}</td></tr>
        ${showReason && reason ? `<tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Lý do:</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #1e293b;">${reason}</td></tr>` : ''}
      </table>

      <div style="margin-top: 20px; padding: 16px; background: #f0f4f8; border-left: 4px solid #2563eb; border-radius: 6px;">
        <p style="font-size: 13px; color: #475569; margin: 0; line-height: 1.5;">
          <strong>📞 Liên hệ hỗ trợ:</strong><br>
          Mọi chi tiết, thắc mắc xin liên hệ Trung tâm Anh ngữ Y&V - Hotline: <strong>0967815400</strong>. Chúng tôi luôn sẵn sàng hỗ trợ bạn.
        </p>
      </div>
    </div>
  `;

  return await sendMail(to, subject, htmlContent);
};

const sendFutureClassAssignedMail = async ({ to, studentName, newClassName, courseName, startDate = '' }) => {
  const subject = `[ANH NGỮ Y&V] Thông báo xếp lớp đợt mở mới sau Bảo lưu - Học viên ${studentName}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0284c7, #0369a1); padding: 16px 20px; border-radius: 10px; margin-bottom: 20px;">
        <h3 style="color: #ffffff; margin: 0; font-size: 1.25rem;">
          🚀 THÔNG BÁO XẾP LỚP ĐỢT MỚI
        </h3>
      </div>
      <p style="font-size: 15px; color: #334155;">Xin chào <strong>${studentName}</strong>,</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        Ban Quản Lý Trung tâm Anh ngữ Y&V xin thông báo: Bạn đã được Quản trị viên <strong>xếp ca vào lớp đợt mở mới</strong> sau thời gian bảo lưu!
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; border: 1px solid #e2e8f0;">
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0; width: 38%;">Học viên:</td><td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>${studentName}</strong></td></tr>
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Khóa học:</td><td style="padding: 10px; border: 1px solid #e2e8f0;">${courseName || ''}</td></tr>
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Lớp đợt mới:</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #16a34a; font-weight: bold;">${newClassName}</td></tr>
        ${startDate ? `<tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Ngày khai giảng:</td><td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>${startDate}</strong></td></tr>` : ''}
        <tr><td style="padding: 10px; font-weight: bold; background: #f8fafc; border: 1px solid #e2e8f0;">Trạng thái:</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #2563eb; font-weight: bold;">Đang học</td></tr>
      </table>

      <div style="margin-top: 25px; text-align: center;">
        <a href="http://localhost:3000/classes/my-classes" style="background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px;">
          📅 Xem Thời Khóa Biểu Chi Tiết
        </a>
      </div>
    </div>
  `;

  return await sendMail(to, subject, htmlContent);
};

module.exports = { 
  sendMail, 
  sendTeacherAlertMailToAdmin, 
  sendStudentTransferRequestMailToAdmin,
  sendClassTransferApprovedMail,
  sendClassTransferRejectedMail,
  sendEnrollmentStatusMail,
  sendFutureClassAssignedMail
};