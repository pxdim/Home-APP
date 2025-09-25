class Particle {
    constructor(x, y, vx, vy, emoji, special = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.emoji = emoji;
        this.size = special ? Math.random() * 20 + 30 : 40;
        this.mass = this.size / 40;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        this.lifespan = special ? 2000 : 10000;
        this.createdAt = Date.now();
        this.special = special;
        this.trail = [];
        this.maxTrailLength = 10;
        this.glowIntensity = 0;
    }

    update(gravity, bounce, friction, width, height) {
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        this.trail.push({ x: this.x, y: this.y, time: Date.now() });

        this.vy += gravity * this.mass;

        this.vx *= friction;
        this.vy *= friction;

        this.x += this.vx;
        this.y += this.vy;

        this.rotation += this.rotationSpeed;

        const dampening = 0.95;

        if (this.x - this.size / 2 < 0) {
            this.x = this.size / 2;
            this.vx *= -bounce;
            this.rotationSpeed *= -1;
            this.glowIntensity = 1;
        }
        if (this.x + this.size / 2 > width) {
            this.x = width - this.size / 2;
            this.vx *= -bounce;
            this.rotationSpeed *= -1;
            this.glowIntensity = 1;
        }

        if (this.y - this.size / 2 < 0) {
            this.y = this.size / 2;
            this.vy *= -bounce;
            this.rotationSpeed *= dampening;
            this.glowIntensity = 1;
        }
        if (this.y + this.size / 2 > height) {
            this.y = height - this.size / 2;
            this.vy *= -bounce;
            this.rotationSpeed *= dampening;
            this.glowIntensity = 1;

            if (Math.abs(this.vy) < 0.5 && Math.abs(this.vx) < 0.5) {
                this.rotationSpeed *= 0.9;
            }
        }

        this.glowIntensity *= 0.95;
    }

    checkCollision(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (this.size + other.size) / 2;

        if (distance < minDistance && distance > 0) {
            const angle = Math.atan2(dy, dx);
            const overlap = minDistance - distance;

            const separationX = Math.cos(angle) * overlap * 0.5;
            const separationY = Math.sin(angle) * overlap * 0.5;

            this.x += separationX;
            this.y += separationY;
            other.x -= separationX;
            other.y -= separationY;

            const relativeVelocityX = this.vx - other.vx;
            const relativeVelocityY = this.vy - other.vy;
            const dotProduct = relativeVelocityX * Math.cos(angle) + relativeVelocityY * Math.sin(angle);

            if (dotProduct > 0) {
                const impulse = 2 * dotProduct / (this.mass + other.mass);
                this.vx -= impulse * other.mass * Math.cos(angle) * 0.8;
                this.vy -= impulse * other.mass * Math.sin(angle) * 0.8;
                other.vx += impulse * this.mass * Math.cos(angle) * 0.8;
                other.vy += impulse * this.mass * Math.sin(angle) * 0.8;

                this.glowIntensity = 0.8;
                other.glowIntensity = 0.8;
            }
        }
    }

    draw(ctx, qualityMode) {
        ctx.save();

        const age = Date.now() - this.createdAt;
        const lifeRatio = age / this.lifespan;
        const opacity = Math.max(0, 1 - lifeRatio);

        if (qualityMode && this.trail.length > 1) {
            ctx.globalAlpha = opacity * 0.3;
            for (let i = 0; i < this.trail.length - 1; i++) {
                const point = this.trail[i];
                const trailAge = Date.now() - point.time;
                const trailOpacity = Math.max(0, 1 - (trailAge / 500));

                ctx.globalAlpha = opacity * trailOpacity * 0.2;
                ctx.font = `${this.size * (0.3 + i / this.trail.length * 0.7)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(this.emoji, point.x, point.y);
            }
        }

        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        if (this.glowIntensity > 0 && qualityMode) {
            ctx.shadowColor = 'rgba(255, 255, 255, ' + this.glowIntensity + ')';
            ctx.shadowBlur = 20 * this.glowIntensity;
        }

        ctx.globalAlpha = opacity;
        ctx.font = `${this.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const scale = 1 + Math.sin(age * 0.002) * 0.05;
        ctx.scale(scale, scale);

        ctx.fillText(this.emoji, 0, 0);

        ctx.restore();
    }
}

class PhysicsEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.selectedEmoji = '💖';
        this.totalParticlesCreated = 0;

        this.gravity = 0.5;
        this.bounce = 0.7;
        this.friction = 0.99;
        this.power = 15;

        this.mouseDown = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;

        this.gravityEnabled = true;
        this.qualityMode = true;
        this.autoMode = false;
        this.fps = 60;
        this.targetFps = 60;
        this.lastFrameTime = performance.now();
        this.frameCount = 0;

        this.secretCode = [];
        this.konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

        this.resize();
        this.setupEventListeners();
        this.setupKeyboardControls();
        this.animate();

        this.showWelcomeMessage();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.resize();
            this.addSystemMessage('視窗大小已調整');
        });

        const handleStart = (x, y) => {
            const controlPanel = document.querySelector('.controls');
            const rect = controlPanel.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                return;
            }

            this.mouseDown = true;
            this.startX = x;
            this.startY = y;
            this.currentX = x;
            this.currentY = y;

            const indicator = document.getElementById('launchIndicator');
            if (indicator) {
                indicator.style.display = 'block';
                this.playSound('charge');
            }
        };

        const handleMove = (x, y) => {
            if (this.mouseDown) {
                this.currentX = x;
                this.currentY = y;
                this.updateLaunchIndicator();
            }
        };

        const handleEnd = () => {
            if (this.mouseDown) {
                const dx = Math.abs(this.startX - this.currentX);
                const dy = Math.abs(this.startY - this.currentY);
                if (dx > 5 || dy > 5) {
                    this.launchParticle();
                    this.playSound('launch');
                }
                this.mouseDown = false;
                const indicator = document.getElementById('launchIndicator');
                if (indicator) {
                    indicator.style.display = 'none';
                }
            }
        };

        this.canvas.addEventListener('mousedown', e => handleStart(e.clientX, e.clientY));
        this.canvas.addEventListener('mousemove', e => handleMove(e.clientX, e.clientY));
        this.canvas.addEventListener('mouseup', handleEnd);
        this.canvas.addEventListener('mouseleave', handleEnd);

        this.canvas.addEventListener('touchstart', e => {
            const touch = e.touches[0];
            handleStart(touch.clientX, touch.clientY);
            e.preventDefault();
        });

        this.canvas.addEventListener('touchmove', e => {
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
            e.preventDefault();
        });

        this.canvas.addEventListener('touchend', e => {
            handleEnd();
            e.preventDefault();
        });

        document.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedEmoji = btn.dataset.emoji;
                this.playSound('select');
            });
        });

        document.getElementById('gravity')?.addEventListener('input', e => {
            this.gravity = parseFloat(e.target.value);
            document.getElementById('gravityValue').textContent = this.gravity.toFixed(1);
            if (this.gravityEnabled) {
                this.addSystemMessage(`重力：${this.gravity.toFixed(1)}G`);
            }
        });

        document.getElementById('bounce')?.addEventListener('input', e => {
            this.bounce = parseFloat(e.target.value);
            document.getElementById('bounceValue').textContent = this.bounce.toFixed(1);
            this.addSystemMessage(`彈性：${Math.round(this.bounce * 100)}%`);
        });

        document.getElementById('power')?.addEventListener('input', e => {
            this.power = parseFloat(e.target.value);
            document.getElementById('powerValue').textContent = this.power;
            this.addSystemMessage(`力度：${this.power}`);
        });

        document.getElementById('friction')?.addEventListener('input', e => {
            this.friction = parseFloat(e.target.value);
            document.getElementById('frictionValue').textContent = this.friction.toFixed(2);
            this.addSystemMessage(`摩擦：${Math.round((1 - this.friction) * 100)}%`);
        });

        document.getElementById('clearBtn')?.addEventListener('click', () => {
            const count = this.particles.length;
            this.particles = [];
            this.addSystemMessage(`已清除 ${count} 個表情`);
            this.playSound('clear');
        });

        document.getElementById('rainBtn')?.addEventListener('click', () => {
            this.createRain();
            this.addSystemMessage('表情雨模式啟動 🌧️');
            this.playSound('rain');
        });

        document.getElementById('explosionBtn')?.addEventListener('click', () => {
            this.createExplosion();
            this.addSystemMessage('大爆炸！💥');
            this.playSound('explosion');
        });

        document.getElementById('gravityBtn')?.addEventListener('click', () => {
            this.gravityEnabled = !this.gravityEnabled;
            const btn = document.getElementById('gravityBtn');
            if (!this.gravityEnabled) {
                btn.textContent = '🪐 開啟重力';
                this.addSystemMessage('進入零重力模式 🚀');
            } else {
                btn.textContent = '🌍 切換重力';
                this.addSystemMessage('重力已恢復');
            }
            this.playSound('gravity');
        });
    }

    setupKeyboardControls() {
        document.addEventListener('keydown', e => {
            this.secretCode.push(e.key);
            if (this.secretCode.length > this.konami.length) {
                this.secretCode.shift();
            }

            if (JSON.stringify(this.secretCode) === JSON.stringify(this.konami)) {
                this.activateEasterEgg();
                this.secretCode = [];
            }

            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    this.launchParticleAtCenter();
                    break;
                case 'c':
                case 'C':
                    this.particles = [];
                    break;
                case 'r':
                case 'R':
                    this.createRain();
                    break;
                case 'e':
                case 'E':
                    this.createExplosion();
                    break;
                case 'g':
                case 'G':
                    this.gravityEnabled = !this.gravityEnabled;
                    break;
                case 'q':
                case 'Q':
                    this.qualityMode = !this.qualityMode;
                    this.addSystemMessage(`品質模式：${this.qualityMode ? '高' : '效能'}`);
                    break;
                case 'a':
                case 'A':
                    this.autoMode = !this.autoMode;
                    if (this.autoMode) {
                        this.startAutoMode();
                        this.addSystemMessage('自動模式：開啟 🤖');
                    } else {
                        this.addSystemMessage('自動模式：關閉');
                    }
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                    const index = parseInt(e.key) - 1;
                    const btns = document.querySelectorAll('.emoji-btn');
                    if (btns[index]) {
                        btns[index].click();
                    }
                    break;
            }
        });
    }

    launchParticleAtCenter() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 10 + 5;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        this.particles.push(new Particle(centerX, centerY, vx, vy, this.selectedEmoji));
        this.manageParticleLimit();
    }

    updateLaunchIndicator() {
        const indicator = document.getElementById('launchIndicator');
        if (!indicator) return;

        const dx = this.currentX - this.startX;
        const dy = this.currentY - this.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        indicator.style.left = `${this.startX}px`;
        indicator.style.top = `${this.startY}px`;

        const powerBar = indicator.querySelector('.power-fill');
        if (powerBar) {
            const power = Math.min(distance * 2, 200);
            powerBar.style.width = `${power}px`;
            powerBar.style.background = `linear-gradient(90deg,
                hsl(${120 - power * 0.6}, 70%, 50%) 0%,
                hsl(${60 - power * 0.3}, 90%, 60%) 100%)`;
        }

        const arrow = indicator.querySelector('.angle-arrow');
        if (arrow) {
            arrow.style.transform = `rotate(${angle}rad)`;
        }
    }

    launchParticle() {
        const dx = this.startX - this.currentX;
        const dy = this.startY - this.currentY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) return;

        const vx = (dx / distance) * Math.min(distance / 10, this.power);
        const vy = (dy / distance) * Math.min(distance / 10, this.power);

        this.particles.push(new Particle(
            this.startX,
            this.startY,
            vx,
            vy,
            this.selectedEmoji
        ));

        this.totalParticlesCreated++;
        this.manageParticleLimit();
    }

    manageParticleLimit() {
        const maxParticles = this.qualityMode ? 150 : 200;
        if (this.particles.length > maxParticles) {
            this.particles.splice(0, this.particles.length - maxParticles);
        }
    }

    createRain() {
        const emojis = ['😀', '🚀', '⚽', '🎈', '💖', '⭐', '🔥', '🌈', '🎯', '🍕', '🦄', '💎'];
        const count = this.qualityMode ? 25 : 35;

        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                if (this.particles.length < 200) {
                    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                    const x = Math.random() * this.canvas.width;
                    const y = -50;
                    const vx = (Math.random() - 0.5) * 3;
                    const vy = Math.random() * 3 + 2;
                    this.particles.push(new Particle(x, y, vx, vy, emoji, true));
                }
            }, i * 60);
        }
    }

    createExplosion() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const emojis = ['💥', '⭐', '✨', '🔥', '💫', '🌟', '💖', '🎆'];
        const count = this.qualityMode ? 40 : 60;

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = Math.random() * 15 + 10;
            const emoji = emojis[Math.floor(Math.random() * emojis.length)];
            const vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 5;
            const vy = Math.sin(angle) * speed + (Math.random() - 0.5) * 5;
            const size = Math.random() * 20 + 20;

            const particle = new Particle(centerX, centerY, vx, vy, emoji, true);
            particle.size = size;
            particle.rotationSpeed = (Math.random() - 0.5) * 0.5;
            this.particles.push(particle);
        }

        this.manageParticleLimit();
    }

    activateEasterEgg() {
        this.addSystemMessage('🎮 Konami Code Activated! 🎮');
        const specialEmojis = ['👾', '🎮', '🕹️', '👻', '🤖', '🛸', '🌟', '💫'];

        for (let i = 0; i < 100; i++) {
            setTimeout(() => {
                const x = Math.random() * this.canvas.width;
                const y = Math.random() * this.canvas.height;
                const vx = (Math.random() - 0.5) * 20;
                const vy = (Math.random() - 0.5) * 20;
                const emoji = specialEmojis[Math.floor(Math.random() * specialEmojis.length)];

                const particle = new Particle(x, y, vx, vy, emoji, true);
                particle.size = Math.random() * 30 + 20;
                particle.glowIntensity = 1;
                this.particles.push(particle);
            }, i * 20);
        }

        this.playSound('powerup');
    }

    startAutoMode() {
        if (!this.autoMode) return;

        const actions = [
            () => this.launchParticleAtCenter(),
            () => this.createRandomLaunch(),
            () => this.createMiniExplosion(),
            () => this.createWave()
        ];

        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        randomAction();

        setTimeout(() => this.startAutoMode(), Math.random() * 2000 + 500);
    }

    createRandomLaunch() {
        const x = Math.random() * this.canvas.width;
        const y = Math.random() * this.canvas.height;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 15 + 5;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        this.particles.push(new Particle(x, y, vx, vy, this.selectedEmoji));
        this.manageParticleLimit();
    }

    createMiniExplosion() {
        const x = Math.random() * this.canvas.width;
        const y = Math.random() * this.canvas.height;
        const count = 8;

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = Math.random() * 5 + 5;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            this.particles.push(new Particle(x, y, vx, vy, this.selectedEmoji, true));
        }
    }

    createWave() {
        const waveCount = 10;
        for (let i = 0; i < waveCount; i++) {
            setTimeout(() => {
                const x = (this.canvas.width / waveCount) * i;
                const y = this.canvas.height - 50;
                const vx = (Math.random() - 0.5) * 5;
                const vy = -Math.random() * 10 - 10;
                this.particles.push(new Particle(x, y, vx, vy, this.selectedEmoji));
            }, i * 50);
        }
    }

    addSystemMessage(message) {
        const messagesContainer = document.getElementById('systemMessages');
        if (!messagesContainer) {
            const container = document.createElement('div');
            container.id = 'systemMessages';
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                z-index: 1000;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }

        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            background: rgba(20, 20, 40, 0.9);
            color: #a0a0ff;
            padding: 8px 16px;
            border-radius: 8px;
            margin-bottom: 5px;
            font-size: 0.9rem;
            border-left: 3px solid #667eea;
            animation: slideIn 0.3s ease, fadeOut 0.5s ease 2.5s forwards;
            backdrop-filter: blur(10px);
        `;
        messageEl.textContent = message;

        document.getElementById('systemMessages').appendChild(messageEl);

        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    }

    playSound(type) {
        if (!this.qualityMode) return;
    }

    showWelcomeMessage() {
        setTimeout(() => {
            this.addSystemMessage('歡迎使用表情物理發射器 v2.0');
            setTimeout(() => {
                this.addSystemMessage('按 H 查看快捷鍵');
            }, 1500);
        }, 500);
    }

    animate() {
        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;

        if (deltaTime > 16) {
            this.frameCount++;
            if (this.frameCount % 30 === 0) {
                this.fps = Math.round(1000 / deltaTime);
                const fpsEl = document.getElementById('fps');
                if (fpsEl) {
                    fpsEl.textContent = this.fps;
                    fpsEl.style.color = this.fps > 50 ? '#667eea' :
                                       this.fps > 30 ? '#f59e0b' : '#ef4444';
                }

                if (this.fps < 30 && this.qualityMode && this.particles.length > 50) {
                    this.qualityMode = false;
                    this.addSystemMessage('自動切換至效能模式');
                }
            }

            this.lastFrameTime = now;

            this.ctx.fillStyle = 'rgba(10, 10, 30, 0.15)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            const currentGravity = this.gravityEnabled ? this.gravity : 0;

            for (let i = 0; i < this.particles.length; i++) {
                const particle = this.particles[i];
                particle.update(currentGravity, this.bounce, this.friction, this.canvas.width, this.canvas.height);

                if (this.qualityMode || this.particles.length < 50) {
                    for (let j = i + 1; j < this.particles.length; j++) {
                        particle.checkCollision(this.particles[j]);
                    }
                }

                particle.draw(this.ctx, this.qualityMode);
            }

            this.particles = this.particles.filter(p => {
                const age = Date.now() - p.createdAt;
                return age < p.lifespan;
            });

            const countEl = document.getElementById('emojiCount');
            if (countEl) {
                countEl.textContent = this.particles.length;
                if (this.particles.length > 100) {
                    countEl.style.color = '#ef4444';
                } else if (this.particles.length > 50) {
                    countEl.style.color = '#f59e0b';
                } else {
                    countEl.style.color = '#667eea';
                }
            }
        }

        requestAnimationFrame(() => this.animate());
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(-100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
            transform: translateY(10px);
        }
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('physicsCanvas');
    if (canvas) {
        window.physicsEngine = new PhysicsEngine(canvas);
    }
});