/**
 * Bonus Run - Retro Arcade Platformer
 * Pure Vanilla JavaScript & Canvas 2D
 */

class SoundManager {
    constructor() {
        this.soundEnabled = true;
        this.musicEnabled = true;
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(frequency, duration, type = 'square', volume = 0.1) {
        if (!this.soundEnabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
            
            gain.gain.setValueAtTime(volume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            console.error(e);
        }
    }

    jump() {
        this.playTone(300, 0.15, 'square', 0.1);
        setTimeout(() => this.playTone(450, 0.15, 'square', 0.1), 50);
    }

    coin() {
        this.playTone(800, 0.08, 'sine', 0.1);
        setTimeout(() => this.playTone(1200, 0.12, 'sine', 0.1), 60);
    }

    purchase() {
        this.playTone(523.25, 0.1, 'triangle', 0.15);
        setTimeout(() => this.playTone(659.25, 0.1, 'triangle', 0.15), 100);
        setTimeout(() => this.playTone(783.99, 0.2, 'triangle', 0.15), 200);
    }

    hit() {
        this.playTone(120, 0.3, 'sawtooth', 0.2);
    }

    finish() {
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
            setTimeout(() => this.playTone(freq, 0.2, 'square', 0.15), idx * 150);
        });
    }
}

class SaveManager {
    constructor() {
        this.storageKey = "bonusRun_gameData_v1";
        this.data = this.load();
    }

    getDefaultData() {
        return {
            playerName: "ALFRED",
            highScore: 0,
            totalCoins: 50, // Starting bonus coins for testing
            unlockedAbilities: {
                speed: 1,      // Level 1 default
                doubleJump: false,
                shieldCount: 0,
                magnet: false
            },
            settings: {
                sound: true,
                music: true
            }
        };
    }

    load() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return this.getDefaultData();
            const parsed = JSON.parse(raw);
            return { ...this.getDefaultData(), ...parsed };
        } catch (e) {
            console.error("Failed to load save data, resetting:", e);
            return this.getDefaultData();
        }
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (e) {
            console.error("Failed to save data:", e);
        }
    }

    updateHighScore(score) {
        if (score > this.data.highScore) {
            this.data.highScore = score;
            this.save();
            return true;
        }
        return false;
    }
}

class InputManager {
    constructor() {
        this.keys = {};
        this.touch = { left: false, right: false, jump: false };
        this.bindEvents();
    }

