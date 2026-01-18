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
let currentClub = "";
let students = [];
let posts = [];
let currentUser = JSON.parse(localStorage.getItem('vovinamCurrentUser')); 

const COLL_STUDENTS = "students";
const COLL_POSTS = "posts";
const COLL_HISTORY = "attendance_logs";

// --- 4. LẮNG NGHE DỮ LIỆU ---
onSnapshot(collection(db, COLL_STUDENTS), (snapshot) => {
    students = [];
    snapshot.forEach((doc) => {
        let data = doc.data();
        data.firebaseId = doc.id; 
        students.push(data);
    });
    
    // Cập nhật session nếu có thay đổi
    if (currentUser && !isAdmin()) {
        const myRecords = students.filter(s => s.phone === currentUser.phone);
        if (myRecords.length === 0) {
            alert("Tài khoản của bạn đã bị xóa."); logout(); return;
        }
        const latest = myRecords[0];
        currentUser.name = latest.name;
        currentUser.dob = latest.dob;
        currentUser.img = latest.img;
        currentUser.clubs = myRecords.map(s => s.club);
        localStorage.setItem('vovinamCurrentUser', JSON.stringify(currentUser));
        
        checkLoginStatus();
    }

    if(document.getElementById('club-manager').style.display === 'block') {
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

// --- CÁC HÀM XỬ LÝ (LOGIC CHÍNH) ---

function showSection(sectionId) {
    document.querySelectorAll('main > section').forEach(sec => sec.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
    window.scrollTo(0, 0);
}

function isAdmin() { return currentUser && currentUser.phone === '000'; }
function formatDoc(cmd, value = null) { document.execCommand(cmd, false, value); }
function formatComment(cmd) { document.execCommand(cmd, false, null); document.getElementById('comment-input-rich').focus(); }

const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// -- LỊCH SỬ --
function openHistorySection() {
    showSection('history-section');
    const title = document.getElementById('history-title');
    const filters = document.getElementById('history-filters');
    const actionHeader = document.getElementById('history-action-header');

    if (isAdmin()) {
        title.innerText = "QUẢN TRỊ ĐIỂM DANH";
        filters.style.display = "flex";
        if(actionHeader) actionHeader.style.display = "table-cell";
        document.getElementById('history-date-picker').valueAsDate = new Date();
    } else {
        title.innerText = "LỊCH SỬ ĐIỂM DANH CÁ NHÂN";
        filters.style.display = "none";
        if(actionHeader) actionHeader.style.display = "none";
    }
    loadHistoryData();
}

async function loadHistoryData() {
    const list = document.getElementById('history-list');
    const loading = document.getElementById('history-loading');
    const emptyMsg = document.getElementById('history-empty');
    
    list.innerHTML = "";
    loading.style.display = "block";
    emptyMsg.style.display = "none";

    try {
        let historyRecords = [];

        if (isAdmin()) {
            const dateInput = document.getElementById('history-date-picker').value;
            if(!dateInput) { loading.style.display="none"; return; }
            const dateStr = dateInput.split('-').reverse().join('/');
            const clubName = document.getElementById('history-club-select').value;
            
            const q = query(collection(db, COLL_HISTORY), where("date", "==", dateStr), where("club", "==", clubName));
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                const logData = snapshot.docs[0].data();
                const logId = snapshot.docs[0].id;
                logData.records.forEach((rec, idx) => {
                    historyRecords.push({
                        date: logData.date,
                        name: rec.name,
                        status: rec.status,
                        note: rec.note,
                        logId: logId, 
                        recordIndex: idx
                    });
                });
            }
        } else {
            const snapshot = await getDocs(collection(db, COLL_HISTORY));
            snapshot.forEach(doc => {
                const logData = doc.data();
                const myRecord = logData.records.find(r => r.phone === currentUser.phone);
                if (myRecord) {
                    historyRecords.push({
                        date: logData.date,
                        name: logData.club,
                        status: myRecord.status,
                        note: myRecord.note
                    });
                }
            });
            historyRecords.sort((a, b) => {
                const dateA = a.date.split('/').reverse().join('');
                const dateB = b.date.split('/').reverse().join('');
                return dateB.localeCompare(dateA);
            });
        }

        loading.style.display = "none";
        if (historyRecords.length === 0) {
            emptyMsg.style.display = "block";
            return;
        }

        historyRecords.forEach(rec => {
            const tr = document.createElement('tr');
            const statusClass = rec.status === "Có mặt" ? "status-present" : "status-absent";
            const statusBadge = `<span class="status-badge ${statusClass}">${rec.status}</span>`;
            
            tr.innerHTML = `
                <td>${rec.date}</td>
                <td><strong>${rec.name}</strong></td>
                <td>${statusBadge}</td>
                <td>${rec.note || ''}</td>
            `;
            list.appendChild(tr);
        });

    } catch (e) {
        console.error(e);
        loading.style.display = "none";
        alert("Lỗi tải lịch sử: " + e.message);
    }
}

// -- CLUB MANAGER --
function openClubManager(clubName) {
    if (!currentUser) { alert("Vui lòng đăng nhập!"); showSection('login'); return; }
    if (!isAdmin() && (!currentUser.clubs || !currentUser.clubs.includes(clubName))) { 
        alert(`Bạn không có quyền xem CLB này!`); return; 
    }
    currentClub = clubName;
    document.getElementById('current-club-title').innerText = `Danh sách: ${clubName}`;
    const btnAdd = document.getElementById('btn-add-student');
    if (btnAdd) btnAdd.style.display = isAdmin() ? 'inline-block' : 'none';
    showSection('club-manager');
    switchTab('attendance');
}

function switchTab(tabId) {
    document.getElementById('tab-attendance').style.display = 'none';
    document.getElementById('tab-add-student').style.display = 'none';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).style.display = 'block';
    
    if(tabId === 'attendance') {
        const btnAtt = document.getElementById('btn-tab-attendance');
        if(btnAtt) btnAtt.classList.add('active');
        renderAttendanceTable();
        const actionDiv = document.getElementById('attendance-actions');
        if(actionDiv) actionDiv.style.display = isAdmin() ? 'block' : 'none';
    } else {
        const btnAdd = document.getElementById('btn-add-student');
        if(btnAdd) btnAdd.classList.add('active');
        const actionDiv = document.getElementById('attendance-actions');
        if(actionDiv) actionDiv.style.display = 'none';
    }
}

function renderAttendanceTable() {
    const tbody = document.getElementById('attendance-list');
    tbody.innerHTML = "";
    const clubStudents = students.filter(s => s.club === currentClub);

    if (clubStudents.length === 0) { 
        document.getElementById('empty-list-msg').style.display = 'block'; 
        return; 
    } 
    document.getElementById('empty-list-msg').style.display = 'none';

    clubStudents.forEach((student, index) => {
        const tr = document.createElement('tr');
        
        let statusHTML = isAdmin() 
            ? `<label class="switch"><input type="checkbox" id="status-${student.firebaseId}" ${student.isPresent ? 'checked' : ''}><span class="slider"></span></label> 
               <button type="button" class="btn-edit-student" onclick="window.openEditModal('${student.firebaseId}')"><i class="fas fa-pen"></i></button>`
            : (student.isPresent ? `<span style="color:green;font-weight:bold;">Có mặt</span>` : `<span style="color:red;font-weight:bold;">Vắng</span>`);
        
        let noteHTML = isAdmin()
            ? `<input type="text" class="note-input" id="note-${student.firebaseId}" value="${student.note || ''}" placeholder="...">`
            : `<span>${student.note || ''}</span>`;

        let deleteBtn = isAdmin() 
            ? ` <i class="fas fa-trash" style="color: #ff4444; cursor: pointer; margin-left: 10px;" onclick="window.deleteStudent('${student.firebaseId}', '${student.name}')" title="Xóa"></i>` 
            : '';

        let infoDisplay = isAdmin()
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

async function saveDailyAttendance() {
    if(!isAdmin()) return;
    if(!confirm("Lưu điểm danh hôm nay?")) return;

    const clubStudents = students.filter(s => s.club === currentClub);
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
                studentId: student.firebaseId,
                name: student.name,
                phone: student.phone,
                status: isPresent ? "Có mặt" : "Vắng",
                note: note
            });
        }
    });

    try {
        await batch.commit();
        
        const safeDateId = todayStr.replace(/\//g, '-'); 
        const logDocId = `${safeDateId}_${currentClub}`;
        const logData = {
            date: todayStr,
            club: currentClub,
            timestamp: Date.now(),
            records: historyRecords
        };
        await setDoc(doc(db, COLL_HISTORY, logDocId), logData);

        alert(`Đã lưu điểm danh cho ${clubStudents.length} môn sinh!`);
    } catch (e) { alert("Lỗi: " + e.message); }
}

async function deleteStudent(firebaseId, studentName) {
    if(!isAdmin()) return;
    if(confirm(`Xóa ${studentName}?`)) {
        try { await deleteDoc(doc(db, COLL_STUDENTS, firebaseId)); alert("Đã xóa!"); } 
        catch (e) { alert("Lỗi: " + e.message); }
    }
}

// -- PROFILE --
function showProfile() {
    if (!currentUser) return;
    showSection('profile');
    document.getElementById('profile-name').value = currentUser.name;
    document.getElementById('profile-phone').value = currentUser.phone;
    document.getElementById('profile-dob').value = currentUser.dob;
    document.getElementById('profile-club').value = (currentUser.clubs || []).join(", ");
    document.getElementById('profile-img-preview').src = currentUser.img || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
    enableEditProfile(false);
}

function enableEditProfile(enable = true) {
    const isEdit = enable;
    document.getElementById('profile-name').disabled = !isEdit;
    document.getElementById('profile-dob').disabled = !isEdit;
    document.getElementById('btn-change-avatar').style.display = isEdit ? 'inline-flex' : 'none';
    document.getElementById('btn-edit-profile').style.display = isEdit ? 'none' : 'block';
    document.getElementById('btn-save-profile').style.display = isEdit ? 'block' : 'none';
}

function previewProfileAvatar(input) {
    if (input.files && input.files[0]) {
        if (input.files[0].size > 100 * 1024) { alert("Ảnh quá lớn (<100KB)!"); return; }
        const reader = new FileReader();
        reader.onload = function(e) { document.getElementById('profile-img-preview').src = e.target.result; }
        reader.readAsDataURL(input.files[0]);
    }
}

async function saveProfile() {
    if (!currentUser || !confirm("Lưu thay đổi?")) return;
    const newName = document.getElementById('profile-name').value;
    const newDob = document.getElementById('profile-dob').value;
    const newImg = document.getElementById('profile-img-preview').src;
    
    const myRecords = students.filter(s => s.phone === currentUser.phone);
    const batch = writeBatch(db);
    myRecords.forEach(rec => {
        const docRef = doc(db, COLL_STUDENTS, rec.firebaseId);
        batch.update(docRef, { name: newName, dob: newDob, img: newImg });
    });

    try {
        await batch.commit();
        currentUser.name = newName; currentUser.dob = newDob; currentUser.img = newImg;
        localStorage.setItem('vovinamCurrentUser', JSON.stringify(currentUser));
        alert("Đã cập nhật!"); enableEditProfile(false); checkLoginStatus();
    } catch(e) { alert("Lỗi: " + e.message); }
}

function openEditModal(firebaseId) {
    const student = students.find(s => s.firebaseId === firebaseId);
    if (!student) return;
    document.getElementById('edit-id').value = firebaseId;
    document.getElementById('edit-name').value = student.name;
    document.getElementById('edit-phone').value = student.phone;
    document.getElementById('edit-dob').value = student.dob;
    document.getElementById('edit-img-preview').src = student.img;
    document.getElementById('edit-img-upload').value = "";
    document.getElementById('modal-edit-student').style.display = 'block';
}

function closeEditModal() { document.getElementById('modal-edit-student').style.display = 'none'; }

function previewEditAvatar(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) { document.getElementById('edit-img-preview').src = e.target.result; }
        reader.readAsDataURL(input.files[0]);
    }
}

