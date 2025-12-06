/* --- MODULE 1: UI & SCALING --- */
const UI = {
    init: () => {
        window.addEventListener('resize', UI.scaleGame);
        UI.scaleGame();
    },

    scaleGame: () => {
        const container = document.getElementById('game-container');
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const scale = Math.min(winW / 2000, winH / 1000);
        container.style.transform = `scale(${scale})`;
    },

    showScreen: (screenId) => {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        Sound.playTone(400, 'sine', 0.1); // Click sound
    },

    updateHUD: (score, lives) => {
        document.getElementById('score-display').innerText = `Điểm: ${score}`;
        document.getElementById('lives-display').innerText = '❤️'.repeat(lives);
    },

    renderRequest: (request, progress) => {
        const bubble = document.getElementById('thought-bubble');
        bubble.innerHTML = '';
        request.forEach((item, index) => {
            const span = document.createElement('span');
            span.className = `req-item ${index < progress ? 'done' : ''}`;
            span.innerText = Game.foods[item].emoji;
            bubble.appendChild(span);
        });
    },

    highlightFood: (selectedType) => {
        document.querySelectorAll('.food-item').forEach(btn => btn.classList.remove('selected'));
        if (selectedType) {
            // Find button by onclick attribute content or index (simplified here)
            // Trong thực tế nên dùng data-attribute, ở đây ta highlight logic
            // Hacky way to find button corresponding to type
            const btns = document.querySelectorAll('.food-item');
            if(selectedType === 'meat') btns[0].classList.add('selected');
            if(selectedType === 'fish') btns[1].classList.add('selected');
            if(selectedType === 'milk') btns[2].classList.add('selected');
            if(selectedType === 'veg')  btns[3].classList.add('selected');
        }
    }
};

