/**
 * ============================================================================
 * BỘ ĐIỀU KHIỂN GIỎ HÀNG (CART CONTROLLER)
 * ============================================================================
 * Đảm nhận các tính năng đăng ký khóa học qua giỏ hàng (Cart Session):
 * - Hiển thị danh sách các khóa học đã chọn trong giỏ hàng.
 * - Thêm mới/Xóa lớp học khỏi giỏ hàng.
 * - Áp dụng mã giảm giá (Voucher Khuyến mãi).
 * - Xử lý Thanh toán/Ghi danh (Checkout) đồng thời tạo đăng ký học cho từng học viên.
 */

const pool = require('../models/db');
const ClassController = require('./classController');
const { isClassEnrollable } = require('../utils/classStatus');

function getCourseScoreInfo(capDo, tenKhoaHoc) {
  const text = `${capDo || ''} ${tenKhoaHoc || ''}`.toLowerCase();

  if (text.includes('foundation') || text.includes('pre-toeic') || text.includes('mất gốc') || text.includes('cơ bản 1') || text.includes('0-250') || text.includes('0 - 250')) {
    return {
      levelName: 'Foundation (Pre-TOEIC)',
      minInputScore: 0,
      maxInputScore: 250,
      targetOutputScore: 350,
      levelRank: 1
    };
  }
  if (text.includes('450') || text.includes('toeic a') || text.includes('sơ cấp')) {
    return {
      levelName: 'TOEIC 450+',
      minInputScore: 300,
      maxInputScore: 350,
      targetOutputScore: 500,
      levelRank: 2
    };
  }
  if (text.includes('650') || text.includes('toeic b') || text.includes('trung cấp')) {
    return {
      levelName: 'TOEIC 650+',
      minInputScore: 450,
      maxInputScore: 500,
      targetOutputScore: 650,
      levelRank: 3
    };
  }
  if (text.includes('850') || text.includes('750') || text.includes('toeic c') || text.includes('nâng cao')) {
    return {
      levelName: 'TOEIC 850+',
      minInputScore: 550,
      maxInputScore: 650,
      targetOutputScore: 850,
      levelRank: 4
    };
  }
  if (text.includes('cấp tốc') || text.includes('intensive') || text.includes('luyện đề') || text.includes('mastery')) {
    return {
      levelName: 'Luyện đề / Cấp tốc (Mastery)',
      minInputScore: 550,
      maxInputScore: 650,
      targetOutputScore: 850,
      levelRank: 4
    };
  }

  return {
    levelName: capDo || tenKhoaHoc || 'Khóa học',
    minInputScore: 0,
    maxInputScore: 0,
    targetOutputScore: 990,
    levelRank: 1
  };
}

function calculateEstimatedEndDate(startDateStr, thoiLuong) {
  if (!startDateStr) return new Date('2099-12-31');
  const startDate = new Date(startDateStr);
  if (isNaN(startDate.getTime())) return new Date('2099-12-31');

  const sessions = Number(thoiLuong || 24);
  const daysNeeded = Math.ceil(sessions / 3) * 7;
  return new Date(startDate.getTime() + daysNeeded * 24 * 60 * 60 * 1000);
}