    bindEvents() {
        window.addEventListener('keydown', (e) => {
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code) || e.key === ' ') {
                if (e.target.tagName !== 'INPUT') e.preventDefault();
            }
            this.keys[e.code] = true;
            this.keys[e.key.toLowerCase()] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.keys[e.key.toLowerCase()] = false;
        });

        // Mobile touch bindings
        const bindTouch = (id, prop) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('touchstart', (e) => { e.preventDefault(); this.touch[prop] = true; }, { passive: false });
            el.addEventListener('touchend', (e) => { e.preventDefault(); this.touch[prop] = false; }, { passive: false });
            el.addEventListener('mousedown', (e) => { e.preventDefault(); this.touch[prop] = true; });
            el.addEventListener('mouseup', (e) => { e.preventDefault(); this.touch[prop] = false; });
            el.addEventListener('mouseleave', (e) => { e.preventDefault(); this.touch[prop] = false; });
        };

        bindTouch('btn-left', 'left');
        bindTouch('btn-right', 'right');
        bindTouch('btn-jump', 'jump');
    }

    isLeftPressed() {
        return this.keys['ArrowLeft'] || this.keys['KeyA'] || this.keys['a'] || this.touch.left;
    }

    isRightPressed() {
        return this.keys['ArrowRight'] || this.keys['KeyD'] || this.keys['d'] || this.touch.right;
    }

    isJumpPressed() {
        return this.keys['ArrowUp'] || this.keys['KeyW'] || this.keys['w'] || this.keys['Space'] || this.keys[' '] || this.touch.jump;
    }

    isPausePressed() {
        return this.keys['Escape'];
    }
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 36;
        this.vx = 0;
        this.vy = 0;
        this.baseSpeed = 3.5;
        this.maxSpeed = 5;
        this.acceleration = 0.4;
        this.friction = 0.82;
        this.gravity = 0.55;
        this.jumpForce = -11;
        this.isGrounded = false;
        this.facing = 'right';
        this.animTimer = 0;
        this.hasDoubleJumped = false;
    }

    update(input, level, game) {
        // Apply speed boost from abilities
        const speedLevel = game.saveManager.data.unlockedAbilities.speed;
        this.maxSpeed = this.baseSpeed + (speedLevel - 1) * 0.8;

        // Horizontal movement with acceleration and friction
        if (input.isLeftPressed()) {
            this.vx -= this.acceleration;
            if (this.vx < -this.maxSpeed) this.vx = -this.maxSpeed;
            this.facing = 'left';
        } else if (input.isRightPressed()) {
            this.vx += this.acceleration;
            if (this.vx > this.maxSpeed) this.vx = this.maxSpeed;
            this.facing = 'right';
        } else {
            this.vx *= this.friction;
            if (Math.abs(this.vx) < 0.1) this.vx = 0;
        }

        // Apply gravity
        this.vy += this.gravity;
        if (this.vy > 12) this.vy = 12; // Terminal velocity

        // Move X & check collision
        this.x += this.vx;
        this.handleHorizontalCollisions(level);

        // Move Y & check collision
        this.y += this.vy;
        this.isGrounded = false;
        this.handleVerticalCollisions(level);

        // Jump handling
        if (input.isJumpPressed()) {
            if (!this.jumpKeyHeld) {
                if (this.isGrounded) {
                    this.vy = this.jumpForce;
                    this.isGrounded = false;
                    this.hasDoubleJumped = false;
                    game.soundManager.jump();
                } else if (!this.hasDoubleJumped && game.saveManager.data.unlockedAbilities.doubleJump) {
                    this.vy = this.jumpForce * 0.9;
                    this.hasDoubleJumped = true;
                    game.soundManager.jump();
                }
                this.jumpKeyHeld = true;
            }
        } else {
            this.jumpKeyHeld = false;
        }

        // Animation timer
        if (Math.abs(this.vx) > 0.5 && this.isGrounded) {
            this.animTimer += 0.15;
        } else {
            this.animTimer = 0;
        }
    }

    handleHorizontalCollisions(level) {
        for (let plat of level.platforms) {
            if (this.checkAABB(this, plat)) {
                if (this.vx > 0) {
                    this.x = plat.x - this.width;
                } else if (this.vx < 0) {
                    this.x = plat.x + plat.width;
                }
                this.vx = 0;
            }
        }
    }

    handleVerticalCollisions(level) {
        for (let plat of level.platforms) {
            if (this.checkAABB(this, plat)) {
                if (this.vy > 0) { // Landing on top
                    this.y = plat.y - this.height;
                    this.vy = 0;
                    this.isGrounded = true;
                    this.hasDoubleJumped = false;
                } else if (this.vy < 0) { // Hitting ceiling
                    this.y = plat.y + plat.height;
                    this.vy = 0;
                }
            }
        }
    }

    checkAABB(a, b) {
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    }

    draw(ctx, camera) {
        ctx.save();
        const renderX = Math.floor(this.x - camera.x);
        const renderY = Math.floor(this.y - camera.y);

        // Retro pixel art styling
        ctx.fillStyle = '#00ff66';
        
        // Shield aura if active
        if (gameInstance && gameInstance.saveManager.data.unlockedAbilities.shieldCount > 0) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(renderX - 4, renderY - 4, this.width + 8, this.height + 8);
        }

        // Body / Head / Legs
        // Head
        ctx.fillRect(renderX + 4, renderY, 16, 12);
        // Eyes
        ctx.fillStyle = '#111';
        if (this.facing === 'right') {
            ctx.fillRect(renderX + 14, renderY + 3, 3, 3);
        } else {
            ctx.fillRect(renderX + 7, renderY + 3, 3, 3);
        }

        // Torso
        ctx.fillStyle = '#00cc52';
        ctx.fillRect(renderX + 6, renderY + 12, 12, 14);

        // Legs (animated)
        ctx.fillStyle = '#00ff66';
        let legOffset = Math.sin(this.animTimer) * 4;
        if (!this.isGrounded) legOffset = 2; // Jump pose

        ctx.fillRect(renderX + 6, renderY + 26, 4, 10 + legOffset);
        ctx.fillRect(renderX + 14, renderY + 26, 4, 10 - legOffset);

        ctx.restore();
    }
}

