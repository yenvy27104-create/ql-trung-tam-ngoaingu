-- MySQL Dump of database quanly_trungtam_ngoaingu
-- Generated on 2026-07-18T15:23:44.547Z

CREATE DATABASE IF NOT EXISTS `quanly_trungtam_ngoaingu` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `quanly_trungtam_ngoaingu`;

SET FOREIGN_KEY_CHECKS=0;

-- --------------------------------------------------------
-- Table structure for table `baithi`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `baithi`;
CREATE TABLE `baithi` (
  `MaDeThi` int NOT NULL AUTO_INCREMENT,
  `TenDeThi` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ThoiGianLamBai` int NOT NULL COMMENT 'Đơn vị: phút',
  `LoaiDe` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Đầu vào | Luyện tập tự do | Mẫu / Miễn phí',
  `DuongDanFileJSON` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `TrangThai` tinyint DEFAULT '1' COMMENT '1: Hiển thị | 0: Ẩn',
  PRIMARY KEY (`MaDeThi`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `baithi`
INSERT INTO `baithi` (`MaDeThi`, `TenDeThi`, `ThoiGianLamBai`, `LoaiDe`, `DuongDanFileJSON`, `TrangThai`) VALUES
(1, 'Đề Test Đầu Vào - Đề số 1', 60, 'Đầu vào', 'json/test_dauvao_01.json', 1),
(2, 'TOEIC Practice Test 01', 120, 'Luyện tập tự do', 'json/practice_01.json', 0),
(3, 'TOEIC Practice Test 02', 120, 'Luyện tập tự do', 'json/practice_02.json', 0),
(4, 'Đề Thi Thử Miễn Phí – Cơ Bản 01', 60, 'Mẫu / Miễn phí', 'json/free_01.json', 0),
(5, 'Đề Test Đầu Vào - Đề số 2', 60, 'Đầu vào', 'json/test_dauvao_02.json', 1),
(6, 'TOEIC Test 1', 120, 'Mẫu / Miễn phí', 'json/toeic_test_1.json', 1),
(7, 'TOEIC Test 2', 120, 'Mẫu / Miễn phí', 'json/toeic_test_2.json', 1),
(8, 'TOEIC Test 3', 120, 'Mẫu / Miễn phí', 'json/toeic_test_3.json', 1),
(9, 'TOEIC Test 4', 120, 'Luyện đề chính thức', 'json/toeic_test_4.json', 1);

-- --------------------------------------------------------
-- Table structure for table `buoihoc`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `buoihoc`;
CREATE TABLE `buoihoc` (
  `MaBuoiHoc` int NOT NULL AUTO_INCREMENT,
  `TenBuoi` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `GioBatDau` time NOT NULL,
  `GioKetThuc` time NOT NULL,
  PRIMARY KEY (`MaBuoiHoc`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `buoihoc`
INSERT INTO `buoihoc` (`MaBuoiHoc`, `TenBuoi`, `GioBatDau`, `GioKetThuc`) VALUES
(1, 'Ca sáng 1', '07:30:00', '09:00:00'),
(2, 'Ca sáng 2', '09:45:00', '11:45:00'),
(3, 'Ca chiều 1', '13:30:00', '15:30:00'),
(4, 'Ca chiều 2', '15:45:00', '17:45:00'),
(5, 'Ca tối 1', '18:00:00', '20:00:00'),
(6, 'Ca tối 2', '20:15:00', '22:15:00'),
(7, 'Ca tối (19h - 21h)', '19:00:00', '21:00:00');

-- --------------------------------------------------------
-- Table structure for table `dangkyhoc`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `dangkyhoc`;
CREATE TABLE `dangkyhoc` (
  `MaDangKy` int NOT NULL AUTO_INCREMENT,
  `MaHocVien` int NOT NULL,
  `MaLopHoc` int NOT NULL,
  `MaNguoiDangKy` int NOT NULL COMMENT 'Hỗ trợ đăng ký hộ',
  `MaKhuyenMai` int DEFAULT NULL,
  `HocPhiDaGiam` decimal(10,2) NOT NULL,
  `NgayDangKy` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `TrangThai` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Chờ thanh toán' COMMENT 'Chờ thanh toán | Đang học | Ngừng học | Hoàn thành | Đã hủy',
  PRIMARY KEY (`MaDangKy`),
  UNIQUE KEY `uq_dk_hv_lop` (`MaHocVien`,`MaLopHoc`),
  KEY `fk_dk_ndk` (`MaNguoiDangKy`),
  KEY `fk_dk_km` (`MaKhuyenMai`),
  KEY `idx_dk_hocvien` (`MaHocVien`),
  KEY `idx_dk_lophoc` (`MaLopHoc`),
  KEY `idx_dk_trangthai` (`TrangThai`),
  CONSTRAINT `fk_dk_hv` FOREIGN KEY (`MaHocVien`) REFERENCES `hosohocvien` (`MaHocVien`),
  CONSTRAINT `fk_dk_km` FOREIGN KEY (`MaKhuyenMai`) REFERENCES `khuyenmai` (`MaKhuyenMai`),
  CONSTRAINT `fk_dk_lh` FOREIGN KEY (`MaLopHoc`) REFERENCES `lophoc` (`MaLopHoc`),
  CONSTRAINT `fk_dk_ndk` FOREIGN KEY (`MaNguoiDangKy`) REFERENCES `nguoidung` (`MaNguoiDung`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `dangkyhoc`
INSERT INTO `dangkyhoc` (`MaDangKy`, `MaHocVien`, `MaLopHoc`, `MaNguoiDangKy`, `MaKhuyenMai`, `HocPhiDaGiam`, `NgayDangKy`, `TrangThai`) VALUES
(1, 1, 1, 4, 1, '2250000.00', '2026-06-16 15:29:27', 'Đang học');

-- --------------------------------------------------------
-- Table structure for table `diemdanh`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `diemdanh`;
CREATE TABLE `diemdanh` (
  `MaDiemDanh` int NOT NULL AUTO_INCREMENT,
  `MaHocVien` int NOT NULL,
  `MaLopHoc` int NOT NULL,
  `NgayHoc` date NOT NULL,
  `TrangThai` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Có mặt | Vắng mặt',
  PRIMARY KEY (`MaDiemDanh`),
  UNIQUE KEY `uq_dd_hv_lh_ngay` (`MaHocVien`,`MaLopHoc`,`NgayHoc`),
  KEY `idx_dd_hocvien` (`MaHocVien`),
  KEY `idx_dd_lophoc` (`MaLopHoc`),
  CONSTRAINT `fk_dd_hv` FOREIGN KEY (`MaHocVien`) REFERENCES `hosohocvien` (`MaHocVien`),
  CONSTRAINT `fk_dd_lh` FOREIGN KEY (`MaLopHoc`) REFERENCES `lophoc` (`MaLopHoc`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `diemdanh`
INSERT INTO `diemdanh` (`MaDiemDanh`, `MaHocVien`, `MaLopHoc`, `NgayHoc`, `TrangThai`) VALUES
(1, 1, 1, '2026-07-01 00:00:00', 'Có mặt'),
(2, 1, 1, '2026-07-06 00:00:00', 'Vắng mặt');

-- --------------------------------------------------------
-- Table structure for table `giaodich`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `giaodich`;
CREATE TABLE `giaodich` (
  `MaGiaoDich` int NOT NULL AUTO_INCREMENT,
  `MaDangKy` int NOT NULL,
  `SoTien` decimal(10,2) NOT NULL,
  `NgayGiaoDich` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `NoiDungChuyenKhoan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `TrangThai` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Thành công | Thất bại',
  PRIMARY KEY (`MaGiaoDich`),
  KEY `idx_gd_dangky` (`MaDangKy`),
  KEY `idx_gd_trangthai` (`TrangThai`),
  CONSTRAINT `fk_gd_dk` FOREIGN KEY (`MaDangKy`) REFERENCES `dangkyhoc` (`MaDangKy`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `giaodich`
INSERT INTO `giaodich` (`MaGiaoDich`, `MaDangKy`, `SoTien`, `NgayGiaoDich`, `NoiDungChuyenKhoan`, `TrangThai`) VALUES
(1, 1, '2250000.00', '2026-06-16 15:29:27', 'DK001 HOC PHI LOP FOUNDATION A K01', 'Thành công');

-- --------------------------------------------------------
-- Table structure for table `hosohocvien`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `hosohocvien`;
CREATE TABLE `hosohocvien` (
  `MaHocVien` int NOT NULL AUTO_INCREMENT,
  `MaNguoiDung` int NOT NULL,
  `NgaySinh` date DEFAULT NULL,
  `DiaChi` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `TrinhDoHienTai` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`MaHocVien`),
  UNIQUE KEY `MaNguoiDung` (`MaNguoiDung`),
  CONSTRAINT `fk_hhv_nd` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `hosohocvien`
INSERT INTO `hosohocvien` (`MaHocVien`, `MaNguoiDung`, `NgaySinh`, `DiaChi`, `TrinhDoHienTai`) VALUES
(1, 4, '2004-05-08 00:00:00', 'Quận 1, TP.HCM', 'Mất gốc (0-200)');

-- --------------------------------------------------------
-- Table structure for table `hosonhansu`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `hosonhansu`;
CREATE TABLE `hosonhansu` (
  `MaNhanSu` int NOT NULL AUTO_INCREMENT,
  `MaNguoiDung` int NOT NULL,
  `ChucVu` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `HocVi` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ChungChiNgoaiNgu` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `KinhNghiem` text COLLATE utf8mb4_unicode_ci,
  `NgayVaoLam` date DEFAULT NULL,
  PRIMARY KEY (`MaNhanSu`),
  UNIQUE KEY `MaNguoiDung` (`MaNguoiDung`),
  CONSTRAINT `fk_hns_nd` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `hosonhansu`
INSERT INTO `hosonhansu` (`MaNhanSu`, `MaNguoiDung`, `ChucVu`, `HocVi`, `ChungChiNgoaiNgu`, `KinhNghiem`, `NgayVaoLam`) VALUES
(1, 2, 'Giảng viên', 'Thạc sĩ', 'IELTS 8.5', '5 năm giảng dạy TOEIC', '2020-01-15 00:00:00'),
(2, 3, 'Giảng viên', 'Cử nhân', 'TOEIC 900', '3 năm giảng dạy', '2022-06-01 00:00:00');

-- --------------------------------------------------------
-- Table structure for table `ketquathi`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `ketquathi`;
CREATE TABLE `ketquathi` (
  `MaKetQua` int NOT NULL AUTO_INCREMENT,
  `MaHocVien` int DEFAULT NULL COMMENT 'NULL nếu là khách thi thử',
  `SessionKhach` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'NULL nếu đã đăng nhập',
  `MaDeThi` int NOT NULL,
  `MaLoTrinh` int DEFAULT NULL COMMENT 'Chỉ có nếu là bài test đầu vào',
  `DiemNghe` int NOT NULL DEFAULT '0',
  `DiemDoc` int NOT NULL DEFAULT '0',
  `ChiTietBaiLam` longtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'JSON lưu đáp án chi tiết',
  `NgayThi` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaKetQua`),
  KEY `fk_kqt_lt` (`MaLoTrinh`),
  KEY `idx_kqt_hocvien` (`MaHocVien`),
  KEY `idx_kqt_session` (`SessionKhach`),
  KEY `idx_kqt_dethi` (`MaDeThi`),
  CONSTRAINT `fk_kqt_de` FOREIGN KEY (`MaDeThi`) REFERENCES `baithi` (`MaDeThi`),
  CONSTRAINT `fk_kqt_hv` FOREIGN KEY (`MaHocVien`) REFERENCES `hosohocvien` (`MaHocVien`),
  CONSTRAINT `fk_kqt_lt` FOREIGN KEY (`MaLoTrinh`) REFERENCES `lotrinh_dexuat` (`MaLoTrinh`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `ketquathi`
INSERT INTO `ketquathi` (`MaKetQua`, `MaHocVien`, `SessionKhach`, `MaDeThi`, `MaLoTrinh`, `DiemNghe`, `DiemDoc`, `ChiTietBaiLam`, `NgayThi`) VALUES
(2, NULL, 'sess_abc123xyz', 4, NULL, 150, 130, '{\"part1\":[1,2,3],\"part2\":[2,1,3]}', '2026-06-16 15:29:27'),
(6, NULL, 'lF1y9usyXmxmJ8jsWFbruH-tkfdLE-PT', 7, 1, 0, 0, '{}', '2026-06-26 15:47:20'),
(9, NULL, 'E1U8J1EdxTOBlxgQWrnq8xAq1Ke7qrvE', 7, 1, 0, 0, '{}', '2026-06-29 16:11:49'),
(10, NULL, 'IfI_UcjHyJQdVAMVXCObM_vFEFRUH4_T', 7, 1, 0, 0, '{}', '2026-06-29 16:13:37'),
(12, 1, NULL, 7, 1, 0, 0, '{}', '2026-06-29 16:17:21'),
(15, NULL, 'vdV1n0FjlptHgE9-SnEUg4_sU7CUhfpw', 7, 1, 0, 0, '{}', '2026-06-29 16:47:52'),
(16, NULL, 'aP8F9oC7FZm3f97C85q0GoYr44vvRaId', 7, 1, 0, 0, '{}', '2026-06-29 16:54:38'),
(17, NULL, 'IHY8FjjbGgUuWV30g7GEFyb4hP7i4tDT', 7, 1, 0, 0, '{}', '2026-06-29 19:33:42'),
(18, NULL, 'xDlzPnWrtZnrlK8lgiPG7dmH-z2iJgAZ', 7, 1, 0, 0, '{}', '2026-06-29 19:48:24'),
(19, NULL, 'bZmMDF6G20JXBYgRmbViDn6QNpsYrlqK', 7, 1, 0, 0, '{}', '2026-06-29 19:54:03'),
(27, 1, NULL, 9, 1, 0, 0, '{}', '2026-07-08 21:49:04'),
(28, 1, NULL, 8, 1, 0, 0, '{}', '2026-07-08 21:49:36'),
(30, 1, NULL, 8, 1, 0, 0, '{}', '2026-07-08 21:51:38'),
(32, NULL, 'M9qDz0SrsUq4YMkFGn6dUvE9n5wgyAmB', 7, 1, 0, 0, '{}', '2026-07-08 21:55:53'),
(33, NULL, 'YraVdcENMdAuykuf61XfHod58aB0kJae', 7, 1, 0, 0, '{}', '2026-07-08 21:57:40'),
(34, NULL, 'pGEvBSpLZrHH-Q-sJCWEtsg4D5_oPUtk', 8, 1, 0, 0, '{}', '2026-07-08 21:57:47');

-- --------------------------------------------------------
-- Table structure for table `khoahoc`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `khoahoc`;
CREATE TABLE `khoahoc` (
  `MaKhoaHoc` int NOT NULL AUTO_INCREMENT,
  `TenKhoaHoc` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `HocPhi` decimal(10,2) NOT NULL,
  `ThoiLuong` int NOT NULL COMMENT 'Tổng số buổi học',
  `CapDo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Foundation | 450+ | 650+',
  `MoTa` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`MaKhoaHoc`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `khoahoc`
INSERT INTO `khoahoc` (`MaKhoaHoc`, `TenKhoaHoc`, `HocPhi`, `ThoiLuong`, `CapDo`, `MoTa`) VALUES
(1, 'TOEIC Pre (Mục tiêu 300+)', '2500000.00', 26, 'Foundation', 'Dành cho học viên mất gốc. Lấy lại căn bản từ vựng & ngữ pháp nền tảng, nắm vững phát âm chuẩn Anh-Anh & Anh-Mỹ và kỹ năng làm bài thi TOEIC cơ bản.'),
(2, 'TOEIC A (Mục tiêu 450 - 500+)', '3500000.00', 26, '450+', 'Dành cho người có nền tảng cơ bản. Phát triển 600 từ vựng công sở (Tài chính, Kinh doanh, Quản lý), hệ thống ngữ pháp Part 5-6 và kỹ năng nghe Part 1-2.'),
(3, 'TOEIC B (Mục tiêu 600 - 650+)', '4500000.00', 26, '650+', 'Nắm chắc mẹo tránh bẫy các Part, luyện nghe đọc chuyên sâu Part 3, 4, 7, phản xạ nghe Anh-Anh, Anh-Mỹ và kỹ thuật đọc nhanh đoạn kép/ba.'),
(4, 'TOEIC Luyện Đề (Tăng 100 - 150 điểm)', '3200000.00', 14, '650+', 'Chuyên giải bộ đề thực chiến ETS mới nhất, xây dựng tư duy bẫy đề thi Listening & Reading, làm quen áp lực phòng thi thật và tối ưu phương án trắc nghiệm.'),
(5, 'TOEIC Cấp Tốc 2 Kỹ Năng (1 Tháng)', '3800000.00', 26, '450+', 'Chương trình bứt tốc cá nhân hóa dồn 5 buổi/tuần dành cho học viên cần bằng gấp trong 30 ngày. Cam kết tăng 150-200+ điểm so với điểm đầu vào.');

-- --------------------------------------------------------
-- Table structure for table `khuyenmai`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `khuyenmai`;
CREATE TABLE `khuyenmai` (
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

-- Dumping data for table `khuyenmai`
INSERT INTO `khuyenmai` (`MaKhuyenMai`, `TenKhuyenMai`, `PhanTramGiam`, `MaCode`, `NgayBatDau`, `NgayKetThuc`, `HinhAnh`, `NoiDung`) VALUES
(1, 'Combo 2 khóa học', '20.00', 'COMBO20', '2025-12-30 00:00:00', '2026-07-31 00:00:00', '/images/combo_2_khoa_hoc.png', 'Giảm giá lên đến 20% học phí khi đăng ký trọn gói combo 2 khóa học tại Anh ngữ Y&V. Áp dụng cho học viên đăng ký cùng lúc hai khóa học liên tiếp (Ví dụ: Foundation + 450+ hoặc 450+ + 650+).'),
(2, 'Flash Sale Đăng Ký Sớm', '15.00', 'FLASHSALE15', '2026-01-01 00:00:00', '2027-12-31 23:59:59', '/images/FL_SALE.png', 'Ưu đãi giảm trực tiếp 15% học phí khi hoàn tất đăng ký trước ngày khai giảng 10 ngày. Chương trình áp dụng cho tất cả các lớp học offline và online đang mở tuyển sinh.');

-- --------------------------------------------------------
-- Table structure for table `lophoc`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `lophoc`;
CREATE TABLE `lophoc` (
  `MaLopHoc` int NOT NULL AUTO_INCREMENT,
  `MaKhoaHoc` int NOT NULL,
  `MaGiangVien` int DEFAULT NULL,
  `TenLop` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `NgayKhaiGiang` date NOT NULL,
  `NgayKetThuc` date NOT NULL COMMENT 'Hệ thống tự so sánh với NOW() để đóng lớp',
  `SiSoToiDa` int NOT NULL,
  `HocPhi` decimal(10,2) DEFAULT NULL,
  `TrangThaiLop` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Sắp mở' COMMENT 'Sắp mở | Đang diễn ra | Đã đóng',
  `LoaiLop` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Tiêu chuẩn' COMMENT 'Tiêu chuẩn | Cấp tốc',
  PRIMARY KEY (`MaLopHoc`),
  KEY `idx_lh_khoahoc` (`MaKhoaHoc`),
  KEY `idx_lh_gv` (`MaGiangVien`),
  KEY `idx_lh_ngayketthuc` (`NgayKetThuc`),
  CONSTRAINT `fk_lh_gv` FOREIGN KEY (`MaGiangVien`) REFERENCES `hosonhansu` (`MaNhanSu`),
  CONSTRAINT `fk_lh_kh` FOREIGN KEY (`MaKhoaHoc`) REFERENCES `khoahoc` (`MaKhoaHoc`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `lophoc`
INSERT INTO `lophoc` (`MaLopHoc`, `MaKhoaHoc`, `MaGiangVien`, `TenLop`, `NgayKhaiGiang`, `NgayKetThuc`, `SiSoToiDa`, `HocPhi`, `TrangThaiLop`, `LoaiLop`) VALUES
(1, 1, 1, 'PRE109519', '2026-07-21 00:00:00', '2026-09-17 00:00:00', 20, 2500000.00, 'Đang diễn ra', 'Tiêu chuẩn'),
(2, 2, 1, 'A110648', '2026-06-20 00:00:00', '2026-08-18 00:00:00', 20, 3500000.00, 'Đang diễn ra', 'Tiêu chuẩn'),
(3, 3, 2, 'B109523', '2026-08-04 00:00:00', '2026-10-01 00:00:00', 15, 4500000.00, 'Sắp mở', 'Tiêu chuẩn'),
(4, 4, 2, 'DE750_102', '2026-08-03 00:00:00', '2026-09-02 00:00:00', 20, 3200000.00, 'Sắp mở', 'Tiêu chuẩn'),
(5, 5, 1, 'CT650_101', '2026-08-03 00:00:00', '2026-09-07 00:00:00', 15, 3800000.00, 'Sắp mở', 'Cấp tốc');

-- --------------------------------------------------------
-- Table structure for table `lotrinh_dexuat`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `lotrinh_dexuat`;
CREATE TABLE `lotrinh_dexuat` (
  `MaLoTrinh` int NOT NULL AUTO_INCREMENT,
  `MaKhoaHoc` int NOT NULL,
  `DiemTu` int NOT NULL,
  `DiemDen` int NOT NULL,
  `MoTa` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`MaLoTrinh`),
  KEY `fk_lt_kh` (`MaKhoaHoc`),
  CONSTRAINT `fk_lt_kh` FOREIGN KEY (`MaKhoaHoc`) REFERENCES `khoahoc` (`MaKhoaHoc`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `lotrinh_dexuat`
INSERT INTO `lotrinh_dexuat` (`MaLoTrinh`, `MaKhoaHoc`, `DiemTu`, `DiemDen`, `MoTa`) VALUES
(1, 1, 0, 199, 'Xây dựng nền tảng: Chuẩn hóa phát âm IPA, từ vựng cơ bản và phản xạ giao tiếp ban đầu.'),
(2, 2, 0, 199, 'Củng cố ngữ pháp: Hệ thống hóa 12 thì, từ loại, câu bị động và luyện nghe câu hỏi ngắn.'),
(3, 3, 0, 199, 'Hoàn thiện nền tảng: Luyện kỹ năng đọc hiểu cơ bản, nghe hội thoại ngắn để chuẩn bị lên cấp độ TOEIC.'),
(4, 4, 200, 399, 'Bắt đầu TOEIC 450+: Học 600 từ vựng chủ đề công sở và ngữ pháp chuyên biệt cho Part 5 & Part 6.'),
(5, 5, 200, 399, 'Phát triển kỹ năng: Luyện nghe tranh Part 1, hỏi đáp Part 2 và đọc hiểu đoạn văn ngắn Part 7.'),
(6, 6, 200, 399, 'Tối ưu điểm số 450+: Tổng hợp chiến thuật làm đề thi rút gọn và luyện tập tránh các bẫy cơ bản.'),
(7, 7, 400, 549, 'Chinh phục 650+ (Đọc): Chuyên đề từ vựng nâng cao, mẹo tránh bẫy Part 5, 6 và chiến thuật Skimming/Scanning cho Part 7.'),
(8, 8, 400, 549, 'Chinh phục 650+ (Nghe): Luyện nghe giọng đa quốc gia Part 3, 4 và giải đề thi thật 200 câu để tối ưu hóa thời gian.');

-- --------------------------------------------------------
-- Table structure for table `nguoidung`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `nguoidung`;
CREATE TABLE `nguoidung` (
  `MaNguoiDung` int NOT NULL AUTO_INCREMENT,
  `HoTen` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `SoDienThoai` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `MatKhau` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Đã mã hóa Bcrypt',
  `AnhDaiDien` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'default_avatar.png',
  `MaVaiTro` int NOT NULL,
  `TrangThai` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Chưa kích hoạt' COMMENT 'Chưa kích hoạt | Hoạt động | Khóa',
  `NgayTao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaNguoiDung`),
  UNIQUE KEY `Email` (`Email`),
  KEY `idx_nd_email` (`Email`),
  KEY `idx_nd_vaitro` (`MaVaiTro`),
  CONSTRAINT `fk_nd_vaitro` FOREIGN KEY (`MaVaiTro`) REFERENCES `vaitro` (`MaVaiTro`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `nguoidung`
INSERT INTO `nguoidung` (`MaNguoiDung`, `HoTen`, `Email`, `SoDienThoai`, `MatKhau`, `AnhDaiDien`, `MaVaiTro`, `TrangThai`, `NgayTao`) VALUES
(1, 'Admin', 'yenvy27104@gmail.com', '0967815400', '$2b$10$y8p4Suwr5r7oBVegMC64u.IQW6J.zo5kL8hjwZZk7ND/JQ1YaMyBy', '/images/AVT/admin.jpg', 1, 'Hoạt động', '2026-06-16 15:29:27'),
(2, 'Trần Thị Lan', 'yenvytranthi297@gmail.com', '0901000002', '$2b$10$RsuK/XG7oGVeGamzA3HWf.0spmS9Dr06yL7Yvlg.Qc5qdaqi/XDC6', '/images/AVT/lan.png', 2, 'Hoạt động', '2026-06-16 15:29:27'),
(3, 'Lê Minh Khoa', 'vyvy27104@gmail.com', '0901000003', '$2b$10$RsuK/XG7oGVeGamzA3HWf.0spmS9Dr06yL7Yvlg.Qc5qdaqi/XDC6', '/images/AVT/khoa.jpg', 2, 'Hoạt động', '2026-06-16 15:29:27'),
(4, 'Nguyễn Thị Mai', 'tivy22132@gmail.com', '0912000001', '$2b$10$iHtOzZS/ckWWSOU1ihItguJB3UCHObmimgcEp6uOogNMxvBKQFsD.', '/images/AVT/hoa.jpg', 3, 'Hoạt động', '2026-06-16 15:29:27');

-- --------------------------------------------------------
-- Table structure for table `phonghoc`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `phonghoc`;
CREATE TABLE `phonghoc` (
  `MaPhongHoc` int NOT NULL AUTO_INCREMENT,
  `TenPhong` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `SucChua` int DEFAULT NULL,
  `ViTri` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Vị trí phòng học, ví dụ: Tầng 1, Tòa A',
  PRIMARY KEY (`MaPhongHoc`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `phonghoc`
INSERT INTO `phonghoc` (`MaPhongHoc`, `TenPhong`, `SucChua`, `ViTri`) VALUES
(1, 'P101', 25, 'Tầng 1, Tòa A'),
(2, 'P102', 25, 'Tầng 1, Tòa A'),
(3, 'P201', 30, 'Tầng 2, Tòa A'),
(4, 'P202', 30, 'Tầng 2, Tòa A'),
(5, 'P301', 20, 'Tầng 3, Tòa A');

-- --------------------------------------------------------
-- Table structure for table `quanlydiem`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `quanlydiem`;
CREATE TABLE `quanlydiem` (
  `MaBangDiem` int NOT NULL AUTO_INCREMENT,
  `MaHocVien` int NOT NULL,
  `MaLopHoc` int NOT NULL,
  `DiemGiuaKy` float DEFAULT NULL,
  `DiemCuoiKy` float DEFAULT NULL,
  `NhanXetGiangVien` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`MaBangDiem`),
  UNIQUE KEY `uq_qld_hv_lop` (`MaHocVien`,`MaLopHoc`),
  KEY `fk_qld_lh` (`MaLopHoc`),
  CONSTRAINT `fk_qld_hv` FOREIGN KEY (`MaHocVien`) REFERENCES `hosohocvien` (`MaHocVien`),
  CONSTRAINT `fk_qld_lh` FOREIGN KEY (`MaLopHoc`) REFERENCES `lophoc` (`MaLopHoc`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `quanlydiem`
INSERT INTO `quanlydiem` (`MaBangDiem`, `MaHocVien`, `MaLopHoc`, `DiemGiuaKy`, `DiemCuoiKy`, `NhanXetGiangVien`) VALUES
(1, 1, 1, 450, 650, 'Học viên chăm chỉ, tiến bộ tốt');

-- --------------------------------------------------------
-- Table structure for table `thoikhoabieu`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `thoikhoabieu`;
CREATE TABLE `thoikhoabieu` (
  `MaTKB` int NOT NULL AUTO_INCREMENT,
  `MaLopHoc` int NOT NULL,
  `MaPhongHoc` int NOT NULL,
  `MaBuoiHoc` int NOT NULL,
  `ThuTrongTuan` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Thứ Hai | Thứ Ba | ... | Chủ Nhật',
  PRIMARY KEY (`MaTKB`),
  KEY `idx_tkb_ph` (`MaPhongHoc`),
  KEY `fk_tkb_lh` (`MaLopHoc`),
  KEY `fk_tkb_bh` (`MaBuoiHoc`),
  CONSTRAINT `fk_tkb_bh` FOREIGN KEY (`MaBuoiHoc`) REFERENCES `buoihoc` (`MaBuoiHoc`),
  CONSTRAINT `fk_tkb_lh` FOREIGN KEY (`MaLopHoc`) REFERENCES `lophoc` (`MaLopHoc`),
  CONSTRAINT `fk_tkb_ph` FOREIGN KEY (`MaPhongHoc`) REFERENCES `phonghoc` (`MaPhongHoc`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `thoikhoabieu`
INSERT INTO `thoikhoabieu` (`MaTKB`, `MaLopHoc`, `MaPhongHoc`, `MaBuoiHoc`, `ThuTrongTuan`) VALUES
(1, 1, 1, 5, 'Thứ Hai'),
(2, 1, 1, 5, 'Thứ Tư'),
(3, 1, 1, 5, 'Thứ Sáu'),
(4, 2, 2, 1, 'Thứ Ba'),
(5, 2, 2, 1, 'Thứ Năm'),
(6, 2, 2, 1, 'Thứ Bảy'),
(7, 3, 3, 7, 'Thứ Hai'),
(8, 3, 3, 7, 'Thứ Tư'),
(9, 3, 3, 7, 'Thứ Sáu'),
(10, 4, 4, 7, 'Thứ Ba'),
(11, 4, 4, 7, 'Thứ Năm'),
(12, 4, 4, 7, 'Thứ Bảy');

-- --------------------------------------------------------
-- Table structure for table `tintuc`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `tintuc`;
CREATE TABLE `tintuc` (
  `MaTinTuc` int NOT NULL AUTO_INCREMENT,
  `TieuDe` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `TomTat` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `NoiDung` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `HinhAnh` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `NgayDang` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `MaNguoiDang` int NOT NULL,
  PRIMARY KEY (`MaTinTuc`),
  KEY `fk_tt_nd` (`MaNguoiDang`),
  KEY `idx_tt_ngaydang` (`NgayDang` DESC),
  CONSTRAINT `fk_tt_nd` FOREIGN KEY (`MaNguoiDang`) REFERENCES `nguoidung` (`MaNguoiDung`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `tintuc`
INSERT INTO `tintuc` (`MaTinTuc`, `TieuDe`, `TomTat`, `NoiDung`, `HinhAnh`, `NgayDang`, `MaNguoiDang`) VALUES
(1, 'Cập nhật format TOEIC mới nhất năm 2026', 'Những thay đổi quan trọng về cấu trúc đề thi TOEIC mà các thí sinh cần biết để đạt điểm cao.', 'Tìm hiểu chi tiết cấu trúc đề thi TOEIC mới nhất với mô tả chi tiết từng Part từ 1 đến 7 và mẹo phân bổ thời gian.', '/images/Cap_Nhat_Fomat.png', '2026-07-11 23:53:04', 1),
(2, 'Mẹo làm bài Toeic Listening bứt phá điểm số', '5 chiến thuật nghe bắt từ khóa đỉnh cao giúp bạn bứt phá tối đa điểm số TOEIC Listening.', 'Chiến thuật 1: Tận dụng thời gian vàng (Golden Time) để phán đoán trước... Chiến thuật 2: Đoán từ loại của đáp án...', '/images/Meo copy.png', '2026-07-11 23:53:04', 1),
(3, 'Kho 100 từ vựng TOEIC chủ đề văn phòng hay gặp', 'Tổng hợp đầy đủ chức vụ, phòng ban, phúc lợi, văn phòng phẩm và mẫu câu giao tiếp văn phòng hay gặp.', 'Kho từ vựng Tiếng Anh chủ đề Văn phòng & Công việc (Office & Corporate) với âm thanh phát âm và thanh tìm kiếm trực tuyến...', '/images/Kho_Tu_Vung.png', '2026-07-11 23:53:04', 1);

-- --------------------------------------------------------
-- Table structure for table `vaitro`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `vaitro`;
CREATE TABLE `vaitro` (
  `MaVaiTro` int NOT NULL AUTO_INCREMENT,
  `TenVaiTro` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `MoTa` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`MaVaiTro`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `vaitro`
INSERT INTO `vaitro` (`MaVaiTro`, `TenVaiTro`, `MoTa`) VALUES
(1, 'Admin', 'Quản trị viên toàn hệ thống'),
(2, 'Giảng viên', 'Giảng viên'),
(3, 'Học viên', 'Học viên đã đăng ký tài khoản');

SET FOREIGN_KEY_CHECKS=1;
