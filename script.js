// --- 1. NHÚNG THƯ VIỆN FIREBASE (Dạng link Web - CDN) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- 2. CẤU HÌNH KẾT NỐI (Đã điền đúng thông tin từ ảnh của bạn) ---
const firebaseConfig = {
    apiKey: "AIzaSyDn0yqXve0rYSEKFommFKV8J-McHEU-Nh4",
    authDomain: "vovinam-web-4eb57.firebaseapp.com",
    projectId: "vovinam-web-4eb57",
    storageBucket: "vovinam-web-4eb57.firebasestorage.app",
    messagingSenderId: "296472265647",
    appId: "1:296472265647:web:91a6261be41fc00f88255a"
};

// Khởi tạo kết nối
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 3. BIẾN TOÀN CỤC & KHỞI TẠO ---
let currentClub = "";
let students = []; // Dữ liệu sẽ được tải từ Firebase về đây
let posts = [];    // Dữ liệu tin tức tải từ Firebase
let currentUser = JSON.parse(localStorage.getItem('vovinamCurrentUser')); 

const COLL_STUDENTS = "students";
const COLL_POSTS = "posts";

// --- 4. LẮNG NGHE DỮ LIỆU THỜI GIAN THỰC (REAL-TIME) ---

// Lắng nghe danh sách MÔN SINH
onSnapshot(collection(db, COLL_STUDENTS), (snapshot) => {
    students = [];
    snapshot.forEach((doc) => {
        let data = doc.data();
        data.firebaseId = doc.id; // Lưu ID thật của Firebase
        students.push(data);
    });
    // Nếu đang mở bảng quản lý thì vẽ lại ngay
    if(document.getElementById('club-manager') && document.getElementById('club-manager').style.display === 'block') {
        renderAttendanceTable();
    }
});

// Lắng nghe danh sách TIN TỨC
const qPosts = query(collection(db, COLL_POSTS), orderBy("id", "desc")); 
onSnapshot(qPosts, (snapshot) => {
    posts = [];
    snapshot.forEach((doc) => {
        let data = doc.data();
        data.firebaseId = doc.id;
        posts.push(data);
    });
    renderNews(); // Vẽ lại tin tức ngay
});

// Chạy khởi tạo
checkLoginStatus();

// --- 5. CÁC HÀM HỖ TRỢ & GIAO DIỆN ---
// Lưu ý: Vì dùng type="module", các hàm được gọi từ HTML (onclick) cần gán vào window

window.showSection = function(sectionId) {
    document.querySelectorAll('main > section').forEach(sec => sec.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
    window.scrollTo(0, 0);
}

function isAdmin() { return currentUser && currentUser.phone === '000'; }
window.formatDoc = function(cmd, value = null) { document.execCommand(cmd, false, value); }

// --- 6. AUTHENTICATION (ĐĂNG KÝ / ĐĂNG NHẬP) ---

// ĐĂNG KÝ (Lưu lên Firebase)
document.getElementById('register-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const phone = document.getElementById('reg-phone').value;
    const dob = document.getElementById('reg-dob').value;
    const club = document.getElementById('reg-club').value;

    if (!club) { alert("Vui lòng chọn Câu Lạc Bộ!"); return; }
    // Kiểm tra trùng SĐT trong danh sách đã tải về
    if (students.some(s => s.phone === phone)) { alert("Số điện thoại này đã được đăng ký!"); return; }

    const newStudent = {
        id: Date.now(), // ID số để sort nếu cần
        club: club, name: name, phone: phone, dob: dob,
        img: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        isPresent: false
    };

    try {
        await addDoc(collection(db, COLL_STUDENTS), newStudent);
        alert("Đăng ký thành công! Dữ liệu đã lên hệ thống Online. Vui lòng đăng nhập.");
        document.getElementById('register-form').reset();
        window.showSection('login');
    } catch (error) {
        console.error("Lỗi:", error);
        alert("Lỗi kết nối! Không thể đăng ký.");
    }
});

// ĐĂNG NHẬP
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('login-name').value.trim();
    const phone = document.getElementById('login-phone').value.trim();

    if (phone === '000' && name.toLowerCase() === 'admin') {
        currentUser = { name: "Huấn Luyện Viên", phone: "000", club: "ALL", role: "admin" };
        loginSuccess(); return;
    }

    const user = students.find(s => s.phone === phone && s.name.toLowerCase() === name.toLowerCase());
    if (user) { currentUser = user; loginSuccess(); }
    else { alert("Thông tin không đúng hoặc chưa đăng ký!"); }
});

function loginSuccess() {
    localStorage.setItem('vovinamCurrentUser', JSON.stringify(currentUser));
    alert(`Xin chào ${currentUser.name}!`);
    checkLoginStatus();
    window.showSection('home');
}

