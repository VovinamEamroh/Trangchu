// --- 1. NHÚNG THƯ VIỆN FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- 2. CẤU HÌNH KẾT NỐI ---
const firebaseConfig = {
    apiKey: "AIzaSyDn0yqXve0rYSEKFommFKV8J-McHEU-Nh4",
    authDomain: "vovinam-web-4eb57.firebaseapp.com",
    projectId: "vovinam-web-4eb57",
    storageBucket: "vovinam-web-4eb57.firebasestorage.app",
    messagingSenderId: "296472265647",
    appId: "1:296472265647:web:91a6261be41fc00f88255a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 3. BIẾN TOÀN CỤC ---
let currentClub = "";
let students = [];
let posts = [];
let currentUser = JSON.parse(localStorage.getItem('vovinamCurrentUser')); 

const COLL_STUDENTS = "students";
const COLL_POSTS = "posts";

// --- 4. LẮNG NGHE DỮ LIỆU (REAL-TIME) ---
onSnapshot(collection(db, COLL_STUDENTS), (snapshot) => {
    students = [];
    snapshot.forEach((doc) => {
        let data = doc.data();
        data.firebaseId = doc.id; 
        students.push(data);
    });
    // Security Real-time: Kiểm tra nếu bị xóa khi đang online
    if (currentUser && !isAdmin()) {
        const myRecords = students.filter(s => s.phone === currentUser.phone);
        if (myRecords.length === 0) {
            alert("Tài khoản của bạn đã bị xóa."); window.logout(); return;
        }
        // Cập nhật lại quyền hạn CLB
        currentUser.clubs = myRecords.map(s => s.club);
        localStorage.setItem('vovinamCurrentUser', JSON.stringify(currentUser));
        
        // Nếu đang xem CLB mà bị đá ra -> Về trang chủ
        if (currentClub && !currentUser.clubs.includes(currentClub)) {
            // Chỉ thông báo nếu đang mở bảng danh sách
            if(document.getElementById('club-manager').style.display === 'block') {
                alert(`Bạn không còn quyền truy cập CLB ${currentClub}.`);
                window.showSection('home');
            }
        }
        checkLoginStatus();
    }

    if(document.getElementById('club-manager') && document.getElementById('club-manager').style.display === 'block') {
        renderAttendanceTable();
    }
});

const qPosts = query(collection(db, COLL_POSTS), orderBy("id", "desc")); 
onSnapshot(qPosts, (snapshot) => {
    posts = [];
    snapshot.forEach((doc) => {
        let data = doc.data();
        data.firebaseId = doc.id;
        posts.push(data);
    });
    renderNews(); 
});

checkLoginStatus();

// --- 5. HÀM HỖ TRỢ ---
window.showSection = function(sectionId) {
    document.querySelectorAll('main > section').forEach(sec => sec.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
    window.scrollTo(0, 0);
}

function isAdmin() { return currentUser && currentUser.phone === '000'; }
window.formatDoc = function(cmd, value = null) { document.execCommand(cmd, false, value); }

const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// --- 6. XỬ LÝ TÀI KHOẢN ---
document.getElementById('register-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const dob = document.getElementById('reg-dob').value;
    const club = document.getElementById('reg-club').value;

    if (!club) { alert("Vui lòng chọn Câu Lạc Bộ!"); return; }
    if (students.some(s => s.phone === phone && s.club === club)) { 
        alert(`SĐT ${phone} đã có trong CLB ${club} rồi!`); return; 
    }

    const newStudent = {
        id: Date.now(), club: club, name: name, phone: phone, dob: dob,
        img: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        isPresent: false, note: "", lastAttendanceDate: ""
    };

    try {
        await addDoc(collection(db, COLL_STUDENTS), newStudent);
        alert("Đăng ký thành công! Vui lòng đăng nhập.");
        document.getElementById('register-form').reset();
        window.showSection('login');
    } catch (error) { alert("Lỗi: " + error.message); }
});

document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('login-name').value.trim();
    const phone = document.getElementById('login-phone').value.trim();

    if (phone === '000' && name.toLowerCase() === 'admin') {
        currentUser = { name: "Huấn Luyện Viên", phone: "000", clubs: ["ALL"], role: "admin" };
        loginSuccess(); return;
    }

    const matchedRecords = students.filter(s => s.phone === phone && s.name.toLowerCase() === name.toLowerCase());
    if (matchedRecords.length > 0) {
        currentUser = { ...matchedRecords[0], clubs: matchedRecords.map(s => s.club), role: "student" };
        loginSuccess();
    } else { alert("Thông tin không đúng!"); }
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
    const clubLinks = document.querySelectorAll('.dropdown-content li');

    if (currentUser) {
        authActions.style.display = 'none';
        userDisplay.style.display = 'block'; 
        userNameSpan.innerText = isAdmin() ? `HLV: ${currentUser.name}` : `Môn sinh: ${currentUser.name}`;

        clubLinks.forEach(li => {
            const onclickText = li.getAttribute('onclick');
            if (onclickText) {
                const clubName = onclickText.match(/'([^']+)'/)[1];
                li.style.display = (isAdmin() || (currentUser.clubs && currentUser.clubs.includes(clubName))) ? 'block' : 'none';
            }
        });
    } else {
        authActions.style.display = 'flex';
        userDisplay.style.display = 'none';
        clubLinks.forEach(li => li.style.display = 'block');
    }
    renderNews();
}