function validateMultiCourseProgression(classList, studentName) {
  if (!classList || classList.length < 2) return null;

  const sorted = [...classList].sort((a, b) => {
    const infoA = getCourseScoreInfo(a.CapDo, a.TenKhoaHoc);
    const infoB = getCourseScoreInfo(b.CapDo, b.TenKhoaHoc);
    if (infoA.levelRank !== infoB.levelRank) {
      return infoA.levelRank - infoB.levelRank;
    }

    const dateA = a.NgayKhaiGiang ? new Date(a.NgayKhaiGiang).getTime() : 0;
    const dateB = b.NgayKhaiGiang ? new Date(b.NgayKhaiGiang).getTime() : 0;
    return dateA - dateB;
  });

  for (let i = 0; i < sorted.length - 1; i++) {
    const itemPrev = sorted[i];
    const itemNext = sorted[i + 1];

    const infoPrev = getCourseScoreInfo(itemPrev.CapDo, itemPrev.TenKhoaHoc);
    const infoNext = getCourseScoreInfo(itemNext.CapDo, itemNext.TenKhoaHoc);

    // 1. Kiểm tra Chuẩn điểm đầu ra khóa trước >= Điểm đầu vào khóa sau
    if (infoNext.levelRank > infoPrev.levelRank) {
      if (infoPrev.targetOutputScore < infoNext.minInputScore) {
        return `Không thể đăng ký: Lộ trình của học viên ${studentName} khi đăng ký lớp "${itemNext.TenKhoaHoc}" (${infoNext.levelName}) yêu cầu chuẩn điểm đầu vào từ ${infoNext.minInputScore} điểm. Tuy nhiên, khóa học trước đó bạn chọn ("${itemPrev.TenKhoaHoc}") chỉ đạt chuẩn đầu ra ${infoPrev.targetOutputScore} điểm (chưa đạt mốc ${infoNext.minInputScore} điểm). Vui lòng đăng ký bổ sung khóa học trung gian phù hợp!`;
      }
    }

    // 2. Tính thời gian hoàn thành khóa trước và tự động chuyển khóa sau thành Đăng ký sớm (không học song song)
    const dateStartNext = itemNext.NgayKhaiGiang ? new Date(itemNext.NgayKhaiGiang) : null;
    const dateEndPrev = itemPrev.NgayKetThuc ? new Date(itemPrev.NgayKetThuc) : calculateEstimatedEndDate(itemPrev.NgayKhaiGiang, itemPrev.ThoiLuong);

    if (dateStartNext && dateStartNext <= dateEndPrev) {
      itemNext.autoCheckFutureShift = true;
      itemNext.isPendingFutureShift = true;
      itemNext.sequentialNotice = `[Đăng ký sớm] Học viên ${studentName} sẽ hoàn thành khóa "${itemPrev.TenLop || itemPrev.TenKhoaHoc}" (dự kiến kết thúc ngày ${dateEndPrev.toLocaleDateString('vi-VN')}) trước khi chính thức xếp ca học lớp "${itemNext.TenLop || itemNext.TenKhoaHoc}".`;
    }
  }

  return null;
}