function checkLoginStatus() {
    const authActions = document.getElementById('auth-actions');
    const userDisplay = document.getElementById('user-display');
    const userNameSpan = document.getElementById('user-name-display');
    const menuItems = document.querySelectorAll('#club-menu-list li');

    if (currentUser) {
        authActions.style.display = 'none';
        userDisplay.style.display = 'block'; // Hiện dropdown user
        userNameSpan.innerText = isAdmin() ? `HLV: ${currentUser.name}` : `Môn sinh: ${currentUser.name}`;

        menuItems.forEach(item => {
            const clubAttr = item.getAttribute('data-club');
            item.style.display = (isAdmin() || clubAttr === currentUser.club) ? 'block' : 'none';
        });
    } else {
        authActions.style.display = 'flex';
        userDisplay.style.display = 'none';
        menuItems.forEach(item => item.style.display = 'block');
    }
}

window.logout = function() {
    currentUser = null;
    localStorage.removeItem('vovinamCurrentUser');
    checkLoginStatus();
    window.showSection('home');
}

// --- 7. QUẢN LÝ CLB ---
window.openClubManager = function(clubName) {
    if (!currentUser) { alert("Vui lòng đăng nhập!"); window.showSection('login'); return; }
    if (!isAdmin() && currentUser.club !== clubName) { alert(`Bạn không có quyền xem CLB ${clubName}!`); return; }

    currentClub = clubName;
    document.getElementById('current-club-title').innerText = `Danh sách: ${clubName}`;
    const btnAdd = document.getElementById('btn-add-student');
    if (btnAdd) btnAdd.style.display = isAdmin() ? 'block' : 'none';

    window.showSection('club-manager');
    window.switchTab('attendance');
}

window.switchTab = function(tabId) {
    document.getElementById('tab-attendance').style.display = 'none';
    document.getElementById('tab-add-student').style.display = 'none';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).style.display = 'block';
    if(tabId === 'attendance') {
        document.querySelector('.tab-btn').classList.add('active');
        renderAttendanceTable();
    } else {
        const btnAdd = document.getElementById('btn-add-student');
        if(btnAdd) btnAdd.classList.add('active');
    }
}

function renderAttendanceTable() {
    const tbody = document.getElementById('attendance-list');
    tbody.innerHTML = "";
    const clubStudents = students.filter(s => s.club === currentClub);

    if (clubStudents.length === 0) { document.getElementById('empty-list-msg').style.display = 'block'; return; }
    else { document.getElementById('empty-list-msg').style.display = 'none'; }

    clubStudents.forEach((student, index) => {
        const tr = document.createElement('tr');
        // Nút gạt điểm danh (Admin mới dùng được) - Gọi hàm update online
        let statusHTML = isAdmin() 
            ? `<label class="switch"><input type="checkbox" ${student.isPresent ? 'checked' : ''} onchange="toggleAttendance('${student.firebaseId}', ${!student.isPresent})"><span class="slider"></span></label>`
            : (student.isPresent ? `<span style="color:green;font-weight:bold;">Có mặt</span>` : `<span style="color:red;font-weight:bold;">Vắng</span>`);
        
        const isMe = !isAdmin() && currentUser.phone === student.phone;
        const rowStyle = isMe ? 'background-color: #e3f2fd; border-left: 5px solid #0055A4;' : ''; 
        
        tr.innerHTML = `<td style="${rowStyle}">${index + 1}</td><td style="${rowStyle}"><img src="${student.img}" class="student-avatar"></td><td style="${rowStyle}"><strong>${student.name}</strong> ${isMe ? '(Bạn)' : ''}<br><small>${student.dob}</small></td><td style="${rowStyle}">${statusHTML}</td>`;
        tbody.appendChild(tr);
    });
}

// CẬP NHẬT ĐIỂM DANH LÊN MÂY
window.toggleAttendance = async function(firebaseId, newStatus) {
    if(!firebaseId) return;
    const docRef = doc(db, COLL_STUDENTS, firebaseId);
    await updateDoc(docRef, { isPresent: newStatus });
}

// THÊM MÔN SINH (Admin)
document.getElementById('add-student-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('student-name').value;
    const phone = document.getElementById('student-phone').value;
    const dob = document.getElementById('student-dob').value;
    
    const newStudent = { 
        id: Date.now(), club: currentClub, name: name, phone: phone, dob: dob, 
        img: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png", isPresent: false 
    };
    
    await addDoc(collection(db, COLL_STUDENTS), newStudent);
    alert(`Đã thêm môn sinh ${name} lên hệ thống!`);
    document.getElementById('add-student-form').reset();
    window.switchTab('attendance');
});

