/**
 * Vinecraft - World Generation
 * Handles terrain, biomes, caves, trees, and chunk management.
 */

var World = (function () {
    'use strict';

    var SEA_LEVEL = 62;

    // ─── Biome IDs ──────────────────────────────────────────────────────────
    var BIOME = {
        PLAINS:    0,
        FOREST:    1,
        DESERT:    2,
        MOUNTAINS: 3,
        OCEAN:     4,
        TUNDRA:    5,
        JUNGLE:    6,
        SAVANNA:   7,
        SWAMP:     8,
        MUSHROOM:  9,
    };

    function World(THREE, scene, atlasMaterial, transparentMaterial) {
        this.THREE = THREE;
        this.scene = scene;
        this.atlasMaterial = atlasMaterial;
        this.transparentMaterial = transparentMaterial;
        this.chunks = {};     // key = "cx,cz"
        this.seed = Math.floor(Math.random() * 1000000);
        Noise.seed(this.seed);
        this.pendingBuild = []; // queue of chunks needing mesh rebuild
    }

    World.SEA_LEVEL = SEA_LEVEL;

    // ─── Noise helpers ───────────────────────────────────────────────────────

    World.prototype._height = function (wx, wz) {
        var scale = 0.003;
        var h = Noise.fbm2(wx * scale, wz * scale, 6, 0.5, 2.0);
        // mountain amplifier
        var ridges = Noise.fbm2(wx * scale * 0.5 + 500, wz * scale * 0.5 + 500, 4, 0.5, 2.0);
        ridges = Math.abs(ridges);
        h = h * 0.6 + ridges * 0.4;
        // Map to block height
        return Math.round(SEA_LEVEL + h * 40);
    };

    World.prototype._temperature = function (wx, wz) {
        return Noise.noise2(wx * 0.0008 + 1000, wz * 0.0008 + 1000);
    };

    World.prototype._humidity = function (wx, wz) {
        return Noise.noise2(wx * 0.0008 + 2000, wz * 0.0008 + 2000);
    };

    World.prototype._getBiome = function (wx, wz, surfHeight) {
        var temp = this._temperature(wx, wz);
        var humid = this._humidity(wx, wz);
        if (surfHeight < SEA_LEVEL - 2) return BIOME.OCEAN;
        if (temp > 0.4 && humid < -0.2) return BIOME.DESERT;
        if (temp > 0.4 && humid > 0.4)  return BIOME.JUNGLE;
        if (temp > 0.2 && humid > 0.0)  return BIOME.FOREST;
        if (temp > 0.1 && humid < 0.0)  return BIOME.SAVANNA;
        if (temp < -0.3 && humid > 0.2) return BIOME.TUNDRA;
        if (temp < -0.2)                return BIOME.MOUNTAINS;
        if (humid > 0.5)                return BIOME.SWAMP;
        if (Noise.noise2(wx * 0.001 + 5000, wz * 0.001 + 5000) > 0.6) return BIOME.MUSHROOM;
        return BIOME.PLAINS;
    };

    World.prototype._caveNoise = function (wx, wy, wz) {
        var s = 0.05;
        var n1 = Noise.noise3(wx * s, wy * s, wz * s);
        var n2 = Noise.noise3(wx * s + 100, wy * s + 100, wz * s + 100);
        return n1 * n1 + n2 * n2;
    };

    // ─── Generation ──────────────────────────────────────────────────────────

    World.prototype._generateColumn = function (chunk, lx, lz) {
        var CW = Chunk.WIDTH, CH = Chunk.HEIGHT;
        var wx = chunk.cx * CW + lx;
        var wz = chunk.cz * CW + lz;
        var surfH = Math.min(CH - 5, Math.max(2, this._height(wx, wz)));
        var biome = this._getBiome(wx, wz, surfH);

        // Bedrock layer (y=0..3 with decreasing probability)
        for (var y = 0; y < 5; y++) {
            if (y < 2 || Math.random() < (5 - y) / 5)
                chunk.setBlock(lx, y, lz, BLOCK.BEDROCK);
        }

        // Stone base up to surfH - 4
        for (var y = 5; y < surfH - 3; y++) {
            var blockId = BLOCK.STONE;

            // Ore distribution
            var rand = Math.random();
            if (y < 20 && rand < 0.01)       blockId = BLOCK.DIAMOND_ORE;
            else if (y < 30 && rand < 0.015) blockId = BLOCK.GOLD_ORE;
            else if (rand < 0.03)             blockId = BLOCK.IRON_ORE;
            else if (rand < 0.04)             blockId = BLOCK.COAL_ORE;
            else if (y < 25 && rand < 0.005) blockId = BLOCK.REDSTONE_ORE;
            else if (y < 35 && rand < 0.005) blockId = BLOCK.LAPIS_ORE;
            else if (y < 15 && rand < 0.008) blockId = BLOCK.EMERALD_ORE;

            // Geological variety: marble, limestone, basalt bands
            var geoNoise = Noise.noise3(wx * 0.02, y * 0.05, wz * 0.02);
            if (blockId === BLOCK.STONE) {
                if (geoNoise > 0.4)        blockId = BLOCK.MARBLE;
                else if (geoNoise < -0.4)  blockId = BLOCK.BASALT;
                else if (geoNoise > 0.2)   blockId = BLOCK.LIMESTONE;
            }

            // Cave carving
            if (y > 5 && y < surfH - 5) {
                var caveVal = this._caveNoise(wx, y, wz);
                if (caveVal < 0.025) {
                    blockId = BLOCK.AIR;
                    // Crystal formations in caves
                    if (Math.random() < 0.003) blockId = BLOCK.CRYSTAL;
                }
            }

            chunk.setBlock(lx, y, lz, blockId);
        }

        // Surface + sub-surface biome specific
        if (surfH < SEA_LEVEL) {
            // Underwater fill
            for (var y = surfH - 1; y <= SEA_LEVEL; y++) {
                if (y < surfH - 1)      chunk.setBlock(lx, y, lz, BLOCK.SAND);
                else if (y < surfH + 1) chunk.setBlock(lx, y, lz, BLOCK.SAND);
                else                    chunk.setBlock(lx, y, lz, BLOCK.WATER);
            }
            // Clay pockets on ocean floor
            if (Math.random() < 0.1) chunk.setBlock(lx, surfH - 1, lz, BLOCK.CLAY);
        } else {
            switch (biome) {
                case BIOME.DESERT:
                    for (var y = surfH - 4; y < surfH; y++) chunk.setBlock(lx, y, lz, BLOCK.SAND);
                    chunk.setBlock(lx, surfH, lz, BLOCK.SAND);
                    if (surfH - 5 > 5) chunk.setBlock(lx, surfH - 5, lz, BLOCK.SANDSTONE);
                    break;
                case BIOME.TUNDRA:
                    chunk.setBlock(lx, surfH - 1, lz, BLOCK.DIRT);
                    chunk.setBlock(lx, surfH,     lz, BLOCK.SNOW);
                    break;
                case BIOME.MOUNTAINS:
                    // Rocky peaks
                    chunk.setBlock(lx, surfH, lz, surfH > 90 ? BLOCK.SNOW : BLOCK.STONE);
                    if (surfH > 85) chunk.setBlock(lx, surfH - 1, lz, BLOCK.STONE);
                    else { chunk.setBlock(lx, surfH - 1, lz, BLOCK.DIRT); chunk.setBlock(lx, surfH, lz, BLOCK.GRASS); }
                    break;
                case BIOME.OCEAN:
                    for (var y = surfH - 3; y <= surfH; y++) chunk.setBlock(lx, y, lz, BLOCK.SAND);
                    for (var y = surfH + 1; y <= SEA_LEVEL; y++) chunk.setBlock(lx, y, lz, BLOCK.WATER);
                    break;
                case BIOME.SWAMP:
                    chunk.setBlock(lx, surfH - 1, lz, BLOCK.DIRT);
                    chunk.setBlock(lx, surfH,     lz, Math.random() < 0.3 ? BLOCK.WATER : BLOCK.GRASS);
                    if (Math.random() < 0.05) chunk.setBlock(lx, surfH - 2, lz, BLOCK.CLAY);
                    break;
                case BIOME.MUSHROOM:
                    chunk.setBlock(lx, surfH - 1, lz, BLOCK.DIRT);
                    chunk.setBlock(lx, surfH,     lz, BLOCK.MYCELIUM);
                    break;
                default:
                    // Grass biomes
                    chunk.setBlock(lx, surfH - 3, lz, BLOCK.DIRT);
                    chunk.setBlock(lx, surfH - 2, lz, BLOCK.DIRT);
                    chunk.setBlock(lx, surfH - 1, lz, BLOCK.DIRT);
                    chunk.setBlock(lx, surfH,     lz, BLOCK.GRASS);
                    break;
            }
        }

        // Gravel pockets near surface
        if (Math.random() < 0.03 && surfH > SEA_LEVEL) {
            for (var y = surfH - 8; y < surfH - 5; y++) {
                if (chunk.getBlock(lx, y, lz) === BLOCK.STONE) chunk.setBlock(lx, y, lz, BLOCK.GRAVEL);
            }
        }

        return { surfH: surfH, biome: biome };
    };

    World.prototype._generateTrees = function (chunk, surfaces) {
        var CW = Chunk.WIDTH;
        for (var lz = 2; lz < CW - 2; lz++) {
            for (var lx = 2; lx < CW - 2; lx++) {
                var info = surfaces[lz * CW + lx];
                if (!info) continue;
                var surfH = info.surfH, biome = info.biome;
                var wx = chunk.cx * CW + lx;
                var wz = chunk.cz * CW + lz;

                // Tree noise: random but stable
                var treeVal = Noise.noise2(wx * 0.3, wz * 0.3);

                switch (biome) {
                    case BIOME.FOREST:
                        if (treeVal > 0.35 && surfH > SEA_LEVEL) this._placeOakTree(chunk, lx, surfH + 1, lz, 5 + Math.floor(Math.random() * 3));
                        break;
                    case BIOME.PLAINS:
                        if (treeVal > 0.55 && surfH > SEA_LEVEL) this._placeOakTree(chunk, lx, surfH + 1, lz, 4 + Math.floor(Math.random() * 2));
                        break;
                    case BIOME.JUNGLE:
                        if (treeVal > 0.2 && surfH > SEA_LEVEL) this._placeOakTree(chunk, lx, surfH + 1, lz, 7 + Math.floor(Math.random() * 5));
                        break;
                    case BIOME.DESERT:
                        if (treeVal > 0.6 && surfH > SEA_LEVEL) this._placeCactus(chunk, lx, surfH + 1, lz);
                        break;
                    case BIOME.SAVANNA:
                        if (treeVal > 0.55 && surfH > SEA_LEVEL) this._placeOakTree(chunk, lx, surfH + 1, lz, 4);
                        break;
                    case BIOME.TUNDRA:
                        if (treeVal > 0.55 && surfH > SEA_LEVEL) this._placeOakTree(chunk, lx, surfH + 1, lz, 3);
                        break;
                    case BIOME.MUSHROOM:
                        if (treeVal > 0.5 && surfH > SEA_LEVEL) this._placeMushroomTree(chunk, lx, surfH + 1, lz);
                        break;
                }

                // Pumpkins / melons in plains/forest
                if ((biome === BIOME.PLAINS || biome === BIOME.FOREST) && treeVal < -0.6 && surfH > SEA_LEVEL) {
                    chunk.setBlock(lx, surfH + 1, lz, Math.random() < 0.5 ? BLOCK.PUMPKIN : BLOCK.MELON);
                }
            }
        }
    };

    World.prototype._placeOakTree = function (chunk, x, y, z, height) {
        var CH = Chunk.HEIGHT;
        if (y + height >= CH) return;
        // Trunk
        for (var i = 0; i < height; i++) {
            chunk.setBlock(x, y + i, z, BLOCK.LOG);
        }
        // Leaf sphere
        var leafY = y + height - 2;
        var rad = 2;
        for (var dy = -1; dy <= 2; dy++) {
            var r = (dy === 2 || dy === -1) ? 1 : rad;
            for (var dz = -r; dz <= r; dz++) {
                for (var dx = -r; dx <= r; dx++) {
                    if (dx * dx + dz * dz <= r * r + 0.5) {
                        var lx2 = x + dx, ly2 = leafY + dy, lz2 = z + dz;
                        if (lx2 >= 0 && lx2 < Chunk.WIDTH && lz2 >= 0 && lz2 < Chunk.DEPTH && ly2 < CH) {
                            if (chunk.getBlock(lx2, ly2, lz2) === BLOCK.AIR) {
                                chunk.setBlock(lx2, ly2, lz2, BLOCK.LEAVES);
                            }
                        }
                    }
                }
            }
        }
    };

    World.prototype._placeCactus = function (chunk, x, y, z) {
        var h = 2 + Math.floor(Math.random() * 3);
        for (var i = 0; i < h; i++) chunk.setBlock(x, y + i, z, BLOCK.CACTUS);
    };

    World.prototype._placeMushroomTree = function (chunk, x, y, z) {
        var h = 5 + Math.floor(Math.random() * 3);
        for (var i = 0; i < h; i++) chunk.setBlock(x, y + i, z, BLOCK.LOG);
        // Mushroom cap
        for (var dz = -2; dz <= 2; dz++) {
            for (var dx = -2; dx <= 2; dx++) {
                if (Math.abs(dx) + Math.abs(dz) <= 3) {
                    var lx2 = x + dx, lz2 = z + dz;
                    if (lx2 >= 0 && lx2 < Chunk.WIDTH && lz2 >= 0 && lz2 < Chunk.DEPTH) {
                        chunk.setBlock(lx2, y + h, lz2, BLOCK.MYCELIUM);
                        chunk.setBlock(lx2, y + h - 1, lz2, BLOCK.MYCELIUM);
                    }
                }
            }
        }
    };

    // ─── Chunk management ────────────────────────────────────────────────────

    World.prototype._chunkKey = function (cx, cz) { return cx + ',' + cz; };

    World.prototype.getChunk = function (cx, cz) {
        return this.chunks[this._chunkKey(cx, cz)] || null;
    };

    World.prototype._generateChunk = function (cx, cz) {
        var chunk = new Chunk(cx, cz, this);
        var CW = Chunk.WIDTH;
        var surfaces = new Array(CW * CW);

        // First pass: terrain
        for (var lz = 0; lz < CW; lz++) {
            for (var lx = 0; lx < CW; lx++) {
                surfaces[lz * CW + lx] = this._generateColumn(chunk, lx, lz);
            }
        }

        // Second pass: trees & decorations
        this._generateTrees(chunk, surfaces);

        this.chunks[this._chunkKey(cx, cz)] = chunk;
        return chunk;
    };

    World.prototype.ensureChunk = function (cx, cz) {
        var key = this._chunkKey(cx, cz);
        if (!this.chunks[key]) {
            this._generateChunk(cx, cz);
        }
        return this.chunks[key];
    };

    /** Returns block at world coordinate */
    World.prototype.getBlock = function (wx, wy, wz) {
        var CW = Chunk.WIDTH, CD = Chunk.DEPTH;
        var cx = Math.floor(wx / CW);
        var cz = Math.floor(wz / CD);
        var chunk = this.getChunk(cx, cz);
        if (!chunk) return BLOCK.AIR;
        var lx = wx - cx * CW;
        var lz = wz - cz * CD;
        return chunk.getBlock(lx, wy, lz);
    };

    /** Sets block at world coordinate; marks chunk + neighbours dirty */
    World.prototype.setBlock = function (wx, wy, wz, id) {
        var CW = Chunk.WIDTH, CD = Chunk.DEPTH;
        var cx = Math.floor(wx / CW);
        var cz = Math.floor(wz / CD);
        var chunk = this.getChunk(cx, cz);
        if (!chunk) return;
        var lx = wx - cx * CW;
        var lz = wz - cz * CD;
        chunk.setBlock(lx, wy, lz, id);
        // Mark adjacent chunks dirty if block is on boundary
        if (lx === 0)      this._markDirty(cx - 1, cz);
        if (lx === CW - 1) this._markDirty(cx + 1, cz);
        if (lz === 0)      this._markDirty(cx, cz - 1);
        if (lz === CD - 1) this._markDirty(cx, cz + 1);
    };

    World.prototype._markDirty = function (cx, cz) {
        var chunk = this.getChunk(cx, cz);
        if (chunk) chunk.dirty = true;
    };

    /** Update: load/unload chunks around player; rebuild dirty meshes (time-sliced). */
    World.prototype.update = function (playerX, playerZ, renderDist) {
        var CW = Chunk.WIDTH, CD = Chunk.DEPTH;
        var pcx = Math.floor(playerX / CW);
        var pcz = Math.floor(playerZ / CD);
        renderDist = renderDist || 4;

        // ── Load new chunks ─────────────────────────────────────────────────
        for (var dz = -renderDist; dz <= renderDist; dz++) {
            for (var dx = -renderDist; dx <= renderDist; dx++) {
                if (dx*dx + dz*dz > renderDist*renderDist) continue;
                this.ensureChunk(pcx + dx, pcz + dz);
            }
        }

        // ── Unload far chunks ────────────────────────────────────────────────
        var removeDist = renderDist + 2;
        for (var key in this.chunks) {
            var chunk = this.chunks[key];
            var ddx = chunk.cx - pcx, ddz = chunk.cz - pcz;
            if (ddx*ddx + ddz*ddz > removeDist*removeDist) {
                chunk.dispose(this.scene);
                delete this.chunks[key];
            }
        }

        // ── Rebuild dirty chunk meshes (max 2 per frame for performance) ─────
        var rebuilt = 0;
        for (var key in this.chunks) {
            if (rebuilt >= 2) break;
            var chunk = this.chunks[key];
            if (chunk.dirty) {
                chunk.buildMesh(this.THREE, this.scene, this.atlasMaterial, this.transparentMaterial);
                rebuilt++;
            }
        }
    };

    /** Raycast from origin along direction to find hit block.
     *  Returns { wx, wy, wz, faceNorm } or null. */
    World.prototype.raycast = function (origin, direction, maxDist) {
        maxDist = maxDist || 6;
        var ox = origin.x, oy = origin.y, oz = origin.z;
        var dx = direction.x, dy = direction.y, dz = direction.z;

        var x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
        var stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
        var tMaxX = dx !== 0 ? (dx > 0 ? (x+1-ox)/dx : (ox-x)/(-dx)) : Infinity;
        var tMaxY = dy !== 0 ? (dy > 0 ? (y+1-oy)/dy : (oy-y)/(-dy)) : Infinity;
        var tMaxZ = dz !== 0 ? (dz > 0 ? (z+1-oz)/dz : (oz-z)/(-dz)) : Infinity;
        var tDeltaX = dx !== 0 ? Math.abs(1/dx) : Infinity;
        var tDeltaY = dy !== 0 ? Math.abs(1/dy) : Infinity;
        var tDeltaZ = dz !== 0 ? Math.abs(1/dz) : Infinity;

        var faceNorm = [0, 0, 0];
        var t = 0;

        for (var i = 0; i < 100 && t < maxDist; i++) {
            var id = this.getBlock(x, y, z);
            if (id !== BLOCK.AIR && !blockIsLiquid(id)) {
                return { wx: x, wy: y, wz: z, faceNorm: faceNorm.slice() };
            }
            if (tMaxX < tMaxY && tMaxX < tMaxZ) {
                t = tMaxX; tMaxX += tDeltaX;
                faceNorm = [-stepX, 0, 0]; x += stepX;
            } else if (tMaxY < tMaxZ) {
                t = tMaxY; tMaxY += tDeltaY;
                faceNorm = [0, -stepY, 0]; y += stepY;
            } else {
                t = tMaxZ; tMaxZ += tDeltaZ;
                faceNorm = [0, 0, -stepZ]; z += stepZ;
            }
        }
        return null;
    };

    return World;
}());
