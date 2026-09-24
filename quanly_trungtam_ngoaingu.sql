USE `ql-trung-tam`;

-- Tắt kiểm tra khóa ngoại để tránh lỗi Error 1452 khi Drop/Create Table
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------
-- Table structure for table `baithi`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `baithi`;
CREATE TABLE IF NOT EXISTS `baithi` (
  `MaDeThi` int NOT NULL AUTO_INCREMENT,
  `TenDeThi` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ThoiGianLamBai` int NOT NULL COMMENT 'Đơn vị: phút',
  `LoaiDe` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Đầu vào | Luyện tập tự do | Mẫu / Miễn phí',
  `DuongDanFileJSON` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `TrangThai` tinyint DEFAULT '1' COMMENT '1: Hiển thị | 0: Ẩn',
  PRIMARY KEY (`MaDeThi`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `baithi` (`MaDeThi`, `TenDeThi`, `ThoiGianLamBai`, `LoaiDe`, `DuongDanFileJSON`, `TrangThai`) VALUES
(6, 'TOEIC Test 1', 120, 'Mẫu / Miễn phí', 'json/toeic_test_1.json', 1),
(7, 'TOEIC Test 2', 120, 'Mẫu / Miễn phí', 'json/toeic_test_2.json', 1),
(8, 'TOEIC Test 3', 120, 'Mẫu / Miễn phí', 'json/toeic_test_3.json', 1),
(9, 'TOEIC Test 4', 120, 'Luyện đề chính thức', 'json/toeic_test_4.json', 1),
(19, 'TOEIC Test 5', 120, 'Luyện đề chính thức', 'json/toeic_test_5.json', 1),
(20, 'Đề Test Đầu Vào (200 Câu)', 120, 'Đầu vào', 'json/toeic_test_6.json', 1);

-- --------------------------------------------------------
-- Table structure for table `buoihoc`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `buoihoc`;
CREATE TABLE IF NOT EXISTS `buoihoc` (
  `MaBuoiHoc` int NOT NULL AUTO_INCREMENT,
  `TenBuoi` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `GioBatDau` time NOT NULL,
  `GioKetThuc` time NOT NULL,
  PRIMARY KEY (`MaBuoiHoc`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `buoihoc` (`MaBuoiHoc`, `TenBuoi`, `GioBatDau`, `GioKetThuc`) VALUES
(1, 'Ca sáng 1', '07:30:00', '09:00:00'),
(2, 'Ca sáng 2', '09:30:00', '11:00:00'),
(3, 'Ca chiều 1', '13:30:00', '15:00:00'),
(4, 'Ca chiều 2', '15:30:00', '17:00:00'),
(5, 'Ca tối 1', '17:45:00', '19:15:00'),
(6, 'Ca tối 2', '19:30:00', '21:00:00'),
(7, 'Sáng cuối tuần (T7 & CN)', '08:00:00', '10:15:00'),
(8, 'Chiều cuối tuần (T7 & CN)', '14:00:00', '16:15:00'),
(15, 'Ca sáng 1', '07:30:00', '09:00:00');

-- --------------------------------------------------------
-- Table structure for table `dangkyhoc`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `dangkyhoc`;
CREATE TABLE IF NOT EXISTS `dangkyhoc` (
  `MaDangKy` int NOT NULL AUTO_INCREMENT,
  `MaHocVien` int NOT NULL,
  `MaLopHoc` int NOT NULL,
  `MaNguoiDangKy` int NOT NULL COMMENT 'Hỗ trợ đăng ký hộ',
  `MaKhuyenMai` int DEFAULT NULL,
  `HocPhiDaGiam` decimal(10,2) NOT NULL,
  `NgayDangKy` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `TrangThai` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Chờ thanh toán',
  `GhiChu` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`MaDangKy`),
  UNIQUE KEY `uq_dk_hv_lop` (`MaHocVien`,`MaLopHoc`),
  KEY `fk_dk_ndk` (`MaNguoiDangKy`),
  KEY `fk_dk_km` (`MaKhuyenMai`),
  KEY `idx_dk_hocvien` (`MaHocVien`),
  KEY `idx_dk_lophoc` (`MaLopHoc`),
  KEY `idx_dk_trangthai` (`TrangThai`)
) ENGINE=InnoDB AUTO_INCREMENT=326 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `dangkyhoc` (`MaDangKy`, `MaHocVien`, `MaLopHoc`, `MaNguoiDangKy`, `MaKhuyenMai`, `HocPhiDaGiam`, `NgayDangKy`, `TrangThai`, `GhiChu`) VALUES
(303, 110, 2, 97, NULL, 1000.00, '2026-08-14 09:00:00', 'Đang học', NULL),
(312, 111, 2, 98, NULL, 1000.00, '2026-08-14 09:00:00', 'Đang học', NULL),
(313, 111, 3, 98, NULL, 1000.00, '2026-08-18 09:00:00', 'Đang học', 'Đăng ký giữ chỗ đợt sớm (Chờ hoàn thành Khóa A)'),
(314, 111, 4, 98, NULL, 1000.00, '2026-08-18 09:00:00', 'Đang học', 'Đăng ký giữ chỗ đợt sớm (Chờ hoàn thành Khóa A)');

-- --------------------------------------------------------
-- Table structure for table `diemdanh`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `diemdanh`;
CREATE TABLE IF NOT EXISTS `diemdanh` (
  `MaDiemDanh` int NOT NULL AUTO_INCREMENT,
  `MaHocVien` int NOT NULL,
  `MaLopHoc` int NOT NULL,
  `NgayHoc` date NOT NULL,
  `TrangThai` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`MaDiemDanh`),
  UNIQUE KEY `uq_dd_hv_lh_ngay` (`MaHocVien`,`MaLopHoc`,`NgayHoc`),
  KEY `idx_dd_hocvien` (`MaHocVien`),
  KEY `idx_dd_lophoc` (`MaLopHoc`)
) ENGINE=InnoDB AUTO_INCREMENT=1207 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `diemdanh` (`MaDiemDanh`, `MaHocVien`, `MaLopHoc`, `NgayHoc`, `TrangThai`) VALUES
(382, 111, 4, '2026-08-19', 'Có mặt'),
(1203, 111, 2, '2026-08-15', 'Có mặt'),
(1204, 111, 2, '2026-08-18', 'Có mặt'),
(1205, 110, 2, '2026-08-15', 'Vắng mặt'),
(1206, 110, 2, '2026-08-18', 'Vắng mặt');

-- --------------------------------------------------------
-- Table structure for table `giaodich`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `giaodich`;
CREATE TABLE IF NOT EXISTS `giaodich` (
  `MaGiaoDich` int NOT NULL AUTO_INCREMENT,
  `MaDangKy` int NOT NULL,
  `SoTien` decimal(10,2) NOT NULL,
  `NgayGiaoDich` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `NoiDungChuyenKhoan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `TrangThai` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`MaGiaoDich`),
  KEY `idx_gd_dangky` (`MaDangKy`),
  KEY `idx_gd_trangthai` (`TrangThai`)
) ENGINE=InnoDB AUTO_INCREMENT=411 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `giaodich` (`MaGiaoDich`, `MaDangKy`, `SoTien`, `NgayGiaoDich`, `NoiDungChuyenKhoan`, `TrangThai`) VALUES
(395, 303, 1000.00, '2026-08-18 21:49:41', 'MBVCB.15646688052.932300.MADK303 DK Thanh toan gop 1 lop', 'Thành công'),
(398, 312, 1000.00, '2026-08-18 22:31:11', 'DK hoc lop A101 MaDK312', 'Thành công'),
(399, 313, 1000.00, '2026-08-18 22:31:11', 'DK hoc lop B101 MaDK313', 'Thành công'),
(400, 314, 1000.00, '2026-08-18 22:31:11', 'DK hoc lop DE101 MaDK314', 'Thành công');