// --- 8. PROFILE SYSTEM (CẬP NHẬT LÊN MÂY) ---
window.showProfile = function() {
    if (!currentUser) return;
    window.showSection('profile');
    document.getElementById('profile-name').value = currentUser.name;
    document.getElementById('profile-phone').value = currentUser.phone;
    document.getElementById('profile-dob').value = currentUser.dob || "";
    document.getElementById('profile-club').value = currentUser.club;
    document.getElementById('profile-img-preview').src = currentUser.img || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
    window.disableEditMode();
}

window.enableEditProfile = function() {
    document.getElementById('profile-name').disabled = false;
    document.getElementById('profile-phone').disabled = false;
    document.getElementById('profile-dob').disabled = false;
    document.getElementById('btn-edit-profile').style.display = 'none';
    document.getElementById('btn-save-profile').style.display = 'block';
}

window.disableEditMode = function() {
    document.getElementById('profile-name').disabled = true;
    document.getElementById('profile-phone').disabled = true;
    document.getElementById('profile-dob').disabled = true;
    document.getElementById('btn-edit-profile').style.display = 'block';
    document.getElementById('btn-save-profile').style.display = 'none';
}

window.previewProfileAvatar = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) { document.getElementById('profile-img-preview').src = e.target.result; }
        reader.readAsDataURL(input.files[0]);
    }
}

window.saveProfile = async function(e) {
    e.preventDefault();
    if (!currentUser || !confirm("Lưu thay đổi?")) return;

    const newName = document.getElementById('profile-name').value;
    const newPhone = document.getElementById('profile-phone').value;
    const newDob = document.getElementById('profile-dob').value;
    const newImg = document.getElementById('profile-img-preview').src;

    const student = students.find(s => s.phone === currentUser.phone);
    
    if (student && student.firebaseId) {
        const docRef = doc(db, COLL_STUDENTS, student.firebaseId);
        await updateDoc(docRef, { name: newName, phone: newPhone, dob: newDob, img: newImg });
        
        currentUser.name = newName; currentUser.phone = newPhone; currentUser.dob = newDob; currentUser.img = newImg;
        localStorage.setItem('vovinamCurrentUser', JSON.stringify(currentUser));
        
        alert("Đã cập nhật hồ sơ!");
        window.disableEditMode();
        checkLoginStatus();
    } else {
        alert("Lỗi: Không tìm thấy dữ liệu gốc!");
    }
}

// --- 9. NEWS SYSTEM (CẬP NHẬT LÊN MÂY) ---
let currentViewingPostId = null;
let editingFirebaseId = null; 

window.togglePostForm = function(isEditMode = false) {
    const form = document.getElementById('post-creator');
    const submitBtn = form.querySelector('.btn-submit');
    if (form.style.display === 'none') {
        form.style.display = 'block';
        if (!isEditMode) {
            document.getElementById('post-title').value = "";
            document.getElementById('post-content').innerHTML = "";
            editingFirebaseId = null;
            if(submitBtn) submitBtn.innerText = "Đăng bài";
        }
    } else if (!isEditMode) { form.style.display = 'none'; }
}

window.handleMediaUpload = function(input) {
    const file = input.files[0];
    if (!file || file.size > 3*1024*1024) { alert("File quá lớn (>3MB)!"); return; }
    const reader = new FileReader();
    reader.onload = function(e) {
        const mediaHTML = file.type.startsWith('video') ? `<br><video controls src="${e.target.result}"></video><br>` : `<br><img src="${e.target.result}"><br>`;
        document.getElementById('post-content').innerHTML += mediaHTML;
        input.value = "";
    };
    reader.readAsDataURL(file);
}

window.publishPost = async function() {
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').innerHTML;
    if(!title) { alert("Thiếu tiêu đề!"); return; }

    try {
        if (editingFirebaseId) {
            const docRef = doc(db, COLL_POSTS, editingFirebaseId);
            await updateDoc(docRef, { title: title, content: content });
            alert("Đã cập nhật!");
            editingFirebaseId = null;
        } else {
            await addDoc(collection(db, COLL_POSTS), { 
                id: Date.now(), title: title, content: content, date: new Date().toLocaleDateString('vi-VN'), comments: [] 
            });
            alert("Đã đăng bài!");
        }
        document.getElementById('post-creator').style.display = 'none';
    } catch (e) {
        console.error(e);
        alert("Lỗi khi đăng bài!");
    }
}

window.deletePost = async function(firebaseId) {
    if (confirm("Xóa bài viết này?")) {
        await deleteDoc(doc(db, COLL_POSTS, firebaseId));
        alert("Đã xóa!");
    }
}