class Camera {
    constructor(width, height) {
        this.x = 0;
        this.y = 0;
        this.width = width;
        this.height = height;
        this.maxWidth = 4000; // Level total width
    }

    follow(player) {
        this.x = player.x - this.width / 2 + player.width / 2;
        // Clamp camera to level bounds
        if (this.x < 0) this.x = 0;
        if (this.x > this.maxWidth - this.width) {
            this.x = this.maxWidth - this.width;
        }
    }
}

class Level {
    constructor() {
        this.width = 4000;
        this.height = 768;
        this.platforms = [];
        this.coins = [];
        this.obstacles = [];
        this.finishZone = null;
        this.generateLevel();
    }

    generateLevel() {
        // Ground blocks (segmented for optimization)
        for (let x = 0; x < this.width; x += 300) {
            this.platforms.push({ x: x, y: 700, width: 300, height: 68, type: 'ground' });
        }

        // Custom platforms, coins, and obstacles layout
        const layout = [
            // Section 1
            { x: 350, y: 580, w: 160, h: 20 },
            { x: 600, y: 480, w: 140, h: 20 },
            { x: 850, y: 380, w: 180, h: 20 },
            { x: 1150, y: 500, w: 200, h: 20 },
            // Section 2
            { x: 1450, y: 420, w: 140, h: 20 },
            { x: 1700, y: 320, w: 160, h: 20 },
            { x: 2000, y: 450, w: 220, h: 20 },
            { x: 2350, y: 350, w: 180, h: 20 },
            // Section 3
            { x: 2650, y: 500, w: 150, h: 20 },
            { x: 2900, y: 380, w: 160, h: 20 },
            { x: 3200, y: 280, w: 180, h: 20 },
            { x: 3550, y: 420, w: 200, h: 20 }
        ];

        layout.forEach(p => {
            this.platforms.push({ x: p.x, y: p.y, width: p.w, height: p.h, type: 'plat' });

            // Add coins above platforms
            for (let i = 0; i < Math.floor(p.w / 40); i++) {
                this.coins.push({
                    x: p.x + 20 + i * 35,
                    y: p.y - 35,
                    width: 16,
                    height: 16,
                    collected: false,
                    floatOffset: Math.random() * Math.PI
                });
            }
        });

        // Add ground coins & obstacles
        for (let x = 500; x < this.width - 300; x += 400) {
            this.coins.push({ x: x, y: 660, width: 16, height: 16, collected: false, floatOffset: 0 });
            this.coins.push({ x: x + 40, y: 660, width: 16, height: 16, collected: false, floatOffset: 1 });
            
            // Obstacles (Spikes/Mines)
            this.obstacles.push({
                x: x + 200,
                y: 670,
                width: 30,
                height: 30,
                type: 'spike'
            });
        }

        // Add platform obstacles
        this.obstacles.push({ x: 900, y: 345, width: 25, height: 35, type: 'mine' });
        this.obstacles.push({ x: 1750, y: 285, width: 25, height: 35, type: 'mine' });
        this.obstacles.push({ x: 2950, y: 345, width: 25, height: 35, type: 'mine' });

        // Finish Zone at the end
        this.finishZone = {
            x: 3850,
            y: 550,
            width: 60,
            height: 150
        };
    }