-- --------------------------------------------------------
-- Table structure for table `hosohocvien`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `hosohocvien`;
CREATE TABLE IF NOT EXISTS `hosohocvien` (
  `MaHocVien` int NOT NULL AUTO_INCREMENT,
  `MaNguoiDung` int NOT NULL,
  `HoTen` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `QuanHe` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Ban than',
  `NgaySinh` date DEFAULT NULL,
  `DiaChi` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `TrinhDoHienTai` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`MaHocVien`),
  KEY `fk_hosohocvien_nguoidung` (`MaNguoiDung`)
) ENGINE=InnoDB AUTO_INCREMENT=124 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `hosohocvien` (`MaHocVien`, `MaNguoiDung`, `HoTen`, `QuanHe`, `NgaySinh`, `DiaChi`, `TrinhDoHienTai`) VALUES
(110, 97, 'Trần Văn A', 'Bản thân', '2009-05-06', 'cầu giấy,quận 1 tp.hcm\r\n', 'Cơ bản (200-450)'),
(111, 98, 'Phạm Thị Hoa', 'Bản thân', '2009-05-06', '123 abc, Quận Tân Phú, TP. Hồ Chí Minh', 'Luyện đề'),
(122, 71, 'Nguyễn Đăng Khoa', 'Bản thân', NULL, NULL, 'Chưa xác định');

