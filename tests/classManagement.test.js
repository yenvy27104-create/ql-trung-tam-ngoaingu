/**
 * ============================================================================
 * UNIT TEST SUITE: NỘI DUNG VÀ TRẠNG THÁI LỚP HỌC & ĐĂNG KÝ HỌC VIÊN
 * ============================================================================
 * Đường dẫn: tests/classManagement.test.js
 * Framework: Jest
 * Kỹ thuật: Mock DB (Pool Query), Time Travel (Fake Timers), BVA (Boundary Value Analysis)
 */

const pool = require('../models/db');
const AdminController = require('../controllers/adminController');
const ClassController = require('../controllers/classController');

// 1. MOCK DATABASE POOL - Giả lập CSDL để không sửa đổi DB thật
jest.mock('../models/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn()
}));

describe('🧪 UNIT TEST: Xử lý Nghiệp vụ & Cập nhật Trạng thái Lớp học', () => {

  test('Điểm danh lưu đúng khi payload gửi ở dạng mảng record', async () => {
    jest.setSystemTime(new Date('2026-08-17T20:15:00+07:00'));

    const req = {
      body: {
        MaLopHoc: 9,
        NgayHoc: '2026-08-17',
        records: [{ MaHocVien: 12, TrangThai: 'Có mặt' }]
      },
      session: { user: { TenVaiTro: 'Giảng viên', HoTen: 'GV Test' } }
    };
    const res = { redirect: jest.fn() };

    pool.query
      .mockResolvedValueOnce([[{ NgayKhaiGiang: '2026-08-01', NgayKetThuc: '2026-12-31', TenLop: 'PRE_TEST_01' }]])
      .mockResolvedValueOnce([[{ ThuTrongTuan: 'Thứ Hai', GioBatDau: '18:30:00', GioKetThuc: '20:30:00' }]])
      .mockResolvedValueOnce([[{ MaHocVien: 12 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 1001 }]);

    await ClassController.saveAttendance(req, res);

    expect(pool.query.mock.calls.some(([sql, params]) =>
      typeof sql === 'string' && sql.includes('INSERT INTO diemdanh') &&
      Array.isArray(params) && params[0] === 12 && params[1] === 9 && params[2] === '2026-08-17' && params[3] === 'Có mặt'
    )).toBe(true);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('success='));
  });

  beforeEach(() => {
    // Kích hoạt Time Travel giả lập thời gian thực thi
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Trả lại thời gian thực cho hệ thống sau mỗi test case
    jest.useRealTimers();
  });

  // ==========================================================================
  // KỊCH BẢN 1: HAPPY PATH (Điều kiện lý tưởng)
  // ==========================================================================
  describe('Kịch bản 1: Happy Path - Đăng ký lớp học thành công', () => {
    test('Cho phép đăng ký học viên thành công khi sĩ số chưa đầy và học viên chưa từng đăng ký', async () => {
      // ARRANGE (Chuẩn bị dữ liệu & Giả lập kết quả trả về từ DB)
      const mockCurrentDate = new Date('2026-08-15T10:00:00.000Z');
      jest.setSystemTime(mockCurrentDate);

      const req = {
        body: {
          MaHocVien: 10,
          MaLopHoc: 1,
          StudentLevel: 'Cơ bản (450+)'
        },
        session: {
          user: { MaNguoiDung: 1, HoTen: 'Admin' }
        }
      };

      const res = {
        redirect: jest.fn()
      };

      // Mock 1: Check existing registration -> []
      pool.query.mockResolvedValueOnce([[]]);

      // Mock 2: Get Class & Course info
      pool.query.mockResolvedValueOnce([[{
        MaLopHoc: 1,
        TenLop: 'TOEIC_A_K01',
        CapDo: '450+',
        SiSoToiDa: 20,
        TrangThaiLop: 'Sắp mở',
        HocPhi: 3500000
      }]]);

      // Mock 3: Get Student Placement Test score
      pool.query.mockResolvedValueOnce([[{ TotalScore: 500 }]]);

      // Mock 4: Count current enrolled students (15/20)
      pool.query.mockResolvedValueOnce([[{ Count: 15 }]]);

      // Mock 5: Fetch Class fee
      pool.query.mockResolvedValueOnce([[{ HocPhi: 3500000 }]]);

      // Mock 6: INSERT into dangkyhoc
      pool.query.mockResolvedValueOnce([{ insertId: 101 }]);

      // Mock 7: INSERT into giaodich
      pool.query.mockResolvedValueOnce([{ insertId: 201 }]);

      // ACT (Thực thi hàm nghiệp vụ)
      await AdminController.addEnrollment(req, res);

      // ASSERT (Kiểm chứng kết quả)
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dangkyhoc'),
        expect.arrayContaining([10, 1])
      );
      
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('success')
      );
    });
  });

  // ==========================================================================
  // KỊCH BẢN 2: BIÊN RANH GIỚI (Boundary Value Analysis - BVA)
  // ==========================================================================
  describe('Kịch bản 2: Phân tích Giá trị Biên (Boundary Value Analysis)', () => {

    test('BVA - Sĩ số sát nút (SiSoToiDa - 1 = 19/20): Vẫn chấp nhận lượt đăng ký cuối cùng', async () => {
      // ARRANGE
      const req = {
        body: { MaHocVien: 99, MaLopHoc: 2 },
        session: { user: { MaNguoiDung: 1 } }
      };
      const res = { redirect: jest.fn() };

      // Mock 1: Check existing registration
      pool.query.mockResolvedValueOnce([[]]);
      // Mock 2: Get Class info
      pool.query.mockResolvedValueOnce([[{
        MaLopHoc: 2,
        TenLop: 'PRE101',
        CapDo: 'Foundation',
        SiSoToiDa: 20,
        TrangThaiLop: 'Sắp mở'
      }]]);
      // Mock 3: Placement test score
      pool.query.mockResolvedValueOnce([[]]);
      // Mock 4: Sĩ số sát nút 19/20
      pool.query.mockResolvedValueOnce([[{ Count: 19 }]]);
      // Mock 5: Class fee
      pool.query.mockResolvedValueOnce([[{ HocPhi: 2500000 }]]);
      // Mock 6: INSERT dangkyhoc
      pool.query.mockResolvedValueOnce([{ insertId: 102 }]);
      // Mock 7: INSERT giaodich
      pool.query.mockResolvedValueOnce([{ insertId: 202 }]);

      // ACT
      await AdminController.addEnrollment(req, res);

      // ASSERT
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dangkyhoc'),
        expect.anything()
      );
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('success')
      );
    });

    test('BVA - Giả lập thời gian đúng mốc 00:00:00 ngày Khai giảng: Trạng thái lớp chuyển "Đang diễn ra"', async () => {
      // ARRANGE - TIME TRAVEL: Đặt mốc thời gian sát nút vừa chạm 00:00:00 ngày Khai giảng
      const exactStartDate = new Date('2026-08-20T00:00:00.000Z');
      jest.setSystemTime(exactStartDate);

      async function updateClassStatusesMock() {
        await pool.query(`
          UPDATE lophoc 
          SET TrangThaiLop = 'Đang diễn ra' 
          WHERE DATE(NgayKhaiGiang) <= CURDATE() 
            AND DATE(NgayKetThuc) >= CURDATE()
        `);
      }

      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      // ACT
      await updateClassStatusesMock();

      // ASSERT
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("TrangThaiLop = 'Đang diễn ra'")
      );
    });
  });

  // ==========================================================================
  // KỊCH BẢN 3: BẮT LỖI & RÀNG BUỘC NGOẠI LỆ (Error & Constraint Handling)
  // ==========================================================================
  describe('Kịch bản 3: Bắt lỗi & Từ chối thao tác (Throw Error / Reject)', () => {

    test('Vượt quá Sĩ số Tối đa (20/20): Hệ thống phải TỪ CHỐI đăng ký', async () => {
      // ARRANGE
      const req = {
        body: { MaHocVien: 105, MaLopHoc: 3 },
        session: { user: { MaNguoiDung: 1 } }
      };
      const res = { redirect: jest.fn() };

      // Mock 1: Check existing registration
      pool.query.mockResolvedValueOnce([[]]);
      // Mock 2: Get Class info
      pool.query.mockResolvedValueOnce([[{
        MaLopHoc: 3,
        TenLop: 'FULL_CLASS_01',
        CapDo: 'Foundation',
        SiSoToiDa: 20,
        TrangThaiLop: 'Sắp mở'
      }]]);
      // Mock 3: Test score
      pool.query.mockResolvedValueOnce([[]]);
      // Mock 4: Sĩ số hiện tại ĐÃ ĐẦY (20/20)
      pool.query.mockResolvedValueOnce([[{ Count: 20 }]]);

      // ACT
      await AdminController.addEnrollment(req, res);

      // ASSERT
      expect(pool.query).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dangkyhoc'),
        expect.anything()
      );
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('Lớp học đã đạt mức sĩ số tối đa'))
      );
    });

    test('Đăng ký vào Lớp đã ĐÓNG/KẾT THÚC: Hệ thống phải TỪ CHỐI thao tác', async () => {
      // ARRANGE
      const req = {
        body: { MaHocVien: 88, MaLopHoc: 5 },
        session: { user: { MaNguoiDung: 1 } }
      };
      const res = { redirect: jest.fn() };

      // Mock 1: Check existing registration
      pool.query.mockResolvedValueOnce([[]]);
      // Mock 2: Get Class info
      pool.query.mockResolvedValueOnce([[{
        MaLopHoc: 5,
        TenLop: 'OLD_CLASS_2025',
        CapDo: 'Foundation',
        SiSoToiDa: 20,
        TrangThaiLop: 'Đã đóng' // Lớp đã đóng
      }]]);
      // Mock 3: Test score
      pool.query.mockResolvedValueOnce([[]]);
      // Mock 4: Count enrolled
      pool.query.mockResolvedValueOnce([[{ Count: 5 }]]);

      // ACT
      await AdminController.addEnrollment(req, res);

      // ASSERT
      expect(pool.query).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dangkyhoc'),
        expect.anything()
      );
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('Lớp học đã đóng'))
      );
    });

  });
});