window.logout = function() {
    currentUser = null;
    localStorage.removeItem('vovinamCurrentUser');
    checkLoginStatus();
    window.showSection('home');
}

// --- 7. QUẢN LÝ CLB (CẬP NHẬT: ẨN SĐT VỚI MÔN SINH) ---
window.openClubManager = function(clubName) {
    if (!currentUser) { alert("Vui lòng đăng nhập!"); window.showSection('login'); return; }
    const isMember = currentUser.clubs && currentUser.clubs.includes(clubName);
    if (!isAdmin() && !isMember) { alert("Bạn không có quyền xem CLB này!"); return; }

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
    
    const actionDiv = document.getElementById('attendance-actions');
    if(tabId === 'attendance') {
        document.querySelector('.tab-btn').classList.add('active');
        renderAttendanceTable();
        if(actionDiv) actionDiv.style.display = isAdmin() ? 'block' : 'none';
    } else {
        const btnAdd = document.getElementById('btn-add-student');
        if(btnAdd) btnAdd.classList.add('active');
        if(actionDiv) actionDiv.style.display = 'none';
    }
}

// --- HÀM RENDER QUAN TRỌNG (ĐÃ SỬA PHẦN HIỂN THỊ SĐT) ---
function renderAttendanceTable() {
    const tbody = document.getElementById('attendance-list');
    tbody.innerHTML = "";
    const clubStudents = students.filter(s => s.club === currentClub);

    if (clubStudents.length === 0) { document.getElementById('empty-list-msg').style.display = 'block'; return; }
    else { document.getElementById('empty-list-msg').style.display = 'none'; }

    clubStudents.forEach((student, index) => {
        const tr = document.createElement('tr');
        
        let statusHTML = isAdmin() 
            ? `<label class="switch"><input type="checkbox" id="status-${student.firebaseId}" ${student.isPresent ? 'checked' : ''}><span class="slider"></span></label>`
            : (student.isPresent ? `<span style="color:green;font-weight:bold;">Có mặt</span>` : `<span style="color:red;font-weight:bold;">Vắng</span>`);
        
        let noteHTML = isAdmin()
            ? `<input type="text" class="note-input" id="note-${student.firebaseId}" value="${student.note || ''}" placeholder="...">`
            : `<span>${student.note || ''}</span>`;

        let deleteBtn = isAdmin() 
            ? ` <i class="fas fa-trash" style="color: #ff4444; cursor: pointer; margin-left: 10px;" onclick="deleteStudent('${student.firebaseId}', '${student.name}')" title="Xóa"></i>` 
            : '';

        const isMe = !isAdmin() && currentUser.phone === student.phone;
        const rowStyle = isMe ? 'background-color: #e3f2fd; border-left: 5px solid #0055A4;' : ''; 
        let dateInfo = student.lastAttendanceDate ? `<br><small style="color:blue">Cập nhật: ${student.lastAttendanceDate}</small>` : '';

        // --- LOGIC HIỂN THỊ THÔNG TIN ---
        let infoDisplay = "";
        if (isAdmin()) {
            // Admin: Thấy SĐT và Ngày sinh
            infoDisplay = `<br><small><i class="fas fa-phone"></i> ${student.phone}</small> | <small><i class="fas fa-birthday-cake"></i> ${student.dob}</small>`;
        } else {
            // Môn sinh: CHỈ thấy Ngày sinh (Ẩn SĐT)
            infoDisplay = `<br><small><i class="fas fa-birthday-cake"></i> ${student.dob}</small>`;
        }

        tr.innerHTML = `
            <td style="${rowStyle}">${index + 1}</td>
            <td style="${rowStyle}"><img src="${student.img}" class="student-avatar"></td>
            <td style="${rowStyle}">
                <strong>${student.name}</strong> ${isMe ? '(Bạn)' : ''} ${deleteBtn}
                ${infoDisplay} ${dateInfo}
            </td>
            <td style="${rowStyle}">${statusHTML}</td>
            <td style="${rowStyle}">${noteHTML}</td>
        `;
        tbody.appendChild(tr);
    });
}