async function saveStudentEdits(e) {
    e.preventDefault();
    if(!isAdmin()) return;
    const id = document.getElementById('edit-id').value;
    const name = document.getElementById('edit-name').value;
    const phone = document.getElementById('edit-phone').value;
    const dob = document.getElementById('edit-dob').value;
    let imgUrl = document.getElementById('edit-img-preview').src;
    const imgInput = document.getElementById('edit-img-upload');

    if (imgInput.files && imgInput.files[0]) {
        if (imgInput.files[0].size > 100 * 1024) { alert("Ảnh quá lớn!"); return; }
        imgUrl = await readFileAsBase64(imgInput.files[0]);
    }

    try {
        const relatedRecords = students.filter(s => s.phone === phone);
        const batch = writeBatch(db);
        
        if(relatedRecords.length > 0) {
            relatedRecords.forEach(rec => {
                const docRef = doc(db, COLL_STUDENTS, rec.firebaseId);
                batch.update(docRef, { name, dob, img: imgUrl });
            });
            await batch.commit();
        } else {
            const docRef = doc(db, COLL_STUDENTS, id);
            await updateDoc(docRef, { name, phone, dob, img: imgUrl });
        }
        
        alert("Đã cập nhật thông tin!");
        closeEditModal();
    } catch (error) { alert("Lỗi: " + error.message); }
}

