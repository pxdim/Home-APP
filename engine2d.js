// 2D Physics Engine with Advanced Features
class Physics2DEngine {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');

        // Engine state
        this.particles = [];
        this.maxParticles = 300;
        this.selectedEmoji = '😀';
        this.isPaused = false;
        this.timeScale = 1;
        this.score = 0;
        this.combo = 0;
        this.lastHitTime = 0;

        // Physics settings
        this.gravity = 500;
        this.bounce = 0.8;
        this.friction = 0.99;
        this.particleSize = 30;

        // Special modes
        this.zeroG = false;
        this.slowMo = false;
        this.matrixMode = false;
        this.trajectoryMode = false;
        this.debugMode = false;
        this.extremePhysics = false;
        this.blackHole = null;
        this.vortexActive = false;

        // Input state
        this.mouseDown = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.rapidFire = false;

        // Performance
        this.fps = 60;
        this.lastTime = performance.now();
        this.frameCount = 0;

        // Secret codes
        this.konamiCode = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
        this.inputHistory = [];

        // Initialize
        this.init();
    }

    init() {
        this.resize();
        this.setupEventListeners();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => this.resize());

        // Mouse controls
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.onMouseUp());

        // Touch controls
        this.canvas.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            this.onMouseDown({clientX: touch.clientX, clientY: touch.clientY});
            e.preventDefault();
        });

        this.canvas.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            this.onMouseMove({clientX: touch.clientX, clientY: touch.clientY});
            e.preventDefault();
        });

        this.canvas.addEventListener('touchend', () => this.onMouseUp());

        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Emoji selection
        document.querySelectorAll('.emoji-btn').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedEmoji = btn.dataset.emoji;
            });
        });

        // Control sliders
        document.getElementById('gravity').addEventListener('input', (e) => {
            this.gravity = parseInt(e.target.value);
            document.getElementById('gravityVal').textContent = this.gravity;
        });

        document.getElementById('bounce').addEventListener('input', (e) => {
            this.bounce = parseInt(e.target.value) / 100;
            document.getElementById('bounceVal').textContent = this.bounce.toFixed(2);
        });

        document.getElementById('friction').addEventListener('input', (e) => {
            this.friction = parseInt(e.target.value) / 100;
            document.getElementById('frictionVal').textContent = this.friction.toFixed(2);
        });

        document.getElementById('size').addEventListener('input', (e) => {
            this.particleSize = parseInt(e.target.value);
            document.getElementById('sizeVal').textContent = this.particleSize;
        });

        // Button controls
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAll());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('gravityBtn').addEventListener('click', () => this.toggleZeroG());
        document.getElementById('slowmoBtn').addEventListener('click', () => this.toggleSlowMo());
        document.getElementById('explosionBtn').addEventListener('click', () => this.createExplosion());
        document.getElementById('vortexBtn').addEventListener('click', () => this.toggleVortex());
        document.getElementById('rainBtn').addEventListener('click', () => this.createRain());
        document.getElementById('blackholeBtn').addEventListener('click', () => this.createBlackHole());
    }

    handleKeyDown(e) {
        // Track key history for Konami code
        this.inputHistory.push(e.key);
        if (this.inputHistory.length > 10) {
            this.inputHistory.shift();
        }

        // Check for Konami code
        if (this.inputHistory.join(',') === this.konamiCode.join(',')) {
            this.activateKonamiCode();
        }

        switch(e.key.toLowerCase()) {
            case '?':
                this.toggleHelp();
                break;
            case 'c':
                this.clearAll();
                break;
            case ' ':
                e.preventDefault();
                this.togglePause();
                break;
            case 'g':
                this.toggleZeroG();
                break;
            case 's':
                this.toggleSlowMo();
                break;
            case 'b':
                this.createExplosion();
                break;
            case 'v':
                this.toggleVortex();
                break;
            case 'r':
                this.createRain();
                break;
            case 'h':
                this.createBlackHole();
                break;
            case 'm':
                this.toggleMatrixMode();
                break;
            case 't':
                this.trajectoryMode = !this.trajectoryMode;
                this.showModeIndicator(this.trajectoryMode ? 'TRAJECTORY ON' : 'TRAJECTORY OFF');
                break;
            case 'f':
                this.createFireworks();
                break;
            case 'd':
                this.debugMode = !this.debugMode;
                break;
            case 'x':
                this.extremePhysics = !this.extremePhysics;
                this.showModeIndicator(this.extremePhysics ? 'EXTREME PHYSICS!' : 'NORMAL PHYSICS');
                break;
            case 'shift':
                this.rapidFire = true;
                break;
        }

        // Number keys for emoji selection
        if (e.key >= '0' && e.key <= '9') {
            const index = e.key === '0' ? 9 : parseInt(e.key) - 1;
            const buttons = document.querySelectorAll('.emoji-btn');
            if (buttons[index]) {
                buttons[index].click();
            }
        }
    }

    handleKeyUp(e) {
        if (e.key === 'Shift') {
            this.rapidFire = false;
        }
    }

    onMouseDown(e) {
        this.mouseDown = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.currentX = e.clientX;
        this.currentY = e.clientY;

        document.getElementById('powerMeter').style.display = 'block';

        if (this.rapidFire) {
            this.rapidFireInterval = setInterval(() => {
                if (this.mouseDown) {
                    this.launchParticle();
                }
            }, 50);
        }
    }

    onMouseMove(e) {
        this.currentX = e.clientX;
        this.currentY = e.clientY;

        if (this.mouseDown) {
            const dx = this.currentX - this.startX;
            const dy = this.currentY - this.startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const power = Math.min(distance / 2, 100);
            document.getElementById('powerFill').style.width = power + '%';
        }
    }

    onMouseUp() {
        if (this.mouseDown) {
            this.launchParticle();
            this.mouseDown = false;
            document.getElementById('powerMeter').style.display = 'none';

            if (this.rapidFireInterval) {
                clearInterval(this.rapidFireInterval);
                this.rapidFireInterval = null;
            }
        }
    }

    launchParticle() {
        if (this.particles.length >= this.maxParticles) {
            this.particles.shift();
        }

        const dx = this.startX - this.currentX;
        const dy = this.startY - this.currentY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const power = Math.min(distance * 2, 1000);

        const vx = (dx / distance) * power || 0;
        const vy = (dy / distance) * power || 0;

        const particle = {
            x: this.startX,
            y: this.startY,
            vx: vx,
            vy: vy,
            emoji: this.selectedEmoji,
            size: this.particleSize,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.3,
            createdAt: Date.now(),
            trail: [],
            color: this.getEmojiColor(this.selectedEmoji),
            mass: this.particleSize / 30
        };

        this.particles.push(particle);
        this.updateStats();
    }

    getEmojiColor(emoji) {
        const colors = {
            '😀': '#ffff00',
            '🚀': '#ff4444',
            '💎': '#00ffff',
            '🔥': '#ff8800',
            '⭐': '#ffff00',
            '💖': '#ff00ff',
            '🌈': '#ff00ff',
            '⚡': '#ffff00',
            '🎯': '#ff0000',
            '👾': '#00ff00'
        };
        return colors[emoji] || '#ffffff';
    }

    updatePhysics(deltaTime) {
        if (this.isPaused) return;

        const dt = deltaTime * this.timeScale;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            // Store trail
            if (p.trail.length > 20) p.trail.shift();
            p.trail.push({x: p.x, y: p.y});

            // Apply gravity
            if (!this.zeroG) {
                p.vy += this.gravity * dt;
            }

            // Apply vortex force
            if (this.vortexActive) {
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                const dx = centerX - p.x;
                const dy = centerY - p.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const force = 10000 / (distance + 1);
                p.vx += (dx / distance) * force * dt;
                p.vy += (dy / distance) * force * dt;

                // Tangential force for swirl
                p.vx += (-dy / distance) * force * 0.5 * dt;
                p.vy += (dx / distance) * force * 0.5 * dt;
            }

            // Apply black hole force
            if (this.blackHole) {
                const dx = this.blackHole.x - p.x;
                const dy = this.blackHole.y - p.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 50) {
                    // Particle consumed by black hole
                    this.particles.splice(i, 1);
                    i--;
                    this.score += 100;
                    continue;
                }

                const force = 50000 / (distance * distance);
                p.vx += (dx / distance) * force * dt;
                p.vy += (dy / distance) * force * dt;
            }

            // Apply extreme physics
            if (this.extremePhysics) {
                p.vx += (Math.random() - 0.5) * 1000 * dt;
                p.vy += (Math.random() - 0.5) * 1000 * dt;
            }

            // Apply friction
            p.vx *= Math.pow(this.friction, dt * 60);
            p.vy *= Math.pow(this.friction, dt * 60);

            // Update position
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Update rotation
            p.rotation += p.rotationSpeed;

            // Boundary collision
            if (p.x - p.size/2 < 0) {
                p.x = p.size/2;
                p.vx *= -this.bounce;
                p.rotationSpeed *= -1;
                this.checkCombo();
            }
            if (p.x + p.size/2 > this.canvas.width) {
                p.x = this.canvas.width - p.size/2;
                p.vx *= -this.bounce;
                p.rotationSpeed *= -1;
                this.checkCombo();
            }
            if (p.y - p.size/2 < 0) {
                p.y = p.size/2;
                p.vy *= -this.bounce;
                this.checkCombo();
            }
            if (p.y + p.size/2 > this.canvas.height) {
                p.y = this.canvas.height - p.size/2;
                p.vy *= -this.bounce;
                this.checkCombo();
            }

            // Particle collision
            for (let j = i + 1; j < this.particles.length; j++) {
                const p2 = this.particles[j];
                const dx = p2.x - p.x;
                const dy = p2.y - p.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = (p.size + p2.size) / 2;

                if (distance < minDistance && distance > 0) {
                    // Collision response
                    const nx = dx / distance;
                    const ny = dy / distance;

                    // Separate particles
                    const overlap = minDistance - distance;
                    p.x -= nx * overlap * 0.5;
                    p.y -= ny * overlap * 0.5;
                    p2.x += nx * overlap * 0.5;
                    p2.y += ny * overlap * 0.5;

                    // Exchange velocities
                    const relativeVelocity = (p2.vx - p.vx) * nx + (p2.vy - p.vy) * ny;
                    if (relativeVelocity > 0) continue;

                    const impulse = 2 * relativeVelocity / (p.mass + p2.mass);
                    p.vx += impulse * p2.mass * nx * this.bounce;
                    p.vy += impulse * p2.mass * ny * this.bounce;
                    p2.vx -= impulse * p.mass * nx * this.bounce;
                    p2.vy -= impulse * p.mass * ny * this.bounce;

                    this.checkCombo();
                    this.score += 10;
                }
            }
        }

        // Update black hole
        if (this.blackHole) {
            this.blackHole.rotation += 0.05;
            this.blackHole.time += dt;

            if (this.blackHole.time > 5) {
                this.blackHole = null;
            }
        }
    }

    checkCombo() {
        const now = Date.now();
        if (now - this.lastHitTime < 1000) {
            this.combo++;
            this.score += this.combo * 10;

            if (this.combo > 1) {
                const counter = document.getElementById('comboCounter');
                document.getElementById('comboNum').textContent = this.combo;
                counter.style.display = 'block';

                setTimeout(() => {
                    counter.style.display = 'none';
                }, 2000);
            }
        } else {
            this.combo = 0;
        }
        this.lastHitTime = now;
    }

    render() {
        // Clear with trail effect
        if (this.matrixMode) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        } else {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        }
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw black hole
        if (this.blackHole) {
            this.ctx.save();
            this.ctx.translate(this.blackHole.x, this.blackHole.y);
            this.ctx.rotate(this.blackHole.rotation);

            // Black hole effect
            const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 100);
            gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
            gradient.addColorStop(0.5, 'rgba(128, 0, 255, 0.5)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(-100, -100, 200, 200);

            this.ctx.restore();
        }

        // Draw particles
        for (const p of this.particles) {
            // Draw trail
            if (this.trajectoryMode && p.trail.length > 1) {
                this.ctx.strokeStyle = p.color + '33';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(p.trail[0].x, p.trail[0].y);
                for (let i = 1; i < p.trail.length; i++) {
                    this.ctx.lineTo(p.trail[i].x, p.trail[i].y);
                }
                this.ctx.stroke();
            }

            // Draw particle
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);

            // Glow effect
            if (this.matrixMode) {
                this.ctx.shadowColor = p.color;
                this.ctx.shadowBlur = 20;
            }

            this.ctx.font = `${p.size}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(p.emoji, 0, 0);

            this.ctx.restore();

            // Debug info
            if (this.debugMode) {
                this.ctx.fillStyle = '#0f0';
                this.ctx.font = '10px monospace';
                this.ctx.fillText(`v: ${Math.round(Math.sqrt(p.vx*p.vx + p.vy*p.vy))}`, p.x, p.y - p.size);
            }
        }

        // Draw trajectory preview when aiming
        if (this.mouseDown && this.trajectoryMode) {
            const dx = this.startX - this.currentX;
            const dy = this.startY - this.currentY;

            this.ctx.strokeStyle = '#0f0';
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(this.startX, this.startY);

            // Simulate trajectory
            let x = this.startX;
            let y = this.startY;
            let vx = dx * 2;
            let vy = dy * 2;

            for (let i = 0; i < 50; i++) {
                x += vx * 0.01;
                y += vy * 0.01;
                vy += this.gravity * 0.01;
                this.ctx.lineTo(x, y);
            }

            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }

    updateStats() {
        document.getElementById('entities').textContent = this.particles.length;
        document.getElementById('combo').textContent = this.combo;
        document.getElementById('score').textContent = this.score;

        // Update velocity of last particle
        if (this.particles.length > 0) {
            const p = this.particles[this.particles.length - 1];
            const velocity = Math.round(Math.sqrt(p.vx * p.vx + p.vy * p.vy));
            document.getElementById('velocity').textContent = velocity;
        }
    }

    // Special effects
    createExplosion() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        for (let i = 0; i < 50; i++) {
            if (this.particles.length >= this.maxParticles) {
                this.particles.shift();
            }

            const angle = (Math.PI * 2 * i) / 50;
            const speed = 500 + Math.random() * 500;

            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                emoji: this.selectedEmoji,
                size: this.particleSize,
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 0.5,
                createdAt: Date.now(),
                trail: [],
                color: this.getEmojiColor(this.selectedEmoji),
                mass: this.particleSize / 30
            });
        }

        this.showModeIndicator('BIG BANG!');
    }

    createRain() {
        let count = 0;
        const interval = setInterval(() => {
            if (count >= 30 || this.particles.length >= this.maxParticles) {
                clearInterval(interval);
                return;
            }

            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: -50,
                vx: (Math.random() - 0.5) * 100,
                vy: 0,
                emoji: this.selectedEmoji,
                size: this.particleSize,
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 0.3,
                createdAt: Date.now(),
                trail: [],
                color: this.getEmojiColor(this.selectedEmoji),
                mass: this.particleSize / 30
            });

            count++;
        }, 100);

        this.showModeIndicator('EMOJI RAIN!');
    }

    createFireworks() {
        const colors = ['😀', '🚀', '💎', '🔥', '⭐', '💖'];
        const x = Math.random() * this.canvas.width;
        const y = Math.random() * this.canvas.height;

        for (let i = 0; i < 20; i++) {
            if (this.particles.length >= this.maxParticles) {
                this.particles.shift();
            }

            const angle = (Math.PI * 2 * i) / 20;
            const speed = 300 + Math.random() * 200;
            const emoji = colors[Math.floor(Math.random() * colors.length)];

            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                emoji: emoji,
                size: this.particleSize,
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 0.5,
                createdAt: Date.now(),
                trail: [],
                color: this.getEmojiColor(emoji),
                mass: this.particleSize / 30
            });
        }

        this.showModeIndicator('FIREWORKS!');
    }

    createBlackHole() {
        this.blackHole = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            rotation: 0,
            time: 0
        };

        this.showModeIndicator('BLACK HOLE ACTIVATED!');
    }

    toggleVortex() {
        this.vortexActive = !this.vortexActive;
        this.showModeIndicator(this.vortexActive ? 'VORTEX ON!' : 'VORTEX OFF');
    }

    toggleZeroG() {
        this.zeroG = !this.zeroG;
        this.showModeIndicator(this.zeroG ? 'ZERO GRAVITY!' : 'GRAVITY ON');
    }

    toggleSlowMo() {
        this.slowMo = !this.slowMo;
        this.timeScale = this.slowMo ? 0.2 : 1;
        this.showModeIndicator(this.slowMo ? 'SLOW MOTION!' : 'NORMAL SPEED');
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pauseBtn').textContent = this.isPaused ? 'RESUME [SPACE]' : 'PAUSE [SPACE]';
    }

    toggleMatrixMode() {
        this.matrixMode = !this.matrixMode;
        this.showModeIndicator(this.matrixMode ? 'MATRIX MODE!' : 'NORMAL MODE');
    }

    toggleHelp() {
        const menu = document.getElementById('secretMenu');
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }

    clearAll() {
        this.particles = [];
        this.blackHole = null;
        this.updateStats();
    }

    showModeIndicator(text) {
        const indicator = document.getElementById('modeIndicator');
        indicator.textContent = text;
        indicator.style.animation = 'none';
        setTimeout(() => {
            indicator.style.animation = 'flash 2s';
        }, 10);
    }

    activateKonamiCode() {
        this.showModeIndicator('KONAMI CODE ACTIVATED!');

        // Epic mode
        this.extremePhysics = true;
        this.trajectoryMode = true;
        this.matrixMode = true;

        // Create special effect
        for (let i = 0; i < 100; i++) {
            setTimeout(() => {
                if (this.particles.length >= this.maxParticles) {
                    this.particles.shift();
                }

                const angle = Math.random() * Math.PI * 2;
                const speed = 500 + Math.random() * 500;

                this.particles.push({
                    x: this.canvas.width / 2,
                    y: this.canvas.height / 2,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    emoji: '👾',
                    size: 40,
                    rotation: 0,
                    rotationSpeed: (Math.random() - 0.5) * 0.5,
                    createdAt: Date.now(),
                    trail: [],
                    color: '#00ff00',
                    mass: 1
                });
            }, i * 20);
        }

        this.score += 10000;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const now = performance.now();
        const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1); // Cap delta time
        this.lastTime = now;

        // Update FPS
        this.frameCount++;
        if (this.frameCount % 30 === 0) {
            this.fps = Math.round(1 / deltaTime);
            document.getElementById('fps').textContent = this.fps;
        }

        // Update physics
        this.updatePhysics(deltaTime);

        // Render
        this.render();

        // Update stats
        if (this.frameCount % 10 === 0) {
            this.updateStats();
        }
    }
}

// Initialize engine
document.addEventListener('DOMContentLoaded', () => {
    const engine = new Physics2DEngine();
    window.physicsEngine = engine; // For debugging
});