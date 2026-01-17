// --- KHỞI TẠO DỮ LIỆU ---
let currentClub = "";
let students = JSON.parse(localStorage.getItem('vovinamStudents')) || [];
let posts = JSON.parse(localStorage.getItem('vovinamPosts')) || [
    { title: "Thông báo tập huấn", content: "Kế hoạch tập huấn quý 1 cho các CLB...", date: "2024-01-15" }
];
let currentUser = JSON.parse(localStorage.getItem('vovinamCurrentUser'));

// Chạy hàm kiểm tra ngay khi load trang
checkLoginStatus();
renderNews();

// --- 0. HÀM KIỂM TRA QUYỀN ADMIN (QUAN TRỌNG) ---
// Quy ước: Số điện thoại '000' là Huấn Luyện Viên (Admin)
function isAdmin() {
    return currentUser && currentUser.phone === '000';
}

// --- 1. XỬ LÝ ĐĂNG KÝ & ĐĂNG NHẬP ---

// Xử lý ĐĂNG KÝ
document.getElementById('register-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const phone = document.getElementById('reg-phone').value;
    const dob = document.getElementById('reg-dob').value;
    const club = document.getElementById('reg-club').value;

    if (!club) { alert("Vui lòng chọn Câu Lạc Bộ!"); return; }
    
    // Kiểm tra SĐT trùng
    if (students.some(s => s.phone === phone)) { 
        alert("Số điện thoại này đã được đăng ký!"); return; 
    }

    const newStudent = {
        id: Date.now(),
        club: club,
        name: name,
        phone: phone,
        dob: dob,
        img: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png", // Ảnh mặc định
        isPresent: false
    };

    students.push(newStudent);
    localStorage.setItem('vovinamStudents', JSON.stringify(students));
    alert("Đăng ký thành công! Vui lòng đăng nhập.");
    document.getElementById('register-form').reset();
    showSection('login');
});

// Xử lý ĐĂNG NHẬP
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('login-name').value.trim();
    const phone = document.getElementById('login-phone').value.trim();

    // --- CỬA SAU DÀNH CHO ADMIN ---
    // Nếu nhập tên "Admin" và SĐT "000" thì vào quyền quản trị
    if (phone === '000' && name.toLowerCase() === 'admin') {
        currentUser = { name: "Huấn Luyện Viên", phone: "000", club: "ALL", role: "admin" };
        loginSuccess();
        return;
    }

    // Kiểm tra môn sinh thường
    const user = students.find(s => s.phone === phone && s.name.toLowerCase() === name.toLowerCase());
    if (user) {
        currentUser = user;
        loginSuccess();
    } else {
        alert("Thông tin không đúng hoặc chưa đăng ký!");
    }
});

function loginSuccess() {
    localStorage.setItem('vovinamCurrentUser', JSON.stringify(currentUser));
    alert(`Xin chào ${currentUser.name}!`);
    checkLoginStatus();
    showSection('home');
}

