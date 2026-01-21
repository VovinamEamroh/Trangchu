// --- 1. CONFIG & FIREBASE ---
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

window.currentClub = "";
window.students = [];
window.posts = [];
window.banners = [];
window.currentUser = JSON.parse(localStorage.getItem('vovinamCurrentUser')); 
window.isSortAsc = false;

const COLL_STUDENTS = "students";
const COLL_POSTS = "posts";
const COLL_HISTORY = "attendance_logs";
const COLL_BANNERS = "banners";

// --- 2. LISTENERS ---
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
            alert("Tài khoản đã bị xóa."); window.logout(); return;
        }
        const latest = myRecords[0];
        window.currentUser = {
            ...latest,
            clubs: myRecords.map(s => s.club),
            role: latest.role || 'student' 
        };
        localStorage.setItem('vovinamCurrentUser', JSON.stringify(window.currentUser));
        window.checkLoginStatus();
    }
    if(document.getElementById('club-manager').style.display === 'block') {
        window.openClubManager(window.currentClub);
    }
});

const qPosts = query(collection(db, COLL_POSTS), orderBy("id", "desc")); 
onSnapshot(qPosts, (snapshot) => {
    window.posts = [];
    snapshot.forEach((doc) => { let data = doc.data(); data.firebaseId = doc.id; window.posts.push(data); });
    window.renderNews(); 
});

const qBanners = query(collection(db, COLL_BANNERS), orderBy("timestamp", "asc"));
onSnapshot(qBanners, (snapshot) => {
    window.banners = [];
    snapshot.forEach((doc) => { let data = doc.data(); data.firebaseId = doc.id; window.banners.push(data); });
    window.renderBannerSlider();
});

// --- 3. PERMISSIONS & LOGIC ---
window.isAdmin = function() { return window.currentUser && window.currentUser.phone === '000'; };
window.isAssistant = function() { return window.currentUser && window.currentUser.role === 'assistant'; };
window.isMonitor = function() { return window.currentUser && window.currentUser.role === 'monitor'; };

// Quyền truy cập vào trang Quản lý
window.canManage = function() {
    if (window.isAdmin()) return true;
    if (window.isAssistant() && window.currentUser.clubs.includes(window.currentClub)) return true;
    // Lớp trưởng chỉ quản lý CLB Nội Trú
    if (window.isMonitor() && window.currentClub === 'Nội Trú') return true; 
    return false;
};

// Quyền chỉnh sửa từng môn sinh (MỚI: QUAN TRỌNG CHO LỚP TRƯỞNG)
window.canEditStudent = function(targetStudent) {
    if (window.isAdmin()) return true;
    if (window.isAssistant() && window.currentUser.clubs.includes(window.currentClub)) return true;
    
    // Lớp trưởng chỉ sửa được môn sinh CÙNG LỚP
    if (window.isMonitor() && window.currentClub === 'Nội Trú') {
        return window.currentUser.classRoom === targetStudent.classRoom;
    }
    return false;
}

window.showSection = function(sectionId) {
    document.querySelectorAll('main > section').forEach(sec => sec.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
    window.scrollTo(0, 0);
};

window.logout = function() {
    window.currentUser = null;
    localStorage.removeItem('vovinamCurrentUser');
    window.checkLoginStatus();
    window.showSection('home');
};

window.checkLoginStatus = function() {
    const authActions = document.getElementById('auth-actions');
    const userDisplay = document.getElementById('user-display');
    const userNameSpan = document.getElementById('user-name-display');
    const menuHistory = document.getElementById('menu-history');
    const menuHistoryText = document.getElementById('menu-history-text');
    const clubLinks = document.querySelectorAll('.dropdown-content li');
    const btnConfigBanner = document.getElementById('btn-config-banner');

    if (window.currentUser) {
        authActions.style.display = 'none';
        userDisplay.style.display = 'block'; 
        let roleTitle = "Môn sinh";
        if (window.isAdmin()) roleTitle = "HLV Trưởng";
        else if (window.isAssistant()) roleTitle = "Hướng dẫn viên";
        else if (window.isMonitor()) roleTitle = "Lớp trưởng"; // Hiện chức vụ
        
        userNameSpan.innerText = `${roleTitle}: ${window.currentUser.name}`;
        
        if (menuHistory) {
            menuHistory.style.display = 'block';
            menuHistoryText.innerText = (window.isAdmin() || window.isAssistant() || window.isMonitor()) ? "Quản trị" : "Điểm danh";
        }
        if (btnConfigBanner) btnConfigBanner.style.display = window.isAdmin() ? 'block' : 'none';

        clubLinks.forEach(li => {
            const onclickText = li.getAttribute('onclick');
            if (onclickText) {
                const clubName = onclickText.match(/'([^']+)'/)[1];
                li.style.display = (window.isAdmin() || (window.currentUser.clubs && window.currentUser.clubs.includes(clubName)) || (window.isMonitor() && clubName === 'Nội Trú')) ? 'block' : 'none';
            }
        });
    } else {
        authActions.style.display = 'flex';
        userDisplay.style.display = 'none';
        if(menuHistory) menuHistory.style.display = 'none';
        if (btnConfigBanner) btnConfigBanner.style.display = 'none';
        clubLinks.forEach(li => li.style.display = 'block');
    }
    window.renderNews();
};

window.toggleRegisterFields = function() {
    const club = document.getElementById('reg-club').value;
    const classDiv = document.getElementById('reg-class-wrapper');
    if(classDiv) {
        classDiv.style.display = (club === 'Nội Trú') ? 'block' : 'none';
    }
}