class CartController {
  static async getCart(req, res) {
    try {
      const cart = req.session.cart || [];
      const user = req.session.user;
      let profiles = [];
      if (user) {
        const [pRows] = await pool.query('SELECT * FROM hosohocvien WHERE MaNguoiDung = ? ORDER BY MaHocVien ASC', [user.MaNguoiDung]);
        profiles = pRows;
      }
      const [promotions] = await pool.query(
        'SELECT * FROM khuyenmai WHERE NOW() >= NgayBatDau AND DATE(NOW()) <= DATE(NgayKetThuc)'
      );

      // Auto detect schedule conflicts between cart items for the user
      const cartWithConflicts = JSON.parse(JSON.stringify(cart));
      const conflictPairs = new Set();

      for (let i = 0; i < cartWithConflicts.length; i++) {
        const itemA = cartWithConflicts[i];
        if (!('conflictNotice' in itemA)) itemA.conflictNotice = null;
        if (!('autoCheckFutureShift' in itemA)) itemA.autoCheckFutureShift = false;

        for (let j = 0; j < cartWithConflicts.length; j++) {
          if (i === j) continue;
          const itemB = cartWithConflicts[j];
          const conflict = await ClassController.checkTwoClassesScheduleConflict(itemA.MaLopHoc, itemB.MaLopHoc);
          if (conflict) {
            itemA.conflictNotice = {
              withClassName: conflict.className2 === itemA.TenLop ? conflict.className1 : conflict.className2,
              detail: `${conflict.day}, ${conflict.time}`
            };

            const pairKey = [Math.min(i, j), Math.max(i, j)].join('_');
            if (!conflictPairs.has(pairKey)) {
              conflictPairs.add(pairKey);
              const lvlA = (itemA.CapDo || '').toLowerCase() + (itemA.TenKhoaHoc || '').toLowerCase();
              const isEntryA = lvlA.includes('foundation') || lvlA.includes('pre') || lvlA.includes('cơ bản');

              if (isEntryA) {
                itemB.autoCheckFutureShift = true;
              } else {
                itemA.autoCheckFutureShift = true;
              }
            }
            break;
          }
        }
      }

      res.render('student/cart', {
        cart: cartWithConflicts,
        promotions,
        profiles,
        user: req.session.user || null,
        error: req.query.error || null,
        success: req.query.success || null
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Lỗi hệ thống khi tải giỏ hàng');
    }
  }

  static async addToCart(req, res) {
    try {
      const MaLopHoc = req.body.MaLopHoc || req.body.classId;
      if (!MaLopHoc) {
        return res.status(400).json({ success: false, message: 'Thiếu MaLopHoc' });
      }

      // Initialize cart in session if not exists
      if (!req.session.cart) {
        req.session.cart = [];
      }

      // Check if user is logged in
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ success: false, requireLogin: true, message: 'Vui lòng đăng nhập để thêm lớp học vào giỏ hàng.' });
      }

      if (user && user.isGoogleGuest) {
        return res.status(403).json({ success: false, message: 'Tài khoản Google chưa đăng ký thông tin cá nhân. Vui lòng đăng ký tài khoản đầy đủ trước khi đăng ký lớp học.' });
      }

      // Check if user role is valid
      if (user.TenVaiTro !== 'Học viên' && user.TenVaiTro !== 'Admin') {
        return res.json({ success: false, message: 'Chỉ tài khoản Học viên mới có thể thêm lớp học vào giỏ hàng.' });
      }

      // Get user child profiles count
      const [userProfiles] = await pool.query('SELECT MaHocVien, HoTen, QuanHe FROM hosohocvien WHERE MaNguoiDung = ? ORDER BY MaHocVien ASC', [user.MaNguoiDung]);
      const itemsInCartCount = req.session.cart.filter(item => item.MaLopHoc == MaLopHoc).length;

      if (userProfiles.length <= 1) {
        if (itemsInCartCount >= 1) {
          return res.json({
            success: false,
            requireChildProfile: true,
            message: 'Tài khoản của bạn hiện mới có 1 Hồ sơ cá nhân. Để đăng ký thêm 1 suất học cho con thứ 2, vui lòng tạo thêm "Hồ sơ con/người thân" trong Quản lý hồ sơ.'
          });
        }
      } else {
        if (itemsInCartCount >= userProfiles.length) {
          return res.json({
            success: false,
            requireChildProfile: true,
            message: `Tài khoản của bạn có ${userProfiles.length} hồ sơ và bạn đã thêm đủ ${itemsInCartCount} suất học trong giỏ hàng. Vui lòng tạo thêm Hồ sơ con mới nếu muốn đăng ký thêm!`
          });
        }
      }

      // Fetch class details from DB
      const [rows] = await pool.query(
        `SELECT lh.*, kh.TenKhoaHoc, COALESCE(lh.HocPhi, kh.HocPhi) AS HocPhi, kh.ThoiLuong, kh.CapDo
         FROM lophoc lh
         JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc
         WHERE lh.MaLopHoc = ?`,
        [MaLopHoc]
      );

      if (rows.length === 0) {
        return res.json({ success: false, message: 'Không tìm thấy lớp học.' });
      }

      const classInfo = rows[0];

      if (classInfo.SiSoHienTai + itemsInCartCount >= classInfo.SiSoToiDa) {
        return res.json({
          success: false,
          message: `⚠️ Sức chứa lớp học không đủ: Lớp "${classInfo.TenLop}" hiện có Sĩ số tối đa là ${classInfo.SiSoToiDa} học viên (đã có ${classInfo.SiSoHienTai} học viên ghi danh và ${itemsInCartCount} suất trong giỏ hàng). Không thể thêm suất học nữa!`
        });
      }

      if (!isClassEnrollable(classInfo.TrangThaiLop)) {
        return res.json({ success: false, message: '🔒 Đã đóng đăng ký: Lớp học này đã bắt đầu giảng dạy hoặc đã kết thúc, không thể nhận thêm học viên mới. Bạn vui lòng tham khảo các lớp có trạng thái "Sắp mở" nhé.' });
      }

      // Check input condition confirmation for class registration if student hasn't confirmed warning
      const isAlreadyInCart = itemsInCartCount > 0;
      const confirmedInputWarning = req.body.confirmedInputWarning || req.body.acceptedInputWarning || isAlreadyInCart;

      if (!confirmedInputWarning) {
        return res.json({
          success: false,
          requireInputWarning: true,
          message: `Hệ thống ghi nhận học viên chưa làm Bài Test đầu vào hoặc chưa học Khóa học tiền đề (Pre-TOEIC / Cơ bản) trước khi đăng ký lớp "${classInfo.TenLop}".`,
          className: classInfo.TenLop,
          courseName: classInfo.TenKhoaHoc,
          warningMessage: `Hệ thống ghi nhận học viên chưa làm Bài Test đầu vào hoặc chưa học Khóa học tiền đề (Pre-TOEIC / Cơ bản) trước khi đăng ký lớp "${classInfo.TenLop}".`,
          confirmCheckboxText: `Tôi xác nhận đã đọc kỹ yêu cầu đầu vào của lớp ${classInfo.TenLop} và tự chịu trách nhiệm về lựa chọn này.`
        });
      }

      // Check capacity limit
      const [cntRow] = await pool.query(
        "SELECT COUNT(*) AS Count FROM dangkyhoc WHERE MaLopHoc = ? AND TrangThai IN ('Thành công', 'Đang học')",
        [MaLopHoc]
      );
      const actualCount = cntRow[0].Count;

      // Phụ huynh có thể đăng ký nhiều lớp khác cấp độ cho các con/người thân khác nhau
      // Không chặn kiểm tra lộ trình đơn lẻ khi thêm vào giỏ hàng

      // Assign unique cartItemId
      const cartItemId = `${MaLopHoc}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const classItem = { ...classInfo, cartItemId: cartItemId };

      // Add to session cart
      req.session.cart.push(classItem);

      return res.json({
        success: true,
        message: 'Đã thêm lớp học vào giỏ hàng.',
        cartCount: req.session.cart.length
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
  }

  static async removeFromCart(req, res) {
    const { MaLopHoc, cartItemId } = req.body;
    if (!req.session.cart) {
      req.session.cart = [];
    }

    if (cartItemId) {
      req.session.cart = req.session.cart.filter(item => (item.cartItemId || item.MaLopHoc) != cartItemId);
    } else if (MaLopHoc) {
      req.session.cart = req.session.cart.filter(item => item.MaLopHoc != MaLopHoc);
    }

    // Also delete pending/unpaid registrations in dangkyhoc table for this class & student
    if (req.session.user && MaLopHoc) {
      try {
        const [profiles] = await pool.query('SELECT MaHocVien FROM hosohocvien WHERE MaNguoiDung = ?', [req.session.user.MaNguoiDung]);
        if (profiles.length > 0) {
          const hocVienIds = profiles.map(p => p.MaHocVien);
          await pool.query(
            'DELETE FROM dangkyhoc WHERE MaLopHoc = ? AND MaHocVien IN (?) AND TrangThai NOT IN ("Thành công", "Đang học", "Hoàn thành")',
            [MaLopHoc, hocVienIds]
          );
        }
      } catch (err) {
        console.error('Error syncing cart removal with dangkyhoc:', err);
      }
    }

    return res.json({
      success: true,
      message: 'Đã xóa lớp học khỏi giỏ hàng.',
      cartCount: req.session.cart.length
    });
  }

  static async checkout(req, res) {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để thanh toán.' });
      }

      if (user && user.isGoogleGuest) {
        return res.status(400).json({ success: false, requireRegister: true, message: 'Tài khoản Google chưa đăng ký thông tin cá nhân. Vui lòng đăng ký tài khoản đầy đủ trước khi đăng ký lớp học.' });
      }

      if (user.TenVaiTro !== 'Học viên') {
        return res.status(403).json({ success: false, message: 'Chỉ tài khoản Học viên mới có thể đăng ký học.' });
      }

      let cart = req.session.cart || [];
      const { selectedClassIds, promoCode, studentAssignments, pendingFutureShifts } = req.body;
      if (selectedClassIds && Array.isArray(selectedClassIds)) {
        const ids = selectedClassIds.map(Number);
        cart = cart.filter(item => ids.includes(Number(item.MaLopHoc)));
      }

      if (cart.length === 0) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất một lớp học để thanh toán.' });
      }

      // Get MaHocVien list for user
      const [userProfiles] = await pool.query('SELECT * FROM hosohocvien WHERE MaNguoiDung = ?', [user.MaNguoiDung]);
      if (userProfiles.length === 0) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ học viên.' });
      }
      const defaultMaHocVien = userProfiles[0].MaHocVien;

      // Check if student has a phone number
      const [userRows] = await pool.query('SELECT SoDienThoai FROM NguoiDung WHERE MaNguoiDung = ?', [user.MaNguoiDung]);
      if (userRows.length === 0 || !userRows[0].SoDienThoai || userRows[0].SoDienThoai.trim() === '') {
        return res.status(400).json({
          success: false,
          requirePhone: true,
          message: 'Vui lòng bổ sung Số điện thoại liên lạc trước khi đăng ký lớp học.'
        });
      }

      let promoId = null;
      let discountPct = 0;
      let promo = null;

      if (promoCode) {
        const [promoRows] = await pool.query(
          'SELECT * FROM khuyenmai WHERE MaCode = ? AND NOW() >= NgayBatDau AND DATE(NOW()) <= DATE(NgayKetThuc)',
          [promoCode.trim().toUpperCase()]
        );
        if (promoRows.length > 0) {
          promo = promoRows[0];
          promoId = promo.MaKhuyenMai;
          discountPct = parseFloat(promo.PhanTramGiam);
          
          if (promo.MaCode === 'FLASHSALE15') {
            const today = new Date();
            today.setHours(0,0,0,0);
            for (const item of cart) {
              const startDate = new Date(item.NgayKhaiGiang);
              startDate.setHours(0,0,0,0);
              const diffTime = startDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays < 10) {
                return res.status(400).json({
                  success: false,
                  message: `Mã FLASHSALE15 yêu cầu tất cả các lớp học phải khai giảng sau tối thiểu 10 ngày. Lớp "${item.TenLop || item.TenKhoaHoc}" khai giảng sau ${diffDays < 0 ? 0 : diffDays} ngày.`
                });
              }
            }
          }

          if (promo.MaCode === 'COMBO20') {
            if (cart.length < 2) {
              return res.status(400).json({
                success: false,
                message: 'Mã COMBO20 yêu cầu đăng ký từ 2 khóa học trở lên.'
              });
            }

            const today = new Date();
            today.setHours(0,0,0,0);
            for (const item of cart) {
              const startDate = new Date(item.NgayKhaiGiang);
              startDate.setHours(0,0,0,0);
              const diffTime = startDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays < 10) {
                return res.status(400).json({
                  success: false,
                  message: `Mã COMBO20 yêu cầu tất cả các lớp học phải khai giảng sau tối thiểu 10 ngày. Lớp "${item.TenLop || item.TenKhoaHoc}" khai giảng sau ${diffDays < 0 ? 0 : diffDays} ngày.`
                });
              }
            }
          }
        } else {
          return res.status(400).json({ success: false, message: 'Mã khuyến mãi không hợp lệ hoặc đã hết hạn.' });
        }
      }

       const registeredIds = [];
       const alreadyRegistered = [];
       let totalDiscountedAmount = 0;
       const assignedProfilesInCart = new Map();

       for (const item of cart) {
         // Determine target MaHocVien for this class item
         let targetMaHocVien = defaultMaHocVien;
         const itemKey = item.cartItemId || item.MaLopHoc;
         if (studentAssignments && (studentAssignments[itemKey] || studentAssignments[item.MaLopHoc])) {
           const assignedId = Number(studentAssignments[itemKey] || studentAssignments[item.MaLopHoc]);
           const match = userProfiles.find(p => p.MaHocVien === assignedId);
           if (match) targetMaHocVien = assignedId;
         }

         const targetProfile = userProfiles.find(p => p.MaHocVien === targetMaHocVien) || userProfiles[0];
         const studentName = targetProfile.HoTen || user.HoTen;

         // Check if same student profile is assign         const itemKey = item.cartItemId || item.MaLopHoc;
         const isPendingFutureShift = Boolean(pendingFutureShifts && (pendingFutureShifts[itemKey] || pendingFutureShifts[item.MaLopHoc]));

         if (!isPendingFutureShift) {
           // 1. Check schedule conflict for target student profile against existing DB classes
           const conflict = await ClassController.checkScheduleConflict(targetMaHocVien, item.MaLopHoc);
           if (conflict) {
             return res.status(400).json({
               success: false,
               message: `Không thể đăng ký: Lịch học lớp "${item.TenLop}" của học viên ${studentName} bị TRÙNG với lớp "${conflict.className}" (${conflict.day}, ${conflict.time}).`
             });
           }

           // 1b. Check schedule conflict between items IN THE CART assigned to the same student profile
           if (!assignedProfilesInCart.has(`classes_${targetMaHocVien}`)) {
             assignedProfilesInCart.set(`classes_${targetMaHocVien}`, []);
           }
           const cartClassList = assignedProfilesInCart.get(`classes_${targetMaHocVien}`);
           for (const prevCartItem of cartClassList) {
             const innerConflict = await ClassController.checkTwoClassesScheduleConflict(item.MaLopHoc, prevCartItem.MaLopHoc);
             if (innerConflict) {
               return res.status(400).json({
                 success: false,
                 message: `Không thể đăng ký: Lịch học 2 lớp trong giỏ hàng "${innerConflict.className1}" và "${innerConflict.className2}" của học viên ${studentName} bị TRÙNG NHAU (${innerConflict.day}, ${innerConflict.time}). Vui lòng chọn ca học khác hoặc tích chọn Đăng ký giữ chỗ đợt mới!`
               });
             }
           }
            cartClassList.push(item);

            // 1c. Check multi-course progression (output score of earlier course >= input score of next course)
            const progressionError = validateMultiCourseProgression(cartClassList, studentName);
            if (progressionError) {
              return res.status(400).json({
                success: false,
                message: progressionError
              });
            }
          }

         // 2. Check class status and capacity limit
         const [clsRow] = await pool.query('SELECT SiSoToiDa, TrangThaiLop, TenLop FROM lophoc WHERE MaLopHoc = ?', [item.MaLopHoc]);
         const cls = clsRow[0];

         if (!cls || !isClassEnrollable(cls.TrangThaiLop)) {
           return res.status(400).json({
             success: false,
             message: `Lớp "${item.TenLop}" đã khai giảng hoặc đang diễn ra, không thể đăng ký thêm.`
           });
         }

         const [cntRow] = await pool.query(
           "SELECT COUNT(*) AS Count FROM dangkyhoc WHERE MaLopHoc = ? AND TrangThai IN ('Thành công', 'Đang học')",
           [item.MaLopHoc]
         );
         const actualCount = cntRow[0].Count;
         if (cls && actualCount >= cls.SiSoToiDa) {
           return res.status(400).json({ success: false, message: `Lớp học "${item.TenLop}" đã đạt sĩ số tối đa, không thể đăng ký thêm.` });
         }

        // Calculate discount for this item
        let itemDiscountPct = 0;
        let itemPromoId = null;
        if (promo) {
          if (promo.MaCode === 'FLASHSALE15') {
            const today = new Date();
            today.setHours(0,0,0,0);
            const startDate = new Date(item.NgayKhaiGiang);
            startDate.setHours(0,0,0,0);
            const diffTime = startDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays >= 10) {
              itemDiscountPct = discountPct;
              itemPromoId = promoId;
            }
          } else {
            itemDiscountPct = discountPct;
            itemPromoId = promoId;
          }
        }

        const baseFee = parseFloat(item.HocPhi);
        const finalFee = baseFee - (baseFee * itemDiscountPct / 100);

        // Check if student is already registered for this class
        const [existing] = await pool.query(
          'SELECT * FROM dangkyhoc WHERE MaHocVien = ? AND MaLopHoc = ?',
          [targetMaHocVien, item.MaLopHoc]
        );

        // Tự động gán trạng thái Đăng ký sớm (Chờ xếp ca đợt sau) nếu khóa học nối tiếp khóa trước
        const isFutureShift = item.isPendingFutureShift || item.autoCheckFutureShift || Boolean(pendingFutureShifts && (pendingFutureShifts[itemKey] || pendingFutureShifts[item.MaLopHoc]));
        const initialStatus = isFutureShift ? 'Chờ xếp ca đợt sau' : 'Chờ thanh toán';
        const initialNote = isFutureShift ? (item.sequentialNotice || '[Đăng ký sớm] Học viên chờ hoàn thành khóa học trước') : null;

        if (existing.length > 0) {
          const ex = existing[0];
          if (ex.TrangThai === 'Đang học' || ex.TrangThai === 'Thành công') {
            alreadyRegistered.push(`${item.TenLop} (${studentName})`);
            continue;
          } else if (ex.TrangThai === 'Chờ thanh toán' || ex.TrangThai === 'Chờ duyệt' || ex.TrangThai === 'Chờ xếp ca đợt sau') {
            await pool.query(
              `UPDATE dangkyhoc SET TrangThai = ?, HocPhiDaGiam = ?, MaKhuyenMai = ?, GhiChu = ?, NgayDangKy = NOW() WHERE MaDangKy = ?`,
              [initialStatus, finalFee, itemPromoId, initialNote || ex.GhiChu, ex.MaDangKy]
            );
            registeredIds.push(ex.MaDangKy);
            totalDiscountedAmount += finalFee;
            continue;
          } else if (ex.TrangThai === 'Đã hủy' || ex.TrangThai === 'Thất bại') {
            await pool.query(
              `UPDATE dangkyhoc SET TrangThai = ?, HocPhiDaGiam = ?, MaKhuyenMai = ?, GhiChu = ?, NgayDangKy = NOW() WHERE MaDangKy = ?`,
              [initialStatus, finalFee, itemPromoId, initialNote, ex.MaDangKy]
            );
            registeredIds.push(ex.MaDangKy);
            totalDiscountedAmount += finalFee;
            continue;
          }
        }

        totalDiscountedAmount += finalFee;

        // Insert new registration
        const [result] = await pool.query(
          `INSERT INTO dangkyhoc (MaHocVien, MaLopHoc, MaNguoiDangKy, MaKhuyenMai, HocPhiDaGiam, TrangThai, GhiChu, NgayDangKy)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [targetMaHocVien, item.MaLopHoc, user.MaNguoiDung, itemPromoId, finalFee, initialStatus, initialNote]
        );
        registeredIds.push(result.insertId);
      }

      // Remove successfully processed classes from session cart
      const processedClassIds = cart.map(item => Number(item.MaLopHoc));
      req.session.cart = (req.session.cart || []).filter(item => !processedClassIds.includes(Number(item.MaLopHoc)));

      // Nếu tất cả các lớp được chọn đã được đăng ký và thanh toán từ trước (Trạng thái 'Đang học')
      if (registeredIds.length === 0 && alreadyRegistered.length > 0) {
        return res.json({
          success: true,
          alreadyEnrolled: true,
          message: `Lớp ${alreadyRegistered.join(', ')} đã được bạn đăng ký và thanh toán thành công từ trước. Hệ thống đang chuyển đến trang Lớp học của bạn!`,
          redirect: '/classes/my-classes'
        });
      }

      let message = 'Tạo đơn đăng ký lớp học thành công!';
      if (alreadyRegistered.length > 0) {
        message += ` (Lưu ý: Lớp ${alreadyRegistered.join(', ')} đã được thanh toán từ trước).`;
      }

      return res.json({
        success: true,
        message,
        registeredIds,
        discountedAmount: totalDiscountedAmount,
        redirect: '/classes/my-classes?tab=overview'
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi thanh toán giỏ hàng.' });
    }
  }

  static async validatePromo(req, res) {
    try {
      const { promoCode } = req.body;
      if (!promoCode) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập mã khuyến mãi.' });
      }

      const [rows] = await pool.query(
        'SELECT * FROM khuyenmai WHERE MaCode = ? AND NOW() BETWEEN NgayBatDau AND NgayKetThuc',
        [promoCode.trim().toUpperCase()]
      );

      if (rows.length === 0) {
        return res.json({ success: false, message: 'Mã khuyến mãi không tồn tại hoặc đã hết hạn.' });
      }

      const promo = rows[0];
      let cart = req.session.cart || [];
      const { selectedClassIds } = req.body;
      if (selectedClassIds && Array.isArray(selectedClassIds)) {
        const ids = selectedClassIds.map(Number);
        cart = cart.filter(item => ids.includes(Number(item.MaLopHoc)));
      }
      if (cart.length === 0) {
        return res.json({ success: false, message: 'Vui lòng chọn lớp học trước khi áp dụng mã.' });
      }

      let discountAmount = 0;
      const discountPct = parseFloat(promo.PhanTramGiam);

      if (promo.MaCode === 'FLASHSALE15') {
        const today = new Date();
        today.setHours(0,0,0,0);
        for (const item of cart) {
          const startDate = new Date(item.NgayKhaiGiang);
          startDate.setHours(0,0,0,0);
          const diffTime = startDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays < 10) {
            return res.json({
              success: false,
              message: `Mã FLASHSALE15 yêu cầu tất cả các lớp trong giỏ hàng phải khai giảng sau tối thiểu 10 ngày. Lớp "${item.TenLop || item.TenKhoaHoc}" khai giảng sau ${diffDays < 0 ? 0 : diffDays} ngày.`
            });
          }
          discountAmount += Math.round(parseFloat(item.HocPhi) * (discountPct / 100));
        }
      } else if (promo.MaCode === 'COMBO20') {
        if (cart.length < 2) {
          return res.json({
            success: false,
            message: 'Mã COMBO20 yêu cầu thanh toán đăng ký từ 2 lớp/khóa học trở lên.'
          });
        }
        const today = new Date();
        today.setHours(0,0,0,0);
        for (const item of cart) {
          const startDate = new Date(item.NgayKhaiGiang);
          startDate.setHours(0,0,0,0);
          const diffTime = startDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays < 10) {
            return res.json({
              success: false,
              message: `Mã COMBO20 yêu cầu tất cả các lớp trong giỏ hàng phải khai giảng sau tối thiểu 10 ngày. Lớp "${item.TenLop || item.TenKhoaHoc}" khai giảng sau ${diffDays < 0 ? 0 : diffDays} ngày.`
            });
          }
          discountAmount += Math.round(parseFloat(item.HocPhi) * (discountPct / 100));
        }
      } else {
        for (const item of cart) {
          discountAmount += Math.round(parseFloat(item.HocPhi) * (discountPct / 100));
        }
      }

      return res.json({
        success: true,
        promoId: promo.MaKhuyenMai,
        percent: discountPct,
        tenKhuyenMai: promo.TenKhuyenMai,
        discountAmount: discountAmount
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi kiểm tra mã khuyến mãi.' });
    }
  }
}

module.exports = CartController;