-- --------------------------------------------------------
-- Table structure for table `hosonhansu`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `hosonhansu`;
CREATE TABLE IF NOT EXISTS `hosonhansu` (
  `MaNhanSu` int NOT NULL AUTO_INCREMENT,
  `MaNguoiDung` int NOT NULL,
  `ChucVu` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `HocVi` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ChungChiNgoaiNgu` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `KinhNghiem` text COLLATE utf8mb4_unicode_ci,
  `NgaySinh` date DEFAULT NULL,
  `DiaChi` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `NgayVaoLam` date DEFAULT NULL,
  PRIMARY KEY (`MaNhanSu`),
  UNIQUE KEY `MaNguoiDung` (`MaNguoiDung`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `hosonhansu` (`MaNhanSu`, `MaNguoiDung`, `ChucVu`, `HocVi`, `ChungChiNgoaiNgu`, `KinhNghiem`, `NgaySinh`, `DiaChi`, `NgayVaoLam`) VALUES
(1, 2, 'Giảng viên', 'Thạc sĩ', 'IELTS 7.5+', '5 năm giảng dạy TOEIC', '1998-01-23', 'abc, Quận 5, TP. Hồ Chí Minh', '2020-01-14'),
(3, 71, 'Giảng viên TOEIC Cao cấp', 'Thạc sĩ', 'TOEIC 990+', '3 năm kinh nghiệm dạy tại các trung tâm anh ngữ.', '1995-06-20', 'TP. Hồ Chí Minh', '2024-01-15');

-- --------------------------------------------------------
-- Table structure for table `ketquathi`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `ketquathi`;
CREATE TABLE IF NOT EXISTS `ketquathi` (
  `MaKetQua` int NOT NULL AUTO_INCREMENT,
  `MaHocVien` int DEFAULT NULL,
  `SessionKhach` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `MaDeThi` int NOT NULL,
  `MaLoTrinh` int DEFAULT NULL,
  `DiemNghe` int NOT NULL DEFAULT '0',
  `DiemDoc` int NOT NULL DEFAULT '0',
  `ChiTietBaiLam` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `NgayThi` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaKetQua`),
  KEY `fk_kqt_lt` (`MaLoTrinh`),
  KEY `idx_kqt_hocvien` (`MaHocVien`),
  KEY `idx_kqt_session` (`SessionKhach`),
  KEY `idx_kqt_dethi` (`MaDeThi`)
) ENGINE=InnoDB AUTO_INCREMENT=75 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `ketquathi` (`MaKetQua`, `MaHocVien`, `SessionKhach`, `MaDeThi`, `MaLoTrinh`, `DiemNghe`, `DiemDoc`, `ChiTietBaiLam`, `NgayThi`) VALUES
(69, 110, NULL, 20, 12, 0, 0, '{}', '2026-08-20 04:25:18'),
(70, 110, NULL, 9, 12, 0, 0, '{}', '2026-08-20 04:25:41'),
(71, NULL, 'vcI8uuB_aY25eeGZ-lEy4M0APQRj9lx1', 9, 12, 5, 0, '[\"C\",\"A\",\"B\",\"A\",\"A\"]', '2026-08-20 04:35:34'),
(72, 110, NULL, 9, 12, 0, 0, '{}', '2026-08-20 04:40:33'),
(73, 110, NULL, 7, 12, 0, 0, '{}', '2026-08-20 04:41:49'),
(74, 110, NULL, 6, 12, 0, 0, '{}', '2026-08-20 04:50:18');

