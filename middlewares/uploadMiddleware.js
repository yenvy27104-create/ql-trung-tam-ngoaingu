/**
 * ============================================================================
 * MIDDLEWARE XỬ LÝ UPLOAD TỆP TIN (MULTER UPLOAD MIDDLEWARE)
 * ============================================================================
 * Cấu hình Multer để tải tệp tin (hình ảnh, tài liệu) lên thư mục public/uploads/
 * - Tự động tạo tên file duy nhất tránh trùng lặp.
 * - Kiểm tra định dạng file ảnh (PNG, JPG, JPEG,...).
 * - Giới hạn kích thước tệp tối đa 5MB.
 */

const multer = require('multer');
const path = require('path');

// Cấu hình nơi lưu trữ và cách đặt tên file tải lên
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Bộ lọc tệp tin (chỉ cho phép tải lên file hình ảnh)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Giới hạn kích thước tệp tối đa 5MB
});

module.exports = upload;
