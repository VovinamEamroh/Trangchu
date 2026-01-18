<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vovinam - Khu Vực Đắk Lắk</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <header>
        <div class="header-content">
            <div class="logo-container">
                <img src="Logo_VVF.png" onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Vovinam_Logo.svg/1200px-Vovinam_Logo.svg.png'" alt="Logo" class="logo">
                <h1 class="hide-on-mobile">Vovinam Lộc Shadow</h1>
            </div>
            
            <nav>
                <ul class="main-menu">
                    <li onclick="showSection('home')"><a href="#">Trang chủ</a></li>
                    <li onclick="handleAdminClick()"><a href="#"><i class="fas fa-user-shield"></i> Quản trị</a></li>
                    
                    <li class="dropdown">
                        <a href="#">Câu Lạc Bộ <i class="fas fa-caret-down"></i></a>
                        <ul class="dropdown-content">
                            <li onclick="openClubManager('Nguyễn Huệ')"><a href="#">CLB Nguyễn Huệ</a></li>
                            <li onclick="openClubManager('Lê Hữu Trác')"><a href="#">CLB Lê Hữu Trác</a></li>
                            <li onclick="openClubManager('Nội Trú')"><a href="#">CLB Nội Trú</a></li>
                            <li onclick="openClubManager('Y Ngông')"><a href="#">CLB Y Ngông</a></li>
                        </ul>
                    </li>
                    <li onclick="showSection('news')"><a href="#">Tin tức</a></li>
                </ul>
            </nav>

            <div class="auth-buttons" id="auth-actions">
                <button class="btn-login" onclick="showSection('login')">Đăng Nhập</button>
                <button class="btn-register" onclick="showSection('register')">Đăng Ký</button>
            </div>
            <div class="user-info" id="user-display" style="display: none;">
                <span id="user-name-display">Xin chào, Môn sinh</span>
                <button class="btn-logout" onclick="logout()">Đăng xuất</button>
            </div>
        </div>
    </header>

    <main>
        <section id="home" class="active-section">
            <div class="banner">
                <h2>TINH HOA VÕ THUẬT VIỆT NAM</h2>
                <p>Rèn luyện thân thể - Tu dưỡng tinh thần</p>
            </div>
            <div class="club-slider">
                <h3>Các Câu Lạc Bộ Trực Thuộc</h3>
                <div class="slider-container">
                    <div class="club-card" onclick="openClubManager('Nguyễn Huệ')">
                        <i class="fas fa-school"></i> <h4>CLB Nguyễn Huệ</h4>
                    </div>
                    <div class="club-card" onclick="openClubManager('Lê Hữu Trác')">
                        <i class="fas fa-yin-yang"></i> <h4>CLB Lê Hữu Trác</h4>
                    </div>
                    <div class="club-card" onclick="openClubManager('Nội Trú')">
                        <i class="fas fa-users"></i> <h4>CLB Nội Trú</h4>
                    </div>
                    <div class="club-card" onclick="openClubManager('Y Ngông')">
                        <i class="fas fa-fist-raised"></i> <h4>CLB Y Ngông</h4>
                    </div>
                </div>
            </div>
        </section>

        <section id="admin-dashboard" style="display: none;">
            <h2 class="section-title">Bảng Quản Trị Viên</h2>
            
            <div class="admin-container">
                <div class="calendar-wrapper">
                    <div class="calendar-header">
                        <button onclick="changeMonth(-1)"><i class="fas fa-chevron-left"></i></button>
                        <h3 id="calendar-month-year">Tháng ...</h3>
                        <button onclick="changeMonth(1)"><i class="fas fa-chevron-right"></i></button>
                    </div>
                    <div class="calendar-grid" id="calendar-body">
                        </div>
                </div>

                <div id="daily-records-section" style="display: none; margin-top: 30px;">
                    <h3 id="selected-date-title" style="color: var(--vovinam-blue); border-bottom: 2px solid var(--vovinam-yellow); padding-bottom: 10px;">Dữ liệu ngày ...</h3>
                    <div id="club-records-list" class="records-grid">
                        </div>
                </div>

                <div id="record-detail-view" style="display: none; margin-top: 30px; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h4 id="detail-club-name">Chi tiết</h4>
                        <button onclick="closeDetailView()" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Đóng</button>
                    </div>
                    <div class="table-responsive">
                        <table class="detail-table">
                            <thead>
                                <tr>
                                    <th>Tên Môn Sinh</th>
                                    <th>Trạng Thái</th>
                                    <th>Ghi Chú</th>
                                </tr>
                            </thead>
                            <tbody id="detail-student-list"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>

        <section id="login" style="display: none;">
            <div class="auth-container">
                <h2>Đăng Nhập Môn Sinh</h2>
                <form id="login-form">
                    <div class="form-group">
                        <label>Họ và tên:</label>
                        <input type="text" id="login-name" placeholder="Nhập họ tên đã đăng ký" required>
                    </div>
                    <div class="form-group">
                        <label>Số điện thoại:</label>
                        <input type="number" id="login-phone" placeholder="Nhập số điện thoại" required>
                    </div>
                    <button type="submit" class="btn-submit">Đăng Nhập</button>
                    <p class="auth-link">Bạn chưa có tài khoản? <a href="#" onclick="showSection('register')">Đăng ký ngay</a></p>
                </form>
            </div>
        </section>

        <section id="register" style="display: none;">
            <div class="auth-container">
                <h2>Đăng Ký Thành Viên Mới</h2>
                <form id="register-form">
                    <div class="form-group">
                        <label>Họ và tên:</label>
                        <input type="text" id="reg-name" placeholder="Nhập họ và tên..." required>
                    </div>
                    <div class="form-group">
                        <label>Số điện thoại:</label>
                        <input type="number" id="reg-phone" placeholder="Tối đa 10 số" maxlength="10" required>
                    </div>
                    <div class="form-group">
                        <label>Ngày sinh:</label>
                        <input type="date" id="reg-dob" required>
                    </div>
                    <div class="form-group">
                        <label>Chọn Câu Lạc Bộ mong muốn:</label>
                        <select id="reg-club" required>
                            <option value="">-- Chọn CLB --</option>
                            <option value="Nguyễn Huệ">CLB Nguyễn Huệ</option>
                            <option value="Lê Hữu Trác">CLB Lê Hữu Trác</option>
                            <option value="Nội Trú">CLB Nội Trú</option>
                            <option value="Y Ngông">CLB Y Ngông</option>
                        </select>
                    </div>
                    <button type="submit" class="btn-submit">Đăng Ký Tham Gia</button>
                </form>
            </div>
        </section>

        <section id="club-manager" style="display: none;">
            <h2 id="current-club-title" class="section-title">Quản lý CLB</h2>
            <div class="club-tabs">
                <button class="tab-btn active" onclick="switchTab('attendance')">Điểm Danh</button>
                <button class="tab-btn" id="btn-add-student" onclick="switchTab('add-student')">Thêm Môn Sinh</button>
            </div>
            <div id="tab-add-student" class="tab-content" style="display: none;">
                <form id="add-student-form">
                    <div class="form-group">
                        <label>Họ và tên:</label>
                        <input type="text" id="student-name" placeholder="Nhập tên môn sinh..." required>
                    </div>
                    <div class="form-group">
                        <label>Số điện thoại (PH/Môn sinh):</label>
                        <input type="number" id="student-phone" placeholder="Tối đa 10 số" maxlength="10" required>
                    </div>
                    <div class="form-group">
                        <label>Ngày sinh:</label>
                        <input type="date" id="student-dob" required>
                    </div>
                    <div class="form-group">
                        <label>Ảnh đại diện:</label>
                        <input type="file" id="student-img" accept="image/*">
                    </div>
                    <button type="submit" class="btn-submit">Thêm vào danh sách</button>
                </form>
            </div>
            <div id="tab-attendance" class="tab-content">
                <div class="table-responsive">
                    <table id="attendance-table">
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Ảnh</th>
                                <th>Họ và Tên</th>
                                <th>Trạng Thái</th>
                                <th>Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody id="attendance-list"></tbody>
                    </table>
                </div>
                <div id="empty-list-msg" style="text-align: center; margin-top: 20px; color: #666; display: none;">
                    Chưa có môn sinh nào.
                </div>
                <div id="attendance-actions" style="text-align: center; margin-top: 20px; display: none;">
                    <button onclick="saveDailyAttendance()" class="btn-save-attendance">
                        <i class="fas fa-save"></i> Lưu Điểm Danh Hôm Nay
                    </button>
                </div>
            </div>
        </section>

        <section id="news" style="display: none;">
            <div class="news-header">
                <h2>Tin Tức & Thông Báo</h2>
                <button id="btn-create-post" onclick="togglePostForm()" class="btn-create-news" style="display: none;">
                    <i class="fas fa-pen"></i> Đăng bài mới
                </button>
            </div>
            <div id="post-creator" style="display: none;">
                <h3>Soạn thảo bài viết</h3>
                <input type="text" id="post-title" placeholder="Tiêu đề bài viết..." class="post-input">
                <div class="rich-editor-toolbar">
                    <button type="button" onclick="formatDoc('bold')" title="In đậm"><b>B</b></button>
                    <button type="button" onclick="formatDoc('italic')" title="In nghiêng"><i>I</i></button>
                    <button type="button" onclick="formatDoc('underline')" title="Gạch chân"><u>U</u></button>
                    <label for="media-upload" class="btn-tool-media" title="Thêm Ảnh/Video">
                        <i class="fas fa-photo-video"></i> Thêm Media
                    </label>
                    <input type="file" id="media-upload" accept="image/*, video/*" style="display: none;" onchange="handleMediaUpload(this)">
                </div>
                <div id="post-content" class="post-editor" contenteditable="true"></div>
                <button onclick="publishPost()" class="btn-submit">Đăng bài</button>
            </div>
            <div id="news-list-view">
                <div id="news-feed"></div>
            </div>
            <div id="news-detail-view" style="display: none;">
                <button onclick="backToNewsList()" class="btn-back"><i class="fas fa-arrow-left"></i> Quay lại danh sách</button>
                <div class="article-container">
                    <h1 id="detail-title">Tiêu đề bài viết</h1>
                    <small id="detail-date" style="color: #666;">Ngày đăng...</small>
                    <hr>
                    <div id="detail-content" class="article-content"></div>
                </div>
                <div class="comment-section">
                    <h3>Bình luận</h3>
                    <div id="comment-list"></div>
                    <form id="comment-form" onsubmit="submitComment(event)">
                        <input type="text" id="comment-input" placeholder="Viết bình luận của bạn..." required>
                        <button type="submit" class="btn-comment"><i class="fas fa-paper-plane"></i> Gửi</button>
                    </form>
                </div>
            </div>
        </section>
        
        <section id="profile" style="display: none;">
            <div class="profile-container">
                <div class="profile-header">
                    <div class="avatar-wrapper">
                        <img id="profile-img-preview" class="profile-avatar-large" src="">
                        <label for="profile-avatar-upload" class="btn-upload-avatar"><i class="fas fa-camera"></i></label>
                        <input type="file" id="profile-avatar-upload" style="display: none;" accept="image/*" onchange="previewProfileAvatar(this)">
                    </div>
                    <h2>Hồ Sơ Cá Nhân</h2>
                </div>
                <form id="profile-form" onsubmit="saveProfile(event)">
                    <div class="form-group">
                        <label>Họ và tên:</label>
                        <input type="text" id="profile-name" disabled>
                    </div>
                    <div class="form-group">
                        <label>Số điện thoại (Không thể sửa):</label>
                        <input type="text" id="profile-phone" disabled style="background-color: #eee;">
                    </div>
                    <div class="form-group">
                        <label>Ngày sinh:</label>
                        <input type="date" id="profile-dob" disabled>
                    </div>
                    <div class="form-group">
                        <label>Câu lạc bộ tham gia:</label>
                        <input type="text" id="profile-club" disabled style="background-color: #eee;">
                    </div>
                    <div class="profile-actions">
                        <button type="button" id="btn-edit-profile" class="btn-edit" onclick="enableEditProfile()"><i class="fas fa-pen"></i> Chỉnh sửa</button>
                        <button type="submit" id="btn-save-profile" class="btn-save" style="display: none;"><i class="fas fa-save"></i> Lưu thay đổi</button>
                    </div>
                </form>
            </div>
        </section>

    </main>

    <footer>
        <p>Liên hệ Ban Chủ Nhiệm</p>
        <p><i class="fas fa-phone-alt"></i> / Zalo: 0123456789</p>
        <p>&copy; Vovinam Lộc Shadow - Tinh thần Việt võ đạo</p>
    </footer>

    <script type="module" src="script.js"></script>
</body>
</html>