-- --------------------------------------------------------
-- Table structure for table `khoahoc`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `khoahoc`;
CREATE TABLE IF NOT EXISTS `khoahoc` (
  `MaKhoaHoc` int NOT NULL AUTO_INCREMENT,
  `TenKhoaHoc` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `HocPhi` decimal(10,2) NOT NULL,
  `ThoiLuong` int NOT NULL,
  `CapDo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `MoTa` text COLLATE utf8mb4_unicode_ci,
  `TrangThai` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Hoạt động',
  PRIMARY KEY (`MaKhoaHoc`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `khoahoc` (`MaKhoaHoc`, `TenKhoaHoc`, `HocPhi`, `ThoiLuong`, `CapDo`, `MoTa`, `TrangThai`) VALUES
(1, 'TOEIC Pre (Mục tiêu 300+)', 1000.00, 26, 'Foundation', 'Dành cho học viên mất gốc.', 'Hoạt động'),
(2, 'TOEIC A (Mục tiêu 450 - 500+)', 1000.00, 26, '450+', 'Dành cho người có nền tảng cơ bản.', 'Hoạt động'),
(3, 'TOEIC B (Mục tiêu 600 - 650+)', 1000.00, 24, '650+', 'Nắm chắc mẹo tránh bẫy các Part.', 'Hoạt động'),
(4, 'TOEIC Luyện Đề (Tăng 100 - 150 điểm)', 2000.00, 20, 'Luyện đề', 'Chuyên giải bộ đề thực chiến ETS.', 'Hoạt động'),
(5, 'TOEIC Cấp Tốc 2 Kỹ Năng (1 Tháng)', 1000.00, 16, 'Cấp tốc', 'Chương trình bứt tốc cá nhân hóa.', 'Hoạt động'),
(25, 'TOEIC C (Mục tiêu 700 - 800+)', 3000.00, 26, '850+', '', 'Hoạt động');

-- --------------------------------------------------------
-- Table structure for table `khuyenmai`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `khuyenmai`;
CREATE TABLE IF NOT EXISTS `khuyenmai` (
  `MaKhuyenMai` int NOT NULL AUTO_INCREMENT,
  `TenKhuyenMai` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `PhanTramGiam` decimal(5,2) NOT NULL,
  `MaCode` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `NgayBatDau` datetime NOT NULL,
  `NgayKetThuc` datetime NOT NULL,
  `HinhAnh` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '/images/logo.png',
  `NoiDung` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`MaKhuyenMai`),
  UNIQUE KEY `MaCode` (`MaCode`),
  KEY `idx_km_code` (`MaCode`),
  KEY `idx_km_hethan` (`NgayKetThuc`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `khuyenmai` (`MaKhuyenMai`, `TenKhuyenMai`, `PhanTramGiam`, `MaCode`, `NgayBatDau`, `NgayKetThuc`, `HinhAnh`, `NoiDung`) VALUES
(1, 'Combo 2 khóa học', 20.00, 'COMBO20', '2025-12-28 00:00:00', '2026-09-30 00:00:00', '/images/combo_2_khoa_hoc.png', 'Giảm giá lên đến 20% học phí.'),
(2, 'Flash Sale Đăng Ký Sớm', 15.00, 'FLASHSALE15', '2026-01-01 00:00:00', '2027-12-31 23:59:59', '/images/FL_SALE.png', 'Ưu đãi giảm trực tiếp 15% học phí.');

-- --------------------------------------------------------
-- Table structure for table `lophoc`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `lophoc`;
CREATE TABLE IF NOT EXISTS `lophoc` (
  `MaLopHoc` int NOT NULL AUTO_INCREMENT,
  `MaKhoaHoc` int NOT NULL,
  `MaGiangVien` int DEFAULT NULL,
  `TenLop` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `NgayKhaiGiang` date NOT NULL,
  `NgayKetThuc` date NOT NULL,
  `SiSoToiDa` int NOT NULL,
  `HocPhi` decimal(10,2) DEFAULT NULL,
  `TrangThaiLop` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Sắp mở',
  `LoaiLop` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Tiêu chuẩn',
  PRIMARY KEY (`MaLopHoc`),
  KEY `idx_lh_khoahoc` (`MaKhoaHoc`),
  KEY `idx_lh_gv` (`MaGiangVien`),
  KEY `idx_lh_ngayketthuc` (`NgayKetThuc`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `lophoc` (`MaLopHoc`, `MaKhoaHoc`, `MaGiangVien`, `TenLop`, `NgayKhaiGiang`, `NgayKetThuc`, `SiSoToiDa`, `HocPhi`, `TrangThaiLop`, `LoaiLop`) VALUES
(1, 1, 3, 'PRE_101', '2026-10-21', '2026-12-18', 20, 1000.00, 'Sắp mở', 'Tiêu chuẩn'),
(2, 2, 3, 'A_101', '2026-08-15', '2026-12-31', 15, 1000.00, 'Đang diễn ra', 'Tiêu chuẩn'),
(3, 3, 1, 'B_101', '2026-08-24', '2026-10-20', 15, 1000.00, 'Sắp mở', 'Tiêu chuẩn'),
(4, 4, 3, 'DE_101', '2026-08-19', '2026-10-05', 1, 2000.00, 'Đang diễn ra', 'Tiêu chuẩn'),
(23, 25, 3, 'C_101', '2026-11-11', '2027-01-09', 15, 3000.00, 'Sắp mở', 'Tiêu chuẩn'),
(25, 5, 1, 'CT_101', '2026-09-09', '2026-10-14', 1, 1000.00, 'Sắp mở', 'Cấp tốc');

-- --------------------------------------------------------
-- Table structure for table `lotrinh_dexuat`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `lotrinh_dexuat`;
CREATE TABLE IF NOT EXISTS `lotrinh_dexuat` (
  `MaLoTrinh` int NOT NULL AUTO_INCREMENT,
  `MaKhoaHoc` int NOT NULL,
  `DiemTu` int NOT NULL,
  `DiemDen` int NOT NULL,
  `MoTa` text COLLATE utf8mb4_unicode_ci,
  `LoaiLoTrinh` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Tiêu chuẩn',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `MaCode` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`MaLoTrinh`),
  KEY `fk_lt_kh` (`MaKhoaHoc`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `lotrinh_dexuat` (`MaLoTrinh`, `MaKhoaHoc`, `DiemTu`, `DiemDen`, `MoTa`, `LoaiLoTrinh`, `is_active`, `MaCode`) VALUES
(12, 1, 0, 350, 'Lấy lại gốc ngữ pháp, xây dựng từ vựng căn bản.', 'Mất gốc', 1, 'LTR_MG_01'),
(13, 2, 305, 450, 'Làm quen cấu trúc đề thi.', 'Tiêu chuẩn', 1, 'LTR_TC_01'),
(14, 3, 455, 600, 'Phát triển kỹ năng nghe bắt từ khóa.', 'Tiêu chuẩn', 1, 'LTR_TC_02'),
(15, 25, 605, 800, 'Xử lý bẫy ngữ pháp khó.', 'Tiêu chuẩn', 1, 'LTR_TC_03'),
(16, 5, 400, 500, 'Học cường độ cao.', 'Cấp tốc', 1, 'LTR_CT_01'),
(17, 4, 500, 900, 'Thực hành giải đề liên tục.', 'Cấp tốc', 1, 'LTR_CT_02');

-- --------------------------------------------------------
-- Table structure for table `nguoidung` (ĐÃ RESET MẬT KHẨU ADMIN)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `nguoidung`;
CREATE TABLE IF NOT EXISTS `nguoidung` (
  `MaNguoiDung` int NOT NULL AUTO_INCREMENT,
  `HoTen` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `SoDienThoai` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `MatKhau` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `AnhDaiDien` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'default_avatar.png',
  `MaVaiTro` int NOT NULL,
  `TrangThai` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Chưa kích hoạt',
  `NgayTao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaNguoiDung`),
  UNIQUE KEY `Email` (`Email`),
  KEY `idx_nd_email` (`Email`),
  KEY `idx_nd_vaitro` (`MaVaiTro`)
) ENGINE=InnoDB AUTO_INCREMENT=106 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `nguoidung` (`MaNguoiDung`, `HoTen`, `Email`, `SoDienThoai`, `MatKhau`, `AnhDaiDien`, `MaVaiTro`, `TrangThai`, `NgayTao`) VALUES
(1, 'Admin', 'admin@example.com', '0900000001', '$2b$10$X72.t9o.r6t4L/Y9Q4V3zOTbY1D4tM78w/Bv5U718r9J0X3F3z8P.', '/images/AVT/admin.jpg', 1, 'Hoạt động', '2026-06-16 15:29:27'),
(2, 'Trần Thị Lan', 'tranlan.gv@example.com', '0900000002', '$2b$10$RsuK/XG7oGVeGamzA3HWf.0spmS9Dr06yL7Yvlg.Qc5qdaqi/XDC6', '/images/AVT/lan.png', 2, 'Hoạt động', '2026-06-16 15:29:27'),
(71, 'Nguyễn Đăng Khoa', 'khoa.gv@example.com', '0900000071', '$2b$10$RsuK/XG7oGVeGamzA3HWf.0spmS9Dr06yL7Yvlg.Qc5qdaqi/XDC6', '/images/AVT/khoa.jpg', 2, 'Hoạt động', '2026-06-16 15:29:27'),
(97, 'Trần Văn A', 'vana.hv@example.com', '0900000097', '$2b$10$iHtOzZS/ckWWSOU1ihItguJB3UCHObmimgcEp6uOogNMxvBKQFsD.', '/images/AVT/hoa.jpg', 3, 'Hoạt động', '2026-06-16 15:29:27'),
(98, 'Phạm Thị Hoa', 'hoa.hv@example.com', '0900000098', '$2b$10$iHtOzZS/ckWWSOU1ihItguJB3UCHObmimgcEp6uOogNMxvBKQFsD.', '/images/AVT/hoa.jpg', 3, 'Hoạt động', '2026-06-16 15:29:27');

-- --------------------------------------------------------
-- Table structure for table `phonghoc`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `phonghoc`;
CREATE TABLE IF NOT EXISTS `phonghoc` (
  `MaPhongHoc` int NOT NULL AUTO_INCREMENT,
  `TenPhong` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `SucChua` int DEFAULT NULL,
  `ViTri` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`MaPhongHoc`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `phonghoc` (`MaPhongHoc`, `TenPhong`, `SucChua`, `ViTri`) VALUES
(1, 'P101', 5, 'Tầng 1, Tòa A'),
(2, 'P102', 25, 'Tầng 1, Tòa A'),
(3, 'P201', 1, 'Tầng 2, Tòa A'),
(4, 'P202', 30, 'Tầng 2, Tòa A'),
(6, 'P302', 15, 'Tầng 3, Tòa A');

-- --------------------------------------------------------
-- Table structure for table `quanlydiem`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `quanlydiem`;
CREATE TABLE IF NOT EXISTS `quanlydiem` (
  `MaBangDiem` int NOT NULL AUTO_INCREMENT,
  `MaHocVien` int NOT NULL,
  `MaLopHoc` int NOT NULL,
  `DiemGiuaKy` float DEFAULT NULL,
  `DiemCuoiKy` float DEFAULT NULL,
  `NhanXetGiangVien` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`MaBangDiem`),
  UNIQUE KEY `uq_qld_hv_lop` (`MaHocVien`,`MaLopHoc`),
  KEY `fk_qld_lh` (`MaLopHoc`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `quanlydiem` (`MaBangDiem`, `MaHocVien`, `MaLopHoc`, `DiemGiuaKy`, `DiemCuoiKy`, `NhanXetGiangVien`) VALUES
(14, 111, 2, 400, 0, '');

-- --------------------------------------------------------
-- Table structure for table `thoikhoabieu`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `thoikhoabieu`;
CREATE TABLE IF NOT EXISTS `thoikhoabieu` (
  `MaTKB` int NOT NULL AUTO_INCREMENT,
  `MaLopHoc` int NOT NULL,
  `MaPhongHoc` int NOT NULL,
  `MaBuoiHoc` int NOT NULL,
  `ThuTrongTuan` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`MaTKB`),
  KEY `fk_tkb_lh` (`MaLopHoc`),
  KEY `fk_tkb_bh` (`MaBuoiHoc`),
  KEY `idx_tkb_ph` (`MaPhongHoc`)
) ENGINE=InnoDB AUTO_INCREMENT=482 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `thoikhoabieu` (`MaTKB`, `MaLopHoc`, `MaPhongHoc`, `MaBuoiHoc`, `ThuTrongTuan`) VALUES
(123, 4, 3, 5, 'Thứ Hai'),
(124, 4, 3, 5, 'Thứ Tư'),
(125, 4, 3, 5, 'Thứ Sáu'),
(126, 3, 4, 5, 'Thứ Ba'),
(127, 3, 4, 5, 'Thứ Năm'),
(128, 3, 4, 5, 'Thứ Bảy'),
(135, 23, 6, 3, 'Thứ Ba'),
(136, 23, 6, 3, 'Thứ Năm'),
(137, 23, 6, 3, 'Thứ Bảy'),
(180, 1, 4, 4, 'Thứ Hai'),
(181, 1, 4, 4, 'Thứ Tư'),
(182, 1, 4, 4, 'Thứ Sáu'),
(253, 25, 1, 4, 'Thứ Hai'),
(254, 25, 1, 4, 'Thứ Tư'),
(255, 25, 1, 4, 'Thứ Sáu'),
(479, 2, 1, 1, 'Thứ Ba'),
(480, 2, 1, 1, 'Thứ Năm'),
(481, 2, 1, 1, 'Thứ Bảy');

-- --------------------------------------------------------
-- Table structure for table `tintuc`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `tintuc`;
CREATE TABLE IF NOT EXISTS `tintuc` (
  `MaTinTuc` int NOT NULL AUTO_INCREMENT,
  `TieuDe` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `TomTat` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `NoiDung` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `HinhAnh` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `NgayDang` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `MaNguoiDang` int NOT NULL,
  PRIMARY KEY (`MaTinTuc`),
  KEY `fk_tt_nd` (`MaNguoiDang`),
  KEY `idx_tt_ngaydang` (`NgayDang` DESC)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `tintuc` (`MaTinTuc`, `TieuDe`, `TomTat`, `NoiDung`, `HinhAnh`, `NgayDang`, `MaNguoiDang`) VALUES
(1, 'Cập nhật format TOEIC mới nhất', 'Những thay đổi quan trọng...', 'Tìm hiểu chi tiết cấu trúc...', '/images/Cap_Nhat_Fomat.png', '2026-07-11 23:53:04', 1),
(2, 'Mẹo làm bài Toeic Listening', '5 chiến thuật nghe bắt từ khóa...', 'Chiến thuật 1: Tận dụng thời gian vàng...', '/images/Meo copy.png', '2026-07-11 23:53:04', 1),
(3, 'Kho 100 từ vựng TOEIC', 'Tổng hợp đầy đủ chức vụ...', 'Kho từ vựng Tiếng Anh chủ đề...', '/images/Kho_Tu_Vung.png', '2026-07-11 23:53:04', 1);

-- --------------------------------------------------------
-- Table structure for table `vaitro`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `vaitro`;
CREATE TABLE IF NOT EXISTS `vaitro` (
  `MaVaiTro` int NOT NULL AUTO_INCREMENT,
  `TenVaiTro` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `MoTa` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`MaVaiTro`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `vaitro` (`MaVaiTro`, `TenVaiTro`, `MoTa`) VALUES
(1, 'Admin', 'Quản trị viên toàn hệ thống'),
(2, 'Giảng viên', 'Giảng viên'),
(3, 'Học viên', 'Học viên đã đăng ký tài khoản');

-- --------------------------------------------------------
-- Constraints for dumped tables
-- --------------------------------------------------------

ALTER TABLE `dangkyhoc`
  ADD CONSTRAINT `fk_dk_hv` FOREIGN KEY (`MaHocVien`) REFERENCES `hosohocvien` (`MaHocVien`),
  ADD CONSTRAINT `fk_dk_km` FOREIGN KEY (`MaKhuyenMai`) REFERENCES `khuyenmai` (`MaKhuyenMai`),
  ADD CONSTRAINT `fk_dk_lh` FOREIGN KEY (`MaLopHoc`) REFERENCES `lophoc` (`MaLopHoc`),
  ADD CONSTRAINT `fk_dk_ndk` FOREIGN KEY (`MaNguoiDangKy`) REFERENCES `nguoidung` (`MaNguoiDung`);

ALTER TABLE `diemdanh`
  ADD CONSTRAINT `fk_dd_hv` FOREIGN KEY (`MaHocVien`) REFERENCES `hosohocvien` (`MaHocVien`),
  ADD CONSTRAINT `fk_dd_lh` FOREIGN KEY (`MaLopHoc`) REFERENCES `lophoc` (`MaLopHoc`);

ALTER TABLE `giaodich`
  ADD CONSTRAINT `fk_gd_dk` FOREIGN KEY (`MaDangKy`) REFERENCES `dangkyhoc` (`MaDangKy`);

ALTER TABLE `hosohocvien`
  ADD CONSTRAINT `fk_hosohocvien_nguoidung` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `hosonhansu`
  ADD CONSTRAINT `fk_hns_nd` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`);

