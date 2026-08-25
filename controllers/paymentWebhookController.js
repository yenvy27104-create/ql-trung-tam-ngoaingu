/**
 * ============================================================================
 * BỘ ĐIỀU KHIỂN WEBHOOK THANH TOÁN TỰ ĐỘNG (PAYMENT WEBHOOK CONTROLLER)
 * ============================================================================
 * Tiếp nhận thông báo chuyển khoản tự động từ cổng SePay & VietQR / Casso:
 * - Phân tích cú pháp tin nhắn chuyển khoản để tìm Mã đăng ký học (MaDK).
 * - Cập nhật trạng thái đăng ký học sang "Đang học".
 * - Tự động cập nhật trình độ hiện tại cho học viên.
 * - Phát tín hiệu Socket.IO thông báo thanh toán thành công tức thì trên giao diện Web.
 * - Gửi Email xác nhận kép cho Admin & Học viên.
 */

const pool = require('../models/db');
const { notifyAdminPaymentSuccess } = require('../utils/paymentNotification');
const { updateStudentProficiencyLevel } = require('../utils/scoreCalc');

class PaymentWebhookController {
  /**
   * Kích hoạt đơn đăng ký an toàn: Kiểm tra sĩ số tối đa của lớp học.
   * Nếu còn chỗ -> 'Đang học'. Nếu đã đủ sĩ số -> 'Chờ xếp ca đợt sau'.
   */
  static async activateRegistrationWithCapacityCheck(connection, item, targetClassId = null, extraNote = '') {
    const classId = targetClassId || item.MaLopHoc;
    
    // Khóa dòng lớp học và đếm số học viên chính thức hiện tại trong CSDL
    const [clsRows] = await connection.query(
      `SELECT SiSoToiDa, 
              (SELECT COUNT(*) FROM dangkyhoc WHERE MaLopHoc = ? AND TrangThai IN ('Thành công', 'Đang học')) AS CurrentEnrolled
       FROM lophoc WHERE MaLopHoc = ? FOR UPDATE`,
      [classId, classId]
    );

    const cls = clsRows[0];
    const maxCapacity = cls ? Number(cls.SiSoToiDa) : 999;
    const currentEnrolled = cls ? Number(cls.CurrentEnrolled || 0) : 0;

    if (cls && currentEnrolled >= maxCapacity) {
      console.warn(`[PAYMENT SYNC] ⚠️ Lớp mã #${classId} đã đầy (${currentEnrolled}/${maxCapacity}). Đơn DK#${item.MaDangKy} được gán 'Chờ xếp ca đợt sau'.`);
      const overflowNote = extraNote 
        ? `${extraNote} | [Tự động] Đã thanh toán nhưng lớp mã #${classId} đã đầy (${currentEnrolled}/${maxCapacity})`
        : `[Tự động] Đã thanh toán nhưng lớp mã #${classId} đã đầy (${currentEnrolled}/${maxCapacity})`;
      
      if (targetClassId) {
        await connection.query(
          "UPDATE dangkyhoc SET MaLopHoc = ?, TrangThai = 'Chờ xếp ca đợt sau', GhiChu = ? WHERE MaDangKy = ?",
          [targetClassId, overflowNote, item.MaDangKy]
        );
      } else {
        await connection.query(
          "UPDATE dangkyhoc SET TrangThai = 'Chờ xếp ca đợt sau', GhiChu = ? WHERE MaDangKy = ?",
          [overflowNote, item.MaDangKy]
        );
      }
      return { success: true, isOverflow: true };
    } else {
      if (targetClassId) {
        await connection.query(
          "UPDATE dangkyhoc SET MaLopHoc = ?, TrangThai = 'Đang học', GhiChu = ? WHERE MaDangKy = ?",
          [targetClassId, extraNote || `[Đã bổ sung học phí] Chuyển thành công sang lớp mã #${targetClassId}`, item.MaDangKy]
        );
      } else {
        await connection.query(
          "UPDATE dangkyhoc SET TrangThai = 'Đang học' WHERE MaDangKy = ?",
          [item.MaDangKy]
        );
      }
      // Nếu sĩ số vừa đủ tối đa sau lượt kích hoạt này -> Tự động chuyển trạng thái lớp sang 'Đang diễn ra'
      if (currentEnrolled + 1 >= maxCapacity) {
        await connection.query("UPDATE lophoc SET TrangThaiLop = 'Đang diễn ra' WHERE MaLopHoc = ?", [classId]);
        console.log(`[PAYMENT SYNC] 🎯 Lớp mã #${classId} đã đạt đủ sĩ số (${currentEnrolled + 1}/${maxCapacity}) -> Tự động chuyển TrangThaiLop sang 'Đang diễn ra'.`);
      }
      return { success: true, isOverflow: false };
    }
  }