// --- CLUB MANAGER ---
window.openClubManager = function(clubName) {
    if (!window.currentUser) { alert("Vui lòng đăng nhập!"); window.showSection('login'); return; }
    
    // Check quyền truy cập
    const isMember = window.currentUser.clubs && window.currentUser.clubs.includes(clubName);
    const isMon = window.isMonitor() && clubName === 'Nội Trú';
    
    if (!window.isAdmin() && !isMember && !isMon) { alert(`Bạn không có quyền truy cập CLB này!`); return; }
    
    window.currentClub = clubName;
    document.getElementById('current-club-title').innerText = `Danh sách: ${clubName}`;
    
    const assistants = window.students.filter(s => s.club === clubName && (s.role === 'assistant' || s.role === 'monitor'));
    const assistDiv = document.getElementById('club-assistants-display');
    if (assistDiv) {
        if (assistants.length > 0) {
            const names = assistants.map(a => `${a.name} (${a.role === 'monitor' ? 'Lớp trưởng' : 'HDV'})`).join(", ");
            assistDiv.innerHTML = `<strong>Ban cán sự:</strong> ${names}`;
        } else { assistDiv.innerHTML = `(Chưa có Ban cán sự)`; }
    }

    const isFullAdmin = window.isAdmin() || window.isAssistant(); // Quyền cao nhất
    
    // Ẩn nút thêm/xóa/import đối với Lớp trưởng
    const btnAdd = document.getElementById('btn-add-student');
    const bulkArea = document.querySelector('.bulk-upload-area');
    const toolbar = document.getElementById('attendance-toolbar');
    
    if (btnAdd) btnAdd.style.display = isFullAdmin ? 'inline-block' : 'none';
    if (bulkArea) bulkArea.style.display = isFullAdmin ? 'block' : 'none';
    if (toolbar) toolbar.style.display = window.canManage() ? 'flex' : 'none'; // Lớp trưởng vẫn thấy toolbar lọc

    const isNoiTru = (clubName === 'Nội Trú');
    const studentClassWrapper = document.getElementById('student-class-wrapper');
    const filterClass = document.getElementById('filter-class-select');
    
    if(studentClassWrapper) studentClassWrapper.style.display = (isFullAdmin && isNoiTru) ? 'block' : 'none';
    if(filterClass) filterClass.style.display = isNoiTru ? 'inline-block' : 'none';

    window.showSection('club-manager');
    window.switchTab('attendance');
};

window.switchTab = function(tabId) {
    document.getElementById('tab-attendance').style.display = 'none';
    document.getElementById('tab-add-student').style.display = 'none';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).style.display = 'block';
    
    if(tabId === 'attendance') {
        document.getElementById('btn-tab-attendance').classList.add('active');
        window.renderAttendanceTable();
        const actionDiv = document.getElementById('attendance-actions');
        // Lớp trưởng vẫn thấy nút Lưu điểm danh (nhưng chỉ lưu được lớp mình)
        if(actionDiv) actionDiv.style.display = window.canManage() ? 'block' : 'none';
    } else {
        const btnAdd = document.getElementById('btn-add-student');
        if(btnAdd) btnAdd.classList.add('active');
        const actionDiv = document.getElementById('attendance-actions');
        if(actionDiv) actionDiv.style.display = 'none';
    }
};

const getBeltClass = (belt) => { if (!belt) return 'belt-white'; if (belt.includes('Hoàng')) return 'belt-yellow'; if (belt.includes('Lam') || belt.includes('Chuẩn')) return 'belt-blue'; return 'belt-white'; }
const getFirstName = (fullName) => { if (!fullName) return ""; const parts = fullName.trim().split(" "); return parts[parts.length - 1].toLowerCase(); }
window.toggleSortName = function() { window.isSortAsc = !window.isSortAsc; const btn = document.querySelector('.btn-sort i'); if(btn) btn.className = window.isSortAsc ? 'fas fa-sort-alpha-up' : 'fas fa-sort-alpha-down'; window.renderAttendanceTable(); }