window.saveDailyAttendance = async function() {
    if(!isAdmin()) return;
    if(!confirm("Lưu điểm danh hôm nay?")) return;
    const clubStudents = students.filter(s => s.club === currentClub);
    const todayStr = new Date().toLocaleDateString('vi-VN');
    const batch = writeBatch(db);
    let count = 0;
    clubStudents.forEach(student => {
        const statusEl = document.getElementById(`status-${student.firebaseId}`);
        const noteEl = document.getElementById(`note-${student.firebaseId}`);
        if (statusEl && noteEl) {
            const docRef = doc(db, COLL_STUDENTS, student.firebaseId);
            batch.update(docRef, { isPresent: statusEl.checked, note: noteEl.value.trim(), lastAttendanceDate: todayStr });
            count++;
        }
    });
    try { await batch.commit(); alert(`Đã lưu ${count} môn sinh!`); } catch (e) { alert("Lỗi: " + e.message); }
}

window.deleteStudent = async function(firebaseId, studentName) {
    if(!isAdmin()) return;
    if(confirm(`Xóa vĩnh viễn ${studentName}?`)) {
        try { await deleteDoc(doc(db, COLL_STUDENTS, firebaseId)); alert("Đã xóa!"); } catch (e) { alert("Lỗi: " + e.message); }
    }
}

document.getElementById('add-student-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('student-name').value;
    const phone = document.getElementById('student-phone').value;
    const dob = document.getElementById('student-dob').value;
    const imgInput = document.getElementById('student-img');
    if (students.some(s => s.phone === phone && s.club === currentClub)) { alert("Đã có trong CLB này!"); return; }
    let imgUrl = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
    if (imgInput.files && imgInput.files[0]) {
        if (imgInput.files[0].size > 500 * 1024) { alert("Ảnh > 500KB!"); return; }
        imgUrl = await readFileAsBase64(imgInput.files[0]);
    }
    const newStudent = { id: Date.now(), club: currentClub, name: name, phone: phone, dob: dob, img: imgUrl, isPresent: false, note: "", lastAttendanceDate: "" };
    await addDoc(collection(db, COLL_STUDENTS), newStudent);
    alert(`Đã thêm ${name}!`);
    document.getElementById('add-student-form').reset();
    window.switchTab('attendance');
});

// --- PROFILE & NEWS ---
window.showProfile = function() {
    if (!currentUser) return;
    window.showSection('profile');
    document.getElementById('profile-name').value = currentUser.name;
    document.getElementById('profile-phone').value = currentUser.phone;
    document.getElementById('profile-dob').value = currentUser.dob || "";
    document.getElementById('profile-club').value = (currentUser.clubs || [currentUser.club]).join(", ");
    document.getElementById('profile-img-preview').src = currentUser.img || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
    window.disableEditMode();
}
window.enableEditProfile = function() {
    document.getElementById('profile-name').disabled = false;
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
    const newDob = document.getElementById('profile-dob').value;
    const newImg = document.getElementById('profile-img-preview').src;
    const batch = writeBatch(db);
    students.filter(s => s.phone === currentUser.phone).forEach(rec => {
        batch.update(doc(db, COLL_STUDENTS, rec.firebaseId), { name: newName, dob: newDob, img: newImg });
    });
    try { await batch.commit(); currentUser.name = newName; currentUser.dob = newDob; currentUser.img = newImg; localStorage.setItem('vovinamCurrentUser', JSON.stringify(currentUser)); alert("Đã cập nhật!"); window.disableEditMode(); checkLoginStatus(); } catch(e) { alert("Lỗi: " + e.message); }
}

