class Particle {
    constructor(x, y, vx, vy, emoji) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.emoji = emoji;
        this.size = 40;
        this.mass = 1;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        this.lifespan = 1000;
        this.createdAt = Date.now();
    }

    update(gravity, bounce, friction, width, height) {
        this.vy += gravity;

        this.vx *= friction;
        this.vy *= friction;

        this.x += this.vx;
        this.y += this.vy;

        this.rotation += this.rotationSpeed;

        if (this.x - this.size / 2 < 0) {
            this.x = this.size / 2;
            this.vx *= -bounce;
            this.rotationSpeed *= -1;
        }
        if (this.x + this.size / 2 > width) {
            this.x = width - this.size / 2;
            this.vx *= -bounce;
            this.rotationSpeed *= -1;
        }

        if (this.y - this.size / 2 < 0) {
            this.y = this.size / 2;
            this.vy *= -bounce;
            this.rotationSpeed *= 0.8;
        }
        if (this.y + this.size / 2 > height) {
            this.y = height - this.size / 2;
            this.vy *= -bounce;
            this.rotationSpeed *= 0.8;

            if (Math.abs(this.vy) < 0.5 && Math.abs(this.vx) < 0.5) {
                this.rotationSpeed *= 0.95;
            }
        }
    }

    checkCollision(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (this.size + other.size) / 2;

        if (distance < minDistance) {
            const angle = Math.atan2(dy, dx);
            const targetX = this.x + Math.cos(angle) * minDistance;
            const targetY = this.y + Math.sin(angle) * minDistance;
            const ax = (targetX - other.x) * 0.05;
            const ay = (targetY - other.y) * 0.05;

            this.vx -= ax;
            this.vy -= ay;
            other.vx += ax;
            other.vy += ay;

            this.vx *= 0.95;
            this.vy *= 0.95;
            other.vx *= 0.95;
            other.vy *= 0.95;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        const age = Date.now() - this.createdAt;
        const opacity = Math.max(0, 1 - (age / (this.lifespan * 10)));
        ctx.globalAlpha = opacity;

        ctx.font = `${this.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
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
        this.fps = 60;
        this.lastFrameTime = performance.now();

        this.resize();
        this.setupEventListeners();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());

        this.canvas.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
            this.startX = e.clientX;
            this.startY = e.clientY;
            this.currentX = e.clientX;
            this.currentY = e.clientY;
            document.getElementById('launchIndicator').style.display = 'block';
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.mouseDown) {
                this.currentX = e.clientX;
                this.currentY = e.clientY;
                this.updateLaunchIndicator();
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (this.mouseDown) {
                this.launchParticle();
                this.mouseDown = false;
                document.getElementById('launchIndicator').style.display = 'none';
            }
        });

        this.canvas.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            this.mouseDown = true;
            this.startX = touch.clientX;
            this.startY = touch.clientY;
            this.currentX = touch.clientX;
            this.currentY = touch.clientY;
            document.getElementById('launchIndicator').style.display = 'block';
            e.preventDefault();
        });

        this.canvas.addEventListener('touchmove', (e) => {
            if (this.mouseDown) {
                const touch = e.touches[0];
                this.currentX = touch.clientX;
                this.currentY = touch.clientY;
                this.updateLaunchIndicator();
                e.preventDefault();
            }
        });

        this.canvas.addEventListener('touchend', (e) => {
            if (this.mouseDown) {
                this.launchParticle();
                this.mouseDown = false;
                document.getElementById('launchIndicator').style.display = 'none';
                e.preventDefault();
            }
        });

        document.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedEmoji = btn.dataset.emoji;
            });
        });

        document.getElementById('gravity').addEventListener('input', (e) => {
            this.gravity = parseFloat(e.target.value);
            document.getElementById('gravityValue').textContent = this.gravity;
        });

        document.getElementById('bounce').addEventListener('input', (e) => {
            this.bounce = parseFloat(e.target.value);
            document.getElementById('bounceValue').textContent = this.bounce;
        });

        document.getElementById('power').addEventListener('input', (e) => {
            this.power = parseFloat(e.target.value);
            document.getElementById('powerValue').textContent = this.power;
        });

        document.getElementById('friction').addEventListener('input', (e) => {
            this.friction = parseFloat(e.target.value);
            document.getElementById('frictionValue').textContent = this.friction;
        });

        document.getElementById('clearBtn').addEventListener('click', () => {
            this.particles = [];
        });

        document.getElementById('rainBtn').addEventListener('click', () => {
            this.createRain();
        });

        document.getElementById('explosionBtn').addEventListener('click', () => {
            this.createExplosion();
        });

        document.getElementById('gravityBtn').addEventListener('click', () => {
            this.gravityEnabled = !this.gravityEnabled;
            if (!this.gravityEnabled) {
                this.gravity = 0;
                document.getElementById('gravity').value = 0;
                document.getElementById('gravityValue').textContent = 0;
            } else {
                this.gravity = 0.5;
                document.getElementById('gravity').value = 0.5;
                document.getElementById('gravityValue').textContent = 0.5;
            }
        });
    }

    updateLaunchIndicator() {
        const indicator = document.getElementById('launchIndicator');
        const dx = this.currentX - this.startX;
        const dy = this.currentY - this.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        indicator.style.left = `${this.startX}px`;
        indicator.style.top = `${this.startY}px`;

        const powerBar = indicator.querySelector('.power-fill');
        powerBar.style.width = `${Math.min(distance * 2, 200)}px`;

        const arrow = indicator.querySelector('.angle-arrow');
        arrow.style.transform = `rotate(${angle}rad)`;
    }

    launchParticle() {
        const dx = this.startX - this.currentX;
        const dy = this.startY - this.currentY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const vx = (dx / distance) * Math.min(distance / 10, this.power);
        const vy = (dy / distance) * Math.min(distance / 10, this.power);

        this.particles.push(new Particle(
            this.startX,
            this.startY,
            vx,
            vy,
            this.selectedEmoji
        ));

        if (this.particles.length > 200) {
            this.particles.shift();
        }
    }

    createRain() {
        const emojis = ['😀', '🚀', '⚽', '🎈', '💖', '⭐', '🔥', '🌈', '🎯', '🍕', '🦄', '💎'];
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                const x = Math.random() * this.canvas.width;
                const y = -50;
                const vx = (Math.random() - 0.5) * 2;
                const vy = Math.random() * 2 + 1;
                this.particles.push(new Particle(x, y, vx, vy, emoji));
            }, i * 50);
        }
    }

    createExplosion() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const emojis = ['💥', '⭐', '✨', '🔥', '💫', '🌟'];

        for (let i = 0; i < 50; i++) {
            const angle = (Math.PI * 2 * i) / 50;
            const speed = Math.random() * 20 + 10;
            const emoji = emojis[Math.floor(Math.random() * emojis.length)];
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            this.particles.push(new Particle(centerX, centerY, vx, vy, emoji));
        }
    }

    animate() {
        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;

        if (deltaTime > 16) {
            this.fps = Math.round(1000 / deltaTime);
            this.lastFrameTime = now;

            this.ctx.fillStyle = 'rgba(10, 10, 30, 0.1)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            const currentGravity = this.gravityEnabled ? this.gravity : 0;

            for (let i = 0; i < this.particles.length; i++) {
                const particle = this.particles[i];
                particle.update(currentGravity, this.bounce, this.friction, this.canvas.width, this.canvas.height);

                for (let j = i + 1; j < this.particles.length; j++) {
                    particle.checkCollision(this.particles[j]);
                }

                particle.draw(this.ctx);
            }

            this.particles = this.particles.filter(p => {
                const age = Date.now() - p.createdAt;
                return age < p.lifespan * 10;
            });

            document.getElementById('emojiCount').textContent = this.particles.length;
            document.getElementById('fps').textContent = this.fps;
        }

        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('physicsCanvas');
    new PhysicsEngine(canvas);
});