// -- NEWS --
let editingFirebaseId = null; 
let currentViewingPostId = null;

function togglePostForm(isEditMode = false) { 
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

function handleMediaUpload(input) { 
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

async function publishPost() { 
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

async function deletePost(firebaseId) { 
    if (confirm("Xóa bài viết?")) { await deleteDoc(doc(db, COLL_POSTS, firebaseId)); alert("Đã xóa!"); } 
}

function editPost(firebaseId) { 
    const post = posts.find(p => p.firebaseId === firebaseId); 
    if (!post) return; 
    togglePostForm(true); 
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
        let adminActions = isAdmin() ? `<div class="admin-actions"><button class="btn-edit-post" onclick="window.editPost('${post.firebaseId}')"><i class="fas fa-edit"></i> Sửa</button><button class="btn-delete-post" onclick="window.deletePost('${post.firebaseId}')"><i class="fas fa-trash-alt"></i> Xóa</button></div>` : ""; 
        div.innerHTML = `<h3>${post.title}</h3><small style="color:#666;">${post.date}</small><div class="news-preview">${post.content}</div><div class="read-more-btn" onclick="window.viewPost('${post.firebaseId}')">Xem & Bình luận >></div>${adminActions}`; 
        list.appendChild(div); 
    }); 
}

function viewPost(firebaseId) { 
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

function backToNewsList() { 
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
        const div = document.createElement('div'); 
        div.className = `comment-item ${cmt.isAdminComment ? 'is-admin' : 'is-student'}`; 
        let roleBadge = cmt.isAdminComment ? `<span class="comment-role-badge">Quản trị viên</span>` : ""; 
        let authorName = cmt.isAdminComment ? "Huấn Luyện Viên" : cmt.userName; 
        let delBtn = isAdmin() ? `<button class="btn-delete-cmt" onclick="window.deleteComment('${post.firebaseId}', ${idx})"><i class="fas fa-trash"></i></button>` : ""; 
        div.innerHTML = `<div class="comment-header"><span class="comment-author-name">${authorName} ${roleBadge}</span><span class="comment-date">${cmt.date}</span></div><div class="comment-text">${cmt.text}</div>${delBtn}`; 
        list.appendChild(div); 
    }); 
}

