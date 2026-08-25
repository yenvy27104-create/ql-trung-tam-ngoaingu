/**
 * ============================================================================
 * BỘ ĐIỀU KHIỂN KHÓA HỌC (COURSE CONTROLLER)
 * ============================================================================
 * Xử lý hiển thị danh sách các khóa học công khai ngoài trang chủ cho khách viếng thăm.
 */

const Course = require('../models/Course');

class CourseController {
  /**
   * Lấy danh sách toàn bộ khóa học và render ra giao diện public
   */
  static async listCourses(req, res) {
    const courses = await Course.getAll();
    res.render('public/home', { courses, news: [], error: null, user: req.session.user });
  }
}

module.exports = CourseController;