    draw(ctx, camera) {
        // Draw platforms
        for (let plat of this.platforms) {
            if (plat.x + plat.width < camera.x || plat.x > camera.x + camera.width) continue;
            
            const rx = Math.floor(plat.x - camera.x);
            const ry = Math.floor(plat.y - camera.y);

            if (plat.type === 'ground') {
                ctx.fillStyle = '#1e261a';
                ctx.fillRect(rx, ry, plat.width, plat.height);
                ctx.strokeStyle = '#00ff66';
                ctx.lineWidth = 2;
                ctx.strokeRect(rx, ry, plat.width, plat.height);
                
                // Retro grid lines on ground
                ctx.fillStyle = '#263320';
                for (let gx = rx + 10; gx < rx + plat.width; gx += 30) {
                    ctx.fillRect(gx, ry + 5, 15, 8);
                }
            } else {
                ctx.fillStyle = '#222';
                ctx.fillRect(rx, ry, plat.width, plat.height);
                ctx.strokeStyle = '#00ff66';
                ctx.lineWidth = 2;
                ctx.strokeRect(rx, ry, plat.width, plat.height);
            }
        }

        // Draw coins
        for (let coin of this.coins) {
            if (coin.collected) continue;
            if (coin.x + coin.width < camera.x || coin.x > camera.x + camera.width) continue;

            const rx = Math.floor(coin.x - camera.x);
            const ry = Math.floor(coin.y - camera.y + Math.sin(Date.now() / 200 + coin.floatOffset) * 4);

            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(rx + coin.width / 2, ry + coin.height / 2, coin.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Inner symbol
            ctx.fillStyle = '#997700';
            ctx.font = '8px monospace';
            ctx.fillText('$', rx + 4, ry + 12);
        }

        // Draw obstacles
        for (let obs of this.obstacles) {
            if (obs.x + obs.width < camera.x || obs.x > camera.x + camera.width) continue;

            const rx = Math.floor(obs.x - camera.x);
            const ry = Math.floor(obs.y - camera.y);

            ctx.fillStyle = '#ff0055';
            if (obs.type === 'spike') {
                ctx.beginPath();
                ctx.moveTo(rx, ry + obs.height);
                ctx.lineTo(rx + obs.width / 2, ry);
                ctx.lineTo(rx + obs.width, ry + obs.height);
                ctx.closePath();
                ctx.fill();
            } else {
                // Mine
                ctx.fillRect(rx, ry, obs.width, obs.height);
                ctx.fillStyle = '#fff';
                ctx.fillRect(rx + 8, ry + 8, 9, 9);
            }
        }

        // Draw Finish Zone
        if (this.finishZone) {
            const fx = Math.floor(this.finishZone.x - camera.x);
            const fy = Math.floor(this.finishZone.y - camera.y);
            if (fx + this.finishZone.width >= 0 && fx <= camera.width) {
                ctx.fillStyle = 'rgba(0, 255, 102, 0.2)';
                ctx.fillRect(fx, fy, this.finishZone.width, this.finishZone.height);
                ctx.strokeStyle = '#00ff66';
                ctx.lineWidth = 3;
                ctx.setLineDash([6, 6]);
                ctx.strokeRect(fx, fy, this.finishZone.width, this.finishZone.height);
                ctx.setLineDash([]);

                ctx.fillStyle = '#00ff66';
                ctx.font = '10px "Press Start 2P"';
                ctx.fillText('FINISH', fx + 4, fy - 10);
            }
        }
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();

        this.soundManager = new SoundManager();
        this.saveManager = new SaveManager();
        this.inputManager = new InputManager();

        this.currentState = 'START';
        this.score = 0;
        this.coinsCollected = 0;

        this.player = null;
        this.level = null;
        this.camera = null;

        this.lastTime = performance.now();

        this.initUI();
        this.setupEventListeners();
        this.changeState('START');

        requestAnimationFrame((ts) => this.loop(ts));
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth > 1024 ? 1024 : window.innerWidth;
        this.canvas.height = window.innerHeight > 768 ? 768 : window.innerHeight;
        if (this.camera) {
            this.camera.width = this.canvas.width;
            this.camera.height = this.canvas.height;
        }
    }

    initUI() {
        window.addEventListener('resize', () => this.resizeCanvas());

        document.getElementById('menu-play-btn').addEventListener('click', () => {
            this.soundManager.init();
            if (!this.saveManager.data.playerName || this.saveManager.data.playerName === 'ALFRED') {
                this.changeState('NAME_INPUT');
            } else {
                this.startNewGame();
            }
        });

        document.getElementById('menu-shop-btn').addEventListener('click', () => {
            this.soundManager.init();
            this.openShop();
        });

        document.getElementById('menu-settings-btn').addEventListener('click', () => {
            this.soundManager.init();
            this.changeState('SETTINGS');
        });

        document.getElementById('name-submit-btn').addEventListener('click', () => {
            const val = document.getElementById('player-name-input').value.trim();
            if (val) {
                this.saveManager.data.playerName = val.toUpperCase();
                this.saveManager.save();
            }
            this.startNewGame();
        });

        document.getElementById('pause-btn').addEventListener('click', () => {
            if (this.currentState === 'PLAYING') this.changeState('PAUSED');
        });

        document.getElementById('pause-resume-btn').addEventListener('click', () => {
            this.changeState('PLAYING');
        });

        document.getElementById('pause-shop-btn').addEventListener('click', () => {
            this.openShop();
        });

        document.getElementById('pause-restart-btn').addEventListener('click', () => {
            this.startNewGame();
        });

        document.getElementById('pause-menu-btn').addEventListener('click', () => {
            this.changeState('START');
        });

        document.getElementById('shop-close-btn').addEventListener('click', () => {
            this.closeShop();
        });

        document.getElementById('settings-back-btn').addEventListener('click', () => {
            this.changeState('START');
        });

        document.getElementById('change-name-btn').addEventListener('click', () => {
            this.changeState('NAME_INPUT');
        });

        document.getElementById('toggle-sound-btn').addEventListener('click', (e) => {
            const s = !this.saveManager.data.settings.sound;
            this.saveManager.data.settings.sound = s;
            this.soundManager.soundEnabled = s;
            e.target.textContent = s ? 'ON' : 'OFF';
            this.saveManager.save();
        });

        document.getElementById('toggle-music-btn').addEventListener('click', (e) => {
            const m = !this.saveManager.data.settings.music;
            this.saveManager.data.settings.music = m;
            this.soundManager.musicEnabled = m;
            e.target.textContent = m ? 'ON' : 'OFF';
            this.saveManager.save();
        });

        document.getElementById('buy-speed-btn').addEventListener('click', () => this.buyUpgrade('speed'));
        document.getElementById('buy-djump-btn').addEventListener('click', () => this.buyUpgrade('doubleJump'));
        document.getElementById('buy-shield-btn').addEventListener('click', () => this.buyUpgrade('shield'));
        document.getElementById('buy-magnet-btn').addEventListener('click', () => this.buyUpgrade('magnet'));

        document.getElementById('go-retry-btn').addEventListener('click', () => this.startNewGame());
        document.getElementById('go-menu-btn').addEventListener('click', () => this.changeState('START'));

        document.getElementById('vic-retry-btn').addEventListener('click', () => this.startNewGame());
        document.getElementById('vic-shop-btn').addEventListener('click', () => this.openShop());
        document.getElementById('vic-menu-btn').addEventListener('click', () => this.changeState('START'));
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.currentState === 'PLAYING') this.changeState('PAUSED');
                else if (this.currentState === 'PAUSED') this.changeState('PLAYING');
            }
        });
    }

    changeState(newState) {
        this.currentState = newState;

        const screens = ['screen-start', 'screen-name', 'screen-pause', 'screen-shop', 'screen-settings', 'screen-gameover', 'screen-victory', 'hud', 'mobile-controls'];
        screens.forEach(id => document.getElementById(id).classList.add('hidden'));

        if (newState === 'START') {
            document.getElementById('screen-start').classList.remove('hidden');
        } else if (newState === 'NAME_INPUT') {
            document.getElementById('screen-name').classList.remove('hidden');
            document.getElementById('player-name-input').value = this.saveManager.data.playerName;
        } else if (newState === 'PLAYING') {
            document.getElementById('hud').classList.remove('hidden');
            document.getElementById('mobile-controls').classList.remove('hidden');
        } else if (newState === 'PAUSED') {
            document.getElementById('screen-pause').classList.remove('hidden');
            document.getElementById('hud').classList.remove('hidden');
        } else if (newState === 'SHOP') {
            document.getElementById('screen-shop').classList.remove('hidden');
            this.updateShopUI();
        } else if (newState === 'SETTINGS') {
            document.getElementById('screen-settings').classList.remove('hidden');
            document.getElementById('settings-current-name').textContent = this.saveManager.data.playerName;
            document.getElementById('toggle-sound-btn').textContent = this.saveManager.data.settings.sound ? 'ON' : 'OFF';
            document.getElementById('toggle-music-btn').textContent = this.saveManager.data.settings.music ? 'ON' : 'OFF';
            this.soundManager.soundEnabled = this.saveManager.data.settings.sound;
            this.soundManager.musicEnabled = this.saveManager.data.settings.music;
        } else if (newState === 'GAMEOVER') {
            document.getElementById('screen-gameover').classList.remove('hidden');
            document.getElementById('go-player').textContent = this.saveManager.data.playerName;
            document.getElementById('go-score').textContent = this.score;
            document.getElementById('go-coins').textContent = this.coinsCollected;
            
            const isNew = this.saveManager.updateHighScore(this.score);
            const notice = document.getElementById('go-highscore-notice');
            if (isNew) notice.classList.remove('hidden');
            else notice.classList.add('hidden');
        } else if (newState === 'VICTORY') {
            document.getElementById('screen-victory').classList.remove('hidden');
            document.getElementById('vic-player').textContent = this.saveManager.data.playerName;
            document.getElementById('vic-score').textContent = this.score;
            document.getElementById('vic-coins').textContent = this.coinsCollected;
            const total = this.score + 500;
            document.getElementById('vic-total').textContent = total;
            this.saveManager.updateHighScore(total);
        }
    }

    startNewGame() {
        this.score = 0;
        this.coinsCollected = 0;
        this.level = new Level();
        this.camera = new Camera(this.canvas.width, this.canvas.height);
        this.player = new Player(100, 500);
        this.changeState('PLAYING');
    }

    openShop() {
        this.changeState('SHOP');
    }

    closeShop() {
        if (this.player && this.level) {
            this.changeState('PAUSED');
        } else {
            this.changeState('START');
        }
    }

    updateShopUI() {
        const data = this.saveManager.data;
        document.getElementById('shop-coins-val').textContent = data.totalCoins;

        const speedLvl = data.unlockedAbilities.speed;
        document.getElementById('shop-speed-lvl').textContent = `Level: ${speedLvl}`;
        const speedCost = speedLvl * 50;
        document.getElementById('buy-speed-btn').textContent = speedLvl >= 3 ? 'MAX' : `UPGRADE (${speedCost})`;

        const djump = data.unlockedAbilities.doubleJump;
        document.getElementById('shop-djump-status').textContent = djump ? 'UNLOCKED' : 'LOCKED';
        document.getElementById('buy-djump-btn').textContent = djump ? 'OWNED' : 'UNLOCK (100)';
        document.getElementById('buy-djump-btn').disabled = djump;

        const shields = data.unlockedAbilities.shieldCount;
        document.getElementById('shop-shield-status').textContent = `Owned: ${shields}`;
        document.getElementById('buy-shield-btn').textContent = 'BUY (150)';

        const magnet = data.unlockedAbilities.magnet;
        document.getElementById('shop-magnet-status').textContent = magnet ? 'UNLOCKED' : 'LOCKED';
        document.getElementById('buy-magnet-btn').textContent = magnet ? 'OWNED' : 'UNLOCK (200)';
        document.getElementById('buy-magnet-btn').disabled = magnet;
    }

    buyUpgrade(type) {
        const data = this.saveManager.data;
        if (type === 'speed') {
            const cost = data.unlockedAbilities.speed * 50;
            if (data.unlockedAbilities.speed < 3 && data.totalCoins >= cost) {
                data.totalCoins -= cost;
                data.unlockedAbilities.speed++;
                this.soundManager.purchase();
                this.saveManager.save();
            }
        } else if (type === 'doubleJump') {
            if (!data.unlockedAbilities.doubleJump && data.totalCoins >= 100) {
                data.totalCoins -= 100;
                data.unlockedAbilities.doubleJump = true;
                this.soundManager.purchase();
                this.saveManager.save();
            }
        } else if (type === 'shield') {
            if (data.totalCoins >= 150) {
                data.totalCoins -= 150;
                data.unlockedAbilities.shieldCount++;
                this.soundManager.purchase();
                this.saveManager.save();
            }
        } else if (type === 'magnet') {
            if (!data.unlockedAbilities.magnet && data.totalCoins >= 200) {
                data.totalCoins -= 200;
                data.unlockedAbilities.magnet = true;
                this.soundManager.purchase();
                this.saveManager.save();
            }
        }
        this.updateShopUI();
    }

    update(dt) {
        if (this.currentState !== 'PLAYING') return;

        this.player.update(this.inputManager, this.level, this);
        this.camera.follow(this.player);

        const magnetActive = this.saveManager.data.unlockedAbilities.magnet;
        const magnetRadius = 120;

        for (let coin of this.level.coins) {
            if (coin.collected) continue;

            if (magnetActive) {
                const dx = (this.player.x + this.player.width / 2) - (coin.x + coin.width / 2);
                const dy = (this.player.y + this.player.height / 2) - (coin.y + coin.height / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < magnetRadius) {
                    coin.x += (dx / dist) * 4;
                    coin.y += (dy / dist) * 4;
                }
            }

            if (this.player.checkAABB(this.player, coin)) {
                coin.collected = true;
                this.coinsCollected++;
                this.score += 10;
                this.saveManager.data.totalCoins++;
                this.saveManager.save();
                this.soundManager.coin();
            }
        }

        for (let obs of this.level.obstacles) {
            if (this.player.checkAABB(this.player, obs)) {
                const abilities = this.saveManager.data.unlockedAbilities;
                if (abilities.shieldCount > 0) {
                    abilities.shieldCount--;
                    this.saveManager.save();
                    this.player.vy = -8;
                    this.player.vx = this.player.facing === 'right' ? -5 : 5;
                    this.soundManager.hit();
                    obs.x = -9999;
                } else {
                    this.soundManager.hit();
                    this.changeState('GAMEOVER');
                    return;
                }
            }
        }

        if (this.player.y > this.level.height + 100) {
            this.soundManager.hit();
            this.changeState('GAMEOVER');
            return;
        }

        if (this.level.finishZone && this.player.checkAABB(this.player, this.level.finishZone)) {
            this.score += 500;
            this.soundManager.finish();
            this.changeState('VICTORY');
            return;
        }

        document.getElementById('hud-name').textContent = `PLAYER: ${this.saveManager.data.playerName}`;
        document.getElementById('hud-score').textContent = `SCORE: ${this.score}`;
        document.getElementById('hud-coins').textContent = `COINS: ${this.coinsCollected}`;
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#141812';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.currentState === 'PLAYING' || this.currentState === 'PAUSED') {
            this.level.draw(this.ctx, this.camera);
            this.player.draw(this.ctx, this.camera);
        }
    }

    loop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.033);
        this.lastTime = timestamp;

        this.update(dt);
        this.render();

        requestAnimationFrame((ts) => this.loop(ts));
    }
}

let gameInstance = null;
window.addEventListener('load', () => {
    gameInstance = new Game();
});
