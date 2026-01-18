// --- 1. FIREBASE CONFIG ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, writeBatch, where, getDocs, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// --- 2. GLOBAL VARIABLES ---
window.currentClub = "";
window.students = [];
window.posts = [];
window.currentUser = JSON.parse(localStorage.getItem('vovinamCurrentUser')); 

const COLL_STUDENTS = "students";
const COLL_POSTS = "posts";
const COLL_HISTORY = "attendance_logs";

// --- 3. DATA LISTENERS ---
onSnapshot(collection(db, COLL_STUDENTS), (snapshot) => {
    window.students = [];
    snapshot.forEach((doc) => {
        let data = doc.data();
        data.firebaseId = doc.id; 
        window.students.push(data);
    });
    // Re-check user & render
    if (window.currentUser && !window.isAdmin()) {
        const myRecord = window.students.find(s => s.phone === window.currentUser.phone);
        if (!myRecord) { alert("Tài khoản bị xóa!"); window.logout(); return; }
        // Update session
        window.currentUser.name = myRecord.name;
        window.currentUser.img = myRecord.img;
        localStorage.setItem('vovinamCurrentUser', JSON.stringify(window.currentUser));
    }
    if(document.getElementById('club-manager').style.display === 'block') window.renderAttendanceTable();
    window.checkLoginStatus();
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

// --- 4. CORE FUNCTIONS (ATTACH TO WINDOW) ---

window.showSection = function(sectionId) {
    document.querySelectorAll('main > section').forEach(sec => sec.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
    window.scrollTo(0, 0);
}

window.isAdmin = function() { return window.currentUser && window.currentUser.phone === '000'; }

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
    const historyMenu = document.getElementById('menu-history');
    const historyText = document.getElementById('menu-history-text');

    if (window.currentUser) {
        authActions.style.display = 'none';
        userDisplay.style.display = 'block'; 
        userNameSpan.innerText = window.currentUser.name;
        
        // HIỆN MENU LỊCH SỬ
        if(historyMenu) {
            historyMenu.style.display = 'block';
            historyText.innerText = window.isAdmin() ? "Quản trị" : "Điểm danh";
        }
    } else {
        authActions.style.display = 'flex';
        userDisplay.style.display = 'none';
        if(historyMenu) historyMenu.style.display = 'none';
    }
    window.renderNews();
}

// --- HISTORY LOGIC ---
window.openHistorySection = function() {
    window.showSection('history-section');
    const title = document.getElementById('history-title');
    const filters = document.getElementById('history-filters');
    const list = document.getElementById('history-list');
    
    list.innerHTML = ""; // Clear old data

    if (window.isAdmin()) {
        title.innerText = "QUẢN TRỊ ĐIỂM DANH";
        filters.style.display = "flex";
        document.getElementById('history-date-picker').valueAsDate = new Date();
    } else {
        title.innerText = "LỊCH SỬ ĐIỂM DANH CÁ NHÂN";
        filters.style.display = "none";
        // Môn sinh tự động load dữ liệu luôn
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
            // ADMIN: Lọc theo Ngày và CLB
            const dateInput = document.getElementById('history-date-picker').value;
            if(!dateInput) { loading.style.display="none"; return; }
            const dateStr = dateInput.split('-').reverse().join('/'); // yyyy-mm-dd -> dd/mm/yyyy
            const clubName = document.getElementById('history-club-select').value;
            
            const q = query(collection(db, COLL_HISTORY), where("date", "==", dateStr), where("club", "==", clubName));
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                const logData = snapshot.docs[0].data();
                logData.records.forEach(rec => {
                    historyRecords.push({
                        date: logData.date,
                        info: rec.name, // Hiển thị tên HS
                        status: rec.status,
                        note: rec.note
                    });
                });
            }
        } else {
            // MÔN SINH: Lấy toàn bộ lịch sử của mình
            const snapshot = await getDocs(collection(db, COLL_HISTORY));
            snapshot.forEach(doc => {
                const logData = doc.data();
                // Tìm xem trong ngày này có tên mình không
                const myRecord = logData.records.find(r => r.phone === window.currentUser.phone);
                if (myRecord) {
                    historyRecords.push({
                        date: logData.date,
                        info: logData.club, // Hiển thị tên CLB
                        status: myRecord.status,
                        note: myRecord.note
                    });
                }
            });
            // Sắp xếp ngày mới nhất lên đầu
            historyRecords.sort((a, b) => {
                const da = a.date.split('/').reverse().join('');
                const db = b.date.split('/').reverse().join('');
                return db.localeCompare(da);
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
            tr.innerHTML = `
                <td>${rec.date}</td>
                <td><strong>${rec.info}</strong></td>
                <td><span class="status-badge ${statusClass}">${rec.status}</span></td>
                <td>${rec.note || ''}</td>
            `;
            list.appendChild(tr);
        });

    } catch (e) {
        console.error(e);
        loading.style.display = "none";
        alert("Lỗi tải: " + e.message);
    }
}

// --- CLUB MANAGER ---
window.openClubManager = function(clubName) {
    if (!window.currentUser) { alert("Vui lòng đăng nhập!"); window.showSection('login'); return; }
    if (!window.isAdmin() && (!window.currentUser.clubs || !window.currentUser.clubs.includes(clubName))) { 
        alert(`Bạn không có quyền xem CLB này!`); return; 
    }
    window.currentClub = clubName;
    document.getElementById('current-club-title').innerText = `Danh sách: ${clubName}`;
    const btnAdd = document.getElementById('btn-add-student');
    if(btnAdd) btnAdd.style.display = window.isAdmin() ? 'inline-block' : 'none';
    
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

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><img src="${student.img}" class="student-avatar"></td>
            <td><strong>${student.name}</strong> ${deleteBtn} ${infoDisplay}</td>
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
            
            // Cập nhật trạng thái hiện tại
            const docRef = doc(db, COLL_STUDENTS, student.firebaseId);
            batch.update(docRef, { isPresent, note, lastAttendanceDate: todayStr });

            // Lưu vào mảng lịch sử
            historyRecords.push({
                studentId: student.firebaseId,
                name: student.name,
                phone: student.phone, // Lưu SĐT để định danh
                status: isPresent ? "Có mặt" : "Vắng",
                note: note
            });
        }
    });

    try {
        await batch.commit();
        
        // TẠO LOG LỊCH SỬ
        // ID log = NGAY_CLB (để không bị trùng)
        const safeDateId = todayStr.replace(/\//g, '-'); 
        const logDocId = `${safeDateId}_${window.currentClub}`;
        
        const logData = {
            date: todayStr,
            club: window.currentClub,
            timestamp: Date.now(),
            records: historyRecords
        };
        
        // setDoc sẽ ghi đè nếu đã có (cho phép update lại trong ngày)
        await setDoc(doc(db, COLL_HISTORY, logDocId), logData);

        alert("Đã lưu điểm danh và cập nhật lịch sử!");
    } catch (e) { alert("Lỗi: " + e.message); }
}

