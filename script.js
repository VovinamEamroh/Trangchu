// --- 1. NHÚNG THƯ VIỆN FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, writeBatch, where, getDocs, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
window.currentClub = "";
window.students = [];
window.posts = [];
window.currentUser = JSON.parse(localStorage.getItem('vovinamCurrentUser')); 

const COLL_STUDENTS = "students";
const COLL_POSTS = "posts";
const COLL_HISTORY = "attendance_logs";

// --- 4. LẮNG NGHE DỮ LIỆU ---
onSnapshot(collection(db, COLL_STUDENTS), (snapshot) => {
    window.students = [];
    snapshot.forEach((doc) => {
        let data = doc.data();
        data.firebaseId = doc.id; 
        window.students.push(data);
    });
    
    if (window.currentUser && !window.isAdmin()) {
        const myRecords = window.students.filter(s => s.phone === window.currentUser.phone);
        if (myRecords.length === 0) {
            alert("Tài khoản của bạn đã bị xóa."); window.logout(); return;
        }
        const latest = myRecords[0];
        window.currentUser.name = latest.name;
        window.currentUser.dob = latest.dob;
        window.currentUser.img = latest.img;
        window.currentUser.clubs = myRecords.map(s => s.club);
        localStorage.setItem('vovinamCurrentUser', JSON.stringify(window.currentUser));
        
        window.checkLoginStatus();
    }

    if(document.getElementById('club-manager').style.display === 'block') {
        window.renderAttendanceTable();
    }
});

const qPosts = query(collection(db, COLL_POSTS), orderBy("id", "desc")); 
onSnapshot(qPosts, (snapshot) => {
    window.posts = [];
    snapshot.forEach((doc) => {
        let data = doc.data();
        data.firebaseId = doc.id;
        window.posts.push(data);
    });
    window.renderNews(); 
});

// --- 5. CÁC HÀM XỬ LÝ CHÍNH ---

window.isAdmin = function() { return window.currentUser && window.currentUser.phone === '000'; }

window.showSection = function(sectionId) {
    document.querySelectorAll('main > section').forEach(sec => sec.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
    window.scrollTo(0, 0);
}

window.logout = function() {
    window.currentUser = null;
    localStorage.removeItem('vovinamCurrentUser');
    window.checkLoginStatus();
    window.showSection('home');
}

window.checkLoginStatus = function() {
    const authActions = document.getElementById('auth-actions');
    const userDisplay = document.getElementById('user-display');
    const userNameSpan = document.getElementById('user-name-display');
    const menuHistory = document.getElementById('menu-history');
    const menuHistoryText = document.getElementById('menu-history-text');
    const clubLinks = document.querySelectorAll('.dropdown-content li');

    if (window.currentUser) {
        authActions.style.display = 'none';
        userDisplay.style.display = 'block'; 
        userNameSpan.innerText = window.currentUser.name;
        
        if (menuHistory) {
            menuHistory.style.display = 'block';
            menuHistoryText.innerText = window.isAdmin() ? "Quản trị" : "Điểm danh";
        }

        clubLinks.forEach(li => {
            const onclickText = li.getAttribute('onclick');
            if (onclickText) {
                const clubName = onclickText.match(/'([^']+)'/)[1];
                li.style.display = (window.isAdmin() || (window.currentUser.clubs && window.currentUser.clubs.includes(clubName))) ? 'block' : 'none';
            }
        });
    } else {
        authActions.style.display = 'flex';
        userDisplay.style.display = 'none';
        if(menuHistory) menuHistory.style.display = 'none';
        clubLinks.forEach(li => li.style.display = 'block');
    }
    window.renderNews();
}

window.openClubManager = function(clubName) {
    if (!window.currentUser) { alert("Vui lòng đăng nhập!"); window.showSection('login'); return; }
    if (!window.isAdmin() && (!window.currentUser.clubs || !window.currentUser.clubs.includes(clubName))) { 
        alert(`Bạn không có quyền xem CLB này!`); return; 
    }
    window.currentClub = clubName;
    document.getElementById('current-club-title').innerText = `Danh sách: ${clubName}`;
    const btnAdd = document.getElementById('btn-add-student');
    if (btnAdd) btnAdd.style.display = window.isAdmin() ? 'inline-block' : 'none';
    window.showSection('club-manager');
    window.switchTab('attendance');
}