// Hàm cập nhật giao diện theo trạng thái đăng nhập
function checkLoginStatus() {
    const authActions = document.getElementById('auth-actions');
    const userDisplay = document.getElementById('user-display');
    const userNameSpan = document.getElementById('user-name-display');
    const menuItems = document.querySelectorAll('#club-menu-list li');

    if (currentUser) {
        // Đã đăng nhập
        authActions.style.display = 'none';
        userDisplay.style.display = 'flex';
        userNameSpan.innerText = isAdmin() ? `HLV: ${currentUser.name}` : `Môn sinh: ${currentUser.name}`;

        // Lọc Menu: Admin thấy hết, Môn sinh chỉ thấy CLB của mình
        menuItems.forEach(item => {
            const clubAttr = item.getAttribute('data-club');
            if (isAdmin() || clubAttr === currentUser.club) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    } else {
        // Chưa đăng nhập
        authActions.style.display = 'flex';
        userDisplay.style.display = 'none';
        // Hiện hết menu (nhưng bấm vào sẽ bị chặn)
        menuItems.forEach(item => item.style.display = 'block');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('vovinamCurrentUser');
    checkLoginStatus();
    showSection('home');
}

// --- 2. QUẢN LÝ CLB & PHÂN QUYỀN ---

function showSection(sectionId) {
    document.querySelectorAll('main > section').forEach(sec => sec.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
    window.scrollTo(0, 0);
}

function openClubManager(clubName) {
    if (!currentUser) { alert("Vui lòng đăng nhập!"); showSection('login'); return; }

    // Logic chặn quyền truy cập trái phép
    if (!isAdmin() && currentUser.club !== clubName) {
        alert(`Bạn là thành viên CLB ${currentUser.club}, không được xem CLB ${clubName}!`);
        return;
    }

    currentClub = clubName;
    document.getElementById('current-club-title').innerText = `Danh sách: ${clubName}`;
    
    // ẨN/HIỆN NÚT "THÊM MÔN SINH"
    const btnAdd = document.getElementById('btn-add-student');
    if (btnAdd) {
        // Nếu là Admin thì hiện, Môn sinh thì ẩn
        btnAdd.style.display = isAdmin() ? 'block' : 'none';
    }

    showSection('club-manager');
    switchTab('attendance');
}

function switchTab(tabId) {
    document.getElementById('tab-attendance').style.display = 'none';
    document.getElementById('tab-add-student').style.display = 'none';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).style.display = 'block';
    
    // Active đúng nút tab
    if(tabId === 'attendance') {
        document.querySelector('.tab-btn').classList.add('active'); // Nút đầu tiên (Điểm danh)
        renderAttendanceTable();
    } else {
        const btnAdd = document.getElementById('btn-add-student');
        if(btnAdd) btnAdd.classList.add('active');
    }
}

// --- 3. HIỂN THỊ DANH SÁCH & ĐIỂM DANH ---

function renderAttendanceTable() {
    const tbody = document.getElementById('attendance-list');
    tbody.innerHTML = "";
    
    // Lọc môn sinh theo CLB
    const clubStudents = students.filter(s => s.club === currentClub);

    if (clubStudents.length === 0) {
        document.getElementById('empty-list-msg').style.display = 'block';
        return;
    } else {
        document.getElementById('empty-list-msg').style.display = 'none';
    }

    clubStudents.forEach((student, index) => {
        const tr = document.createElement('tr');
        
        // --- XỬ LÝ CỘT TRẠNG THÁI (QUAN TRỌNG) ---
        let statusHTML = '';
        if (isAdmin()) {
            // ADMIN: Được hiện nút gạt để chỉnh sửa
            statusHTML = `
                <label class="switch">
                    <input type="checkbox" ${student.isPresent ? 'checked' : ''} onchange="toggleAttendance(${student.id})">
                    <span class="slider"></span>
                </label>`;
        } else {
            // MÔN SINH: Chỉ hiện chữ (Read-only)
            if (student.isPresent) {
                statusHTML = `<span style="color: green; font-weight: bold;"><i class="fas fa-check-circle"></i> Có mặt</span>`;
            } else {
                statusHTML = `<span style="color: red; font-weight: bold;"><i class="fas fa-times-circle"></i> Vắng</span>`;
            }
        }

        // Highlight dòng của chính mình (nếu là môn sinh)
        const isMe = !isAdmin() && currentUser.phone === student.phone;
        const rowStyle = isMe ? 'background-color: #e3f2fd; border-left: 5px solid #0055A4;' : ''; 

        tr.innerHTML = `
            <td style="${rowStyle}">${index + 1}</td>
            <td style="${rowStyle}"><img src="${student.img}" class="student-avatar"></td>
            <td style="${rowStyle}">
                <strong>${student.name}</strong> ${isMe ? '<span style="color:red; font-size: 0.8em">(Bạn)</span>' : ''}<br>
                <small>${student.dob}</small>
            </td>
            <td style="${rowStyle}">${statusHTML}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Hàm xử lý khi Admin gạt nút điểm danh
function toggleAttendance(id) {
    const student = students.find(s => s.id === id);
    if (student) {
        student.isPresent = !student.isPresent;
        localStorage.setItem('vovinamStudents', JSON.stringify(students));
        // Không cần render lại toàn bộ để tránh giật lag, nút gạt tự đổi màu CSS
    }
}

// Xử lý Form thêm môn sinh (Chỉ Admin mới thấy và dùng được)
document.getElementById('add-student-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('student-name').value;
    const phone = document.getElementById('student-phone').value;
    const dob = document.getElementById('student-dob').value;
    
    // Lưu ý: Ảnh đang dùng link giả lập, thực tế cần xử lý file upload
    const imgUrl = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

    // Logic thêm vào mảng
    const newStudent = { 
        id: Date.now(), 
        club: currentClub, 
        name: name, 
        phone: phone, 
        dob: dob, 
        img: imgUrl, 
        isPresent: false 
    };
    
    students.push(newStudent);
    localStorage.setItem('vovinamStudents', JSON.stringify(students));
    
    alert(`Đã thêm môn sinh ${name} vào danh sách!`);
    document.getElementById('add-student-form').reset();
    switchTab('attendance'); // Quay về bảng danh sách
});

// --- 4. CHỨC NĂNG TIN TỨC & BÌNH LUẬN (ĐÃ NÂNG CẤP: SỬA/XÓA) ---

// Biến lưu trạng thái
let currentViewingPostId = null;
let editingPostId = null; // Biến mới: Theo dõi bài viết đang được sửa

// Hàm hỗ trợ tạo ID ngẫu nhiên
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// Ẩn/Hiện form đăng bài (Đã cập nhật logic cho chế độ Sửa)
function togglePostForm(isEditMode = false) {
    const form = document.getElementById('post-creator');
    const submitBtn = form.querySelector('.btn-submit');
    
    if (form.style.display === 'none') {
        form.style.display = 'block';
        // Nếu KHÔNG phải chế độ sửa -> Reset form thành trống để đăng bài mới
        if (!isEditMode) {
            document.getElementById('post-title').value = "";
            document.getElementById('post-content').innerHTML = "";
            editingPostId = null;
            if(submitBtn) submitBtn.innerText = "Đăng bài";
        }
    } else {
        // Nếu đang hiện mà người dùng bấm tắt (và không phải đang sửa) -> Ẩn đi
        if (!isEditMode) form.style.display = 'none';
    }
}

function formatDoc(cmd, value = null) { document.execCommand(cmd, false, value); }
// --- HÀM XỬ LÝ MEDIA (MỚI) ---

function handleMediaUpload(input) {
    const file = input.files[0];
    if (!file) return;

    // Kiểm tra kích thước file (Giới hạn 3MB để tránh đơ trình duyệt)
    if (file.size > 3 * 1024 * 1024) {
        alert("Vui lòng chọn ảnh/video dưới 3MB để đảm bảo tốc độ website!");
        return;
    }

    const reader = new FileReader();

    // Khi đọc file xong
    reader.onload = function(e) {
        const result = e.target.result; // Chuỗi Base64 của file
        let mediaHTML = "";

        // Kiểm tra xem là Video hay Ảnh
        if (file.type.startsWith('video')) {
            mediaHTML = `<br><video controls src="${result}"></video><br>`;
        } else {
            mediaHTML = `<br><img src="${result}" alt="Uploaded Image"><br>`;
        }

        // Chèn vào khung soạn thảo
        const editor = document.getElementById('post-content');
        
        // Cách 1: Chèn vào cuối (Đơn giản nhất, ít lỗi)
        editor.innerHTML += mediaHTML;
        
        // Reset input để chọn lại file khác nếu muốn
        input.value = "";
    };

    // Bắt đầu đọc file
    reader.readAsDataURL(file);
}

// Hàm Đăng bài / Lưu bài sửa (Logic mới quan trọng)
function publishPost() {
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').innerHTML;
    
    if(!title) { alert("Vui lòng nhập tiêu đề!"); return; }

    if (editingPostId) {
        // --- TRƯỜNG HỢP 1: ĐANG SỬA BÀI ---
        const post = posts.find(p => p.id === editingPostId);
        if (post) {
            post.title = title;
            post.content = content;
            alert("Đã cập nhật bài viết!");
        }
        editingPostId = null; // Reset trạng thái sau khi sửa xong
    } else {
        // --- TRƯỜNG HỢP 2: ĐĂNG BÀI MỚI ---
        const newPost = {
            id: generateId(),
            title: title,
            content: content,
            date: new Date().toLocaleDateString('vi-VN'),
            comments: []
        };
        posts.unshift(newPost);
        alert("Đã đăng bài viết mới!");
    }

    localStorage.setItem('vovinamPosts', JSON.stringify(posts));
    document.getElementById('post-creator').style.display = 'none';
    renderNews(); // Vẽ lại danh sách
}

// Hàm XÓA bài viết (Mới)
function deletePost(postId) {
    if (confirm("Bạn có chắc chắn muốn xóa bài viết này không? Hành động này không thể hoàn tác!")) {
        posts = posts.filter(p => p.id !== postId); // Lọc bỏ bài viết có ID tương ứng
        localStorage.setItem('vovinamPosts', JSON.stringify(posts));
        renderNews();
        alert("Đã xóa bài viết.");
    }
}

// Hàm SỬA bài viết (Mới)
function editPost(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Mở form ở chế độ Edit (true)
    togglePostForm(true); 

    // Đổ dữ liệu cũ vào form
    document.getElementById('post-title').value = post.title;
    document.getElementById('post-content').innerHTML = post.content;
    
    // Gán ID bài đang sửa vào biến
    editingPostId = postId;
    
    // Đổi tên nút bấm thành "Lưu cập nhật" cho dễ hiểu
    const submitBtn = document.querySelector('#post-creator .btn-submit');
    if(submitBtn) submitBtn.innerText = "Lưu cập nhật";
    
    // Cuộn màn hình lên chỗ form
    document.getElementById('post-creator').scrollIntoView({behavior: "smooth"});
}

// Hiển thị danh sách bài viết (Đã thêm nút Sửa/Xóa cho Admin)
function renderNews() {
    const listContainer = document.getElementById('news-feed');
    listContainer.innerHTML = "";
    
    const btnCreate = document.getElementById('btn-create-post');
    if(btnCreate) {
        btnCreate.style.display = isAdmin() ? 'block' : 'none';
    }

    posts.forEach(post => {
        const div = document.createElement('div');
        div.className = 'news-item';
        
        // Tạo nút Admin (Sửa/Xóa) chỉ hiển thị khi là Admin
        let adminActions = "";
        if (isAdmin()) {
            adminActions = `
                <div class="admin-actions">
                    <button class="btn-edit-post" onclick="editPost('${post.id}')"><i class="fas fa-edit"></i> Sửa</button>
                    <button class="btn-delete-post" onclick="deletePost('${post.id}')"><i class="fas fa-trash-alt"></i> Xóa</button>
                </div>
            `;
        }

        div.innerHTML = `
            <h3>${post.title}</h3>
            <small style="color:#666;">${post.date}</small>
            <div class="news-preview">${post.content}</div>
            <div class="read-more-btn" onclick="viewPost('${post.id}')">Xem chi tiết & Bình luận >></div>
            ${adminActions}
        `;
        listContainer.appendChild(div);
    });
}

// Chuyển sang màn hình xem chi tiết
function viewPost(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    currentViewingPostId = postId;

    document.getElementById('news-list-view').style.display = 'none';
    document.getElementById('news-detail-view').style.display = 'block';
    
    const btnCreate = document.getElementById('btn-create-post');
    if(btnCreate) btnCreate.style.display = 'none';

    document.getElementById('detail-title').innerText = post.title;
    document.getElementById('detail-date').innerText = post.date;
    document.getElementById('detail-content').innerHTML = post.content;

    renderComments(post);
    window.scrollTo(0, 0);
}

// Quay lại danh sách
function backToNewsList() {
    document.getElementById('news-detail-view').style.display = 'none';
    document.getElementById('news-list-view').style.display = 'block';
    currentViewingPostId = null;
    
    const btnCreate = document.getElementById('btn-create-post');
    if(btnCreate && isAdmin()) btnCreate.style.display = 'block';
}

// --- XỬ LÝ BÌNH LUẬN (GIỮ NGUYÊN NHƯNG CẦN DÁN LẠI VÌ ĐÃ XÓA PHẦN CUỐI) ---

function renderComments(post) {
    const commentList = document.getElementById('comment-list');
    commentList.innerHTML = "";

    if (!post.comments) post.comments = [];

    if (post.comments.length === 0) {
        commentList.innerHTML = "<p style='color:#777; font-style:italic;'>Chưa có bình luận nào.</p>";
        return;
    }

    post.comments.forEach(cmt => {
        const div = document.createElement('div');
        div.className = 'comment-item';
        
        let displayName = cmt.userName;
        let roleClass = "";
        
        if (cmt.isAdminComment) {
            displayName = "Huấn Luyện Viên - Quản Trị";
            roleClass = "admin-role";
        }

        let deleteBtn = "";
        if (isAdmin()) {
            deleteBtn = `<button class="btn-delete-cmt" onclick="deleteComment('${cmt.id}')" title="Xóa bình luận"><i class="fas fa-trash"></i></button>`;
        }

        div.innerHTML = `
            <div class="comment-author ${roleClass}">
                ${displayName} <span class="comment-date">(${cmt.date})</span>
            </div>
            <div class="comment-text">${cmt.text}</div>
            ${deleteBtn}
        `;
        commentList.appendChild(div);
    });
}

function submitComment(e) {
    e.preventDefault();
    if (!currentUser) { alert("Vui lòng đăng nhập để bình luận!"); showSection('login'); return; }

    const input = document.getElementById('comment-input');
    const text = input.value.trim();
    if (!text) return;

    const postIndex = posts.findIndex(p => p.id === currentViewingPostId);
    if (postIndex === -1) return;

    const newComment = {
        id: generateId(),
        userId: currentUser.phone,
        userName: currentUser.name,
        text: text,
        date: new Date().toLocaleString('vi-VN'),
        isAdminComment: isAdmin()
    };

    if (!posts[postIndex].comments) posts[postIndex].comments = [];
    posts[postIndex].comments.push(newComment);
    localStorage.setItem('vovinamPosts', JSON.stringify(posts));

    renderComments(posts[postIndex]);
    input.value = "";
}

function deleteComment(commentId) {
    if (!confirm("Bạn có chắc muốn xóa bình luận này?")) return;
    const postIndex = posts.findIndex(p => p.id === currentViewingPostId);
    if (postIndex === -1) return;
    posts[postIndex].comments = posts[postIndex].comments.filter(c => c.id !== commentId);
    localStorage.setItem('vovinamPosts', JSON.stringify(posts));
    renderComments(posts[postIndex]);
}