window.editPost = function(firebaseId) {
    const post = posts.find(p => p.firebaseId === firebaseId);
    if (!post) return;
    window.togglePostForm(true);
    document.getElementById('post-title').value = post.title;
    document.getElementById('post-content').innerHTML = post.content;
    editingFirebaseId = firebaseId; 
    document.querySelector('#post-creator .btn-submit').innerText = "Lưu cập nhật";
    document.getElementById('post-creator').scrollIntoView({behavior:"smooth"});
}

function renderNews() {
    const list = document.getElementById('news-feed');
    list.innerHTML = "";
    const btnCreate = document.getElementById('btn-create-post');
    if(btnCreate) btnCreate.style.display = isAdmin() ? 'block' : 'none';

    posts.forEach(post => {
        const div = document.createElement('div');
        div.className = 'news-item';
        let adminActions = isAdmin() ? `<div class="admin-actions"><button class="btn-edit-post" onclick="editPost('${post.firebaseId}')"><i class="fas fa-edit"></i> Sửa</button><button class="btn-delete-post" onclick="deletePost('${post.firebaseId}')"><i class="fas fa-trash"></i> Xóa</button></div>` : "";
        div.innerHTML = `<h3>${post.title}</h3><small style="color:#666;">${post.date}</small><div class="news-preview">${post.content}</div><div class="read-more-btn" onclick="viewPost('${post.firebaseId}')">Xem & Bình luận >></div>${adminActions}`;
        list.appendChild(div);
    });
}

window.viewPost = function(firebaseId) {
    const post = posts.find(p => p.firebaseId === firebaseId);
    if (!post) return;
    currentViewingPostId = firebaseId;
    document.getElementById('news-list-view').style.display = 'none';
    document.getElementById('news-detail-view').style.display = 'block';
    if(document.getElementById('btn-create-post')) document.getElementById('btn-create-post').style.display = 'none';
    document.getElementById('detail-title').innerText = post.title;
    document.getElementById('detail-date').innerText = post.date;
    document.getElementById('detail-content').innerHTML = post.content;
    renderComments(post);
    window.scrollTo(0, 0);
}

window.backToNewsList = function() {
    document.getElementById('news-detail-view').style.display = 'none';
    document.getElementById('news-list-view').style.display = 'block';
    currentViewingPostId = null;
    if(document.getElementById('btn-create-post') && isAdmin()) document.getElementById('btn-create-post').style.display = 'block';
}

function renderComments(post) {
    const list = document.getElementById('comment-list');
    list.innerHTML = "";
    if (!post.comments) post.comments = [];
    if (post.comments.length === 0) { list.innerHTML = "<p style='color:#777;font-style:italic;'>Chưa có bình luận.</p>"; return; }
    post.comments.forEach((cmt, idx) => {
        const div = document.createElement('div');
        div.className = 'comment-item';
        let role = cmt.isAdminComment ? "admin-role" : "";
        let name = cmt.isAdminComment ? "HLV - Quản Trị" : cmt.userName;
        let delBtn = isAdmin() ? `<button class="btn-delete-cmt" onclick="deleteComment('${post.firebaseId}', ${idx})"><i class="fas fa-trash"></i></button>` : "";
        div.innerHTML = `<div class="comment-author ${role}">${name} <span class="comment-date">(${cmt.date})</span></div><div class="comment-text">${cmt.text}</div>${delBtn}`;
        list.appendChild(div);
    });
}

window.submitComment = async function(e) {
    e.preventDefault();
    if (!currentUser) { alert("Vui lòng đăng nhập!"); window.showSection('login'); return; }
    const text = document.getElementById('comment-input').value.trim();
    if (!text) return;

    const post = posts.find(p => p.firebaseId === currentViewingPostId);
    if (!post) return;
    
    const newComment = { 
        userId: currentUser.phone, userName: currentUser.name, text: text, 
        date: new Date().toLocaleString(), isAdminComment: isAdmin() 
    };

    let updatedComments = post.comments || [];
    updatedComments.push(newComment);

    const docRef = doc(db, COLL_POSTS, currentViewingPostId);
    await updateDoc(docRef, { comments: updatedComments });
    document.getElementById('comment-input').value = "";
}

window.deleteComment = async function(firebaseId, commentIndex) {
    if (!confirm("Xóa bình luận?")) return;
    const post = posts.find(p => p.firebaseId === firebaseId);
    if(!post) return;

    let updatedComments = post.comments.filter((_, idx) => idx !== commentIndex);
    const docRef = doc(db, COLL_POSTS, firebaseId);
    await updateDoc(docRef, { comments: updatedComments });
}

window.toggleMobileMenu = function() {
    const nav = document.querySelector('nav');
    if(nav) nav.classList.toggle('active');
}
