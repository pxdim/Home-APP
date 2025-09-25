// Optimized 3D Physics Emoji Launcher with Instance Mesh System
class EmojiPhysicsEngine {
    constructor() {
        // Core settings
        this.MAX_ENTITIES = 200;
        this.entities = [];
        this.selectedEmoji = '😀';
        this.isLaunching = false;
        this.launchInterval = null;

        // Physics parameters
        this.physics = {
            gravity: 9.8,
            power: 15,
            bounce: 0.6,
            friction: 0.3
        };

        // Performance tracking
        this.stats = {
            fps: 60,
            frameTime: 0,
            physicsTime: 0,
            lastTime: performance.now(),
            frames: 0
        };

        // Initialize
        this.init();
    }

    async init() {
        this.showLoadingProgress(10);
        await this.setupRenderer();

        this.showLoadingProgress(30);
        await this.setupScene();

        this.showLoadingProgress(50);
        await this.setupPhysics();

        this.showLoadingProgress(70);
        await this.setupInstancedMesh();

        this.showLoadingProgress(90);
        this.setupControls();

        this.showLoadingProgress(100);
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
            this.animate();
        }, 500);
    }

    showLoadingProgress(percent) {
        const progress = document.getElementById('loadingProgress');
        if (progress) {
            progress.style.width = percent + '%';
        }
    }

    async setupRenderer() {
        // Create renderer
        this.canvas = document.getElementById('renderCanvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Handle resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    async setupScene() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000000, 10, 100);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 15, 30);
        this.camera.lookAt(0, 0, 0);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0x00ff00, 0.5);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.camera.left = -30;
        dirLight.shadow.camera.right = 30;
        dirLight.shadow.camera.top = 30;
        dirLight.shadow.camera.bottom = -30;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);

        // Ground
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Grid
        const grid = new THREE.GridHelper(100, 50, 0x00ff00, 0x004400);
        this.scene.add(grid);

        // Walls (visual indicators)
        const wallGeometry = new THREE.PlaneGeometry(100, 50);
        const wallMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.05,
            side: THREE.DoubleSide
        });

        // Back wall
        const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
        backWall.position.z = -50;
        this.scene.add(backWall);
    }

    async setupPhysics() {
        // Physics world
        this.world = new CANNON.World();
        this.world.gravity.set(0, -this.physics.gravity, 0);
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.world.solver.iterations = 5;
        this.world.defaultContactMaterial.contactEquationStiffness = 1e7;
        this.world.defaultContactMaterial.contactEquationRelaxation = 4;

        // Materials
        this.groundMaterial = new CANNON.Material('ground');
        this.emojiMaterial = new CANNON.Material('emoji');

        // Contact materials
        const groundEmojiContact = new CANNON.ContactMaterial(
            this.groundMaterial,
            this.emojiMaterial,
            {
                friction: this.physics.friction,
                restitution: this.physics.bounce
            }
        );
        this.world.addContactMaterial(groundEmojiContact);

        const emojiEmojiContact = new CANNON.ContactMaterial(
            this.emojiMaterial,
            this.emojiMaterial,
            {
                friction: 0.1,
                restitution: 0.4
            }
        );
        this.world.addContactMaterial(emojiEmojiContact);

        // Ground body
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({
            mass: 0,
            material: this.groundMaterial
        });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.add(groundBody);

        // Walls
        this.addWall(50, 25, 0, Math.PI / 2);  // Right
        this.addWall(-50, 25, 0, -Math.PI / 2); // Left
        this.addWall(0, 25, -50, 0);            // Back
        this.addWall(0, 25, 50, Math.PI);       // Front
    }

    addWall(x, y, z, rotation) {
        const wallShape = new CANNON.Box(new CANNON.Vec3(1, 50, 50));
        const wallBody = new CANNON.Body({
            mass: 0,
            material: this.groundMaterial
        });
        wallBody.addShape(wallShape);
        wallBody.position.set(x, y, z);
        wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotation);
        this.world.add(wallBody);
    }

    async setupInstancedMesh() {
        // Create instanced mesh for performance
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.7,
            metalness: 0.3
        });

        this.instancedMesh = new THREE.InstancedMesh(
            geometry,
            material,
            this.MAX_ENTITIES
        );
        this.instancedMesh.castShadow = true;
        this.instancedMesh.receiveShadow = true;
        this.instancedMesh.count = 0;
        this.scene.add(this.instancedMesh);

        // Create emoji textures
        this.emojiTextures = {};
        const emojis = ['😀', '🚀', '💎', '🔥', '⭐', '💖', '🌟', '⚡'];

        for (const emoji of emojis) {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');

            // Background
            ctx.fillStyle = '#111';
            ctx.fillRect(0, 0, 256, 256);

            // Emoji
            ctx.font = '200px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, 128, 128);

            this.emojiTextures[emoji] = new THREE.CanvasTexture(canvas);
        }

        // Matrix for transformations
        this.tempMatrix = new THREE.Matrix4();
        this.tempColor = new THREE.Color();
    }

    setupControls() {
        // Mouse controls
        this.canvas.addEventListener('mousedown', (e) => this.startLaunching(e));
        this.canvas.addEventListener('mouseup', () => this.stopLaunching());
        this.canvas.addEventListener('mouseleave', () => this.stopLaunching());
        this.canvas.addEventListener('mousemove', (e) => this.updateMousePosition(e));

        // Touch controls
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.startLaunching(touch);
        });
        this.canvas.addEventListener('touchend', () => this.stopLaunching());

        // Emoji selection
        document.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedEmoji = btn.dataset.emoji;
            });
        });

        // Physics controls
        document.getElementById('gravityControl').addEventListener('input', (e) => {
            this.physics.gravity = parseFloat(e.target.value);
            document.getElementById('gravityValue').textContent = this.physics.gravity.toFixed(1);
            this.world.gravity.set(0, -this.physics.gravity, 0);
        });

        document.getElementById('powerControl').addEventListener('input', (e) => {
            this.physics.power = parseFloat(e.target.value);
            document.getElementById('powerValue').textContent = this.physics.power;
        });

        document.getElementById('bounceControl').addEventListener('input', (e) => {
            this.physics.bounce = parseFloat(e.target.value);
            document.getElementById('bounceValue').textContent = this.physics.bounce.toFixed(2);
            this.updateContactMaterials();
        });

        document.getElementById('frictionControl').addEventListener('input', (e) => {
            this.physics.friction = parseFloat(e.target.value);
            document.getElementById('frictionValue').textContent = this.physics.friction.toFixed(2);
            this.updateContactMaterials();
        });

        // Action buttons
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAll());
        document.getElementById('explosionBtn').addEventListener('click', () => this.createExplosion());
        document.getElementById('rainBtn').addEventListener('click', () => this.createRain());
        document.getElementById('zeroGBtn').addEventListener('click', () => this.toggleZeroG());
    }

    updateContactMaterials() {
        if (this.world.contactmaterials.length > 0) {
            this.world.contactmaterials[0].friction = this.physics.friction;
            this.world.contactmaterials[0].restitution = this.physics.bounce;
        }
    }

    startLaunching(event) {
        this.isLaunching = true;
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;

        // Launch immediately
        this.launchEmoji();

        // Continue launching
        this.launchInterval = setInterval(() => {
            if (this.isLaunching) {
                this.launchEmoji();
            }
        }, 100);
    }

    stopLaunching() {
        this.isLaunching = false;
        if (this.launchInterval) {
            clearInterval(this.launchInterval);
            this.launchInterval = null;
        }
    }

    updateMousePosition(event) {
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
    }

    launchEmoji() {
        // Check limit and remove oldest if needed
        if (this.entities.length >= this.MAX_ENTITIES) {
            this.removeOldestEntity();
        }

        // Calculate launch position and velocity
        const mouse = new THREE.Vector2(
            (this.mouseX / window.innerWidth) * 2 - 1,
            -(this.mouseY / window.innerHeight) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        const planeZ = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const point = new THREE.Vector3();
        raycaster.ray.intersectPlane(planeZ, point);

        // Create physics body
        const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
        const body = new CANNON.Body({
            mass: 1,
            material: this.emojiMaterial
        });
        body.addShape(shape);

        // Set position
        body.position.set(
            point.x,
            10,
            point.z
        );

        // Apply random velocity
        const angle = Math.random() * Math.PI * 2;
        const velocity = new CANNON.Vec3(
            Math.cos(angle) * this.physics.power * (0.5 + Math.random() * 0.5),
            this.physics.power * (0.5 + Math.random()),
            Math.sin(angle) * this.physics.power * (0.5 + Math.random() * 0.5)
        );
        body.velocity = velocity;

        // Random angular velocity
        body.angularVelocity.set(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
        );

        this.world.add(body);

        // Store entity data
        this.entities.push({
            body: body,
            emoji: this.selectedEmoji,
            createdAt: Date.now()
        });

        // Update instance count
        this.instancedMesh.count = this.entities.length;
        this.updateStats();
    }

    removeOldestEntity() {
        if (this.entities.length > 0) {
            const oldest = this.entities.shift();
            this.world.remove(oldest.body);
        }
    }

    clearAll() {
        while (this.entities.length > 0) {
            this.removeOldestEntity();
        }
        this.instancedMesh.count = 0;
        this.updateStats();
    }

    createExplosion() {
        const count = Math.min(30, this.MAX_ENTITIES - this.entities.length);
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = this.physics.power;

            setTimeout(() => {
                if (this.entities.length >= this.MAX_ENTITIES) {
                    this.removeOldestEntity();
                }

                const body = new CANNON.Body({
                    mass: 1,
                    material: this.emojiMaterial
                });
                body.addShape(new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)));
                body.position.set(0, 10, 0);
                body.velocity.set(
                    Math.cos(angle) * speed,
                    speed,
                    Math.sin(angle) * speed
                );

                this.world.add(body);
                this.entities.push({
                    body: body,
                    emoji: this.selectedEmoji,
                    createdAt: Date.now()
                });

                this.instancedMesh.count = this.entities.length;
                this.updateStats();
            }, i * 50);
        }
    }

    createRain() {
        const count = Math.min(20, this.MAX_ENTITIES - this.entities.length);
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                if (this.entities.length >= this.MAX_ENTITIES) {
                    this.removeOldestEntity();
                }

                const body = new CANNON.Body({
                    mass: 1,
                    material: this.emojiMaterial
                });
                body.addShape(new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)));
                body.position.set(
                    (Math.random() - 0.5) * 30,
                    25 + Math.random() * 10,
                    (Math.random() - 0.5) * 30
                );
                body.velocity.set(
                    (Math.random() - 0.5) * 2,
                    0,
                    (Math.random() - 0.5) * 2
                );

                this.world.add(body);
                this.entities.push({
                    body: body,
                    emoji: this.selectedEmoji,
                    createdAt: Date.now()
                });

                this.instancedMesh.count = this.entities.length;
                this.updateStats();
            }, i * 200);
        }
    }

    toggleZeroG() {
        const btn = document.getElementById('zeroGBtn');
        if (this.world.gravity.y === 0) {
            this.world.gravity.set(0, -this.physics.gravity, 0);
            btn.textContent = 'ZERO-G MODE';
        } else {
            this.world.gravity.set(0, 0, 0);
            btn.textContent = 'NORMAL GRAVITY';
        }
    }

    updateStats() {
        document.getElementById('entityCount').textContent = this.entities.length;

        // Memory estimation (rough)
        if (performance.memory) {
            const memoryMB = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
            document.getElementById('memoryUsage').textContent = memoryMB + 'MB';
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const now = performance.now();
        const deltaTime = (now - this.stats.lastTime) / 1000;
        this.stats.lastTime = now;

        // Update physics
        const physicsStart = performance.now();
        this.world.step(1/60, deltaTime, 3);
        this.stats.physicsTime = (performance.now() - physicsStart).toFixed(1);

        // Update instanced mesh
        for (let i = 0; i < this.entities.length; i++) {
            const entity = this.entities[i];

            // Update matrix
            this.tempMatrix.makeRotationFromQuaternion(entity.body.quaternion);
            this.tempMatrix.setPosition(entity.body.position.x, entity.body.position.y, entity.body.position.z);
            this.instancedMesh.setMatrixAt(i, this.tempMatrix);

            // Update color based on emoji
            const emojiColors = {
                '😀': 0xffff00,
                '🚀': 0xff0000,
                '💎': 0x00ffff,
                '🔥': 0xff6600,
                '⭐': 0xffff00,
                '💖': 0xff00ff,
                '🌟': 0xffffff,
                '⚡': 0xffff00
            };
            this.tempColor.setHex(emojiColors[entity.emoji] || 0xffffff);
            this.instancedMesh.setColorAt(i, this.tempColor);
        }

        this.instancedMesh.instanceMatrix.needsUpdate = true;
        if (this.instancedMesh.instanceColor) {
            this.instancedMesh.instanceColor.needsUpdate = true;
        }

        // Camera animation
        const time = now * 0.0005;
        this.camera.position.x = Math.sin(time) * 5;
        this.camera.position.z = 30 + Math.cos(time) * 5;
        this.camera.lookAt(0, 5, 0);

        // Update FPS
        this.stats.frames++;
        if (this.stats.frames % 30 === 0) {
            this.stats.fps = Math.round(1 / deltaTime);
            document.getElementById('fps').textContent = this.stats.fps;
            document.getElementById('physicsTime').textContent = this.stats.physicsTime + 'ms';
        }

        // Render
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new EmojiPhysicsEngine();
    });
} else {
    new EmojiPhysicsEngine();
}