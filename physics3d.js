// 3D Physics Engine for Emoji Launcher
class Physics3DEngine {
    constructor() {
        this.emojis = [];
        this.maxEmojis = 200;
        this.selectedEmoji = '😀';
        this.isMouseDown = false;
        this.spawnTimer = null;
        this.clock = new THREE.Clock();

        // Physics settings
        this.settings = {
            gravity: 9.82,
            power: 20,
            restitution: 0.7,
            friction: 0.4
        };

        // Performance tracking
        this.stats = {
            fps: 60,
            emojiCount: 0,
            physicsTime: 0
        };

        this.init();
    }

    init() {
        // Setup Three.js scene
        this.setupScene();

        // Setup Cannon.js physics world
        this.setupPhysics();

        // Setup ground and walls
        this.setupEnvironment();

        // Setup controls
        this.setupControls();

        // Setup emoji mesh instances
        this.setupEmojiInstances();

        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
        }, 1500);

        // Start animation loop
        this.animate();
    }

    setupScene() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000000, 1, 100);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 10, 20);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('canvas'),
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x000000);

        // Lights
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0x00ff00, 0.5);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        this.scene.add(directionalLight);

        const pointLight = new THREE.PointLight(0x00ff00, 0.5, 50);
        pointLight.position.set(0, 10, 0);
        this.scene.add(pointLight);

        // Resize handler
        window.addEventListener('resize', () => this.onResize(), false);
    }

    setupPhysics() {
        // Create physics world
        this.world = new CANNON.World();
        this.world.gravity.set(0, -this.settings.gravity, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;
        this.world.defaultContactMaterial.contactEquationStiffness = 1e6;
        this.world.defaultContactMaterial.contactEquationRelaxation = 3;

        // Materials
        this.groundMaterial = new CANNON.Material('ground');
        this.emojiMaterial = new CANNON.Material('emoji');

        // Contact material
        const contactMaterial = new CANNON.ContactMaterial(
            this.groundMaterial,
            this.emojiMaterial,
            {
                friction: this.settings.friction,
                restitution: this.settings.restitution
            }
        );
        this.world.addContactMaterial(contactMaterial);

        // Emoji-emoji contact
        const emojiContactMaterial = new CANNON.ContactMaterial(
            this.emojiMaterial,
            this.emojiMaterial,
            {
                friction: 0.1,
                restitution: 0.5
            }
        );
        this.world.addContactMaterial(emojiContactMaterial);
    }

    setupEnvironment() {
        // Ground
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.3,
            roughness: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Add grid
        const gridHelper = new THREE.GridHelper(100, 50, 0x00ff00, 0x003300);
        this.scene.add(gridHelper);

        // Physics ground
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({
            mass: 0,
            material: this.groundMaterial
        });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.add(groundBody);

        // Add walls (invisible barriers)
        this.addWall(50, 0, 0, Math.PI / 2); // Right
        this.addWall(-50, 0, 0, -Math.PI / 2); // Left
        this.addWall(0, 0, 50, 0); // Back
        this.addWall(0, 0, -50, Math.PI); // Front
    }

    addWall(x, y, z, rotation) {
        const wallShape = new CANNON.Plane();
        const wallBody = new CANNON.Body({
            mass: 0,
            material: this.groundMaterial
        });
        wallBody.addShape(wallShape);
        wallBody.position.set(x, y, z);
        wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotation);
        this.world.add(wallBody);
    }

    setupEmojiInstances() {
        // Create emoji texture canvas
        this.emojiTextures = {};
        const emojiList = ['😀', '🚀', '⚽', '💎', '🔥', '⭐', '💖', '🎯'];

        emojiList.forEach(emoji => {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 256, 256);

            ctx.font = '200px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, 128, 128);

            this.emojiTextures[emoji] = new THREE.CanvasTexture(canvas);
        });

        // Create base geometry for emoji cubes
        this.emojiGeometry = new THREE.BoxGeometry(1, 1, 1);
    }

    createEmoji(x, y, z, velocityX, velocityY, velocityZ) {
        if (this.emojis.length >= this.maxEmojis) {
            this.removeOldestEmoji();
        }

        // Three.js mesh
        const material = new THREE.MeshStandardMaterial({
            map: this.emojiTextures[this.selectedEmoji],
            metalness: 0.2,
            roughness: 0.7
        });

        const mesh = new THREE.Mesh(this.emojiGeometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        // Cannon.js body
        const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
        const body = new CANNON.Body({
            mass: 1,
            material: this.emojiMaterial
        });
        body.addShape(shape);
        body.position.set(x, y, z);
        body.velocity.set(velocityX, velocityY, velocityZ);

        // Add random angular velocity
        body.angularVelocity.set(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
        );

        this.world.add(body);

        // Store emoji data
        this.emojis.push({
            mesh: mesh,
            body: body,
            createdAt: Date.now()
        });

        this.updateStats();
    }

    removeOldestEmoji() {
        if (this.emojis.length > 0) {
            const oldest = this.emojis.shift();
            this.scene.remove(oldest.mesh);
            this.world.remove(oldest.body);
            oldest.mesh.geometry.dispose();
            oldest.mesh.material.dispose();
        }
    }

    clearAllEmojis() {
        while (this.emojis.length > 0) {
            this.removeOldestEmoji();
        }
        this.updateStats();
    }

    setupControls() {
        const canvas = this.renderer.domElement;

        // Mouse controls
        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        canvas.addEventListener('mouseup', () => this.onMouseUp());
        canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Touch controls
        canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        canvas.addEventListener('touchend', () => this.onTouchEnd());

        // UI controls
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAllEmojis());
        document.getElementById('bombBtn').addEventListener('click', () => this.createBomb());
        document.getElementById('rainBtn').addEventListener('click', () => this.createRain());
        document.getElementById('zeroGBtn').addEventListener('click', () => this.toggleZeroG());

        // Physics controls
        document.getElementById('gravity').addEventListener('input', (e) => {
            this.settings.gravity = parseFloat(e.target.value);
            document.getElementById('gravityValue').textContent = this.settings.gravity.toFixed(2);
            this.world.gravity.set(0, -this.settings.gravity, 0);
        });

        document.getElementById('power').addEventListener('input', (e) => {
            this.settings.power = parseFloat(e.target.value);
            document.getElementById('powerValue').textContent = this.settings.power;
        });

        document.getElementById('restitution').addEventListener('input', (e) => {
            this.settings.restitution = parseFloat(e.target.value);
            document.getElementById('restitutionValue').textContent = this.settings.restitution;
            this.updateContactMaterials();
        });

        document.getElementById('friction').addEventListener('input', (e) => {
            this.settings.friction = parseFloat(e.target.value);
            document.getElementById('frictionValue').textContent = this.settings.friction;
            this.updateContactMaterials();
        });

        // Emoji selection
        document.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedEmoji = btn.dataset.emoji;
            });
        });
    }

    onMouseDown(e) {
        this.isMouseDown = true;
        this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;

        this.startContinuousSpawn();
    }

    onMouseUp() {
        this.isMouseDown = false;
        this.stopContinuousSpawn();
    }

    onMouseMove(e) {
        if (this.isMouseDown) {
            this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        }
    }

    onTouchStart(e) {
        const touch = e.touches[0];
        this.isMouseDown = true;
        this.mouseX = (touch.clientX / window.innerWidth) * 2 - 1;
        this.mouseY = -(touch.clientY / window.innerHeight) * 2 + 1;
        this.startContinuousSpawn();
        e.preventDefault();
    }

    onTouchEnd() {
        this.isMouseDown = false;
        this.stopContinuousSpawn();
    }

    startContinuousSpawn() {
        this.spawnEmoji();
        this.spawnTimer = setInterval(() => {
            if (this.isMouseDown) {
                this.spawnEmoji();
            }
        }, 100);
    }

    stopContinuousSpawn() {
        if (this.spawnTimer) {
            clearInterval(this.spawnTimer);
            this.spawnTimer = null;
        }
    }

    spawnEmoji() {
        // Convert mouse position to 3D world position
        const vector = new THREE.Vector3(this.mouseX, this.mouseY, 0.5);
        vector.unproject(this.camera);
        const dir = vector.sub(this.camera.position).normalize();
        const distance = -this.camera.position.y / dir.y;
        const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));

        // Calculate launch velocity
        const velocityDirection = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            1,
            (Math.random() - 0.5) * 2
        ).normalize();

        const velocity = velocityDirection.multiplyScalar(this.settings.power);

        this.createEmoji(
            pos.x,
            5 + Math.random() * 5,
            pos.z,
            velocity.x,
            velocity.y,
            velocity.z
        );
    }

    createBomb() {
        const centerX = 0;
        const centerY = 10;
        const centerZ = 0;

        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            const speed = this.settings.power * 0.8;

            this.createEmoji(
                centerX,
                centerY,
                centerZ,
                Math.cos(angle) * speed,
                Math.random() * speed,
                Math.sin(angle) * speed
            );
        }
    }

    createRain() {
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                this.createEmoji(
                    (Math.random() - 0.5) * 40,
                    20 + Math.random() * 10,
                    (Math.random() - 0.5) * 40,
                    (Math.random() - 0.5) * 5,
                    0,
                    (Math.random() - 0.5) * 5
                );
            }, i * 100);
        }
    }

    toggleZeroG() {
        if (this.world.gravity.y === 0) {
            this.world.gravity.set(0, -this.settings.gravity, 0);
            document.getElementById('zeroGBtn').textContent = 'ZERO GRAVITY';
        } else {
            this.world.gravity.set(0, 0, 0);
            document.getElementById('zeroGBtn').textContent = 'NORMAL GRAVITY';
        }
    }

    updateContactMaterials() {
        this.world.contactmaterials[0].friction = this.settings.friction;
        this.world.contactmaterials[0].restitution = this.settings.restitution;
    }

    updateStats() {
        this.stats.emojiCount = this.emojis.length;
        document.getElementById('emojiCount').textContent = this.stats.emojiCount;
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const deltaTime = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        // Update physics
        const physicsStart = performance.now();
        this.world.step(1/60, deltaTime, 3);
        this.stats.physicsTime = (performance.now() - physicsStart).toFixed(1);

        // Sync Three.js meshes with Cannon.js bodies
        this.emojis.forEach(emoji => {
            emoji.mesh.position.copy(emoji.body.position);
            emoji.mesh.quaternion.copy(emoji.body.quaternion);
        });

        // Animate camera slightly
        this.camera.position.x = Math.sin(time * 0.1) * 2;
        this.camera.position.z = 20 + Math.cos(time * 0.1) * 2;
        this.camera.lookAt(0, 0, 0);

        // Update FPS
        this.stats.fps = Math.round(1 / deltaTime);
        if (this.clock.elapsedTime % 0.5 < deltaTime) {
            document.getElementById('fps').textContent = this.stats.fps;
            document.getElementById('physicsTime').textContent = this.stats.physicsTime;
        }

        // Render
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Update loading bar
    const progress = document.querySelector('.loading-progress');
    let loadProgress = 0;
    const loadInterval = setInterval(() => {
        loadProgress += 10;
        progress.style.width = loadProgress + '%';
        if (loadProgress >= 100) {
            clearInterval(loadInterval);
            // Start the physics engine
            new Physics3DEngine();
        }
    }, 100);
});