/* --- MODULE 2: AUDIO (SYNTHESIZER) --- */
// Tạo âm thanh mà không cần file ngoài
const Sound = {
    ctx: new (window.AudioContext || window.webkitAudioContext)(),
    enabled: true,

    playTone: (freq, type, duration) => {
        if (!Sound.enabled) return;
        const osc = Sound.ctx.createOscillator();
        const gain = Sound.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, Sound.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, Sound.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, Sound.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(Sound.ctx.destination);
        osc.start();
        osc.stop(Sound.ctx.currentTime + duration);
    },

    playCorrect: () => Sound.playTone(600, 'triangle', 0.1),
    playWrong: () => {
        Sound.playTone(150, 'sawtooth', 0.3);
        Sound.playTone(100, 'sawtooth', 0.3);
    },
    playMeow: () => {
        // Giả lập tiếng Meow bằng Sine wave trượt tần số
        if (!Sound.enabled) return;
        const osc = Sound.ctx.createOscillator();
        const gain = Sound.ctx.createGain();
        osc.frequency.setValueAtTime(800, Sound.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1200, Sound.ctx.currentTime + 0.2);
        osc.frequency.linearRampToValueAtTime(800, Sound.ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.1, Sound.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, Sound.ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(Sound.ctx.destination);
        osc.start();
        osc.stop(Sound.ctx.currentTime + 0.4);
    },
    playBark: () => {
        // Giả lập tiếng Gâu
        if (!Sound.enabled) return;
        Sound.playTone(100, 'square', 0.1);
    }
};

/* --- MODULE 3: GAME LOGIC --- */
const Game = {
    foods: {
        'meat': { emoji: '🍖' },
        'fish': { emoji: '🐟' },
        'milk': { emoji: '🥛' },
        'veg':  { emoji: '🥕' }
    },
    pets: [
        { emoji: '🐱', type: 'cat' },
        { emoji: '🐶', type: 'dog' }
    ],

    state: {
        isPlaying: false,
        score: 0,
        lives: 3,
        isHardMode: false,
        currentPet: null,
        request: [], // Mảng chứa các món cần ăn: ['meat', 'fish']
        progress: 0, // Đã ăn được bao nhiêu món trong request
        selectedFood: null,
        maxTime: 5000, // Thời gian tối đa (ms)
        remainingTime: 5000,
        lastFrame: 0
    },

    timerLoop: null,

    startGame: () => {
        // Lấy setting
        Game.state.isHardMode = document.getElementById('hard-mode-toggle').checked;
        Sound.enabled = document.getElementById('sound-toggle').checked;
        
        // Reset state
        Game.state.lives = Game.state.isHardMode ? 1 : 3;
        Game.state.score = 0;
        Game.state.maxTime = 5000; // 5 giây ban đầu
        Game.state.isPlaying = true;
        Game.state.selectedFood = null;

        UI.showScreen('gameplay-screen');
        UI.updateHUD(Game.state.score, Game.state.lives);
        
        Game.nextTurn();
        
        // Bắt đầu vòng lặp game
        Game.state.lastFrame = performance.now();
        requestAnimationFrame(Game.loop);
    },

    nextTurn: () => {
        if (!Game.state.isPlaying) return;

        // 1. Random Pet
        const petIndex = Math.floor(Math.random() * Game.pets.length);
        Game.state.currentPet = Game.pets[petIndex];
        document.getElementById('pet-emoji').innerText = Game.state.currentPet.emoji;
        
        // Phát tiếng kêu
        setTimeout(() => {
            if(Game.state.currentPet.type === 'cat') Sound.playMeow();
            else Sound.playBark();
        }, 200);

        // 2. Random Request (1 hoặc 2 món)
        const foodKeys = Object.keys(Game.foods);
        const itemCount = Math.random() > 0.6 ? 2 : 1; // 40% tỉ lệ ra 2 món
        Game.state.request = [];
        for(let i=0; i<itemCount; i++) {
            Game.state.request.push(foodKeys[Math.floor(Math.random() * 4)]);
        }

        Game.state.progress = 0;
        Game.state.selectedFood = null;
        Game.state.remainingTime = Game.state.maxTime; // Reset thời gian

        UI.highlightFood(null);
        UI.renderRequest(Game.state.request, Game.state.progress);
    },

    loop: (timestamp) => {
        if (!Game.state.isPlaying) return;

        const deltaTime = timestamp - Game.state.lastFrame;
        Game.state.lastFrame = timestamp;

        // Xử lý thời gian
        Game.state.remainingTime -= deltaTime;
        
        // Render thanh thời gian
        const pct = Math.max(0, (Game.state.remainingTime / Game.state.maxTime) * 100);
        document.getElementById('timer-bar').style.width = `${pct}%`;
        
        // Đổi màu thanh thời gian
        const bar = document.getElementById('timer-bar');
        if (pct < 30) bar.style.backgroundColor = '#d63031';
        else bar.style.backgroundColor = '#00b894';

        if (Game.state.remainingTime <= 0) {
            Game.loseLife();
        } else {
            requestAnimationFrame(Game.loop);
        }
    },

    selectFood: (type) => {
        if (!Game.state.isPlaying) return;
        Game.state.selectedFood = type;
        UI.highlightFood(type);
        Sound.playTone(300, 'sine', 0.05);
    },

    handlePetClick: () => {
        if (!Game.state.isPlaying) return;
        if (!Game.state.selectedFood) return;

        // Logic kiểm tra đúng sai theo thứ tự
        const neededFood = Game.state.request[Game.state.progress];

        if (Game.state.selectedFood === neededFood) {
            // ĐÚNG
            Game.state.progress++;
            Sound.playCorrect();
            UI.renderRequest(Game.state.request, Game.state.progress);
            
            // Clear selection để người chơi phải chọn lại món tiếp theo (nếu có)
            Game.state.selectedFood = null;
            UI.highlightFood(null);

            // Kiểm tra đã ăn đủ chưa
            if (Game.state.progress >= Game.state.request.length) {
                Game.winRound();
            }
        } else {
            // SAI
            Game.loseLife();
        }
    },

    winRound: () => {
        Game.state.score++;
        UI.updateHUD(Game.state.score, Game.state.lives);
        
        // Tăng tốc độ 10%
        Game.state.maxTime = Game.state.maxTime * 0.90; 
        
        Game.nextTurn();
    },

    loseLife: () => {
        Game.state.lives--;
        UI.updateHUD(Game.state.score, Game.state.lives);
        Sound.playWrong();
        
        // Hiệu ứng màn hình đỏ
        const container = document.getElementById('game-container');
        container.style.backgroundColor = '#ff7675';
        setTimeout(() => container.style.backgroundColor = '', 200);

        if (Game.state.lives <= 0) {
            Game.endGame(true); // Kết thúc game
        } else {
            // Reset thời gian và chuyển con khác
            Game.nextTurn();
        }
    },

    endGame: (isGameOver) => {
        Game.state.isPlaying = false;
        UI.showScreen('result-screen');
        
        const title = document.getElementById('result-title');
        const msg = document.getElementById('result-message');
        const voucherDiv = document.getElementById('voucher-container');

        if (isGameOver && Game.state.lives <= 0) {
            title.innerText = "GAME OVER";
            title.style.color = "red";
            msg.innerText = Game.state.isHardMode ? "Bạn đã thua! Không có gì cả." : "Hết mạng rồi! Cố gắng lần sau nhé.";
            voucherDiv.classList.add('hidden');
        } else {
            // Trường hợp pause game
            title.innerText = "TẠM DỪNG";
            title.style.color = "orange";
            msg.innerText = "";
            voucherDiv.classList.add('hidden');
        }

        // Logic Voucher: Chỉ Hard Mode & Score >= 30
        if (Game.state.isHardMode && Game.state.lives <= 0 && Game.state.score >= 30) {
            title.innerText = "CHIẾN THẮNG!";
            title.style.color = "gold";
            msg.innerText = "Bạn thật xuất sắc! Nhận quà ngay:";
            voucherDiv.classList.remove('hidden');
            
            // Random Voucher
            const discount = Math.floor(Math.random() * 10) + 1;
            document.getElementById('voucher-code').innerText = 'PET' + Math.floor(1000 + Math.random() * 9000);
            document.getElementById('voucher-value').innerText = `Giảm ${discount}%`;
        }
    }
};

// Khởi tạo
UI.init();