ALTER TABLE `ketquathi`
  ADD CONSTRAINT `fk_kqt_de` FOREIGN KEY (`MaDeThi`) REFERENCES `baithi` (`MaDeThi`),
  ADD CONSTRAINT `fk_kqt_hv` FOREIGN KEY (`MaHocVien`) REFERENCES `hosohocvien` (`MaHocVien`),
  ADD CONSTRAINT `fk_kqt_lt` FOREIGN KEY (`MaLoTrinh`) REFERENCES `lotrinh_dexuat` (`MaLoTrinh`);

ALTER TABLE `lophoc`
  ADD CONSTRAINT `fk_lh_gv` FOREIGN KEY (`MaGiangVien`) REFERENCES `hosonhansu` (`MaNhanSu`),
  ADD CONSTRAINT `fk_lh_kh` FOREIGN KEY (`MaKhoaHoc`) REFERENCES `khoahoc` (`MaKhoaHoc`);

ALTER TABLE `lotrinh_dexuat`
  ADD CONSTRAINT `fk_lt_kh` FOREIGN KEY (`MaKhoaHoc`) REFERENCES `khoahoc` (`MaKhoaHoc`);

ALTER TABLE `nguoidung`
  ADD CONSTRAINT `fk_nd_vaitro` FOREIGN KEY (`MaVaiTro`) REFERENCES `vaitro` (`MaVaiTro`);

