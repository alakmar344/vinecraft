/**
 * Vinecraft - Weather System
 * Rain, snow, thunderstorms, wind effects, and temperature.
 */

var Weather = (function () {
    'use strict';

    var WEATHER = {
        CLEAR:   'clear',
        RAIN:    'rain',
        SNOW:    'snow',
        STORM:   'storm',
        BLIZZARD:'blizzard',
    };

    var PARTICLE_COUNT = 1500;

    function Weather(THREE, scene) {
        this.THREE   = THREE;
        this.scene   = scene;
        this.current = WEATHER.CLEAR;
        this.intensity = 0;
        this._timer  = 0;
        this._nextChange = 60 + Math.random() * 120; // seconds until weather change
        this._lightningTimer = 0;
        this._lightningFlash = null;
        this._lightningFlashTimer = 0;

        this._buildParticles();
        this._buildLightning();
    }

    Weather.TYPES = WEATHER;

    Weather.prototype._buildParticles = function () {
        var THREE = this.THREE;
        var positions = new Float32Array(PARTICLE_COUNT * 3);
        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        var mat = new THREE.PointsMaterial({
            color: 0xAAAAAA,
            size: 0.15,
            transparent: true,
            opacity: 0.6,
            fog: false,
            depthWrite: false,
        });
        this.particles = new THREE.Points(geo, mat);
        this.particles.visible = false;
        this.scene.add(this.particles);
        this._initParticlePositions();
    };

    Weather.prototype._initParticlePositions = function () {
        var buf = this.particles.geometry.attributes.position.array;
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            buf[i*3]   = (Math.random() - 0.5) * 60;
            buf[i*3+1] = Math.random() * 30;
            buf[i*3+2] = (Math.random() - 0.5) * 60;
        }
        this.particles.geometry.attributes.position.needsUpdate = true;
    };

    Weather.prototype._buildLightning = function () {
        var THREE = this.THREE;
        this._lightningLight = new THREE.PointLight(0xBBBBFF, 0, 500);
        this.scene.add(this._lightningLight);
    };

    Weather.prototype.setWeather = function (type, intensity) {
        this.current   = type;
        this.intensity = intensity || 1;
        this.particles.visible = (type !== WEATHER.CLEAR);

        switch (type) {
            case WEATHER.RAIN:
                this.particles.material.color.setHex(0x8888AA);
                this.particles.material.size = 0.1;
                break;
            case WEATHER.SNOW:
            case WEATHER.BLIZZARD:
                this.particles.material.color.setHex(0xEEEEFF);
                this.particles.material.size = 0.25;
                break;
            case WEATHER.STORM:
                this.particles.material.color.setHex(0x6666AA);
                this.particles.material.size = 0.12;
                break;
            default:
                this.particles.visible = false;
                break;
        }
        this.particles.material.opacity = 0.5 + intensity * 0.3;
    };

    Weather.prototype._pickRandomWeather = function (isDay, temperature) {
        var r = Math.random();
        if (r < 0.55) return { type: WEATHER.CLEAR, intensity: 0 };
        if (temperature < -0.2) {
            if (r < 0.75) return { type: WEATHER.SNOW,    intensity: 0.7 };
            return { type: WEATHER.BLIZZARD, intensity: 1.0 };
        }
        if (r < 0.75) return { type: WEATHER.RAIN,  intensity: 0.7 };
        return { type: WEATHER.STORM, intensity: 1.0 };
    };

    Weather.prototype.update = function (dt, playerPos, skyInfo) {
        this._timer += dt;
        if (this._timer > this._nextChange) {
            this._timer = 0;
            this._nextChange = 60 + Math.random() * 240;
            var temp = Noise ? Noise.noise2(playerPos.x * 0.0008 + 1000, playerPos.z * 0.0008 + 1000) : 0;
            var next = this._pickRandomWeather(skyInfo && skyInfo.isDay, temp);
            this.setWeather(next.type, next.intensity);
        }

        if (this.current === WEATHER.CLEAR) return;

        // Move particles: rain falls, snow drifts
        var buf = this.particles.geometry.attributes.position.array;
        var windX = this.current === WEATHER.BLIZZARD ? 2.0 : 0.3;
        var fallSpeed = this.current === WEATHER.SNOW || this.current === WEATHER.BLIZZARD ? 2 : 12;

        for (var i = 0; i < PARTICLE_COUNT; i++) {
            buf[i*3]   += windX * dt;
            buf[i*3+1] -= fallSpeed * dt;
            buf[i*3+2] += (Math.random() - 0.5) * 0.2;

            // Reset when below player
            if (buf[i*3+1] < playerPos.y - 5) {
                buf[i*3]   = playerPos.x + (Math.random() - 0.5) * 60;
                buf[i*3+1] = playerPos.y + 25 + Math.random() * 10;
                buf[i*3+2] = playerPos.z + (Math.random() - 0.5) * 60;
            }
        }
        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particles.position.set(0, 0, 0);

        // Lightning during storms
        if (this.current === WEATHER.STORM) {
            this._lightningTimer -= dt;
            if (this._lightningTimer <= 0) {
                this._lightningTimer = 3 + Math.random() * 8;
                this._triggerLightning(playerPos);
            }
            if (this._lightningFlashTimer > 0) {
                this._lightningFlashTimer -= dt;
                this._lightningLight.intensity = this._lightningFlashTimer > 0 ? 8 : 0;
            }
        } else {
            this._lightningLight.intensity = 0;
        }
    };

    Weather.prototype._triggerLightning = function (playerPos) {
        var lx = playerPos.x + (Math.random() - 0.5) * 100;
        var lz = playerPos.z + (Math.random() - 0.5) * 100;
        this._lightningLight.position.set(lx, 120, lz);
        this._lightningLight.intensity = 8;
        this._lightningFlashTimer = 0.2;
        // Thunder sound simulation via screen flash done by UI
        if (typeof UI !== 'undefined') UI.flashScreen('rgba(200,220,255,0.3)', 0.15);
    };

    /** Returns fog density based on weather */
    Weather.prototype.getFogDensity = function () {
        switch (this.current) {
            case WEATHER.RAIN:     return 0.012;
            case WEATHER.STORM:    return 0.018;
            case WEATHER.SNOW:     return 0.015;
            case WEATHER.BLIZZARD: return 0.030;
            default:               return 0.006;
        }
    };

    return Weather;
}());