async function submitComment() { 
    if (!currentUser) { alert("Vui lòng đăng nhập!"); showSection('login'); return; } 
    const content = document.getElementById('comment-input-rich').innerHTML.trim(); 
    if (!content) return; 
    const post = posts.find(p => p.firebaseId === currentViewingPostId); 
    if (!post) return; 
    const newComment = { userId: currentUser.phone, userName: currentUser.name, text: content, date: new Date().toLocaleString(), isAdminComment: isAdmin() }; 
    let updatedComments = post.comments || []; updatedComments.push(newComment); 
    await updateDoc(doc(db, COLL_POSTS, currentViewingPostId), { comments: updatedComments }); 
    document.getElementById('comment-input-rich').innerHTML = ""; 
}

async function deleteComment(firebaseId, commentIndex) { 
    if (!confirm("Xóa bình luận?")) return; 
    const post = posts.find(p => p.firebaseId === firebaseId); if(!post) return; 
    let updatedComments = post.comments.filter((_, idx) => idx !== commentIndex); 
    await updateDoc(doc(db, COLL_POSTS, firebaseId), { comments: updatedComments }); 
}

// --- !!! PHẦN QUAN TRỌNG NHẤT: ĐƯA HÀM RA WINDOW !!! ---
// Đây là "chìa khóa" để sửa lỗi nút liệt
window.showSection = showSection;
window.loginSuccess = loginSuccess;
window.logout = logout;
window.openClubManager = openClubManager;
window.switchTab = switchTab;
window.saveDailyAttendance = saveDailyAttendance;
window.deleteStudent = deleteStudent;
window.showProfile = showProfile;
window.enableEditProfile = enableEditProfile;
window.saveProfile = saveProfile;
window.previewProfileAvatar = previewProfileAvatar;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.previewEditAvatar = previewEditAvatar;
window.saveStudentEdits = saveStudentEdits;
window.togglePostForm = togglePostForm;
window.handleMediaUpload = handleMediaUpload;
window.publishPost = publishPost;
window.deletePost = deletePost;
window.editPost = editPost;
window.viewPost = viewPost;
window.backToNewsList = backToNewsList;
window.submitComment = submitComment;
window.deleteComment = deleteComment;
window.formatDoc = formatDoc;
window.formatComment = formatComment;
window.openHistorySection = openHistorySection;
window.loadHistoryData = loadHistoryData;

// Gắn form events (Safe Mode)
const regFormFinal = document.getElementById('register-form');
if (regFormFinal) {
    regFormFinal.addEventListener('submit', async function(e) {
        // (Logic đăng ký ở đây)
        // Lưu ý: Đã viết logic đăng ký ở trên, ở đây chỉ để minh họa
        // Nếu đã có addEventListener ở trên thì không cần viết lại.
        // Chỉ cần đảm bảo window.xxxx được gán là xong.
    });
}
checkLoginStatus();
console.log("✅ SYSTEM LOADED & ATTACHED TO WINDOW");
