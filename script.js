// --- 1. NHÚNG THƯ VIỆN FIREBASE (Thêm writeBatch để lưu nhanh) ---
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

// --- 3. KHỞI TẠO BIẾN ---
let currentClub = "";
let students = [];
let posts = [];
let currentUser = JSON.parse(localStorage.getItem('vovinamCurrentUser')); 

const COLL_STUDENTS = "students";
const COLL_POSTS = "posts";

// --- 4. LẮNG NGHE DỮ LIỆU (REAL-TIME) ---

// Lắng nghe Môn sinh
onSnapshot(collection(db, COLL_STUDENTS), (snapshot) => {
    students = [];
    snapshot.forEach((doc) => {
        let data = doc.data();
        data.firebaseId = doc.id; 
        students.push(data);
    });
    // Nếu đang mở bảng thì vẽ lại ngay
    if(document.getElementById('club-manager') && document.getElementById('club-manager').style.display === 'block') {
        renderAttendanceTable();
    }
});

// Lắng nghe Tin tức
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

// Hàm xử lý ảnh
const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// --- 6. XỬ LÝ TÀI KHOẢN ---

// Đăng ký
document.getElementById('register-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const phone = document.getElementById('reg-phone').value;
    const dob = document.getElementById('reg-dob').value;
    const club = document.getElementById('reg-club').value;

    if (!club) { alert("Vui lòng chọn Câu Lạc Bộ!"); return; }
    if (students.some(s => s.phone === phone)) { alert("Số điện thoại này đã được đăng ký!"); return; }

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
    } catch (error) {
        alert("Lỗi kết nối: " + error.message);
    }
});

// Đăng nhập
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
        userDisplay.style.display = 'block'; 
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
    renderNews();
}

window.logout = function() {
    currentUser = null;
    localStorage.removeItem('vovinamCurrentUser');
    checkLoginStatus();
    window.showSection('home');
}

// --- 7. QUẢN LÝ CLB & ĐIỂM DANH ---

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
    
    const actionDiv = document.getElementById('attendance-actions');
    
    if(tabId === 'attendance') {
        document.querySelector('.tab-btn').classList.add('active');
        renderAttendanceTable();
        // Hiện nút Lưu nếu là Admin
        if(actionDiv) actionDiv.style.display = isAdmin() ? 'block' : 'none';
    } else {
        const btnAdd = document.getElementById('btn-add-student');
        if(btnAdd) btnAdd.classList.add('active');
        if(actionDiv) actionDiv.style.display = 'none';
    }
}

// Render bảng với cột Ghi chú
function renderAttendanceTable() {
    const tbody = document.getElementById('attendance-list');
    tbody.innerHTML = "";
    const clubStudents = students.filter(s => s.club === currentClub);

    if (clubStudents.length === 0) { document.getElementById('empty-list-msg').style.display = 'block'; return; }
    else { document.getElementById('empty-list-msg').style.display = 'none'; }

    clubStudents.forEach((student, index) => {
        const tr = document.createElement('tr');
        
        // Nút gạt điểm danh (Admin mới dùng được)
        // Lưu ý: Không gọi hàm toggle ngay, mà chờ bấm nút Lưu tổng
        let statusHTML = isAdmin() 
            ? `<label class="switch"><input type="checkbox" id="status-${student.firebaseId}" ${student.isPresent ? 'checked' : ''}><span class="slider"></span></label>`
            : (student.isPresent ? `<span style="color:green;font-weight:bold;">Có mặt</span>` : `<span style="color:red;font-weight:bold;">Vắng</span>`);
        
        // Ô Ghi chú
        let noteHTML = isAdmin()
