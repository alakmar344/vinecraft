/**
 * Vinecraft - Procedural Texture Atlas
 * Generates all block textures on an HTML canvas and exports a THREE.CanvasTexture.
 * Each tile is 16×16 px; the atlas is 256×256 px (16 cols × 16 rows).
 */

var TextureAtlas = (function () {
    'use strict';

    var TILE = 16;   // px per tile
    var COLS = 16;   // tiles across
    var SIZE = TILE * COLS; // 256

    var canvas, ctx, texture;

    // ─── Helpers ────────────────────────────────────────────────────────────

    function tileX(idx) { return (idx % COLS) * TILE; }
    function tileY(idx) { return Math.floor(idx / COLS) * TILE; }

    function uv(idx) {
        var col = idx % COLS;
        var row = Math.floor(idx / COLS);
        var s = 1 / COLS;
        return { u0: col * s, v0: row * s, u1: (col + 1) * s, v1: (row + 1) * s };
    }

    /** Fill tile with solid colour */
    function fill(idx, color) {
        ctx.fillStyle = color;
        ctx.fillRect(tileX(idx), tileY(idx), TILE, TILE);
    }

    /** Add pixelart noise variation to a tile */
    function noiseOver(idx, r, g, b, strength) {
        var tx = tileX(idx), ty = tileY(idx);
        strength = strength || 20;
        for (var py = 0; py < TILE; py++) {
            for (var px = 0; px < TILE; px++) {
                var v = (Math.random() - 0.5) * strength;
                var cr = Math.max(0, Math.min(255, r + v));
                var cg = Math.max(0, Math.min(255, g + v));
                var cb = Math.max(0, Math.min(255, b + v));
                ctx.fillStyle = 'rgb(' + Math.round(cr) + ',' + Math.round(cg) + ',' + Math.round(cb) + ')';
                ctx.fillRect(tx + px, ty + py, 1, 1);
            }
        }
    }

    /** Draw a dot pattern (for ores) */
    function dotPattern(idx, baseR, baseG, baseB, dotR, dotG, dotB, count) {
        noiseOver(idx, baseR, baseG, baseB, 15);
        var tx = tileX(idx), ty = tileY(idx);
        count = count || 6;
        for (var i = 0; i < count; i++) {
            var px = 2 + Math.floor(Math.random() * (TILE - 4));
            var py = 2 + Math.floor(Math.random() * (TILE - 4));
            ctx.fillStyle = 'rgb(' + dotR + ',' + dotG + ',' + dotB + ')';
            ctx.fillRect(tx + px, ty + py, 2, 2);
            ctx.fillStyle = 'rgb(' + Math.round(dotR * 0.7) + ',' + Math.round(dotG * 0.7) + ',' + Math.round(dotB * 0.7) + ')';
            ctx.fillRect(tx + px + 1, ty + py + 1, 1, 1);
        }
    }

    /** Draw a grid/brick pattern */
    function brickPattern(idx, r1, g1, b1, r2, g2, b2, bw, bh, offset) {
        var tx = tileX(idx), ty = tileY(idx);
        for (var py = 0; py < TILE; py++) {
            var row = Math.floor(py / bh);
            var off = (row % 2 === 0) ? 0 : offset;
            for (var px = 0; px < TILE; px++) {
                var brickX = Math.floor((px + off) / bw) % bw;
                var isEdge = ((px + off) % bw === 0) || (py % bh === 0);
                var v = (Math.random() - 0.5) * 15;
                if (isEdge) {
                    ctx.fillStyle = 'rgb(' + Math.round(r2+v) + ',' + Math.round(g2+v) + ',' + Math.round(b2+v) + ')';
                } else {
                    ctx.fillStyle = 'rgb(' + Math.round(r1+v) + ',' + Math.round(g1+v) + ',' + Math.round(b1+v) + ')';
                }
                ctx.fillRect(tx + px, ty + py, 1, 1);
            }
        }
    }

    /** Draw ring pattern for log top */
    function ringPattern(idx, r, g, b) {
        var tx = tileX(idx), ty = tileY(idx);
        fill(idx, 'rgb(' + r + ',' + g + ',' + b + ')');
        var cx = tx + 8, cy = ty + 8;
        ctx.strokeStyle = 'rgba(' + Math.round(r*0.75) + ',' + Math.round(g*0.75) + ',' + Math.round(b*0.75) + ',0.8)';
        ctx.lineWidth = 1;
        for (var rad = 2; rad < 8; rad += 2) {
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    /** Draw leaf-like dots */
    function leafPattern(idx, r, g, b) {
        var tx = tileX(idx), ty = tileY(idx);
        fill(idx, 'rgba(0,0,0,0)');
        ctx.clearRect(tx, ty, TILE, TILE);
        for (var py = 0; py < TILE; py++) {
            for (var px = 0; px < TILE; px++) {
                if (Math.random() < 0.75) {
                    var v = (Math.random() - 0.5) * 30;
                    ctx.fillStyle = 'rgb(' + Math.round(r+v) + ',' + Math.round(g+v) + ',' + Math.round(b+v) + ')';
                    ctx.fillRect(tx + px, ty + py, 1, 1);
                }
            }
        }
    }

    /** Crystal tile with shimmery facets */
    function crystalPattern(idx, r, g, b) {
        noiseOver(idx, r, g, b, 40);
        var tx = tileX(idx), ty = tileY(idx);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        for (var i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(tx + Math.random() * TILE, ty + Math.random() * TILE);
            ctx.lineTo(tx + Math.random() * TILE, ty + Math.random() * TILE);
            ctx.stroke();
        }
    }

    /** Wavy water tile */
    function waterPattern(idx) {
        var tx = tileX(idx), ty = tileY(idx);
        for (var py = 0; py < TILE; py++) {
            for (var px = 0; px < TILE; px++) {
                var wave = Math.sin((px + py) * 0.8) * 10;
                var r = Math.round(30 + wave);
                var g = Math.round(80 + wave);
                var b = Math.round(200 + wave);
                ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
                ctx.fillRect(tx + px, ty + py, 1, 1);
            }
        }
    }

    /** Glowing tile with bright center */
    function glowPattern(idx, r, g, b) {
        var tx = tileX(idx), ty = tileY(idx);
        var cx = tx + 8, cy = ty + 8;
        var gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10);
        gradient.addColorStop(0, 'rgb(' + r + ',' + g + ',' + b + ')');
        gradient.addColorStop(1, 'rgb(' + Math.round(r*0.4) + ',' + Math.round(g*0.4) + ',' + Math.round(b*0.4) + ')');
        ctx.fillStyle = gradient;
        ctx.fillRect(tx, ty, TILE, TILE);
    }

    // ─── Tile Generators ────────────────────────────────────────────────────

    function buildAtlas() {
        canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // 0: Grass top
        noiseOver(0, 90, 150, 40, 20);
        var tx0 = tileX(0), ty0 = tileY(0);
        for (var i = 0; i < 8; i++) {
            ctx.fillStyle = 'rgba(60,110,20,0.5)';
            ctx.fillRect(tx0 + Math.floor(Math.random()*14), ty0 + Math.floor(Math.random()*14), 2, 2);
        }

        // 1: Grass side (dirt with grass strip on top)
        noiseOver(1, 130, 90, 50, 20);
        ctx.fillStyle = 'rgba(75,130,35,0.9)';
        ctx.fillRect(tileX(1), tileY(1), TILE, 4);

        // 2: Dirt
        noiseOver(2, 135, 95, 55, 20);

        // 3: Stone
        noiseOver(3, 125, 125, 125, 20);
        brickPattern(3, 125, 125, 125, 100, 100, 100, 8, 4, 4);

        // 4: Sand
        noiseOver(4, 220, 200, 140, 15);

        // 5: Gravel
        noiseOver(5, 130, 128, 128, 25);
        for (var i = 0; i < 12; i++) {
            var gx = tileX(5) + Math.floor(Math.random() * 14);
            var gy = tileY(5) + Math.floor(Math.random() * 14);
            ctx.fillStyle = 'rgba(100,100,100,0.5)';
            ctx.fillRect(gx, gy, 2, 2);
        }

        // 6: Water
        waterPattern(6);

        // 7: Log top
        ringPattern(7, 180, 130, 70);

        // 8: Log side (bark)
        brickPattern(8, 160, 110, 55, 110, 75, 35, 4, 16, 0);

        // 9: Leaves
        leafPattern(9, 55, 120, 35);

        // 10: Glass
        fill(10, 'rgba(190,230,255,0.3)');
        ctx.strokeStyle = 'rgba(180,220,250,0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(tileX(10), tileY(10), TILE, TILE);

        // 11: Planks
        brickPattern(11, 180, 140, 80, 140, 100, 50, 16, 4, 8);

        // 12: Brick
        brickPattern(12, 190, 80, 60, 160, 140, 120, 8, 4, 4);

        // 13: Cobblestone
        noiseOver(13, 110, 110, 110, 25);
        for (var i = 0; i < 6; i++) {
            ctx.strokeStyle = 'rgba(70,70,70,0.7)';
            ctx.beginPath();
            var bx = tileX(13), by = tileY(13);
            ctx.arc(bx + 3 + Math.floor(Math.random()*10), by + 3 + Math.floor(Math.random()*10), 2 + Math.random()*2, 0, Math.PI*2);
            ctx.stroke();
        }

        // 14: Obsidian
        noiseOver(14, 25, 20, 35, 10);
        crystalPattern(14, 25, 20, 35);

        // 15: Bedrock
        noiseOver(15, 55, 55, 55, 10);
        for (var i = 0; i < 10; i++) {
            ctx.fillStyle = 'rgba(30,30,30,0.8)';
            ctx.fillRect(tileX(15) + Math.floor(Math.random()*14), tileY(15) + Math.floor(Math.random()*14), 2, 2);
        }

        // 16: Coal Ore
        dotPattern(16, 120, 120, 120, 20, 20, 20, 6);

        // 17: Iron Ore
        dotPattern(17, 120, 120, 120, 200, 160, 120, 6);

        // 18: Gold Ore
        dotPattern(18, 120, 120, 120, 250, 200, 30, 7);

        // 19: Diamond Ore
        dotPattern(19, 120, 120, 120, 50, 220, 230, 6);

        // 20: Emerald Ore
        dotPattern(20, 120, 120, 120, 20, 180, 60, 5);

        // 21: Snow
        noiseOver(21, 240, 245, 255, 10);

        // 22: Ice
        noiseOver(22, 160, 210, 240, 15);
        ctx.strokeStyle = 'rgba(200,240,255,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(tileX(22), tileY(22), TILE, TILE);

        // 23: Cactus top
        noiseOver(23, 60, 130, 40, 15);

        // 24: Cactus side
        brickPattern(24, 60, 130, 40, 45, 100, 30, 16, 2, 0);

        // 25: Clay
        noiseOver(25, 160, 165, 185, 15);

        // 26: Marble
        noiseOver(26, 230, 225, 220, 10);
        for (var i = 0; i < 5; i++) {
            ctx.strokeStyle = 'rgba(200,195,190,0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            var mx = tileX(26), my = tileY(26);
            ctx.moveTo(mx + Math.random()*16, my + Math.random()*16);
            ctx.bezierCurveTo(mx + Math.random()*16, my + Math.random()*16, mx + Math.random()*16, my + Math.random()*16, mx + Math.random()*16, my + Math.random()*16);
            ctx.stroke();
        }

        // 27: Limestone
        noiseOver(27, 195, 185, 160, 15);

        // 28: Basalt
        noiseOver(28, 60, 60, 70, 10);
        for (var i = 0; i < 6; i++) {
            ctx.fillStyle = 'rgba(40,40,50,0.8)';
            ctx.fillRect(tileX(28) + Math.floor(Math.random()*14), tileY(28) + Math.floor(Math.random()*14), 2, 2);
        }

        // 29: Crystal
        crystalPattern(29, 120, 200, 255);

        // 30: Sandstone top
        noiseOver(30, 210, 195, 140, 10);

        // 31: Sandstone side
        brickPattern(31, 210, 195, 140, 190, 170, 110, 16, 5, 0);

        // 32: Glowstone
        glowPattern(32, 255, 225, 140);

        // 33: Mossy Stone
        noiseOver(33, 110, 130, 90, 20);
        brickPattern(33, 110, 130, 90, 85, 110, 70, 8, 4, 4);

        // 34: Redstone Ore
        dotPattern(34, 120, 120, 120, 220, 30, 30, 7);

        // 35: Lapis Ore
        dotPattern(35, 120, 120, 120, 30, 60, 200, 6);

        // 36: Netherrack
        noiseOver(36, 110, 35, 35, 20);

        // 37: Soul Sand
        noiseOver(37, 80, 65, 50, 20);
        for (var i = 0; i < 4; i++) {
            var sx = tileX(37) + 2 + Math.floor(Math.random()*12);
            var sy = tileY(37) + 2 + Math.floor(Math.random()*12);
            ctx.fillStyle = 'rgba(30,20,15,0.8)';
            ctx.fillRect(sx, sy, 3, 3);
        }

        // 38: Magma
        glowPattern(38, 200, 80, 20);
        noiseOver(38, 180, 60, 15, 30);

        // 39: Prismarine
        noiseOver(39, 65, 145, 130, 20);
        crystalPattern(39, 65, 145, 130);

        // 40: Sea Lantern
        glowPattern(40, 170, 220, 200);

        // 41: Terracotta
        noiseOver(41, 170, 100, 70, 20);

        // 42: Pumpkin top
        noiseOver(42, 195, 135, 30, 15);

        // 43: Pumpkin side
        noiseOver(43, 200, 120, 25, 15);
        for (var i = 0; i < 8; i++) {
            ctx.fillStyle = 'rgba(160,90,15,0.6)';
            ctx.fillRect(tileX(43) + Math.floor(Math.random()*2) + i*2, tileY(43), 1, TILE);
        }

        // 44: Melon top
        noiseOver(44, 90, 150, 60, 15);

        // 45: Melon side
        noiseOver(45, 80, 160, 60, 15);
        for (var i = 0; i < 8; i++) {
            ctx.fillStyle = 'rgba(60,120,40,0.5)';
            ctx.fillRect(tileX(45) + Math.floor(Math.random()*2) + i*2, tileY(45), 1, TILE);
        }

        // 46: TNT top
        noiseOver(46, 180, 60, 60, 10);
        ctx.fillStyle = '#fff';
        ctx.font = '6px monospace';
        ctx.fillText('TNT', tileX(46)+2, tileY(46)+10);

        // 47: TNT side
        noiseOver(47, 60, 60, 60, 10);
        var tn = tileX(47), ty47 = tileY(47);
        ctx.fillStyle = '#cc3333';
        ctx.fillRect(tn+2, ty47+4, 12, 8);
        ctx.fillStyle = '#fff';
        ctx.font = '5px monospace';
        ctx.fillText('TNT', tn+3, ty47+10);

        // 48: TNT bottom (same as top)
        noiseOver(48, 180, 60, 60, 10);

        // 49: Bookshelf side
        noiseOver(49, 160, 120, 70, 10);
        ctx.fillStyle = 'rgba(80,50,20,0.8)';
        ctx.fillRect(tileX(49), tileY(49)+3, TILE, 2);
        ctx.fillRect(tileX(49), tileY(49)+10, TILE, 2);
        ctx.fillStyle = 'rgba(120,80,40,0.9)';
        for (var i = 0; i < 4; i++) {
            ctx.fillStyle = ['#aa4444','#4444aa','#44aa44','#aaaa44'][i];
            ctx.fillRect(tileX(49)+1+i*4, tileY(49)+4, 3, 6);
        }

        // 50: Mycelium top
        noiseOver(50, 100, 80, 110, 20);
        leafPattern(50, 130, 100, 140);

        // 51: Mycelium side
        noiseOver(51, 130, 95, 55, 15);
        ctx.fillStyle = 'rgba(100,80,110,0.8)';
        ctx.fillRect(tileX(51), tileY(51), TILE, 4);

        // 52: Nether Brick
        brickPattern(52, 80, 30, 30, 55, 15, 15, 8, 4, 4);

        // Fill remaining tiles with a grey placeholder
        for (var i = 53; i < COLS * COLS; i++) {
            fill(i, 'rgb(80,80,80)');
        }
    }

    /** Returns UV coordinates {u0,v0,u1,v1} for tile index */
    function getTileUV(tileIdx) {
        return uv(tileIdx);
    }

    /** Call once to build; returns THREE.CanvasTexture */
    function build(THREE) {
        buildAtlas();
        texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    /** Returns the raw canvas (for debugging) */
    function getCanvas() { return canvas; }

    return { build: build, getTileUV: getTileUV, getCanvas: getCanvas, TILE: TILE, COLS: COLS };
}());