let currentViewingPostId = null; let editingFirebaseId = null; 
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
    if (!file || file.size > 3*1024*1024) { alert("File quá lớn!"); return; }
    const reader = new FileReader();
    reader.onload = function(e) {
        const mediaHTML = file.type.startsWith('video') ? `<br><video controls src="${e.target.result}"></video><br>` : `<br><img src="${e.target.result}"><br>`;
        document.getElementById('post-content').innerHTML += mediaHTML;
        input.value = "";
    }; reader.readAsDataURL(file);
}
window.publishPost = async function() {
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').innerHTML;
    if(!title) { alert("Thiếu tiêu đề!"); return; }
    try {
        if (editingFirebaseId) {
            await updateDoc(doc(db, COLL_POSTS, editingFirebaseId), { title: title, content: content });
            alert("Đã cập nhật!"); editingFirebaseId = null;
        } else {
            await addDoc(collection(db, COLL_POSTS), { id: Date.now(), title: title, content: content, date: new Date().toLocaleDateString('vi-VN'), comments: [] });
            alert("Đã đăng bài!");
        } document.getElementById('post-creator').style.display = 'none';
    } catch (e) { alert("Lỗi: " + e.message); }
}
window.deletePost = async function(firebaseId) {
    if (confirm("Xóa bài viết?")) { await deleteDoc(doc(db, COLL_POSTS, firebaseId)); alert("Đã xóa!"); }
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
    const list = document.getElementById('news-feed'); list.innerHTML = "";
    const btnCreate = document.getElementById('btn-create-post');
    if(btnCreate) btnCreate.style.display = isAdmin() ? 'block' : 'none';
    posts.forEach(post => {
        const div = document.createElement('div'); div.className = 'news-item';
        let adminActions = isAdmin() ? `<div class="admin-actions"><button class="btn-edit-post" onclick="editPost('${post.firebaseId}')"><i class="fas fa-edit"></i> Sửa</button><button class="btn-delete-post" onclick="deletePost('${post.firebaseId}')"><i class="fas fa-trash-alt"></i> Xóa</button></div>` : "";
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
    renderComments(post); window.scrollTo(0, 0);
}
window.backToNewsList = function() {
    document.getElementById('news-detail-view').style.display = 'none';
    document.getElementById('news-list-view').style.display = 'block';
    currentViewingPostId = null;
    if(document.getElementById('btn-create-post') && isAdmin()) document.getElementById('btn-create-post').style.display = 'block';
}
function renderComments(post) {
    const list = document.getElementById('comment-list'); list.innerHTML = "";
    if (!post.comments) post.comments = [];
    if (post.comments.length === 0) { list.innerHTML = "<p style='color:#777;font-style:italic;'>Chưa có bình luận.</p>"; return; }
    post.comments.forEach((cmt, idx) => {
        const div = document.createElement('div'); div.className = 'comment-item';
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
    const newComment = { userId: currentUser.phone, userName: currentUser.name, text: text, date: new Date().toLocaleString(), isAdminComment: isAdmin() };
    let updatedComments = post.comments || []; updatedComments.push(newComment);
    await updateDoc(doc(db, COLL_POSTS, currentViewingPostId), { comments: updatedComments });
    document.getElementById('comment-input').value = "";
}
window.deleteComment = async function(firebaseId, commentIndex) {
    if (!confirm("Xóa bình luận?")) return;
    const post = posts.find(p => p.firebaseId === firebaseId);
    if(!post) return;
    let updatedComments = post.comments.filter((_, idx) => idx !== commentIndex);
    await updateDoc(doc(db, COLL_POSTS, firebaseId), { comments: updatedComments });
}
window.toggleMobileMenu = function() {
    const nav = document.querySelector('nav');
    if(nav) nav.classList.toggle('active');
}