window.deleteStudent = async function(firebaseId, studentName) {
    if(!window.isAdmin()) return;
    if(confirm(`Xóa ${studentName}?`)) {
        try { await deleteDoc(doc(db, COLL_STUDENTS, firebaseId)); alert("Đã xóa!"); } 
        catch (e) { alert("Lỗi: " + e.message); }
    }
}

// --- PROFILE & EDIT ---
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
    const isEdit = enable;
    document.getElementById('profile-name').disabled = !isEdit;
    document.getElementById('profile-dob').disabled = !isEdit;
    document.getElementById('btn-change-avatar').style.display = isEdit ? 'inline-flex' : 'none';
    document.getElementById('btn-edit-profile').style.display = isEdit ? 'none' : 'block';
    document.getElementById('btn-save-profile').style.display = isEdit ? 'block' : 'none';
}

window.previewProfileAvatar = function(input) {
    if (input.files && input.files[0]) {
        if (input.files[0].size > 100 * 1024) { alert("Ảnh quá lớn (<100KB)!"); return; }
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
    
    // Đồng bộ tất cả
    const myRecords = window.students.filter(s => s.phone === window.currentUser.phone);
    const batch = writeBatch(db);
    myRecords.forEach(rec => {
        const docRef = doc(db, COLL_STUDENTS, rec.firebaseId);
        batch.update(docRef, { name: newName, dob: newDob, img: newImg });
    });

    try {
        await batch.commit();
        window.currentUser.name = newName; window.currentUser.dob = newDob; window.currentUser.img = newImg;
        localStorage.setItem('vovinamCurrentUser', JSON.stringify(window.currentUser));
        alert("Đã cập nhật!"); window.enableEditProfile(false); window.checkLoginStatus();
    } catch(e) { alert("Lỗi: " + e.message); }
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

window.previewEditAvatar = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) { document.getElementById('edit-img-preview').src = e.target.result; }
        reader.readAsDataURL(input.files[0]);
    }
}