ALTER TABLE `quanlydiem`
  ADD CONSTRAINT `fk_qld_hv` FOREIGN KEY (`MaHocVien`) REFERENCES `hosohocvien` (`MaHocVien`),
  ADD CONSTRAINT `fk_qld_lh` FOREIGN KEY (`MaLopHoc`) REFERENCES `lophoc` (`MaLopHoc`);

ALTER TABLE `thoikhoabieu`
  ADD CONSTRAINT `fk_tkb_bh` FOREIGN KEY (`MaBuoiHoc`) REFERENCES `buoihoc` (`MaBuoiHoc`),
  ADD CONSTRAINT `fk_tkb_lh` FOREIGN KEY (`MaLopHoc`) REFERENCES `lophoc` (`MaLopHoc`),
  ADD CONSTRAINT `fk_tkb_ph` FOREIGN KEY (`MaPhongHoc`) REFERENCES `phonghoc` (`MaPhongHoc`);

ALTER TABLE `tintuc`
  ADD CONSTRAINT `fk_tt_nd` FOREIGN KEY (`MaNguoiDang`) REFERENCES `nguoidung` (`MaNguoiDung`);

-- Bật lại kiểm tra khóa ngoại sau khi hoàn tất
SET FOREIGN_KEY_CHECKS=1;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;