window.switchTab = function(tabId) {
    document.getElementById('tab-attendance').style.display = 'none';
    document.getElementById('tab-add-student').style.display = 'none';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).style.display = 'block';
    
    if(tabId === 'attendance') {
        document.getElementById('btn-tab-attendance').classList.add('active');
        window.renderAttendanceTable();
        const actionDiv = document.getElementById('attendance-actions');
        if(actionDiv) actionDiv.style.display = window.isAdmin() ? 'block' : 'none';
    } else {
        const btnAdd = document.getElementById('btn-add-student');
        if(btnAdd) btnAdd.classList.add('active');
        const actionDiv = document.getElementById('attendance-actions');
        if(actionDiv) actionDiv.style.display = 'none';
    }
}

window.renderAttendanceTable = function() {
    const tbody = document.getElementById('attendance-list');
    if(!tbody) return;
    tbody.innerHTML = "";
    const clubStudents = window.students.filter(s => s.club === window.currentClub);

    if (clubStudents.length === 0) { 
        document.getElementById('empty-list-msg').style.display = 'block'; return; 
    } 
    document.getElementById('empty-list-msg').style.display = 'none';

    clubStudents.forEach((student, index) => {
        const tr = document.createElement('tr');
        
        let statusHTML = window.isAdmin() 
            ? `<label class="switch"><input type="checkbox" id="status-${student.firebaseId}" ${student.isPresent ? 'checked' : ''}><span class="slider"></span></label> 
               <button type="button" class="btn-edit-student" onclick="window.openEditModal('${student.firebaseId}')"><i class="fas fa-pen"></i></button>`
            : (student.isPresent ? `<span style="color:green;font-weight:bold;">Có mặt</span>` : `<span style="color:red;font-weight:bold;">Vắng</span>`);
        
        let noteHTML = window.isAdmin()
            ? `<input type="text" class="note-input" id="note-${student.firebaseId}" value="${student.note || ''}" placeholder="...">`
            : `<span>${student.note || ''}</span>`;

        let deleteBtn = window.isAdmin() 
            ? ` <i class="fas fa-trash" style="color: #ff4444; cursor: pointer; margin-left: 10px;" onclick="window.deleteStudent('${student.firebaseId}', '${student.name}')" title="Xóa"></i>` 
            : '';

        let infoDisplay = window.isAdmin()
            ? `<br><small><i class="fas fa-phone"></i> ${student.phone}</small> | <small><i class="fas fa-birthday-cake"></i> ${student.dob}</small>`
            : `<br><small><i class="fas fa-birthday-cake"></i> ${student.dob}</small>`;

        let dateInfo = student.lastAttendanceDate ? `<br><small style="color:blue">Cập nhật: ${student.lastAttendanceDate}</small>` : '';

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><img src="${student.img}" class="student-avatar"></td>
            <td><strong>${student.name}</strong> ${deleteBtn} ${infoDisplay} ${dateInfo}</td>
            <td style="white-space: nowrap;">${statusHTML}</td>
            <td>${noteHTML}</td>
        `;
        tbody.appendChild(tr);
    });
}

window.saveDailyAttendance = async function() {
    if(!window.isAdmin()) return;
    if(!confirm("Lưu điểm danh hôm nay?")) return;
    const clubStudents = window.students.filter(s => s.club === window.currentClub);
    const todayStr = new Date().toLocaleDateString('vi-VN');
    const batch = writeBatch(db);
    let historyRecords = [];
    clubStudents.forEach(student => {
        const statusEl = document.getElementById(`status-${student.firebaseId}`);
        const noteEl = document.getElementById(`note-${student.firebaseId}`);
        if (statusEl && noteEl) {
            const isPresent = statusEl.checked;
            const note = noteEl.value.trim();
            const docRef = doc(db, COLL_STUDENTS, student.firebaseId);
            batch.update(docRef, { isPresent, note, lastAttendanceDate: todayStr });
            historyRecords.push({
                name: student.name,
                status: isPresent ? "Có mặt" : "Vắng",
                note: note
            });
        }
    });
    try {
        await batch.commit();
        const safeDateId = todayStr.replace(/\//g, '-'); 
        const logDocId = `${safeDateId}_${window.currentClub}`;
        const logData = { date: todayStr, club: window.currentClub, timestamp: Date.now(), records: historyRecords };
        await setDoc(doc(db, COLL_HISTORY, logDocId), logData);
        alert("Đã lưu thành công!");
    } catch (e) { alert("Lỗi: " + e.message); }
}

window.deleteStudent = async function(firebaseId, studentName) {
    if(!window.isAdmin()) return;
    if(confirm(`Xóa ${studentName}?`)) {
        try { await deleteDoc(doc(db, COLL_STUDENTS, firebaseId)); alert("Đã xóa!"); } 
        catch (e) { alert("Lỗi: " + e.message); }
    }
}

// --- NEWS LOGIC ---
let currentViewingPostId = null; 
let editingFirebaseId = null;

window.renderNews = function() {
    const list = document.getElementById('news-feed'); 
    if(!list) return;
    list.innerHTML = ""; 
    
    // Nút đăng bài
    const btnCreate = document.getElementById('btn-create-post'); 
    if(btnCreate) btnCreate.style.display = window.isAdmin() ? 'block' : 'none'; 
    
    window.posts.forEach(post => { 
        const div = document.createElement('div'); 
        div.className = 'news-item'; 
        
        // --- KHÔI PHỤC NÚT SỬA VÀ XÓA ---
        let adminActions = "";
        if (window.isAdmin()) {
            adminActions = `
                <div class="admin-actions">
                    <button class="btn-edit-post" onclick="window.editPost('${post.firebaseId}')"><i class="fas fa-edit"></i> Sửa</button>
                    <button class="btn-delete-post" onclick="window.deletePost('${post.firebaseId}')"><i class="fas fa-trash-alt"></i> Xóa</button>
                </div>
            `;
        }

        div.innerHTML = `
            <h3>${post.title}</h3>
            <small style="color:#666;">${post.date}</small>
            <div class="news-preview">${post.content}</div>
            <div class="read-more-btn" onclick="window.viewPost('${post.firebaseId}')">Xem & Bình luận >></div>
            ${adminActions}
        `;
        list.appendChild(div); 
    }); 
}

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
    if (!file || file.size > 2*1024*1024) { alert("File quá lớn!"); return; } 
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
            await updateDoc(doc(db, COLL_POSTS, editingFirebaseId), { title, content }); 
            alert("Đã cập nhật!"); editingFirebaseId = null; 
        } else { 
            await addDoc(collection(db, COLL_POSTS), { id: Date.now(), title, content, date: new Date().toLocaleDateString('vi-VN'), comments: [] }); 
            alert("Đã đăng bài!"); 
        } 
        document.getElementById('post-creator').style.display = 'none'; 
    } catch (e) { alert("Lỗi: " + e.message); } 
}

window.deletePost = async function(firebaseId) { 
    if (confirm("Xóa bài viết?")) { await deleteDoc(doc(db, COLL_POSTS, firebaseId)); alert("Đã xóa!"); } 
}

window.editPost = function(firebaseId) { 
    const post = window.posts.find(p => p.firebaseId === firebaseId); 
    if (!post) return; 
    window.togglePostForm(true); 
    document.getElementById('post-title').value = post.title; 
    document.getElementById('post-content').innerHTML = post.content; 
    editingFirebaseId = firebaseId; 
    document.querySelector('#post-creator .btn-submit').innerText = "Lưu cập nhật"; 
    document.getElementById('post-creator').scrollIntoView({behavior:"smooth"}); 
}

window.viewPost = function(firebaseId) { 
    const post = window.posts.find(p => p.firebaseId === firebaseId); 
    if (!post) return; 
    currentViewingPostId = firebaseId; 
    document.getElementById('news-list-view').style.display = 'none'; 
    document.getElementById('news-detail-view').style.display = 'block'; 
    if(document.getElementById('btn-create-post')) document.getElementById('btn-create-post').style.display = 'none'; 
    document.getElementById('detail-title').innerText = post.title; 
    document.getElementById('detail-date').innerText = post.date; 
    document.getElementById('detail-content').innerHTML = post.content; 
    window.renderComments(post); window.scrollTo(0, 0); 
}

window.backToNewsList = function() { 
    document.getElementById('news-detail-view').style.display = 'none'; 
    document.getElementById('news-list-view').style.display = 'block'; 
    currentViewingPostId = null; 
    if(document.getElementById('btn-create-post') && window.isAdmin()) document.getElementById('btn-create-post').style.display = 'block'; 
}

window.renderComments = function(post) { 
    const list = document.getElementById('comment-list'); list.innerHTML = ""; 
    if (!post.comments) post.comments = []; 
    if (post.comments.length === 0) { list.innerHTML = "<p style='color:#777;font-style:italic;'>Chưa có bình luận.</p>"; return; } 
    post.comments.forEach((cmt, idx) => { 
        const div = document.createElement('div'); 
        div.className = `comment-item ${cmt.isAdminComment ? 'is-admin' : 'is-student'}`; 
        let roleBadge = cmt.isAdminComment ? `<span class="comment-role-badge">Quản trị viên</span>` : ""; 
        let authorName = cmt.isAdminComment ? "Huấn Luyện Viên" : cmt.userName; 
        let delBtn = window.isAdmin() ? `<button class="btn-delete-cmt" onclick="window.deleteComment('${post.firebaseId}', ${idx})"><i class="fas fa-trash"></i></button>` : ""; 
        div.innerHTML = `<div class="comment-header"><span class="comment-author-name">${authorName} ${roleBadge}</span><span class="comment-date">${cmt.date}</span></div><div class="comment-text">${cmt.text}</div>${delBtn}`; 
        list.appendChild(div); 
    }); 
}

window.submitComment = async function() { 
    if (!window.currentUser) { alert("Vui lòng đăng nhập!"); window.showSection('login'); return; } 
    const content = document.getElementById('comment-input-rich').innerHTML.trim(); 
    if (!content) return; 
    const post = window.posts.find(p => p.firebaseId === currentViewingPostId); 
    if (!post) return; 
    const newComment = { userId: window.currentUser.phone, userName: window.currentUser.name, text: content, date: new Date().toLocaleString(), isAdminComment: window.isAdmin() }; 
    let updatedComments = post.comments || []; updatedComments.push(newComment); 
    await updateDoc(doc(db, COLL_POSTS, currentViewingPostId), { comments: updatedComments }); 
    document.getElementById('comment-input-rich').innerHTML = ""; 
}

window.deleteComment = async function(firebaseId, commentIndex) { 
    if (!confirm("Xóa bình luận?")) return; 
    const post = window.posts.find(p => p.firebaseId === firebaseId); if(!post) return; 
    let updatedComments = post.comments.filter((_, idx) => idx !== commentIndex); 
    await updateDoc(doc(db, COLL_POSTS, firebaseId), { comments: updatedComments }); 
}

// --- UTILS ---
window.formatDoc = function(cmd) { document.execCommand(cmd, false, null); }
window.formatComment = function(cmd) { document.execCommand(cmd, false, null); document.getElementById('comment-input-rich').focus(); }
const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// --- HISTORY ---
window.openHistorySection = function() {
    window.showSection('history-section');
    const title = document.getElementById('history-title');
    const filters = document.getElementById('history-filters');
    const list = document.getElementById('history-list');
    list.innerHTML = ""; 

    if (window.isAdmin()) {
        title.innerText = "QUẢN TRỊ ĐIỂM DANH";
        filters.style.display = "flex";
        document.getElementById('history-date-picker').valueAsDate = new Date();
    } else {
        title.innerText = "LỊCH SỬ ĐIỂM DANH CÁ NHÂN";
        filters.style.display = "none";
        window.loadHistoryData();
    }
}

window.loadHistoryData = async function() {
    const list = document.getElementById('history-list');
    const loading = document.getElementById('history-loading');
    const emptyMsg = document.getElementById('history-empty');
    list.innerHTML = "";
    loading.style.display = "block";
    emptyMsg.style.display = "none";

    try {
        let historyRecords = [];
        if (window.isAdmin()) {
            const dateInput = document.getElementById('history-date-picker').value;
            if(!dateInput) { loading.style.display="none"; return; }
            const dateStr = dateInput.split('-').reverse().join('/');
            const clubName = document.getElementById('history-club-select').value;
            const q = query(collection(db, COLL_HISTORY), where("date", "==", dateStr), where("club", "==", clubName));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const logData = snapshot.docs[0].data();
                historyRecords = logData.records.map(r => ({...r, date: logData.date}));
            }
        } else {
            const snapshot = await getDocs(collection(db, COLL_HISTORY));
            snapshot.forEach(doc => {
                const logData = doc.data();
                const myRecord = logData.records.find(r => r.phone === window.currentUser.phone);
                if (myRecord) {
                    historyRecords.push({ date: logData.date, name: logData.club, status: myRecord.status, note: myRecord.note });
                }
            });
            historyRecords.sort((a, b) => {
                const da = a.date.split('/').reverse().join('');
                const db = b.date.split('/').reverse().join('');
                return db.localeCompare(da);
            });
        }
        loading.style.display = "none";
        if(historyRecords.length === 0) { emptyMsg.style.display = "block"; return; }
        
        historyRecords.forEach(rec => {
            const tr = document.createElement('tr');
            const statusClass = rec.status === "Có mặt" ? "status-present" : "status-absent";
            tr.innerHTML = `<td>${rec.date}</td><td><strong>${rec.name}</strong></td><td><span class="status-badge ${statusClass}">${rec.status}</span></td><td>${rec.note || ''}</td>`;
            list.appendChild(tr);
        });
    } catch(e) { loading.style.display = "none"; alert("Lỗi: " + e.message); }
}

// --- PROFILE ---
window.showProfile = function() {
    if (!window.currentUser) return;
    window.showSection('profile');
    document.getElementById('profile-name').value = window.currentUser.name;
    document.getElementById('profile-phone').value = window.currentUser.phone;
    document.getElementById('profile-dob').value = window.currentUser.dob;
    document.getElementById('profile-club').value = (window.currentUser.clubs || []).join(", ");
    document.getElementById('profile-img-preview').src = window.currentUser.img || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
    window.enableEditProfile(false);
}
window.enableEditProfile = function(enable = true) {
    document.getElementById('profile-name').disabled = !enable;
    document.getElementById('profile-dob').disabled = !enable;
    document.getElementById('btn-change-avatar').style.display = enable ? 'inline-flex' : 'none';
    document.getElementById('btn-edit-profile').style.display = enable ? 'none' : 'block';
    document.getElementById('btn-save-profile').style.display = enable ? 'block' : 'none';
}
// --- SỬA LỖI KIỂM TRA DUNG LƯỢNG ẢNH (DƯỚI 1MB) ---
window.previewProfileAvatar = function(input) {
    if (input.files && input.files[0]) {
        if (input.files[0].size > 1 * 1024 * 1024) { // 1MB
            alert("Ảnh quá lớn! Vui lòng chọn ảnh dưới 1MB."); 
            input.value = ""; // Reset input
            return; 
        }
        const reader = new FileReader();
        reader.onload = function(e) { document.getElementById('profile-img-preview').src = e.target.result; }
        reader.readAsDataURL(input.files[0]);
    }
}
window.saveProfile = async function() {
    if (!window.currentUser || !confirm("Lưu thay đổi?")) return;
    const newName = document.getElementById('profile-name').value;
    const newDob = document.getElementById('profile-dob').value;
    const newImg = document.getElementById('profile-img-preview').src;
    const myRecords = window.students.filter(s => s.phone === window.currentUser.phone);
    const batch = writeBatch(db);
    myRecords.forEach(rec => { const docRef = doc(db, COLL_STUDENTS, rec.firebaseId); batch.update(docRef, { name: newName, dob: newDob, img: newImg }); });
    try { await batch.commit(); window.currentUser.name = newName; window.currentUser.dob = newDob; window.currentUser.img = newImg; localStorage.setItem('vovinamCurrentUser', JSON.stringify(window.currentUser)); alert("Đã cập nhật!"); window.enableEditProfile(false); window.checkLoginStatus(); } catch(e) { alert("Lỗi: " + e.message); }
}
window.openEditModal = function(firebaseId) {
    const student = window.students.find(s => s.firebaseId === firebaseId);
    if (!student) return;
    document.getElementById('edit-id').value = firebaseId;
    document.getElementById('edit-name').value = student.name;
    document.getElementById('edit-phone').value = student.phone;
    document.getElementById('edit-dob').value = student.dob;
    document.getElementById('edit-img-preview').src = student.img;
    document.getElementById('edit-img-upload').value = "";
    document.getElementById('modal-edit-student').style.display = 'block';
}
window.closeEditModal = function() { document.getElementById('modal-edit-student').style.display = 'none'; }
// --- SỬA LỖI KIỂM TRA ẢNH TRONG MODAL SỬA ---
window.previewEditAvatar = function(input) {
    if (input.files && input.files[0]) {
        if (input.files[0].size > 1 * 1024 * 1024) { // 1MB
            alert("Ảnh quá lớn! Vui lòng chọn ảnh dưới 1MB.");
            input.value = "";
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) { document.getElementById('edit-img-preview').src = e.target.result; }
        reader.readAsDataURL(input.files[0]);
    }
}
window.saveStudentEdits = async function(e) {
    e.preventDefault(); if(!isAdmin()) return;
    const id = document.getElementById('edit-id').value;
    const name = document.getElementById('edit-name').value;
    const phone = document.getElementById('edit-phone').value;
    const dob = document.getElementById('edit-dob').value;
    let imgUrl = document.getElementById('edit-img-preview').src;
    const imgInput = document.getElementById('edit-img-upload');
    if (imgInput.files && imgInput.files[0]) { 
        if (imgInput.files[0].size > 1 * 1024 * 1024) { alert("Ảnh quá lớn! Chọn ảnh < 1MB"); return; } 
        imgUrl = await readFileAsBase64(imgInput.files[0]); 
    }
    try {
        const relatedRecords = window.students.filter(s => s.phone === phone);
        const batch = writeBatch(db);
        if(relatedRecords.length > 0) { relatedRecords.forEach(rec => { const docRef = doc(db, COLL_STUDENTS, rec.firebaseId); batch.update(docRef, { name, dob, img: imgUrl }); }); await batch.commit(); } 
        else { await updateDoc(doc(db, COLL_STUDENTS, id), { name, phone, dob, img: imgUrl }); }
        alert("Đã cập nhật!"); window.closeEditModal();
    } catch (error) { alert("Lỗi: " + error.message); }
}

// FORM EVENTS
setTimeout(() => {
    const loginF = document.getElementById('login-form');
    if(loginF) loginF.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('login-name').value.trim();
        const phone = document.getElementById('login-phone').value.trim();
        if (phone === '000' && name.toLowerCase() === 'admin') {
            window.currentUser = { name: "Huấn Luyện Viên", phone: "000", clubs: ["ALL"], role: "admin" };
            window.loginSuccess();
        } else {
            const match = window.students.filter(s => s.phone === phone && s.name.toLowerCase() === name.toLowerCase());
            if(match.length > 0) {
                const clubs = match.map(s => s.club);
                // Fix lỗi mất ảnh khi login
                window.currentUser = { ...match[0], clubs: clubs, role: "student" };
                window.loginSuccess();
            } else { alert("Thông tin sai!"); }
        }
    });
    
    const regF = document.getElementById('register-form');
    if(regF) regF.addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = document.getElementById('reg-name').value.trim();
        const phone = document.getElementById('reg-phone').value.trim();
        const dob = document.getElementById('reg-dob').value;
        const club = document.getElementById('reg-club').value;
        if (!club) return alert("Chọn CLB!");
        if (window.students.some(s => s.phone === phone && s.club === club)) return alert("Đã tồn tại");
        let img = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
        const exist = window.students.find(s => s.phone === phone);
        if(exist) img = exist.img;
        await addDoc(collection(db, COLL_STUDENTS), { id: Date.now(), club, name, phone, dob, img, isPresent: false, note: "", lastAttendanceDate: "" });
        alert("Đăng ký thành công!"); window.showSection('login');
    });

    const addF = document.getElementById('add-student-form');
    if(addF) addF.addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = document.getElementById('student-name').value;
        const phone = document.getElementById('student-phone').value;
        const dob = document.getElementById('student-dob').value;
        const input = document.getElementById('student-img');
        if (window.students.some(s => s.phone === phone && s.club === window.currentClub)) return alert("Đã tồn tại");
        let img = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
        const exist = window.students.find(s => s.phone === phone);
        if(exist) img = exist.img;
        if(input.files[0]) { 
            if(input.files[0].size > 1 * 1024 * 1024) return alert("Ảnh quá lớn (<1MB)"); 
            img = await readFileAsBase64(input.files[0]); 
        }
        await addDoc(collection(db, COLL_STUDENTS), { id: Date.now(), club: window.currentClub, name, phone, dob, img, isPresent: false, note: "", lastAttendanceDate: "" });
        alert("Đã thêm!"); document.getElementById('add-student-form').reset(); window.switchTab('attendance');
    });
}, 1000);

window.loginSuccess = function() {
    localStorage.setItem('vovinamCurrentUser', JSON.stringify(window.currentUser));
    alert(`Xin chào ${window.currentUser.name}!`);
    window.checkLoginStatus();
    window.showSection('home');
}

window.checkLoginStatus();
console.log("✅ SYSTEM RESTORED WITH FULL UI!");
