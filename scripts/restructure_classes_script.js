const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'views', 'student', 'classes.ejs');
let content = fs.readFileSync(filePath, 'utf8');

const targetTag = '<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>';
const idx = content.indexOf(targetTag);

if (idx !== -1) {
  const head = content.substring(0, idx);

  const replacement = `<!-- MODAL CHI TIẾT KHÓA HỌC & ĐỀ CƯƠNG (SYLLABUS) -->
<div class="modal fade" id="courseDetailModal" tabindex="-1" aria-labelledby="courseDetailModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-xl">
    <div class="modal-content border-0 rounded-4 shadow-lg">
      <div class="modal-header border-0 bg-light p-4">
        <div>
          <h3 class="modal-title fw-bold text-dark fs-4 mb-1" id="modalCourseTitle">Tên khóa học</h3>
          <span class="text-muted small" id="modalClassCodeBadge">Mã lớp: --</span>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body p-4 p-md-5">
        <p id="modalCourseDesc" class="text-secondary fs-6 mb-4 line-height-base"></p>

        <!-- Nav Tabs cho Lớp học & Đề cương đào tạo -->
        <ul class="nav nav-tabs nav-justified mb-4" id="courseModalTab" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active fw-bold fs-6 py-2.5" id="classes-tab" data-bs-toggle="tab" data-bs-target="#classes-pane" type="button" role="tab" aria-controls="classes-pane" aria-selected="true">
              <i class="bi bi-calendar3 me-2 text-primary"></i>Danh sách lớp học mở tuyển sinh
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link fw-bold fs-6 py-2.5" id="syllabus-tab" data-bs-toggle="tab" data-bs-target="#syllabus-pane" type="button" role="tab" aria-controls="syllabus-pane" aria-selected="false">
              <i class="bi bi-journal-bookmark-fill me-2 text-success"></i>Đề cương đào tạo chi tiết (Syllabus)
            </button>
          </li>
        </ul>

        <div class="tab-content" id="courseModalTabContent">
          <!-- Pane 1: Danh sách lớp học -->
          <div class="tab-pane fade show active" id="classes-pane" role="tabpanel" aria-labelledby="classes-tab" tabindex="0">
            <div id="modalClassesListContainer" class="mb-3">
              <!-- Injected via JavaScript -->
            </div>
          </div>

          <!-- Pane 2: Đề cương đào tạo chi tiết -->
          <div class="tab-pane fade" id="syllabus-pane" role="tabpanel" aria-labelledby="syllabus-tab" tabindex="0">
            <div id="modalSyllabusContainer" class="mb-3">
              <!-- Injected via JavaScript -->
            </div>
          </div>
        </div>

        <div class="d-flex gap-2 pt-2">
          <button type="button" class="btn btn-secondary btn-lg w-100 fw-bold rounded-3" data-bs-dismiss="modal">Đóng</button>
        </div>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script>
(function() {
  window.showInputConditionWarningModal = function(classId, classTitle, data, callback) {
    const displayTitle = data.className || classTitle || 'lớp học';
    const checkboxText = data.confirmCheckboxText || \`Tôi xác nhận đã đọc kỹ yêu cầu đầu vào của lớp \${displayTitle} và tự chịu trách nhiệm về lựa chọn này.\`;

    Swal.fire({
      icon: 'warning',
      title: 'Cảnh báo điều kiện đầu vào',
      html: \`
        <div class="text-start p-1">
          <div class="alert alert-warning border-warning rounded-3 mb-3 p-3" style="background-color: #fff3cd; color: #664d03;">
            <div class="fw-bold mb-1"><i class="bi bi-exclamation-triangle-fill text-warning me-2 fs-5"></i>Lưu ý điều kiện đầu vào:</div>
            <div class="small" style="line-height: 1.5;">
              Hệ thống ghi nhận học viên <strong>chưa làm Bài Test đầu vào</strong> hoặc <strong>chưa học Khóa học tiền đề</strong> (Pre-TOEIC / Cơ bản) trước khi đăng ký lớp <strong>"\${displayTitle}"</strong>.
            </div>
          </div>
          <div class="form-check p-3 bg-light rounded-3 border border-secondary-subtle">
            <input class="form-check-input ms-0 me-2" type="checkbox" id="inputConditionCheckboxStudent" style="cursor: pointer; width: 1.2em; height: 1.2em;">
            <label class="form-check-label fw-semibold text-dark small" for="inputConditionCheckboxStudent" style="cursor: pointer; user-select: none;">
              \${checkboxText}
            </label>
          </div>
        </div>
      \`,
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-check-circle-fill me-1"></i>Xác nhận & Đăng ký',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#f39c12',
      cancelButtonColor: '#6c757d',
      focusConfirm: false,
      preConfirm: () => {
        const chk = document.getElementById('inputConditionCheckboxStudent');
        if (!chk || !chk.checked) {
          Swal.showValidationMessage('Vui lòng tích chọn xác nhận đã đọc kỹ yêu cầu đầu vào trước khi tiếp tục!');
          return false;
        }
        return true;
      }
    }).then((warnRes) => {
      if (warnRes.isConfirmed) {
        fetch('/courses/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ MaLopHoc: classId, confirmedInputWarning: true })
        })
        .then(res => res.json())
        .then(resData => {
          if (callback) callback(resData);
        })
        .catch(err => {
          console.error(err);
          Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Có lỗi xảy ra khi thêm vào giỏ hàng.' });
        });
      }
    });
  };

  const processAddToCartResult = (data) => {
    if (data.requireInputWarning) {
      window.showInputConditionWarningModal(data.MaLopHoc, data.className, data, processAddToCartResult);
      return;
    }

    if (data.success) {
      const badge = document.getElementById('header-cart-badge');
      if (badge) {
        badge.innerText = data.cartCount;
        badge.classList.remove('d-none');
      }

      Swal.fire({
        icon: 'success',
        title: 'Thêm vào giỏ hàng thành công!',
        text: \`Đã thêm lớp học vào giỏ hàng. Bạn có muốn đến giỏ hàng ngay không?\`,
        showCancelButton: true,
        confirmButtonText: 'Đến giỏ hàng',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#6c757d'
      }).then((navRes) => {
        if (navRes.isConfirmed) {
          window.location.href = '/courses/cart';
        }
      });
    } else {
      Swal.fire({
        icon: 'info',
        title: 'Thông báo',
        text: data.message || 'Lớp học này đã có trong giỏ hàng.',
        showCancelButton: true,
        confirmButtonText: 'Đến giỏ hàng',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#3498db'
      }).then((navRes) => {
        if (navRes.isConfirmed) {
          window.location.href = '/courses/cart';
        }
      });
    }
  };

  window.handleAddToCart = function(classId, classTitle) {
    if (!classId) return;

    fetch('/courses/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ MaLopHoc: classId })
    })
    .then(res => res.json())
    .then(data => {
      processAddToCartResult(data);
    })
    .catch(err => {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: 'Đã xảy ra lỗi khi thêm vào giỏ hàng.',
        confirmButtonText: 'Đồng ý'
      });
    });
  };

  window.addtoCartHandler = window.handleAddToCart;

  window.handleDirectRegistration = function (classId, fee, startDateStr, classTitle, courseTitle) {
    if (!classId) return;

    const processDirectRegResult = (data) => {
      if (data.requireInputWarning) {
        window.showInputConditionWarningModal(classId, classTitle, data, processDirectRegResult);
        return;
      }
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Thành công! 🎉',
          text: 'Đã thêm lớp vào danh sách đăng ký. Đang chuyển tới giỏ hàng...',
          timer: 1200,
          showConfirmButton: false
        }).then(() => {
          window.location.href = '/courses/cart';
        });
      } else {
        Swal.fire({
          icon: 'info',
          title: 'Thông báo',
          text: data.message || 'Lớp học này đã có trong giỏ hàng.',
          showCancelButton: true,
          confirmButtonText: 'Đến giỏ hàng',
          cancelButtonText: 'Hủy',
          confirmButtonColor: '#3498db'
        }).then((navRes) => {
          if (navRes.isConfirmed) {
            window.location.href = '/courses/cart';
          }
        });
      }
    };

    fetch('/courses/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ MaLopHoc: classId })
    })
    .then(res => res.json())
    .then(data => processDirectRegResult(data))
    .catch(err => {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Đã xảy ra lỗi khi đăng ký lớp.' });
    });
  };

  window.showClassDetailsModal = function(classId) {
    const available = <%- JSON.stringify(availableClasses || []) %>;
    const cls = available.find(c => String(c.MaLopHoc) === String(classId));
    if (!cls) return;

    document.getElementById('modalCourseTitle').innerText = cls.TenKhoaHoc || cls.TenLop;
    document.getElementById('modalClassCodeBadge').innerText = \`Mã lớp: \${cls.TenLop} | Trình độ: \${cls.CapDo || 'Mở rộng'}\`;
    document.getElementById('modalCourseDesc').innerText = cls.MoTa || \`Khóa học \${cls.TenKhoaHoc} tập trung xây dựng nền tảng vững chắc và luyện kỹ năng làm bài đạt mục tiêu đầu ra.\`;

    const listContainer = document.getElementById('modalClassesListContainer');
    if (listContainer) {
      listContainer.innerHTML = \`
        <div class="p-3.5 bg-light rounded-3 border">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h5 class="fw-bold text-primary mb-0">\${cls.TenLop}</h5>
            <span class="badge bg-success text-white px-3 py-1 rounded-pill">\${Number(cls.HocPhi || 0).toLocaleString('vi-VN')} đ</span>
          </div>
          <div class="row g-2 text-muted small mb-3">
            <div class="col-md-6"><i class="bi bi-clock text-primary me-1"></i><strong>Lịch học:</strong> \${cls.LichHoc || 'Chưa xếp lịch'}</div>
            <div class="col-md-6"><i class="bi bi-calendar-check text-success me-1"></i><strong>Khai giảng:</strong> \${cls.NgayKhaiGiang ? new Date(cls.NgayKhaiGiang).toLocaleDateString('vi-VN') : 'Đang cập nhật'}</div>
            <div class="col-md-6"><i class="bi bi-people text-info me-1"></i><strong>Sĩ số:</strong> \${cls.SiSoHienTai || 0} / \${cls.SiSoToiDa || 20} học viên</div>
          </div>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-outline-primary btn-sm rounded-pill px-3" onclick="handleAddToCart(\${cls.MaLopHoc}, '\${cls.TenLop}')"><i class="bi bi-cart-plus me-1"></i>Thêm vào giỏ hàng</button>
            <button type="button" class="btn btn-primary btn-sm fw-bold rounded-pill px-3" onclick="handleDirectRegistration(\${cls.MaLopHoc}, \${cls.HocPhi}, '\${cls.NgayKhaiGiang}', '\${cls.TenLop}', '\${cls.TenKhoaHoc}')">Đăng ký lớp</button>
          </div>
        </div>
      \`;
    }

    if (typeof loadCourseSyllabus === 'function') {
      loadCourseSyllabus(cls.MaKhoaHoc);
    }

    const modalEl = document.getElementById('courseDetailModal');
    if (modalEl) {
      const bsModal = new bootstrap.Modal(modalEl);
      bsModal.show();
    }
  };

  window.loadCourseSyllabus = async function(courseId) {
    const container = document.getElementById('modalSyllabusContainer');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2 text-muted">Đang tải đề cương chi tiết...</p></div>';
    try {
      const res = await fetch(\`/courses/syllabus/\${courseId}\`);
      const data = await res.json();
      if (data.success && data.syllabus && data.syllabus.length > 0) {
        let metaHtml = '';
        if (data.meta) {
          metaHtml = \`
            <div class="card border-0 bg-light rounded-3 mb-4 shadow-sm">
              <div class="card-body p-4">
                <div class="row g-3">
                  <div class="col-md-6">
                    <div class="d-flex align-items-start gap-2 mb-2.5">
                      <i class="bi bi-person-badge-fill text-primary fs-5"></i>
                      <div>
                        <strong class="text-dark">Đối tượng đầu vào:</strong> <span class="text-secondary d-block mt-0.5">\${data.meta.inputLevel}</span>
                      </div>
                    </div>
                    <div class="d-flex align-items-start gap-2 mb-2.5">
                      <i class="bi bi-headset text-success fs-5"></i>
                      <div>
                        <strong class="text-dark">Dịch vụ bổ trợ:</strong> <span class="text-secondary d-block mt-0.5">\${data.meta.services}</span>
                      </div>
                    </div>
                    <div class="d-flex align-items-start gap-2">
                      <i class="bi bi-clipboard-check-fill text-warning fs-5"></i>
                      <div>
                        <strong class="text-dark">Kiểm tra đánh giá:</strong> <span class="text-secondary d-block mt-0.5">\${data.meta.tests}</span>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="bg-white p-3.5 rounded-3 border">
                      <h6 class="fw-bold text-dark mb-2.5"><i class="bi bi-book-half text-danger me-2"></i>Trọng tâm kiến thức chính (Listening & Reading)</h6>
                      <ul class="list-unstyled mb-0 small text-secondary" style="line-height: 1.6;">
                        <li class="mb-2"><strong class="text-dark">🗣️ Ngữ âm:</strong> \${data.meta.phonetics}</li>
                        <li class="mb-2"><strong class="text-dark">📖 Từ vựng:</strong> \${data.meta.vocabulary}</li>
                        <li><strong class="text-dark">📝 Ngữ pháp:</strong> \${data.meta.grammar}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          \`;
        }

        let rowsHtml = '';
        data.syllabus.forEach(item => {
          let skillBadge = 'bg-primary-subtle text-primary';
          if (item.type.includes('Listening')) skillBadge = 'bg-info-subtle text-info-emphasis';
          else if (item.type.includes('Reading')) skillBadge = 'bg-success-subtle text-success';
          else if (item.type.includes('Exam') || item.type.includes('Test') || item.type.includes('PROGRESS')) skillBadge = 'bg-danger text-white';

          let testBadge = item.test ? \`<span class="badge bg-warning-subtle text-dark border border-warning fw-bold"><i class="bi bi-pencil-square me-1"></i>\${item.test}</span>\` : '<span class="text-muted small">--</span>';

          rowsHtml += \`
            <tr>
              <td class="fw-bold text-center" style="width: 100px;">Buổi \${item.session}</td>
              <td style="width: 180px;"><span class="badge \${skillBadge} p-2 rounded-2">\${item.topic}</span></td>
              <td>\${item.content}</td>
              <td class="text-center" style="width: 140px;">\${testBadge}</td>
            </tr>
          \`;
        });

        container.innerHTML = \`
          \${metaHtml}
          <div class="table-responsive rounded-3 border shadow-sm">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-dark">
                <tr>
                  <th class="text-center">Buổi học</th>
                  <th>Kỹ năng / Chủ đề</th>
                  <th>Nội dung chi tiết</th>
                  <th class="text-center">Bài kiểm tra / Đánh giá</th>
                </tr>
              </thead>
              <tbody>
                \${rowsHtml}
              </tbody>
            </table>
          </div>
        \`;
      } else {
        container.innerHTML = '<div class="alert alert-info py-3 small text-center"><i class="bi bi-info-circle me-2"></i>Đề cương chi tiết cho môn học này đang được bổ sung.</div>';
      }
    } catch (err) {
      console.error(err);
      container.innerHTML = '<div class="alert alert-danger py-3 small text-center"><i class="bi bi-exclamation-triangle me-2"></i>Không thể tải đề cương chi tiết lúc này.</div>';
    }
  };

  window.registerClassSubmit = window.handleDirectRegistration;
})();
</script>

<%- include('../layouts/footer.ejs') %>
`;

  fs.writeFileSync(filePath, head + replacement, 'utf8');
  console.log('Successfully restructured classes.ejs HTML & JS!');
} else {
  console.error('Target tag not found');
}