// --- RENDER TABLE (Logic hiển thị phân quyền) ---
window.renderAttendanceTable = function() {
    const tbody = document.getElementById('attendance-list');
    tbody.innerHTML = "";
    
    let clubStudents = window.students.filter(s => s.club === window.currentClub);

    const classFilter = document.getElementById('filter-class-select') ? document.getElementById('filter-class-select').value : "ALL";
    if (window.currentClub === 'Nội Trú' && classFilter !== "ALL") {
        clubStudents = clubStudents.filter(s => s.classRoom === classFilter);
    }

    const beltFilter = document.getElementById('filter-belt-select') ? document.getElementById('filter-belt-select').value : "ALL";
    if (beltFilter !== "ALL") {
        clubStudents = clubStudents.filter(s => {
            if (!s.belt) return false;
            if (beltFilter === "Lam đai") return s.belt.includes("Lam") || s.belt.includes("Chuẩn");
            if (beltFilter === "Hoàng đai") return s.belt.includes("Hoàng");
            return s.belt === beltFilter;
        });
    }

    if (window.isSortAsc) {
        clubStudents.sort((a, b) => getFirstName(a.name).localeCompare(getFirstName(b.name)));
    }

    if (clubStudents.length === 0) { document.getElementById('empty-list-msg').style.display = 'block'; return; } 
    document.getElementById('empty-list-msg').style.display = 'none';

    clubStudents.forEach((student, index) => {
        const tr = document.createElement('tr');
        
        // KIỂM TRA QUYỀN TRÊN TỪNG MÔN SINH
        const canEditThisStudent = window.canEditStudent(student);

        // Nếu có quyền -> Hiện Checkbox + Input. Nếu không -> Hiện Text (Read-only)
        let statusHTML = canEditThisStudent 
            ? `<label class="switch"><input type="checkbox" id="status-${student.firebaseId}" ${student.isPresent ? 'checked' : ''}><span class="slider"></span></label> 
               <button type="button" class="btn-edit-student" onclick="window.openEditModal('${student.firebaseId}')"><i class="fas fa-pen"></i></button>`
            : (student.isPresent ? `<span style="color:green;font-weight:bold;">Có mặt</span>` : `<span style="color:red;font-weight:bold;">Vắng</span>`);
        
        let noteHTML = canEditThisStudent
            ? `<input type="text" class="note-input" id="note-${student.firebaseId}" value="${student.note || ''}" placeholder="...">`
            : `<span>${student.note || ''}</span>`;

        let deleteBtn = window.isAdmin() 
            ? ` <i class="fas fa-trash" style="color: #ff4444; cursor: pointer; margin-left: 10px;" onclick="window.deleteStudent('${student.firebaseId}', '${student.name}')" title="Xóa"></i>` 
            : '';
        
        // Icon chức vụ
        let roleIcon = "";
        if (student.role === 'assistant') roleIcon = ` <i class="fas fa-star" style="color: #FFD700;" title="Hướng dẫn viên"></i>`;
        else if (student.role === 'monitor') roleIcon = ` <i class="fas fa-user-shield" style="color: #4CAF50;" title="Lớp trưởng"></i>`; // Icon lớp trưởng

        let isMe = (!window.isAdmin() && window.currentUser.phone === student.phone) ? "(Bạn)" : "";
        const rowStyle = isMe ? 'background-color: #e3f2fd; border-left: 5px solid #0055A4;' : ''; 
        let dateInfo = student.lastAttendanceDate ? `<br><small style="color:blue">Cập nhật: ${student.lastAttendanceDate}</small>` : '';
        let beltHTML = student.belt ? `<br><span class="belt-badge ${getBeltClass(student.belt)}">${student.belt}</span>` : '';
        let classInfo = (window.currentClub === 'Nội Trú' && student.classRoom) ? ` <span style="font-size:0.8rem; color:#666;">(Lớp ${student.classRoom})</span>` : '';

        let infoDisplay = `<br><small><i class="fas fa-birthday-cake"></i> ${student.dob}</small>`;
        if (canEditThisStudent) infoDisplay = `<br><small><i class="fas fa-phone"></i> ${student.phone}</small> | ` + infoDisplay;

        tr.innerHTML = `
            <td style="${rowStyle}">${index + 1}</td>
            <td style="${rowStyle}">
                <div style="display:flex; align-items:center;">
                    <img src="${student.img}" class="student-avatar" style="margin-right:10px;">
                    <div><strong>${student.name}</strong>${classInfo} ${roleIcon} ${isMe} ${deleteBtn}${beltHTML}${infoDisplay} ${dateInfo}</div>
                </div>
            </td>
            <td style="${rowStyle}" style="white-space: nowrap;">${statusHTML}</td>
            <td style="${rowStyle}">${noteHTML}</td>
        `;
        tbody.appendChild(tr);
    });
};

