// fix_module.js - Cầu nối đưa hàm ra ngoài window
import * as MainScript from './script.js';

// Danh sách các hàm cần dùng trong HTML onclick="..."
const functionsToExpose = [
    'showSection', 'login', 'logout', 'openClubManager', 'switchTab',
    'saveDailyAttendance', 'deleteStudent', 'showProfile', 'enableEditProfile',
    'saveProfile', 'previewProfileAvatar', 'openEditModal', 'closeEditModal',
    'previewEditAvatar', 'saveStudentEdits', 'togglePostForm', 'publishPost',
    'handleMediaUpload', 'editPost', 'deletePost', 'viewPost', 'backToNewsList',
    'submitComment', 'deleteComment', 'formatDoc', 'formatComment',
    'openHistorySection', 'loadHistoryData' // Thêm các hàm mới nếu có
];

// Gắn từng hàm vào window
functionsToExpose.forEach(funcName => {
    if (MainScript[funcName]) {
        window[funcName] = MainScript[funcName];
    } else {
        console.warn(`Hàm ${funcName} chưa được export trong script.js`);
    }
});

console.log("Đã sửa lỗi kết nối nút bấm thành công!");