window.saveStudentEdits = async function(e) {
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
        // Đồng bộ
        const relatedRecords = window.students.filter(s => s.phone === phone);
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
        alert("Đã cập nhật!");
        window.closeEditModal();
    } catch (error) { alert("Lỗi: " + error.message); }
}

// --- NEWS LOGIC ---
let editingFirebaseId = null; let currentViewingPostId = null;
window.togglePostForm = function() { const form = document.getElementById('post-creator'); if(form) form.style.display = form.style.display === 'none' ? 'block' : 'none'; }
window.formatDoc = function(cmd) { document.execCommand(cmd, false, null); }
window.formatComment = function(cmd) { document.execCommand(cmd, false, null); document.getElementById('comment-input-rich').focus(); }
window.handleMediaUpload = function(input) { const file = input.files[0]; if(file) { const reader = new FileReader(); reader.onload = function(e) { const html = `<br><img src="${e.target.result}"><br>`; document.getElementById('post-content').innerHTML += html; }; reader.readAsDataURL(file); } }
window.publishPost = async function() { const title = document.getElementById('post-title').value; const content = document.getElementById('post-content').innerHTML; if(!title) return alert("Thiếu tiêu đề"); await addDoc(collection(db, COLL_POSTS), { id: Date.now(), title, content, date: new Date().toLocaleDateString('vi-VN'), comments: [] }); alert("Đã đăng!"); document.getElementById('post-creator').style.display = 'none'; }
window.renderNews = function() { const list = document.getElementById('news-feed'); if(!list) return; list.innerHTML = ""; const btnCreate = document.getElementById('btn-create-post'); if(btnCreate) btnCreate.style.display = window.isAdmin() ? 'block' : 'none'; window.posts.forEach(post => { const div = document.createElement('div'); div.className = 'news-item'; let adminActions = window.isAdmin() ? `<div class="admin-actions"><button class="btn-delete-post" onclick="window.deletePost('${post.firebaseId}')">Xóa</button></div>` : ""; div.innerHTML = `<h3>${post.title}</h3><small>${post.date}</small><div class="news-preview">${post.content}</div>${adminActions}`; list.appendChild(div); }); }
window.deletePost = async function(id) { if(confirm("Xóa?")) await deleteDoc(doc(db, COLL_POSTS, id)); }

// FORM EVENTS
setTimeout(() => {
    const loginF = document.getElementById('login-form');
    if(loginF) loginF.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('login-name').value.trim();
        const phone = document.getElementById('login-phone').value.trim();
        if (phone === '000' && name.toLowerCase() === 'admin') {
            window.currentUser = { name: "Huấn Luyện Viên", phone: "000", clubs: ["ALL"], role: "admin" };
            localStorage.setItem('vovinamCurrentUser', JSON.stringify(window.currentUser));
            window.checkLoginStatus(); window.showSection('home');
        } else {
            const match = window.students.filter(s => s.phone === phone && s.name.toLowerCase() === name.toLowerCase());
            if(match.length > 0) {
                const clubs = match.map(s => s.club);
                window.currentUser = { ...match[0], clubs: clubs, role: "student" };
                localStorage.setItem('vovinamCurrentUser', JSON.stringify(window.currentUser));
                window.checkLoginStatus(); window.showSection('home');
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
        if (!club) { alert("Chọn CLB!"); return; }
        if (window.students.some(s => s.phone === phone && s.club === club)) return alert("Đã tồn tại");
        let img = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
        const exist = window.students.find(s => s.phone === phone);
        if(exist) img = exist.img;
        await addDoc(collection(db, COLL_STUDENTS), { id: Date.now(), club, name, phone, dob, img, isPresent: false, note: "", lastAttendanceDate: "" });
        alert("Đăng ký thành công!"); window.showSection('login');
    });
}, 1000);

window.checkLoginStatus();