window.exportToExcel = function() {
    if(!window.canManage()) return;
    // Lớp trưởng không được xuất file (để bảo mật)
    if(window.isMonitor()) { alert("Lớp trưởng không có quyền xuất file!"); return; }

    const beltFilter = document.getElementById('filter-belt-select').value;
    const classFilter = document.getElementById('filter-class-select').value;
    
    let list = window.students.filter(s => s.club === window.currentClub);
    
    if (window.currentClub === 'Nội Trú' && classFilter !== "ALL") {
        list = list.filter(s => s.classRoom === classFilter);
    }
    if (beltFilter !== "ALL") {
        list = list.filter(s => {
            if (!s.belt) return false;
            if (beltFilter === "Lam đai") return s.belt.includes("Lam") || s.belt.includes("Chuẩn");
            if (beltFilter === "Hoàng đai") return s.belt.includes("Hoàng");
            return s.belt === beltFilter;
        });
    }
    if (window.isSortAsc) {
        list.sort((a, b) => getFirstName(a.name).localeCompare(getFirstName(b.name)));
    }
    if (list.length === 0) { alert("Danh sách trống!"); return; }

    let csvContent = "\uFEFF"; 
    csvContent += "STT,Họ và Tên,Lớp,Số điện thoại,Ngày sinh,Cấp đai,Trạng thái hôm nay,Ghi chú\n";
    list.forEach((s, index) => {
        const status = s.isPresent ? "Có mặt" : "Vắng";
        const row = [index + 1, `"${s.name}"`, `"${s.classRoom || ''}"`, `'${s.phone}`, `"${s.dob}"`, `"${s.belt || ''}"`, `"${status}"`, `"${s.note || ''}"`];
        csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const dateStr = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
    link.setAttribute("download", `DS_${window.currentClub}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- SAVE ATTENDANCE (Chỉ lưu những người có quyền sửa) ---
window.saveDailyAttendance = async function() {
    if(!window.canManage()) return;
    if(!confirm("Lưu điểm danh hôm nay và ghi vào lịch sử?")) return;

    const clubStudents = window.students.filter(s => s.club === window.currentClub);
    const d = new Date();
    const todayStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    const displayDateTime = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} ${todayStr}`;

    const batch = writeBatch(db);
    let historyRecords = [];
    let count = 0;

    clubStudents.forEach(student => {
        // QUAN TRỌNG: Chỉ lưu nếu có quyền sửa
        if (!window.canEditStudent(student)) return;

        const statusEl = document.getElementById(`status-${student.firebaseId}`);
        const noteEl = document.getElementById(`note-${student.firebaseId}`);

        if (statusEl && noteEl) {
            const isPresent = statusEl.checked;
            const note = noteEl.value.trim();
            
            const docRef = doc(db, COLL_STUDENTS, student.firebaseId);
            batch.update(docRef, { isPresent, note, lastAttendanceDate: displayDateTime });

            historyRecords.push({
                studentId: student.firebaseId,
                name: student.name,
                phone: student.phone,
                status: isPresent ? "Có mặt" : "Vắng",
                note: note
            });
            count++;
        }
    });

    if (count === 0 && window.isMonitor()) {
        alert("Bạn không có quyền điểm danh ai trong danh sách hiện tại (Khác lớp).");
        return;
    }

    try {
        await batch.commit();
        
        // Lưu lịch sử (Chỉ lưu những người đã điểm danh)
        const safeDateId = todayStr.replace(/\//g, '-'); 
        // Lớp trưởng lưu file log riêng hoặc append? 
        // Để đơn giản, ta dùng log chung, Firestore sẽ merge nếu dùng setDoc với merge (nhưng ở đây cấu trúc mảng nên hơi khó merge).
        // Giải pháp an toàn: Mỗi lần lưu sẽ tạo 1 log entry mới với timestamp để không đè lên log của người khác
        const logDocId = `${safeDateId}_${window.currentClub}_${Date.now()}`; 
        
        const logData = {
            date: todayStr,
            timestampStr: displayDateTime,
            club: window.currentClub,
            timestamp: Date.now(),
            savedBy: window.currentUser.name, // Lưu người điểm danh
            records: historyRecords
        };
        await setDoc(doc(db, COLL_HISTORY, logDocId), logData);

        alert(`Đã lưu thành công ${count} môn sinh!`);
        
        const dp = document.getElementById('history-date-picker');
        if(dp) dp.valueAsDate = new Date();
        const cs = document.getElementById('history-club-select');
        if(cs) cs.value = window.currentClub;
        
        window.openHistorySection();

    } catch (e) { alert("Lỗi: " + e.message); }
};

// --- CÁC HÀM KHÁC (GIỮ NGUYÊN) ---
window.deleteAllStudents = async function() {
    if (!window.isAdmin()) { alert("Chỉ Huấn Luyện Viên trưởng mới được dùng tính năng này!"); return; }
    if (!confirm(`CẢNH BÁO NGUY HIỂM!\n\nBạn có chắc chắn muốn xóa SẠCH toàn bộ danh sách trong CLB "${window.currentClub}" không?`)) return;
    if (!confirm("Xác nhận lần cuối: XÓA HẾT DỮ LIỆU CLB NÀY?")) return;
    const clubStudents = window.students.filter(s => s.club === window.currentClub);
    const batch = writeBatch(db);
    let count = 0;
    clubStudents.forEach(student => { batch.delete(doc(db, COLL_STUDENTS, student.firebaseId)); count++; });
    try { await batch.commit(); alert(`Đã xóa thành công ${count} hồ sơ!`); window.renderAttendanceTable(); } catch (e) { alert("Lỗi khi xóa: " + e.message); }
}

window.handleBulkUpload = function() {
    const input = document.getElementById('bulk-upload-input');
    if (!input.files || input.files.length === 0) { alert("Vui lòng chọn file CSV!"); return; }
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result;
        const lines = text.split('\n');
        const batch = writeBatch(db);
        let count = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if(!line) continue;
            const parts = line.split(',');
            if(parts.length >= 2) { 
                const name = parts[0].trim();
                const phone = parts[1].trim();
                const dob = parts[2] ? parts[2].trim() : "01/01/2000";
                const belt = parts[3] ? parts[3].trim() : "Tự vệ";
                const classRoom = parts[4] ? parts[4].trim() : "";
                const exists = window.students.some(s => s.phone === phone && s.club === window.currentClub);
                if(!exists) {
                    const newRef = doc(collection(db, COLL_STUDENTS));
                    batch.set(newRef, { id: Date.now() + i, club: window.currentClub, name: name, phone: phone, dob: dob, belt: belt, classRoom, img: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png", role: "student", isPresent: false, note: "", lastAttendanceDate: "" });
                    count++;
                }
            }
        }
        try { await batch.commit(); alert(`Đã thêm thành công ${count} môn sinh!`); input.value = ""; window.switchTab('attendance'); } catch (err) { alert("Lỗi khi lưu: " + err.message); }
    };
    reader.readAsText(file, "UTF-8"); 
}

// Banner Logic
let bannerIndex = 0; let bannerInterval;
window.renderBannerSlider = function() { const wrapper = document.getElementById('banner-wrapper'); const dotsContainer = document.getElementById('slider-dots'); if(!wrapper) return; wrapper.innerHTML = ""; dotsContainer.innerHTML = ""; let displayBanners = window.banners; if (displayBanners.length === 0) { displayBanners = [{ img: "https://vovinam.vn/wp-content/uploads/2019/04/vovinam-banner.jpg", title: "TINH HOA VÕ THUẬT VIỆT NAM", desc: "Rèn luyện thân thể - Tu dưỡng tinh thần" }]; } displayBanners.forEach((b, idx) => { const slide = document.createElement('div'); slide.className = 'slide'; slide.innerHTML = `<img src="${b.img}" alt="Banner"><div class="banner-content"><h2>${b.title}</h2><p>${b.desc}</p></div>`; wrapper.appendChild(slide); const dot = document.createElement('div'); dot.className = `dot ${idx === 0 ? 'active' : ''}`; dot.onclick = () => window.goToSlide(idx); dotsContainer.appendChild(dot); }); bannerIndex = 0; window.updateSliderPosition(); window.startBannerAutoPlay(); };
window.updateSliderPosition = function() { const wrapper = document.getElementById('banner-wrapper'); if(wrapper) { wrapper.style.transform = `translateX(-${bannerIndex * 100}%)`; document.querySelectorAll('.dot').forEach((d, i) => { d.classList.toggle('active', i === bannerIndex); }); } };
window.moveSlide = function(n) { const total = document.getElementById('banner-wrapper').children.length; bannerIndex += n; if (bannerIndex >= total) bannerIndex = 0; if (bannerIndex < 0) bannerIndex = total - 1; window.updateSliderPosition(); window.startBannerAutoPlay(); };
window.goToSlide = function(n) { bannerIndex = n; window.updateSliderPosition(); window.startBannerAutoPlay(); };
window.startBannerAutoPlay = function() { clearInterval(bannerInterval); bannerInterval = setInterval(() => { window.moveSlide(1); }, 5000); };
window.openBannerManager = function() { if (!window.isAdmin()) return; document.getElementById('modal-banner-manager').style.display = 'block'; const list = document.getElementById('banner-list-admin'); list.innerHTML = ""; window.banners.forEach(b => { const div = document.createElement('div'); div.className = 'banner-item-admin'; div.innerHTML = `<div style="display:flex;align-items:center;"><img src="${b.img}"><div><strong>${b.title}</strong></div></div><button class="btn-delete-banner" onclick="window.deleteBanner('${b.firebaseId}')">Xóa</button>`; list.appendChild(div); }); };
window.closeBannerManager = function() { document.getElementById('modal-banner-manager').style.display = 'none'; };
window.addBanner = async function() { const title = document.getElementById('new-banner-title').value.trim(); const desc = document.getElementById('new-banner-desc').value.trim(); const fileInput = document.getElementById('new-banner-img'); if(!title || !fileInput.files[0]) { alert("Cần nhập tiêu đề và chọn ảnh!"); return; } const file = fileInput.files[0]; if(file.size > 5 * 1024 * 1024) { alert("Ảnh quá lớn (<5MB)!"); return; } const reader = new FileReader(); reader.onload = async function(e) { const imgBase64 = e.target.result; try { await addDoc(collection(db, COLL_BANNERS), { title, desc, img: imgBase64, timestamp: Date.now() }); alert("Đã thêm banner!"); window.openBannerManager(); } catch(err) { alert("Lỗi: " + err.message); } }; reader.readAsDataURL(file); };
window.deleteBanner = async function(id) { if(!confirm("Xóa banner này?")) return; try { await deleteDoc(doc(db, COLL_BANNERS, id)); window.openBannerManager(); } catch(e) { alert("Lỗi: " + e.message); } };

window.deleteStudent = async function(firebaseId, studentName) { if(!window.isAdmin()) { alert("Chỉ HLV trưởng mới được xóa!"); return; } if(confirm(`Xóa ${studentName}?`)) { try { await deleteDoc(doc(db, COLL_STUDENTS, firebaseId)); alert("Đã xóa!"); } catch (e) { alert("Lỗi: " + e.message); } } };
window.handleAddStudent = async function(e) { e.preventDefault(); const name = document.getElementById('student-name').value; const phone = document.getElementById('student-phone').value; const dob = document.getElementById('student-dob').value; const belt = document.getElementById('student-belt').value; const classRoom = document.getElementById('student-class').value; const input = document.getElementById('student-img'); if (window.students.some(s => s.phone === phone && s.club === window.currentClub)) return alert("Đã tồn tại trong CLB này"); let img = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"; let role = "student"; const exist = window.students.find(s => s.phone === phone); if(exist) { img = exist.img; role = exist.role || "student"; } if(input.files[0]) { if(input.files[0].size > 5 * 1024 * 1024) return alert("Ảnh quá lớn (<5MB)"); img = await readFileAsBase64(input.files[0]); } await addDoc(collection(db, COLL_STUDENTS), { id: Date.now(), club: window.currentClub, name, phone, dob, belt, classRoom, img, role, isPresent: false, note: "", lastAttendanceDate: "" }); alert("Đã thêm!"); document.getElementById('add-student-form').reset(); window.switchTab('attendance'); };
window.openEditModal = function(firebaseId) { const student = window.students.find(s => s.firebaseId === firebaseId); if (!student) return; document.getElementById('edit-id').value = firebaseId; document.getElementById('edit-name').value = student.name; document.getElementById('edit-phone').value = student.phone; document.getElementById('edit-dob').value = student.dob; document.getElementById('edit-belt').value = student.belt || "Tự vệ"; document.getElementById('edit-class').value = student.classRoom || ""; document.getElementById('edit-img-preview').src = student.img; document.getElementById('edit-img-upload').value = ""; const roleDiv = document.getElementById('div-edit-role'); const roleSelect = document.getElementById('edit-role'); 
    // ADMIN MỚI ĐƯỢC CHỈNH ROLE
    if (window.isAdmin()) { roleDiv.style.display = 'block'; roleSelect.value = student.role || 'student'; } else { roleDiv.style.display = 'none'; } 
    document.getElementById('modal-edit-student').style.display = 'block'; };
window.closeEditModal = function() { document.getElementById('modal-edit-student').style.display = 'none'; };
window.previewEditAvatar = function(input) { if (input.files && input.files[0]) { if (input.files[0].size > 5 * 1024 * 1024) { alert("Ảnh quá lớn (<5MB)!"); input.value = ""; return; } const reader = new FileReader(); reader.onload = function(e) { document.getElementById('edit-img-preview').src = e.target.result; }; reader.readAsDataURL(input.files[0]); } };
window.saveStudentEdits = async function(e) { e.preventDefault(); if(!window.canManage()) return; const id = document.getElementById('edit-id').value; const name = document.getElementById('edit-name').value; const phone = document.getElementById('edit-phone').value; const dob = document.getElementById('edit-dob').value; const belt = document.getElementById('edit-belt').value; const classRoom = document.getElementById('edit-class').value; let imgUrl = document.getElementById('edit-img-preview').src; const imgInput = document.getElementById('edit-img-upload'); let newRole = 'student'; const currentStudent = window.students.find(s => s.firebaseId === id); if(currentStudent) newRole = currentStudent.role || 'student'; if (window.isAdmin()) newRole = document.getElementById('edit-role').value; if (imgInput.files && imgInput.files[0]) { if (imgInput.files[0].size > 5 * 1024 * 1024) { alert("Ảnh quá lớn (<5MB)!"); return; } imgUrl = await readFileAsBase64(imgInput.files[0]); } try { const relatedRecords = window.students.filter(s => s.phone === phone); const batch = writeBatch(db); if(relatedRecords.length > 0) { relatedRecords.forEach(rec => { const docRef = doc(db, COLL_STUDENTS, rec.firebaseId); if (rec.firebaseId === id) { batch.update(docRef, { name, dob, belt, classRoom, img: imgUrl, role: newRole }); } else { batch.update(docRef, { name, dob, belt, classRoom, img: imgUrl }); } }); await batch.commit(); } else { const docRef = doc(db, COLL_STUDENTS, id); await updateDoc(docRef, { name, phone, dob, belt, classRoom, img: imgUrl, role: newRole }); } alert("Đã cập nhật!"); window.closeEditModal(); } catch (error) { alert("Lỗi: " + error.message); } };
window.openHistorySection = function() { window.showSection('history-section'); const title = document.getElementById('history-title'); const filters = document.getElementById('history-filters'); const list = document.getElementById('history-list'); list.innerHTML = ""; if (window.isAdmin() || window.isAssistant() || window.isMonitor()) { title.innerText = "QUẢN TRỊ ĐIỂM DANH"; filters.style.display = "flex"; const dp = document.getElementById('history-date-picker'); if(!dp.value) dp.valueAsDate = new Date(); window.loadHistoryData(); } else { title.innerText = "LỊCH SỬ ĐIỂM DANH CÁ NHÂN"; filters.style.display = "none"; window.loadHistoryData(); } };
window.loadHistoryData = async function() { const list = document.getElementById('history-list'); const loading = document.getElementById('history-loading'); const emptyMsg = document.getElementById('history-empty'); list.innerHTML = ""; loading.style.display = "block"; emptyMsg.style.display = "none"; try { let historyRecords = []; if (window.isAdmin() || window.isAssistant() || window.isMonitor()) { const dateInput = document.getElementById('history-date-picker').value; if(!dateInput) { loading.style.display="none"; return; } const dateStr = dateInput.split('-').reverse().join('/'); const clubName = document.getElementById('history-club-select').value; if (window.isAssistant() && !window.currentUser.clubs.includes(clubName)) { loading.style.display = "none"; alert("Bạn không có quyền xem CLB này!"); return; } if (window.isMonitor() && clubName !== 'Nội Trú') { loading.style.display = "none"; alert("Lớp trưởng chỉ xem được CLB Nội Trú!"); return; } const q = query(collection(db, COLL_HISTORY), where("date", "==", dateStr), where("club", "==", clubName)); const snapshot = await getDocs(q); if (!snapshot.empty) { 
    // Lớp trưởng xem log của lớp mình (tuy nhiên log lưu chung, nên xem hết cũng được, hoặc lọc client)
    snapshot.forEach(docLog => {
        const logData = docLog.data(); const displayDate = logData.timestampStr || logData.date; 
        logData.records.forEach(r => { historyRecords.push({...r, date: displayDate}); });
    });
} } else { const snapshot = await getDocs(collection(db, COLL_HISTORY)); snapshot.forEach(doc => { const logData = doc.data(); const myRecord = logData.records.find(r => r.phone === window.currentUser.phone); if (myRecord) { const displayDate = logData.timestampStr || logData.date; historyRecords.push({ date: displayDate, name: logData.club, status: myRecord.status, note: myRecord.note }); } }); historyRecords.sort((a, b) => { return b.date.localeCompare(a.date); }); } loading.style.display = "none"; if(historyRecords.length === 0) { emptyMsg.style.display = "block"; return; } historyRecords.forEach(rec => { const tr = document.createElement('tr'); const statusClass = rec.status === "Có mặt" ? "status-present" : "status-absent"; tr.innerHTML = `<td>${rec.date}</td><td><strong>${rec.name}</strong></td><td><span class="status-badge ${statusClass}">${rec.status}</span></td><td>${rec.note || ''}</td>`; list.appendChild(tr); }); } catch(e) { loading.style.display = "none"; alert("Lỗi: " + e.message); } };
window.formatDoc = function(cmd) { document.execCommand(cmd, false, null); };
window.formatComment = function(cmd) { document.execCommand(cmd, false, null); document.getElementById('comment-input-rich').focus(); };
const readFileAsBase64 = (file) => { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = error => reject(error); reader.readAsDataURL(file); }); };
window.showProfile = function() { if (!window.currentUser) return; window.showSection('profile'); document.getElementById('profile-name').value = window.currentUser.name; document.getElementById('profile-phone').value = window.currentUser.phone; document.getElementById('profile-dob').value = window.currentUser.dob; document.getElementById('profile-belt').value = window.currentUser.belt || "Tự vệ"; document.getElementById('profile-club').value = (window.currentUser.clubs || []).join(", "); 
    document.getElementById('profile-class').value = window.currentUser.classRoom ? `Lớp ${window.currentUser.classRoom}` : "(Không có)";
    document.getElementById('profile-img-preview').src = window.currentUser.img || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"; window.enableEditProfile(false); };
window.enableEditProfile = function(enable = true) { document.getElementById('profile-name').disabled = !enable; document.getElementById('profile-dob').disabled = !enable; document.getElementById('btn-change-avatar').style.display = enable ? 'inline-flex' : 'none'; document.getElementById('btn-edit-profile').style.display = enable ? 'none' : 'block'; document.getElementById('btn-save-profile').style.display = enable ? 'block' : 'none'; };
window.previewProfileAvatar = function(input) { if (input.files && input.files[0]) { if (input.files[0].size > 5 * 1024 * 1024) { alert("Ảnh quá lớn (<5MB)!"); input.value=""; return; } const reader = new FileReader(); reader.onload = function(e) { document.getElementById('profile-img-preview').src = e.target.result; }; reader.readAsDataURL(input.files[0]); } };
window.saveProfile = async function() { if (!window.currentUser || !confirm("Lưu thay đổi?")) return; const newName = document.getElementById('profile-name').value; const newDob = document.getElementById('profile-dob').value; const newImg = document.getElementById('profile-img-preview').src; const myRecords = window.students.filter(s => s.phone === window.currentUser.phone); const batch = writeBatch(db); myRecords.forEach(rec => { const docRef = doc(db, COLL_STUDENTS, rec.firebaseId); batch.update(docRef, { name: newName, dob: newDob, img: newImg }); }); try { await batch.commit(); window.currentUser.name = newName; window.currentUser.dob = newDob; window.currentUser.img = newImg; localStorage.setItem('vovinamCurrentUser', JSON.stringify(window.currentUser)); alert("Đã cập nhật!"); window.enableEditProfile(false); window.checkLoginStatus(); } catch(e) { alert("Lỗi: " + e.message); } };
window.renderNews = function() { const list = document.getElementById('news-feed'); if(!list) return; list.innerHTML = ""; const filterArea = document.getElementById('news-filter-area'); let allowedClubs = []; if (window.isAdmin()) { filterArea.style.display = 'flex'; const checkboxes = filterArea.querySelectorAll('input[type="checkbox"]:checked'); checkboxes.forEach(cb => allowedClubs.push(cb.value)); } else { filterArea.style.display = 'none'; allowedClubs.push("Global"); if (window.currentUser && window.currentUser.clubs) { allowedClubs = allowedClubs.concat(window.currentUser.clubs); } } const btnCreate = document.getElementById('btn-create-post'); if(btnCreate) btnCreate.style.display = (window.isAdmin() || window.isAssistant()) ? 'block' : 'none'; const filteredPosts = window.posts.filter(post => { const postClub = post.club || "Global"; return allowedClubs.includes(postClub); }); if (filteredPosts.length === 0) { list.innerHTML = "<p style='text-align:center; color:#777;'>Không có tin tức nào.</p>"; return; } filteredPosts.forEach(post => { const div = document.createElement('div'); div.className = 'news-item'; let adminActions = ""; if (window.isAdmin()) { adminActions = `<div class="admin-actions"><button class="btn-edit-post" onclick="window.editPost('${post.firebaseId}')"><i class="fas fa-edit"></i> Sửa</button><button class="btn-delete-post" onclick="window.deletePost('${post.firebaseId}')"><i class="fas fa-trash-alt"></i> Xóa</button></div>`; } let clubTag = `<span style="background:#eee; padding:2px 6px; border-radius:4px; font-size:0.8rem; color:#555;">${post.club || 'Tin chung'}</span>`; div.innerHTML = `<div style="display:flex; justify-content:space-between;"><h3>${post.title}</h3>${clubTag}</div><small style="color:#666;">${post.date} - Đăng bởi: ${post.authorName || 'BQT'}</small><div class="news-preview">${post.content}</div><div class="read-more-btn" onclick="window.viewPost('${post.firebaseId}')">Xem & Bình luận >></div>${adminActions}`; list.appendChild(div); }); };
window.togglePostForm = function(isEditMode = false) { const form = document.getElementById('post-creator'); const clubSelect = document.getElementById('post-target-club'); if (form.style.display === 'none') { form.style.display = 'block'; if (!isEditMode) { document.getElementById('post-title').value = ""; document.getElementById('post-content').innerHTML = ""; window.editingFirebaseId = null; form.querySelector('.btn-submit').innerText = "Đăng bài"; if (window.isAdmin()) { clubSelect.disabled = false; clubSelect.value = "Global"; } else if (window.isAssistant()) { clubSelect.value = window.currentUser.clubs[0]; clubSelect.disabled = true; } } } else if (!isEditMode) { form.style.display = 'none'; } };
window.handleMediaUpload = function(input) { const file = input.files[0]; if (!file || file.size > 5 * 1024 * 1024) { alert("Ảnh quá lớn (<5MB)!"); return; } const reader = new FileReader(); reader.onload = function(e) { const mediaHTML = file.type.startsWith('video') ? `<br><video controls src="${e.target.result}"></video><br>` : `<br><img src="${e.target.result}"><br>`; document.getElementById('post-content').innerHTML += mediaHTML; input.value = ""; }; reader.readAsDataURL(file); };
window.publishPost = async function() { const title = document.getElementById('post-title').value; const content = document.getElementById('post-content').innerHTML; const club = document.getElementById('post-target-club').value; if(!title) { alert("Thiếu tiêu đề!"); return; } try { if (window.editingFirebaseId) { await updateDoc(doc(db, COLL_POSTS, window.editingFirebaseId), { title, content, club }); alert("Đã cập nhật!"); window.editingFirebaseId = null; } else { await addDoc(collection(db, COLL_POSTS), { id: Date.now(), title, content, club, authorName: window.currentUser.name, date: new Date().toLocaleDateString('vi-VN'), comments: [] }); alert("Đã đăng bài!"); } document.getElementById('post-creator').style.display = 'none'; } catch (e) { alert("Lỗi: " + e.message); } };
window.deletePost = async function(firebaseId) { if (confirm("Xóa bài viết?")) { await deleteDoc(doc(db, COLL_POSTS, firebaseId)); alert("Đã xóa!"); } };
window.editPost = function(firebaseId) { const post = window.posts.find(p => p.firebaseId === firebaseId); if (!post) return; window.togglePostForm(true); document.getElementById('post-title').value = post.title; document.getElementById('post-content').innerHTML = post.content; window.editingFirebaseId = firebaseId; document.querySelector('#post-creator .btn-submit').innerText = "Lưu cập nhật"; document.getElementById('post-creator').scrollIntoView({behavior:"smooth"}); };
window.viewPost = function(firebaseId) { const post = window.posts.find(p => p.firebaseId === firebaseId); if (!post) return; window.currentViewingPostId = firebaseId; document.getElementById('news-list-view').style.display = 'none'; document.getElementById('news-detail-view').style.display = 'block'; if(document.getElementById('btn-create-post')) document.getElementById('btn-create-post').style.display = 'none'; document.getElementById('detail-title').innerText = post.title; document.getElementById('detail-date').innerText = post.date; document.getElementById('detail-content').innerHTML = post.content; window.renderComments(post); window.scrollTo(0, 0); };
window.backToNewsList = function() { document.getElementById('news-detail-view').style.display = 'none'; document.getElementById('news-list-view').style.display = 'block'; window.currentViewingPostId = null; if(document.getElementById('btn-create-post') && (window.isAdmin() || window.isAssistant())) document.getElementById('btn-create-post').style.display = 'block'; };
window.renderComments = function(post) { const list = document.getElementById('comment-list'); list.innerHTML = ""; if (!post.comments) post.comments = []; if (post.comments.length === 0) { list.innerHTML = "<p style='color:#777;font-style:italic;'>Chưa có bình luận.</p>"; return; } post.comments.forEach((cmt, idx) => { const div = document.createElement('div'); div.className = `comment-item ${cmt.isAdminComment ? 'is-admin' : 'is-student'}`; let roleBadge = cmt.isAdminComment ? `<span class="comment-role-badge">Quản trị viên</span>` : ""; let authorName = cmt.isAdminComment ? "Huấn Luyện Viên" : cmt.userName; let delBtn = window.isAdmin() ? `<button class="btn-delete-cmt" onclick="window.deleteComment('${post.firebaseId}', ${idx})"><i class="fas fa-trash"></i></button>` : ""; div.innerHTML = `<div class="comment-header"><span class="comment-author-name">${authorName} ${roleBadge}</span><span class="comment-date">${cmt.date}</span></div><div class="comment-text">${cmt.text}</div>${delBtn}`; list.appendChild(div); }); };
window.submitComment = async function() { if (!window.currentUser) { alert("Vui lòng đăng nhập!"); window.showSection('login'); return; } const content = document.getElementById('comment-input-rich').innerHTML.trim(); if (!content) return; const post = window.posts.find(p => p.firebaseId === window.currentViewingPostId); if (!post) return; const newComment = { userId: window.currentUser.phone, userName: window.currentUser.name, text: content, date: new Date().toLocaleString(), isAdminComment: window.isAdmin() }; let updatedComments = post.comments || []; updatedComments.push(newComment); await updateDoc(doc(db, COLL_POSTS, window.currentViewingPostId), { comments: updatedComments }); document.getElementById('comment-input-rich').innerHTML = ""; };
window.deleteComment = async function(firebaseId, commentIndex) { if (!confirm("Xóa bình luận?")) return; const post = window.posts.find(p => p.firebaseId === firebaseId); if(!post) return; let updatedComments = post.comments.filter((_, idx) => idx !== commentIndex); await updateDoc(doc(db, COLL_POSTS, firebaseId), { comments: updatedComments }); };
window.toggleMobileMenu = function() { const nav = document.querySelector('nav'); if(nav) nav.classList.toggle('active'); };

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
                window.currentUser = { ...match[0], clubs: clubs, role: match[0].role || 'student', belt: match[0].belt || "Tự vệ", classRoom: match[0].classRoom || "" };
                localStorage.setItem('vovinamCurrentUser', JSON.stringify(window.currentUser));
                window.checkLoginStatus(); window.showSection('home');
            } else { alert("Thông tin sai!"); }
        }
    });
    
    // Đăng ký (Cập nhật có Class)
    const regF = document.getElementById('register-form');
    if(regF) regF.addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = document.getElementById('reg-name').value.trim();
        const phone = document.getElementById('reg-phone').value.trim();
        const dob = document.getElementById('reg-dob').value;
        const club = document.getElementById('reg-club').value;
        const belt = document.getElementById('reg-belt').value;
        const classRoom = document.getElementById('reg-class') ? document.getElementById('reg-class').value : ""; // Lấy lớp

        if (!club) return alert("Chọn CLB!");
        if (window.students.some(s => s.phone === phone && s.club === club)) return alert("Đã tồn tại");
        let img = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
        const exist = window.students.find(s => s.phone === phone);
        if(exist) img = exist.img;
        await addDoc(collection(db, COLL_STUDENTS), { id: Date.now(), club, name, phone, dob, belt, classRoom, img, role: 'student', isPresent: false, note: "", lastAttendanceDate: "" });
        alert("Đăng ký thành công!"); window.showSection('login');
    });
}, 1000);

window.checkLoginStatus();
console.log("✅ SYSTEM UPDATE 19.0: CLASS MONITOR ROLE ADDED");