  static async handleWebhook(req, res) {
    try {
      // Xác thực API Key (nếu có)
      const apiKey = process.env.SEPAY_API_KEY;
      if (apiKey) {
        const authHeader = req.headers['authorization'];
        const queryKey = req.query.api_key;
        const providedKey = authHeader ? authHeader.replace('Apikey ', '').replace('Bearer ', '') : queryKey;
        
        if (providedKey !== apiKey) {
          console.log('[WEBHOOK] Unauthorized request - Invalid API key');
          return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
      }

      console.log('[WEBHOOK] ========================================');
      console.log('[WEBHOOK] Received payment notification:', JSON.stringify(req.body));

      // Parse webhook data (hỗ trợ cả SePay và Casso format)
      let transactions = [];

      if (req.body.data && Array.isArray(req.body.data)) {
        // Casso format
        transactions = req.body.data.map(tx => ({
          content: tx.description || '',
          amount: tx.amount || 0,
          date: tx.when || new Date().toISOString(),
          referenceCode: tx.tid || ''
        }));
      } else if (req.body.content || req.body.transferAmount || req.body.amountIn || req.body.transactionContent) {
        // SePay format (Hỗ trợ đầy đủ các phiên bản API SePay v1 & v2)
        if (req.body.transferType && req.body.transferType !== 'in') {
          // Bỏ qua giao dịch "out" (rút tiền)
          return res.json({ success: true, message: 'Ignored outgoing transaction' });
        }
        transactions = [{
          content: req.body.content || req.body.transactionContent || req.body.description || req.body.body || '',
          amount: parseFloat(req.body.amountIn || req.body.transferAmount || req.body.amount || 0),
          date: req.body.transactionDate || req.body.createdAt || new Date().toISOString(),
          referenceCode: req.body.referenceCode || req.body.referenceNumber || req.body.id || ''
        }];
      } else {
        console.log('[WEBHOOK] Unrecognized payload format');
        return res.status(400).json({ success: false, message: 'Unrecognized payload format' });
      }

      const matchedCount = await PaymentWebhookController.processTransactions(transactions);

      console.log(`[WEBHOOK] Processed ${transactions.length} transaction(s), matched ${matchedCount}`);
      console.log('[WEBHOOK] ========================================');

      return res.json({ success: true, matchedCount });

    } catch (err) {
      console.error('[WEBHOOK] Error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  static async processTransactions(transactions) {
    let matchedCount = 0;

    for (const tx of transactions) {
      const rawContent = (tx.content || '').trim();
      const content = rawContent.replace(/NONG\s*MINH\s*TUAN/gi, 'TRUNG TÂM ANH NGỮ Y&V');
      const amount = Number(tx.amount || 0);
      const rawDateStr = String(tx.date || '').trim().replace(' ', 'T');
      const parsedDate = new Date(rawDateStr);
      const txDate = !isNaN(parsedDate.getTime()) ? parsedDate : new Date();

      if (!content || amount <= 0) continue;

      // Chống tái sử dụng giao dịch ngân hàng cũ đã được ghi nhận thành công trong DB
      const [alreadyUsed] = await pool.query(
        `SELECT MaGiaoDich FROM giaodich WHERE SoTien = ? AND NoiDungChuyenKhoan = ? AND TrangThai = 'Thành công'`,
        [amount, content]
      );
      if (alreadyUsed.length > 0) {
        console.log(`[PAYMENT SYNC] ⏩ Giao dịch "${content}" (${amount}đ) đã được xử lý trước đó -> Bỏ qua.`);
        continue;
      }

      console.log(`[PAYMENT SYNC] Processing: content="${content}", amount=${amount}, date="${tx.date}"`);

      const [pendingTxs] = await pool.query(
        `SELECT dk.MaDangKy, dk.NgayDangKy, dk.MaNguoiDangKy, 
                COALESCE(dk.HocPhiDaGiam, kh.HocPhi) AS SoTien, 
                CONCAT('MADK', dk.MaDangKy) AS NoiDungChuyenKhoan,
                dk.TrangThai AS dkTrangThai, dk.MaHocVien, dk.MaLopHoc, 
                MIN(gd.MaGiaoDich) AS MaGiaoDich, MAX(gd.TrangThai) AS gdTrangThai
         FROM dangkyhoc dk
         JOIN lophoc lh ON dk.MaLopHoc = lh.MaLopHoc
         JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc
         LEFT JOIN giaodich gd ON dk.MaDangKy = gd.MaDangKy
         WHERE dk.TrangThai IN ('Chờ thanh toán', 'Chờ duyệt', 'Đã hủy')
         GROUP BY dk.MaDangKy, dk.NgayDangKy, dk.MaNguoiDangKy, dk.HocPhiDaGiam, kh.HocPhi, dk.TrangThai, dk.MaHocVien, dk.MaLopHoc
         ORDER BY dk.NgayDangKy DESC`
      );

      if (pendingTxs.length === 0) continue;

      const txContentLower = content.replace(/\s+/g, ' ').toLowerCase();
      const txMaDKMatches = txContentLower.match(/(?:madk|dk)[\s_:]*([0-9\s,._-]+)/gi) || [];
      const txMaDKIds = [];
      for (const m of txMaDKMatches) {
        const nums = m.match(/\d+/g) || [];
        nums.forEach(n => {
          const val = parseInt(n, 10);
          if (val > 0 && !txMaDKIds.includes(val)) {
            txMaDKIds.push(val);
          }
        });
      }

      const groupsByDK = {};
      for (const pending of pendingTxs) {
        const dk = pending.MaDangKy;
        if (!groupsByDK[dk]) {
          groupsByDK[dk] = {
            items: [],
            totalAmount: 0,
            NoiDungChuyenKhoan: pending.NoiDungChuyenKhoan
          };
        }
        groupsByDK[dk].items.push(pending);
        groupsByDK[dk].totalAmount += Number(pending.SoTien);
      }

      let matched = false;

      // === Phương pháp 1: Khớp theo danh sách MaDK ID chuẩn xác + Thời gian giao dịch hợp lệ ===
      if (txMaDKIds.length > 0) {
        const itemsToProcess = [];
        for (const dkId of txMaDKIds) {
          if (groupsByDK[dkId]) {
            const group = groupsByDK[dkId];
            const bestItem = group.items.find(item => Math.abs(amount - Number(item.SoTien)) <= 1000) || group.items[0];
            
            if (bestItem.NgayDangKy) {
              const regTime = new Date(bestItem.NgayDangKy).getTime();
              const txTime = txDate.getTime();
              if (txTime < regTime - 60000) {
                console.log(`[PAYMENT SYNC] ⚠️ Giao dịch cũ (${tx.date}) xảy ra trước thời điểm đăng ký DK#${dkId} (${bestItem.NgayDangKy}) -> Bỏ qua.`);
                continue;
              }
            }

            if (!itemsToProcess.some(it => it.MaDangKy === bestItem.MaDangKy)) {
              itemsToProcess.push(bestItem);
            }
          }
        }

        if (itemsToProcess.length > 0) {
          const primaryUser = itemsToProcess[0].MaNguoiDangKy;
          if (primaryUser) {
            const userPendingItems = pendingTxs.filter(p => p.MaNguoiDangKy === primaryUser);
            for (const sibling of userPendingItems) {
              if (!itemsToProcess.some(it => it.MaDangKy === sibling.MaDangKy)) {
                itemsToProcess.push(sibling);
              }
            }
          }

          console.log(`[PAYMENT SYNC] ✅ Matched ${itemsToProcess.length} item(s) by MaDK / Batch for User#${primaryUser}: ${itemsToProcess.map(i => i.MaDangKy).join(', ')}`);
          let matchedIds = [];
          const connection = await pool.getConnection();
          try {
            await connection.beginTransaction();
            for (const item of itemsToProcess) {
              const [existingTxs] = await connection.query(`SELECT MaGiaoDich FROM giaodich WHERE MaDangKy = ? AND TrangThai = 'Chờ duyệt'`, [item.MaDangKy]);
              if (existingTxs.length > 0) {
                await connection.query(`UPDATE giaodich SET TrangThai = 'Thành công', NoiDungChuyenKhoan = ? WHERE MaDangKy = ? AND TrangThai = 'Chờ duyệt'`, [content, item.MaDangKy]);
              } else {
                await connection.query(
                  `INSERT INTO giaodich (MaDangKy, SoTien, NoiDungChuyenKhoan, TrangThai, NgayGiaoDich) VALUES (?, ?, ?, 'Thành công', NOW())`,
                  [item.MaDangKy, item.SoTien || amount, content]
                );
              }
              await PaymentWebhookController.activateRegistrationWithCapacityCheck(connection, item);
              matchedIds.push(item.MaDangKy);
            }
            await connection.commit();
          } catch (txErr) {
            await connection.rollback();
            // [FIX 3]: Không throw lỗi làm sập luồng, log lại và bỏ qua giao dịch lỗi này để xử lý tiếp giao dịch khác
            console.error(`[PAYMENT SYNC] Lỗi cập nhật CSDL ở Phương pháp 1:`, txErr);
            continue; 
          } finally {
            connection.release();
          }

          try {
            await notifyAdminPaymentSuccess(matchedIds, { soTien: amount, noiDungChuyenKhoan: content });
            const [hvRows] = await pool.query('SELECT DISTINCT MaHocVien FROM dangkyhoc WHERE MaDangKy IN (?)', [matchedIds]);
            for (const hv of hvRows) { await updateStudentProficiencyLevel(hv.MaHocVien); }
          } catch (mailErr) {
            console.error('[PAYMENT SYNC] Error sending payment success emails / updating level:', mailErr);
          }

          matchedCount += matchedIds.length;
          matched = true;
        }
      }

      // === Phương pháp 2: Khớp theo nội dung chuyển khoản chuẩn xác ===
      if (!matched) {
        for (const pending of pendingTxs) {
          const dbContent = (pending.NoiDungChuyenKhoan || '').trim().replace(/\s+/g, ' ').toLowerCase();
          if (dbContent.startsWith('vnp_')) continue;

          const dbContentNoUnder = dbContent.replace(/_/g, '');
          const txContentNoUnder = txContentLower.replace(/_/g, '');
          const isContentMatch = txContentNoUnder.includes(dbContentNoUnder) || dbContentNoUnder.includes(txContentNoUnder);
          const isAmountMatch = Math.abs(amount - Number(pending.SoTien)) <= 1000 || amount >= Number(pending.SoTien);

          if (isContentMatch || isAmountMatch) {
            if (pending.NgayDangKy) {
              const regTime = new Date(pending.NgayDangKy).getTime();
              const txTime = txDate.getTime();
              if (txTime < regTime - 60000) {
                console.log(`[PAYMENT SYNC] ⚠️ Giao dịch cũ (${tx.date}) trước khi đăng ký -> Bỏ qua.`);
                continue;
              }
            }

            const userItems = pendingTxs.filter(p => p.MaNguoiDangKy === pending.MaNguoiDangKy);

            console.log(`[PAYMENT SYNC] ✅ Content/Amount match found! Auto-activating ${userItems.length} item(s) for User#${pending.MaNguoiDangKy}`);
            const matchedIds = [];
            const connection = await pool.getConnection();
            try {
              await connection.beginTransaction();
              for (const item of userItems) {
                if (item.MaGiaoDich) {
                  await connection.query(`UPDATE giaodich SET TrangThai = 'Thành công', NoiDungChuyenKhoan = ? WHERE MaGiaoDich = ?`, [content, item.MaGiaoDich]);
                } else {
                  await connection.query(
                    `INSERT INTO giaodich (MaDangKy, SoTien, NoiDungChuyenKhoan, TrangThai, NgayGiaoDich) VALUES (?, ?, ?, 'Thành công', NOW())`,
                    [item.MaDangKy, item.SoTien || amount, content]
                  );
                }
                
                // [FIX 1]: Sửa logic update sĩ số - Chỉ update bảng lophoc khi check capacity thành công (isOverflow = false)
                if (item.GhiChu && item.GhiChu.includes('Mã #')) {
                  const match = item.GhiChu.match(/Mã\s*#(\d+)/i);
                  if (match) {
                    const maLopHocMoi = match[1];
                    const actResult = await PaymentWebhookController.activateRegistrationWithCapacityCheck(connection, item, maLopHocMoi, `[Đã bổ sung học phí] Chuyển thành công sang lớp mã #${maLopHocMoi}`);
                    
                    if (!actResult.isOverflow) {
                      if (item.MaLopHoc) {
                        await connection.query('UPDATE lophoc SET SiSoHienTai = GREATEST(0, SiSoHienTai - 1) WHERE MaLopHoc = ?', [item.MaLopHoc]);
                      }
                      await connection.query('UPDATE lophoc SET SiSoHienTai = SiSoHienTai + 1 WHERE MaLopHoc = ?', [maLopHocMoi]);
                    }
                  } else {
                    await PaymentWebhookController.activateRegistrationWithCapacityCheck(connection, item);
                  }
                } else {
                  await PaymentWebhookController.activateRegistrationWithCapacityCheck(connection, item);
                }
                matchedIds.push(item.MaDangKy);
              }
              await connection.commit();
            } catch (txErr) {
              await connection.rollback();
              // [FIX 3]: Log lỗi và tiếp tục, không ném exception làm văng luồng chạy
              console.error(`[PAYMENT SYNC] Lỗi cập nhật CSDL ở Phương pháp 2:`, txErr);
              continue;
            } finally {
              connection.release();
            }
            
            try {
              await notifyAdminPaymentSuccess(matchedIds, { soTien: amount, noiDungChuyenKhoan: content });
              const [hvRows] = await pool.query('SELECT DISTINCT MaHocVien FROM dangkyhoc WHERE MaDangKy IN (?)', [matchedIds]);
              for (const hv of hvRows) { await updateStudentProficiencyLevel(hv.MaHocVien); }
            } catch (mailErr) {
              console.error('[PAYMENT SYNC] Mail/level error:', mailErr);
            }

            matchedCount += matchedIds.length;
            matched = true;
            break;
          }
        }
      }

      // === Phương pháp 3: Khớp thông minh dự phòng theo Số tiền chính xác ===
      if (!matched) {
        const groupsByUser = {};
        for (const pending of pendingTxs) {
          if (pending.NgayDangKy) {
            const regTime = new Date(pending.NgayDangKy).getTime();
            const txTime = txDate.getTime();
            if (txTime < regTime - 60000) {
              continue; 
            }
          }

          const uId = pending.MaNguoiDangKy || 'default';
          if (!groupsByUser[uId]) {
            groupsByUser[uId] = { items: [], totalAmount: 0 };
          }
          groupsByUser[uId].items.push(pending);
          groupsByUser[uId].totalAmount += Number(pending.SoTien);
        }

        for (const uId in groupsByUser) {
          const group = groupsByUser[uId];
          const isUserTotalMatch = Math.abs(amount - group.totalAmount) < 10;
          if (isUserTotalMatch && group.items.length > 0) {
            console.log(`[PAYMENT SYNC] ✅ Fallback user total amount match found for User#${uId} (Amount: ${amount}đ)`);
            const matchedIds = [];
            const connection = await pool.getConnection();
            try {
              await connection.beginTransaction();
              for (const item of group.items) {
                if (item.MaGiaoDich) {
                  await connection.query(`UPDATE giaodich SET TrangThai = 'Thành công', NoiDungChuyenKhoan = ? WHERE MaGiaoDich = ?`, [content, item.MaGiaoDich]);
                } else {
                  await connection.query(
                    `INSERT INTO giaodich (MaDangKy, SoTien, NoiDungChuyenKhoan, TrangThai, NgayGiaoDich) VALUES (?, ?, ?, 'Thành công', NOW())`,
                    [item.MaDangKy, item.SoTien || amount, content]
                  );
                }
                
                // [FIX 1]: Sửa logic update sĩ số tương tự Phương pháp 2
                if (item.GhiChu && item.GhiChu.includes('Mã #')) {
                  const match = item.GhiChu.match(/Mã\s*#(\d+)/i);
                  if (match) {
                    const maLopHocMoi = match[1];
                    const actResult = await PaymentWebhookController.activateRegistrationWithCapacityCheck(connection, item, maLopHocMoi, `[Đã bổ sung học phí] Chuyển thành công sang lớp mã #${maLopHocMoi}`);
                    
                    if (!actResult.isOverflow) {
                      if (item.MaLopHoc) {
                        await connection.query('UPDATE lophoc SET SiSoHienTai = GREATEST(0, SiSoHienTai - 1) WHERE MaLopHoc = ?', [item.MaLopHoc]);
                      }
                      await connection.query('UPDATE lophoc SET SiSoHienTai = SiSoHienTai + 1 WHERE MaLopHoc = ?', [maLopHocMoi]);
                    }
                  } else {
                    await PaymentWebhookController.activateRegistrationWithCapacityCheck(connection, item);
                  }
                } else {
                  await PaymentWebhookController.activateRegistrationWithCapacityCheck(connection, item);
                }
                matchedIds.push(item.MaDangKy);
              }
              await connection.commit();
            } catch (txErr) {
              await connection.rollback();
              // [FIX 3]: Log lỗi và tiếp tục
              console.error(`[PAYMENT SYNC] Lỗi cập nhật CSDL ở Phương pháp 3:`, txErr);
              continue;
            } finally {
              connection.release();
            }

            try {
              await notifyAdminPaymentSuccess(matchedIds, { soTien: amount, noiDungChuyenKhoan: content });
              const [hvRows] = await pool.query('SELECT DISTINCT MaHocVien FROM dangkyhoc WHERE MaDangKy IN (?)', [matchedIds]);
              for (const hv of hvRows) { await updateStudentProficiencyLevel(hv.MaHocVien); }
            } catch (mailErr) {
              console.error('[PAYMENT SYNC] Mail/level error:', mailErr);
            }

            matchedCount += matchedIds.length;
            matched = true;
            break;
          }
        }
      }
    }
    return matchedCount;
  }

  static async syncWithSepayApi() {
    try {
      const apiKey = process.env.SEPAY_API_KEY;
      if (!apiKey) return;
      
      const response = await fetch('https://my.sepay.vn/userapi/transactions/list', {
        headers: { 'Authorization': 'Bearer ' + apiKey }
      });
      const data = await response.json();
      if (data && data.transactions && Array.isArray(data.transactions)) {
        const transactions = data.transactions.map(tx => ({
          content: tx.transaction_content || '',
          amount: parseFloat(tx.amount_in || 0),
          date: tx.transaction_date || new Date().toISOString(),
          referenceCode: tx.reference_number || ''
        })).filter(tx => tx.amount > 0);

        await PaymentWebhookController.processTransactions(transactions);
      }
    } catch (err) {
      console.error('[SEPAY API SYNC ERROR]:', err);
    }
  }

  /**
   * API kiểm tra trạng thái thanh toán (polling từ client)
   * GET /api/payment-status/:maDangKy
   */
  static async checkPaymentStatus(req, res) {
    try {
      const { maDangKy } = req.params;
      const user = req.session.user;

      if (!user) {
        return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      }

      const [profiles] = await pool.query('SELECT MaHocVien FROM hosohocvien WHERE MaNguoiDung = ?', [user.MaNguoiDung]);
      const studentIds = profiles.map(p => p.MaHocVien);
      if (studentIds.length === 0) {
        studentIds.push(0);
      }

      const rawIds = String(maDangKy || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
      if (rawIds.length === 0) {
        return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
      }

      let [rows] = await pool.query(
        `SELECT dk.MaDangKy, dk.TrangThai AS dkStatus, gd.TrangThai AS gdStatus
         FROM dangkyhoc dk
         LEFT JOIN giaodich gd ON gd.MaDangKy = dk.MaDangKy
         WHERE dk.MaDangKy IN (?) AND (dk.MaNguoiDangKy = ? OR dk.MaHocVien IN (?))
         ORDER BY gd.NgayGiaoDich DESC`,
        [rawIds, user.MaNguoiDung, studentIds]
      );

      let isPaid = rows.length > 0 && rows.some(r => r.dkStatus === 'Đang học' || r.dkStatus === 'Thành công' || r.dkStatus === 'Đã thanh toán' || r.gdStatus === 'Thành công');

      // [FIX 2]: XÓA BỎ đoạn code chủ động gọi syncWithSepayApi() liên tục mỗi khi client check.
      // Dữ liệu thanh toán nên phụ thuộc hoàn toàn vào Webhook tự động bắn về handleWebhook().
      // Tránh việc bị SePay block API vì rate-limit và tránh sập server Database của chính bạn.

      const isFailed = rows.length > 0 && rows.every(r => r.dkStatus === 'Đã hủy' || r.gdStatus === 'Thất bại');

      res.json({
        success: true,
        isPaid,
        isFailed,
        registrationStatus: rows.length > 0 ? rows[0].dkStatus : null,
        transactionStatus: rows.length > 0 ? rows[0].gdStatus : null
      });

    } catch (err) {
      console.error('[PAYMENT STATUS] Error:', err);
      res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
  }
}

module.exports = PaymentWebhookController;