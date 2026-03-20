/**
 * Vinecraft - Main Game
 * Orchestrates all subsystems: renderer, world, player, sky, weather, UI.
 */

var Game = (function () {
    'use strict';

    var RENDER_DIST  = 4;
    var TARGET_FPS   = 60;

    function Game() {
        this.running  = false;
        this.paused   = false;
        this._lastTime = 0;
        this._fpsFrames = 0;
        this._fpsTime   = 0;
        this._fps       = 0;

        // Subsystems
        this.renderer  = null;
        this.scene     = null;
        this.camera    = null;
        this.world     = null;
        this.player    = null;
        this.sky       = null;
        this.weather   = null;
        this.inventory = null;

        // Block selection outline
        this._selectionMesh = null;

        // Mouse button tracking
        this._mouseLeft  = false;
        this._mouseRight = false;
        this._mouseRightPrev = false;
    }

    Game.prototype.init = function () {
        var self = this;
        var THREE = window.THREE;

        // ── Renderer ─────────────────────────────────────────────────────────
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
        // Support both r155 (outputColorSpace) and older (outputEncoding)
        if (THREE.SRGBColorSpace !== undefined) {
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        } else {
            this.renderer.outputEncoding = THREE.sRGBEncoding || 3001;
        }
        document.getElementById('game-canvas').appendChild(this.renderer.domElement);

        // ── Scene & Camera ────────────────────────────────────────────────────
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.007);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        // ── Texture Atlas ─────────────────────────────────────────────────────
        var atlasTexture = TextureAtlas.build(THREE);

        // Opaque material (uses vertex colors for AO)
        var atlasMat = new THREE.MeshLambertMaterial({
            map: atlasTexture,
            vertexColors: true,
            side: THREE.FrontSide,
        });

        // Transparent material (water, glass, ice, leaves)
        var transpMat = new THREE.MeshLambertMaterial({
            map: atlasTexture,
            vertexColors: true,
            transparent: true,
            opacity: 0.82,
            side: THREE.DoubleSide,
            depthWrite: false,
        });

        // ── World ─────────────────────────────────────────────────────────────
        this.world = new World(THREE, this.scene, atlasMat, transpMat);

        // Find a good spawn position
        UI.showLoading('Finding spawn point…');
        var spawnX = 0, spawnZ = 0;
        var spawnY = this.world._height(spawnX, spawnZ) + 3;
        // Pre-generate spawn chunks
        for (var dz = -2; dz <= 2; dz++) {
            for (var dx = -2; dx <= 2; dx++) {
                this.world.ensureChunk(dx, dz);
            }
        }
        // Find actual surface
        spawnY = World.SEA_LEVEL + 5;
        for (var y = 120; y > 0; y--) {
            var b = this.world.getBlock(spawnX, y, spawnZ);
            if (b !== BLOCK.AIR && !blockIsLiquid(b)) { spawnY = y + 2; break; }
        }

        // ── Player ────────────────────────────────────────────────────────────
        this.player = new Player(this.camera, this.renderer.domElement);
        this.player.position.x = spawnX + 0.5;
        this.player.position.y = spawnY;
        this.player.position.z = spawnZ + 0.5;

        // ── Inventory ─────────────────────────────────────────────────────────
        this.inventory = new Inventory();

        // ── Sky ───────────────────────────────────────────────────────────────
        this.sky = new Sky(THREE, this.scene);

        // ── Weather ───────────────────────────────────────────────────────────
        this.weather = new Weather(THREE, this.scene);

        // ── Selection box ────────────────────────────────────────────────────
        var selGeo = new THREE.BoxGeometry(1.001, 1.001, 1.001);
        var selMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.35,
            wireframe: true,
            depthTest: true,
        });
        this._selectionMesh = new THREE.Mesh(selGeo, selMat);
        this._selectionMesh.visible = false;
        this.scene.add(this._selectionMesh);

        // ── UI ────────────────────────────────────────────────────────────────
        UI.init(this.inventory, this.player, this.world);
        UI.updateInventory();

        // ── Events ────────────────────────────────────────────────────────────
        this._setupEvents();

        // ── Resize handler ────────────────────────────────────────────────────
        window.addEventListener('resize', function () {
            self.camera.aspect = window.innerWidth / window.innerHeight;
            self.camera.updateProjectionMatrix();
            self.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Kick off build of initial chunk meshes
        for (var key in this.world.chunks) {
            var c = this.world.chunks[key];
            if (c.dirty) c.buildMesh(THREE, this.scene, atlasMat, transpMat);
        }

        UI.hideLoading();
        this.running = true;
        this._lastTime = performance.now();
        this._loop();
    };

    Game.prototype._setupEvents = function () {
        var self = this;

        // Click to lock pointer
        this.renderer.domElement.addEventListener('click', function () {
            if (UI.isOpen()) return;
            self.player.lock();
        });

        // Mouse buttons
        document.addEventListener('mousedown', function (e) {
            if (UI.isOpen()) return;
            if (e.button === 0) self._mouseLeft  = true;
            if (e.button === 2) self._mouseRight = true;
        });
        document.addEventListener('mouseup', function (e) {
            if (e.button === 0) self._mouseLeft  = false;
            if (e.button === 2) self._mouseRight = false;
        });

        // Right-click context menu suppress
        this.renderer.domElement.addEventListener('contextmenu', function (e) { e.preventDefault(); });

        // Scroll → hotbar
        document.addEventListener('wheel', function (e) {
            if (UI.isOpen()) return;
        });

        // Touch controls (mobile)
        this._setupTouchControls();
    };

    Game.prototype._setupTouchControls = function () {
        var self = this;
        var canvas = this.renderer.domElement;
        var touchMove = { active: false, id: null, lx: 0, ly: 0 };
        var touchLook = { active: false, id: null, lx: 0, ly: 0 };

        canvas.addEventListener('touchstart', function (e) {
            e.preventDefault();
            for (var i = 0; i < e.changedTouches.length; i++) {
                var t = e.changedTouches[i];
                if (t.clientX < window.innerWidth / 2) {
                    if (!touchMove.active) { touchMove.active = true; touchMove.id = t.identifier; touchMove.lx = t.clientX; touchMove.ly = t.clientY; }
                } else {
                    if (!touchLook.active) { touchLook.active = true; touchLook.id = t.identifier; touchLook.lx = t.clientX; touchLook.ly = t.clientY; }
                }
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', function (e) {
            e.preventDefault();
            for (var i = 0; i < e.changedTouches.length; i++) {
                var t = e.changedTouches[i];
                if (t.identifier === touchMove.id) {
                    var dx = t.clientX - touchMove.lx, dy = t.clientY - touchMove.ly;
                    touchMove.lx = t.clientX; touchMove.ly = t.clientY;
                    var threshold = 10;
                    if (Math.abs(dx) > Math.abs(dy)) {
                        self.player.keys['KeyA'] = dx < -threshold;
                        self.player.keys['KeyD'] = dx > threshold;
                    } else {
                        self.player.keys['KeyW'] = dy < -threshold;
                        self.player.keys['KeyS'] = dy > threshold;
                    }
                }
                if (t.identifier === touchLook.id) {
                    var dx = t.clientX - touchLook.lx, dy = t.clientY - touchLook.ly;
                    touchLook.lx = t.clientX; touchLook.ly = t.clientY;
                    self.player.yaw   -= dx * 0.003;
                    self.player.pitch -= dy * 0.003;
                    self.player.pitch = Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, self.player.pitch));
                }
            }
        }, { passive: false });

        canvas.addEventListener('touchend', function (e) {
            for (var i = 0; i < e.changedTouches.length; i++) {
                var t = e.changedTouches[i];
                if (t.identifier === touchMove.id) {
                    touchMove.active = false;
                    self.player.keys['KeyW'] = false; self.player.keys['KeyS'] = false;
                    self.player.keys['KeyA'] = false; self.player.keys['KeyD'] = false;
                }
                if (t.identifier === touchLook.id) { touchLook.active = false; }
            }
        }, { passive: false });
    };

    // ─── Main Loop ────────────────────────────────────────────────────────────

    Game.prototype._loop = function () {
        if (!this.running) return;
        var self = this;
        requestAnimationFrame(function () { self._loop(); });

        var now = performance.now();
        var dt  = Math.min((now - this._lastTime) / 1000, 0.05); // cap at 50ms
        this._lastTime = now;

        // FPS counter
        this._fpsFrames++;
        this._fpsTime += dt;
        if (this._fpsTime >= 0.5) {
            this._fps = Math.round(this._fpsFrames / this._fpsTime);
            this._fpsFrames = 0;
            this._fpsTime   = 0;
            UI.updateFPS(this._fps);
        }

        if (this.paused || UI.isOpen()) {
            this.renderer.render(this.scene, this.camera);
            return;
        }

        this._update(dt);
        this.renderer.render(this.scene, this.camera);
    };

    Game.prototype._update = function (dt) {
        var self   = this;
        var player = this.player;
        var world  = this.world;

        // ── Player ────────────────────────────────────────────────────────────
        player.update(dt, world);

        // ── World chunk loading ────────────────────────────────────────────────
        world.update(player.position.x, player.position.z, RENDER_DIST);

        // ── Fog based on weather ──────────────────────────────────────────────
        if (this.scene.fog) {
            this.scene.fog.density = this.weather.getFogDensity();
        }

        // ── Sky ───────────────────────────────────────────────────────────────
        var skyInfo = this.sky.update(dt, player.position);

        // ── Weather ───────────────────────────────────────────────────────────
        this.weather.update(dt, player.position, skyInfo);

        // ── Raycast for block selection ───────────────────────────────────────
        var dir = new window.THREE.Vector3();
        this.camera.getWorldDirection(dir);
        var target = world.raycast(this.camera.position, dir, player.reachDistance);
        player.target = target;

        if (target) {
            this._selectionMesh.visible = true;
            this._selectionMesh.position.set(target.wx + 0.5, target.wy + 0.5, target.wz + 0.5);
        } else {
            this._selectionMesh.visible = false;
        }

        // ── Block breaking ────────────────────────────────────────────────────
        var broke = player.updateBreaking(dt, world, this._mouseLeft && player.isLocked, this.inventory.selectedBlock());
        if (broke) {
            var targetId = world.getBlock(target.wx, target.wy, target.wz);
            var drops = BLOCK_DATA[targetId] ? BLOCK_DATA[targetId].drops : [targetId];
            drops.forEach(function (d) { if (d) self.inventory.add(d, 1); });
            world.setBlock(target.wx, target.wy, target.wz, BLOCK.AIR);
            UI.updateInventory();
        }

        // Break progress HUD
        if (player.breakProgress > 0 && target) {
            UI.showBreakProgress(player.breakProgress, world.getBlock(target.wx, target.wy, target.wz));
        } else {
            UI.showBreakProgress(0, 0);
        }

        // ── Block placing (right-click) ───────────────────────────────────────
        if (this._mouseRight && !this._mouseRightPrev && player.isLocked && target) {
            var placeId = this.inventory.selectedBlock();
            if (placeId && placeId !== BLOCK.AIR) {
                var px = target.wx + target.faceNorm[0];
                var py = target.wy + target.faceNorm[1];
                var pz = target.wz + target.faceNorm[2];
                // Don't place inside player
                var pbx = Math.floor(player.position.x);
                var pby = Math.floor(player.position.y);
                var pbz = Math.floor(player.position.z);
                var overlap = (px === pbx && pz === pbz && py >= pby && py <= pby + 1);
                if (!overlap) {
                    world.setBlock(px, py, pz, placeId);
                    this.inventory.consumeHotbar();
                    UI.updateInventory();
                    UI.showTooltip('Placed ' + blockName(placeId));
                }
            }
        }
        this._mouseRightPrev = this._mouseRight;

        // ── HUD ───────────────────────────────────────────────────────────────
        UI.updateHUD(player, this.sky, this.weather);
        UI.updateCoords(player.position.x, player.position.y, player.position.z);
    };

    // Expose singleton
    var _instance = null;
    return {
        create: function () {
            if (!_instance) _instance = new Game();
            return _instance;
        },
        getInstance: function () { return _instance; },
    };
}());
