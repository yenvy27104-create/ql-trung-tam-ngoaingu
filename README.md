# 🏫 Hệ Thống Quản Lý Trung Tâm Anh Ngữ Y&V

![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![EJS](https://img.shields.io/badge/EJS-B4CA65?style=for-the-badge&logo=ejs&logoColor=black)
![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap_5-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white)

Hệ thống web toàn diện hỗ trợ quản lý vận hành trung tâm Anh ngữ, từ khâu tuyển sinh, thanh toán, đến theo dõi lộ trình học tập và kiểm tra đầu vào TOEIC tự động.

## ✨ Tính Năng Nổi Bật

### 👮 Dành cho Quản trị viên (Admin)
- **Quản lý học vụ:** Lên lịch giảng dạy (Thời khóa biểu), phân bổ phòng học, quản lý lớp học.
- **Quản lý nhân sự & học viên:** Phân quyền hệ thống, theo dõi hồ sơ giảng viên/học viên.
- **Quản lý tài chính:** Tích hợp thanh toán trực tuyến **SePay VietQR** với Webhook tự động xác nhận học phí.
- **Quản lý nội dung:** Cập nhật khóa học, chương trình khuyến mãi, tin tức.

### 👩‍🏫 Dành cho Giảng viên
- Theo dõi lịch dạy cá nhân.
- Quản lý điểm số, điểm danh, và viết nhận xét lộ trình học viên.

### 👨‍🎓 Dành cho Học viên
- Đăng ký khóa học và thanh toán trực tuyến dễ dàng.
- **Hệ thống Testing tự động:** Làm bài thi thử TOEIC trực tuyến (chấm điểm Reading/Listening tức thì) và nhận đề xuất lộ trình học dựa trên điểm số.
- Theo dõi lịch học, điểm số cá nhân.

## 🛠 Hướng Dẫn Cài Đặt (Local Development)

### 1. Yêu cầu hệ thống
- Node.js (v16 trở lên)
- MySQL / TiDB

### 2. Cài đặt

```bash
# Clone repository
git clone [https://github.com/yenvy27104-create/english-center-management-system.git](https://github.com/yenvy27104-create/english-center-management-system.git)

# Di chuyển vào thư mục dự án
cd english-center-management-system

# Cài đặt thư viện
npm install