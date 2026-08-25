const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const filePath = path.join(__dirname, '..', 'views', 'student', 'classes.ejs');

const remainingCode = `
                                              <% } %>
                                        </div>
                                        <% } %>

                                        <!-- Điểm số & Nhận xét -->
                                        <% if ((grades && grades.length > 0 && (activeTab === 'overview' || activeTab === 'grades')) || activeTab === 'grades') { %>
                                        <div class="portal-card mb-4" id="grades-section">
                                          <div class="portal-card-header">
                                            <h4 class="portal-card-title"><i class="bi bi-bookmark-star-fill text-warning me-2"></i>Điểm số & Nhận xét</h4>
                                          </div>
                                          <div class="portal-card-body p-4">
                                            <% if (grades && grades.length > 0) { %>
                                              <div class="table-responsive">
                                                <table class="table table-hover align-middle">
                                                  <thead class="table-light">
                                                    <tr>
                                                      <th>Lớp học</th>
                                                      <th>Chuyên cần</th>
                                                      <th>Bài tập</th>
                                                      <th>Giữa kỳ</th>
                                                      <th>Cuối kỳ</th>
                                                      <th>Tổng kết</th>
                                                      <th>Nhận xét</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    <% grades.forEach(g => { %>
                                                      <tr>
                                                        <td class="fw-bold"><%= g.TenLop %></td>
                                                        <td><%= g.DiemChuyenCan || '-' %></td>
                                                        <td><%= g.DiemBaiTap || '-' %></td>
                                                        <td><%= g.DiemGiuaKy || '-' %></td>
                                                        <td><%= g.DiemCuoiKy || '-' %></td>
                                                        <td><span class="badge bg-primary fs-6"><%= g.DiemTongKet || '-' %></span></td>
                                                        <td class="small text-muted"><%= g.NhanXet || 'Chưa có nhận xét' %></td>
                                                      </tr>
                                                    <% }) %>
                                                  </tbody>
                                                </table>
                                              </div>
                                            <% } else { %>
                                              <p class="text-muted text-center py-3 mb-0">Tài khoản chưa có dữ liệu điểm số. Vui lòng đăng ký tham gia lớp học chính thức.</p>
                                            <% } %>
                                          </div>
                                        </div>
                                        <% } %>

                                        <!-- Thời khóa biểu -->
                                        <% if ((timetable && timetable.length > 0 && (activeTab === 'overview' || activeTab === 'schedule')) || activeTab === 'schedule') { %>
                                        <div class="portal-card mb-4" id="schedule-section">
                                          <div class="portal-card-header">
                                            <h4 class="portal-card-title"><i class="bi bi-calendar3 text-primary me-2"></i>Thời khóa biểu học tập</h4>
                                          </div>
                                          <div class="portal-card-body p-4">
                                            <% if (timetable && timetable.length > 0) { %>
                                              <div class="row g-3">
                                                <% timetable.forEach(t => { %>
                                                  <div class="col-md-6 col-lg-4">
                                                    <div class="p-3 border rounded-3 bg-light shadow-sm">
                                                      <div class="fw-bold text-primary mb-1"><%= t.TenLop %></div>
                                                      <div class="small text-secondary mb-1"><i class="bi bi-calendar-event me-1"></i><%= t.ThuTrongTuan || t.TKBText %></div>
                                                      <div class="small text-muted"><i class="bi bi-clock me-1"></i><%= t.GioHoc || '' %></div>
                                                    </div>
                                                  </div>
                                                <% }) %>
                                              </div>
                                            <% } else { %>
                                              <p class="text-muted text-center py-3 mb-0">Tài khoản chưa có lịch học chính thức. Vui lòng đăng ký tham gia lớp học.</p>
                                            <% } %>
                                          </div>
                                        </div>
                                        <% } %>

                                      </div>
                                    </div>
                                  </div>
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

  window.registerClassSubmit = window.handleDirectRegistration;
})();
</script>

<%- include('../layouts/footer.ejs') %>
`;

let currentContent = fs.readFileSync(filePath, 'utf8');

const cutoffIndex = currentContent.indexOf('<% } %>\n                                                        </td>\n                                                      </tr>\n                                                      <% }) %>\n                                                   </tbody>\n                                                 </table>\n                                               </div>');

if (cutoffIndex !== -1) {
  const headerPart = currentContent.substring(0, cutoffIndex + '<% } %>\n                                                        </td>\n                                                      </tr>\n                                                      <% }) %>\n                                                   </tbody>\n                                                 </table>\n                                               </div>'.length);
  fs.writeFileSync(filePath, headerPart + '\n' + remainingCode, 'utf8');
} else {
  fs.writeFileSync(filePath, currentContent + '\n' + remainingCode, 'utf8');
}

try {
  ejs.compile(fs.readFileSync(filePath, 'utf8'));
  console.log('SUCCESS: classes.ejs compiled cleanly with zero syntax errors!');
} catch (err) {
  console.error('EJS Compile Error:', err.message);
}
