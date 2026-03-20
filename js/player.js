/**
 * Vinecraft - Player Controller
 * First-person movement, physics, block interaction, and pointer lock.
 */

var Player = (function () {
    'use strict';

    var GRAVITY    = -28;    // units/s²
    var JUMP_SPEED = 8;
    var WALK_SPEED = 5;
    var SPRINT_SPEED = 8;
    var FLY_SPEED  = 12;
    var PLAYER_HEIGHT = 1.8;
    var PLAYER_EYE   = 1.62;
    var PLAYER_RADIUS = 0.3;

    function Player(camera, domElement) {
        this.camera    = camera;
        this.domElement = domElement;

        this.position  = { x: 0, y: 80, z: 0 };
        this.velocity  = { x: 0, y: 0, z: 0 };
        this.yaw       = 0;   // radians
        this.pitch     = 0;   // radians
        this.onGround  = false;
        this.flying    = false;
        this.swimming  = false;
        this.sprinting = false;

        // Health & hunger
        this.health    = 20;
        this.maxHealth = 20;
        this.hunger    = 20;
        this.maxHunger = 20;
        this._hungerTimer = 0;
        this._regenTimer  = 0;

        // Input state
        this.keys = {};
        this.mouseButtons = {};
        this.isLocked = false;

        // Block interaction
        this.breakProgress = 0;  // 0-1
        this.breakTarget   = null;
        this.reachDistance = 6;

        this._setupEvents();
    }

    Player.prototype._setupEvents = function () {
        var self = this;

        document.addEventListener('keydown', function (e) {
            self.keys[e.code] = true;
            if (e.code === 'Space' && self.onGround && !self.flying) {
                self.velocity.y = JUMP_SPEED;
                self.onGround = false;
            }
            if (e.code === 'KeyF') self.flying = !self.flying;
            if (e.code === 'ShiftLeft') self.sprinting = true;
        });

        document.addEventListener('keyup', function (e) {
            self.keys[e.code] = false;
            if (e.code === 'ShiftLeft') self.sprinting = false;
        });

        // Pointer lock
        document.addEventListener('pointerlockchange', function () {
            self.isLocked = document.pointerLockElement === self.domElement;
        });

        document.addEventListener('mousemove', function (e) {
            if (!self.isLocked) return;
            var sens = 0.002;
            self.yaw   -= e.movementX * sens;
            self.pitch -= e.movementY * sens;
            self.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, self.pitch));
        });
    };

    Player.prototype.lock = function () {
        this.domElement.requestPointerLock();
    };

    // ─── Physics ─────────────────────────────────────────────────────────────

    Player.prototype._collide = function (world, axis) {
        var px = this.position.x, py = this.position.y, pz = this.position.z;
        var r = PLAYER_RADIUS, h = PLAYER_HEIGHT;

        // Check corners of player bounding box
        var minX = px - r, maxX = px + r;
        var minY = py,      maxY = py + h;
        var minZ = pz - r,  maxZ = pz + r;

        for (var bx = Math.floor(minX); bx <= Math.floor(maxX); bx++) {
            for (var by = Math.floor(minY); by <= Math.floor(maxY); by++) {
                for (var bz = Math.floor(minZ); bz <= Math.floor(maxZ); bz++) {
                    var id = world.getBlock(bx, by, bz);
                    if (!blockIsSolid(id)) continue;

                    // Overlap on each axis
                    if (axis === 'x') {
                        var overlapPX = (bx + 1) - minX;
                        var overlapNX = maxX - bx;
                        if (this.velocity.x > 0) { this.position.x -= overlapPX; this.velocity.x = 0; }
                        else if (this.velocity.x < 0) { this.position.x += overlapNX; this.velocity.x = 0; }
                    } else if (axis === 'y') {
                        var overlapPY = (by + 1) - minY;
                        var overlapNY = maxY - by;
                        if (this.velocity.y > 0) { this.position.y -= overlapPY; this.velocity.y = 0; }
                        else if (this.velocity.y < 0) {
                            this.position.y += overlapNY;
                            this.velocity.y = 0;
                            this.onGround = true;
                        }
                    } else {
                        var overlapPZ = (bz + 1) - minZ;
                        var overlapNZ = maxZ - bz;
                        if (this.velocity.z > 0) { this.position.z -= overlapPZ; this.velocity.z = 0; }
                        else if (this.velocity.z < 0) { this.position.z += overlapNZ; this.velocity.z = 0; }
                    }

                    // Recalculate bounds after correction
                    minX = this.position.x - r; maxX = this.position.x + r;
                    minY = this.position.y;      maxY = this.position.y + h;
                    minZ = this.position.z - r;  maxZ = this.position.z + r;
                }
            }
        }
    };

    Player.prototype.update = function (dt, world) {
        var speed = this.flying ? FLY_SPEED : (this.sprinting ? SPRINT_SPEED : WALK_SPEED);
        if (this.swimming) speed *= 0.5;

        // Movement direction from keyboard
        var fw = 0, rt = 0;
        if (this.keys['KeyW']) fw -= 1;
        if (this.keys['KeyS']) fw += 1;
        if (this.keys['KeyA']) rt -= 1;
        if (this.keys['KeyD']) rt += 1;

        var sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
        var vx = rt * cos - fw * sin;
        var vz = rt * sin + fw * cos;

        // Normalise
        var len = Math.sqrt(vx * vx + vz * vz);
        if (len > 0) { vx /= len; vz /= len; }

        var friction = this.onGround ? 0.85 : 0.98;
        this.velocity.x = this.velocity.x * friction + vx * speed * (1 - friction);
        this.velocity.z = this.velocity.z * friction + vz * speed * (1 - friction);

        if (this.flying) {
            this.velocity.y = 0;
            if (this.keys['Space'])      this.velocity.y = FLY_SPEED;
            if (this.keys['ShiftLeft'])  this.velocity.y = -FLY_SPEED;
        } else {
            // Gravity
            this.velocity.y += GRAVITY * dt;
            this.velocity.y = Math.max(this.velocity.y, -50);
        }

        // Move & collide on each axis independently
        this.onGround = false;

        this.position.x += this.velocity.x * dt;
        this._collide(world, 'x');

        this.position.y += this.velocity.y * dt;
        this._collide(world, 'y');

        this.position.z += this.velocity.z * dt;
        this._collide(world, 'z');

        // Clamp to world
        if (this.position.y < -10) { this.position.y = 90; this.velocity.y = 0; this.health -= 4; }

        // Swimming check
        var eyeBlock = world.getBlock(
            Math.floor(this.position.x),
            Math.floor(this.position.y + 1),
            Math.floor(this.position.z)
        );
        this.swimming = blockIsLiquid(eyeBlock);

        // Hunger tick
        this._hungerTimer += dt;
        if (this._hungerTimer > 30) {
            this._hungerTimer = 0;
            if (this.hunger > 0) this.hunger--;
        }

        // Regen when full hunger
        if (this.hunger >= 18 && this.health < this.maxHealth) {
            this._regenTimer += dt;
            if (this._regenTimer > 1) { this._regenTimer = 0; this.health++; }
        }

        // Update camera
        this.camera.position.set(
            this.position.x,
            this.position.y + PLAYER_EYE,
            this.position.z
        );
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;
    };

    // ─── Block interaction ────────────────────────────────────────────────────

    Player.prototype.updateBreaking = function (dt, world, isBreaking, hotbarId) {
        if (!isBreaking || !this.target) {
            this.breakProgress = 0;
            this.breakTarget   = null;
            return;
        }
        var t = this.target;
        if (!this.breakTarget || this.breakTarget.wx !== t.wx || this.breakTarget.wy !== t.wy || this.breakTarget.wz !== t.wz) {
            this.breakProgress = 0;
            this.breakTarget = { wx: t.wx, wy: t.wy, wz: t.wz };
        }
        var id = world.getBlock(t.wx, t.wy, t.wz);
        var data = BLOCK_DATA[id];
        if (!data) return;
        var hardness = data.hardness;
        if (hardness === Infinity || hardness === 0) { this.breakProgress = 0; return; }
        this.breakProgress += dt / hardness;
        if (this.breakProgress >= 1) {
            this.breakProgress = 0;
            this.breakTarget = null;
            return true; // signal: block broken
        }
    };

    /** Eat food to restore hunger */
    Player.prototype.eat = function (foodValue) {
        this.hunger = Math.min(this.maxHunger, this.hunger + (foodValue || 4));
    };

    return Player;
}());
