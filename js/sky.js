/**
 * Vinecraft - Sky & Lighting
 * Sun, moon, stars, day/night cycle, and dynamic ambient/directional lights.
 */

var Sky = (function () {
    'use strict';

    var DAY_DURATION   = 600;  // seconds for a full day/night cycle
    var DAY_FRACTION   = 0.6;  // fraction of cycle that is daytime

    function Sky(THREE, scene) {
        this.THREE   = THREE;
        this.scene   = scene;
        this.time    = 0.25; // 0=midnight 0.25=sunrise 0.5=noon 0.75=sunset 1=midnight

        this._buildSky();
        this._buildCelestials();
        this._buildStars();
        this._buildLights();
    }

    Sky.prototype._buildSky = function () {
        var THREE = this.THREE;
        // Large sphere inverted so normals face inward
        var geo = new THREE.SphereGeometry(900, 32, 32);
        var mat = new THREE.MeshBasicMaterial({
            vertexColors: false,
            side: THREE.BackSide,
            color: 0x87CEEB,
            fog: false,
        });
        this.skyDome = new THREE.Mesh(geo, mat);
        this.skyDome.renderOrder = -1;
        this.scene.add(this.skyDome);
    };

    Sky.prototype._buildCelestials = function () {
        var THREE = this.THREE;

        // Sun
        var sunGeo = new THREE.SphereGeometry(30, 16, 16);
        var sunMat = new THREE.MeshBasicMaterial({ color: 0xFFFF88, fog: false });
        this.sun = new THREE.Mesh(sunGeo, sunMat);
        this.scene.add(this.sun);

        // Sun corona
        var coronaGeo = new THREE.SphereGeometry(35, 16, 16);
        var coronaMat = new THREE.MeshBasicMaterial({ color: 0xFFDD44, transparent: true, opacity: 0.3, fog: false });
        this.corona = new THREE.Mesh(coronaGeo, coronaMat);
        this.scene.add(this.corona);

        // Moon
        var moonGeo = new THREE.SphereGeometry(20, 16, 16);
        var moonMat = new THREE.MeshBasicMaterial({ color: 0xDDDDFF, fog: false });
        this.moon = new THREE.Mesh(moonGeo, moonMat);
        this.scene.add(this.moon);
    };

    Sky.prototype._buildStars = function () {
        var THREE = this.THREE;
        var starCount = 2000;
        var positions = new Float32Array(starCount * 3);
        for (var i = 0; i < starCount; i++) {
            var theta = Math.random() * Math.PI * 2;
            var phi   = Math.acos(2 * Math.random() - 1);
            var r = 800;
            positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
            positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i*3+2] = r * Math.cos(phi);
        }
        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        var mat = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 2, fog: false, transparent: true });
        this.stars = new THREE.Points(geo, mat);
        this.scene.add(this.stars);
    };

    Sky.prototype._buildLights = function () {
        var THREE = this.THREE;

        // Ambient light (dims at night)
        this.ambientLight = new THREE.AmbientLight(0x404060, 0.3);
        this.scene.add(this.ambientLight);

        // Directional sun light with shadows
        this.sunLight = new THREE.DirectionalLight(0xFFF8E0, 1.0);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width  = 1024;
        this.sunLight.shadow.mapSize.height = 1024;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far  = 500;
        this.sunLight.shadow.camera.left   = -100;
        this.sunLight.shadow.camera.right  =  100;
        this.sunLight.shadow.camera.top    =  100;
        this.sunLight.shadow.camera.bottom = -100;
        this.scene.add(this.sunLight);

        // Moon (dim blue) light
        this.moonLight = new THREE.DirectionalLight(0x8888FF, 0.1);
        this.scene.add(this.moonLight);

        // Hemisphere sky/ground light
        this.hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x556634, 0.4);
        this.scene.add(this.hemiLight);
    };

    /** t ∈ [0,1] — angle around celestial sphere */
    Sky.prototype._celestialPos = function (t, radius) {
        var angle = t * Math.PI * 2;
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            z: -50,
        };
    };

    Sky.prototype.update = function (dt, playerPos) {
        this.time = (this.time + dt / DAY_DURATION) % 1;
        var t = this.time;

        // Sun at t=0.25 (rise), t=0.5 (noon), t=0.75 (set)
        var sunPos = this._celestialPos(t, 800);
        this.sun.position.set(sunPos.x + playerPos.x, sunPos.y + playerPos.y, sunPos.z + playerPos.z);
        this.corona.position.copy(this.sun.position);

        // Moon is opposite
        var moonPos = this._celestialPos((t + 0.5) % 1, 800);
        this.moon.position.set(moonPos.x + playerPos.x, moonPos.y + playerPos.y, moonPos.z + playerPos.z);

        // Sky dome follows player
        this.skyDome.position.set(playerPos.x, playerPos.y, playerPos.z);
        this.stars.position.set(playerPos.x, playerPos.y, playerPos.z);

        // Sun elevation (0=horizon, 1=zenith)
        var sunElev = Math.sin(t * Math.PI * 2); // -1 to 1

        // ── Colours ──────────────────────────────────────────────────────────
        var dayAmt    = Math.max(0, sunElev);       // 0..1 (daytime)
        var sunsetAmt = Math.max(0, 1 - Math.abs(sunElev) * 3); // sunset/rise
        var nightAmt  = Math.max(0, -sunElev);      // night

        // Sky colour lerp: midnight → sunrise → day → sunset → night
        var skyR, skyG, skyB;
        if (dayAmt > 0.1) {
            // Daytime blue
            skyR = Math.round(50  + dayAmt * 87);
            skyG = Math.round(80  + dayAmt * 126);
            skyB = Math.round(150 + dayAmt * 56);
        } else if (sunsetAmt > 0.1) {
            // Sunset/sunrise orange
            skyR = Math.round(80  + sunsetAmt * 150);
            skyG = Math.round(50  + sunsetAmt * 80);
            skyB = Math.round(50  + sunsetAmt * 50);
        } else {
            // Night dark blue
            skyR = 5;
            skyG = 5;
            skyB = Math.round(20 + nightAmt * 10);
        }

        this.skyDome.material.color.setRGB(skyR/255, skyG/255, skyB/255);

        // Star visibility (only at night)
        this.stars.material.opacity = Math.max(0, nightAmt + sunsetAmt * 0.3);

        // Sun light direction
        this.sunLight.position.copy(this.sun.position).sub(playerPos);
        this.sunLight.intensity = Math.max(0, sunElev * 1.2);
        this.sunLight.color.setHSL(0.09, 0.5 + sunsetAmt * 0.5, 0.9);

        // Moon light
        this.moonLight.position.copy(this.moon.position).sub(playerPos);
        this.moonLight.intensity = Math.max(0, nightAmt * 0.15);

        // Ambient
        this.ambientLight.intensity = 0.1 + dayAmt * 0.35;
        this.hemiLight.intensity    = 0.1 + dayAmt * 0.4;

        // Fog colour matches sky
        if (this.scene.fog) {
            this.scene.fog.color.setRGB(skyR/255, skyG/255, skyB/255);
        }

        return { isDay: sunElev > 0, sunElev: sunElev, skyColor: { r: skyR, g: skyG, b: skyB } };
    };

    /** Format current in-game time as HH:MM */
    Sky.prototype.getTimeString = function () {
        var totalMin = ((this.time + 0.75) % 1) * 24 * 60; // shift so 0.25 = 06:00
        var h = Math.floor(totalMin / 60) % 24;
        var m = Math.floor(totalMin % 60);
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    };

    return Sky;
}());
