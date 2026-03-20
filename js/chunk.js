/**
 * Vinecraft - Chunk
 * Stores block data and generates Three.js meshes for a 16×16×128 chunk.
 * Uses a merged-geometry approach: one opaque mesh + one transparent mesh per chunk.
 */

var Chunk = (function () {
    'use strict';

    var CW = 16;  // chunk width  (X)
    var CD = 16;  // chunk depth  (Z)
    var CH = 128; // chunk height (Y)

    var ATLAS_COLS = 16;       // texture atlas columns
    var INV_ATLAS  = 1 / 16;   // 1/ATLAS_COLS

    // Face normals + vertex offsets for each of the 6 faces
    // Order: +Y (top), -Y (bottom), +X (right), -X (left), +Z (front), -Z (back)
    var FACES = [
        { dir: [0,1,0],  corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], faceIdx: 0 }, // top
        { dir: [0,-1,0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], faceIdx: 1 }, // bottom
        { dir: [1,0,0],  corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]], faceIdx: 2 }, // right (+X)
        { dir: [-1,0,0], corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]], faceIdx: 3 }, // left  (-X)
        { dir: [0,0,1],  corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]], faceIdx: 4 }, // front (+Z)
        { dir: [0,0,-1], corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]], faceIdx: 5 }, // back  (-Z)
    ];

    // AO neighbour offsets for each corner of a face (s1, s2, corner)
    var AO_OFFSETS = [
        // top face corners [0,1,1],[1,1,1],[1,1,0],[0,1,0]
        [[-1,1,0],[0,1,1],[-1,1,1]],  [[1,1,0],[0,1,1],[1,1,1]],
        [[1,1,0],[0,1,-1],[1,1,-1]], [[-1,1,0],[0,1,-1],[-1,1,-1]],
    ];

    function Chunk(cx, cz, world) {
        this.cx = cx;
        this.cz = cz;
        this.world = world;
        this.blocks = new Uint8Array(CW * CD * CH);
        this.mesh = null;
        this.transparentMesh = null;
        this.dirty = true;
    }

    Chunk.WIDTH  = CW;
    Chunk.DEPTH  = CD;
    Chunk.HEIGHT = CH;

    Chunk.prototype.blockIdx = function (x, y, z) {
        return y * CW * CD + z * CW + x;
    };

    Chunk.prototype.getBlock = function (x, y, z) {
        if (x < 0 || x >= CW || z < 0 || z >= CD || y < 0 || y >= CH) return 0;
        return this.blocks[this.blockIdx(x, y, z)];
    };

    Chunk.prototype.setBlock = function (x, y, z, id) {
        if (x < 0 || x >= CW || z < 0 || z >= CD || y < 0 || y >= CH) return;
        this.blocks[this.blockIdx(x, y, z)] = id;
        this.dirty = true;
    };

    /** Get block from world coords (may cross chunk boundary) */
    Chunk.prototype.getWorldBlock = function (lx, ly, lz) {
        if (lx >= 0 && lx < CW && lz >= 0 && lz < CD) {
            return this.getBlock(lx, ly, lz);
        }
        var wx = this.cx * CW + lx;
        var wz = this.cz * CD + lz;
        return this.world.getBlock(wx, ly, wz);
    };

    /** Compute ambient occlusion value (0=full light, 1=darkest) for a vertex */
    Chunk.prototype.computeAO = function (x, y, z, s1, s2, corner) {
        var a = blockIsOpaque(this.getWorldBlock(x+s1[0], y+s1[1], z+s1[2])) ? 1 : 0;
        var b = blockIsOpaque(this.getWorldBlock(x+s2[0], y+s2[1], z+s2[2])) ? 1 : 0;
        var c = blockIsOpaque(this.getWorldBlock(x+corner[0], y+corner[1], z+corner[2])) ? 1 : 0;
        if (a && b) return 3;
        return a + b + c;
    };

    /** Get UV for atlas tile index, adjusted per corner [0-3] */
    Chunk.prototype.getTileUV = function (tileIdx, corner) {
        var col = tileIdx % ATLAS_COLS;
        var row = Math.floor(tileIdx / ATLAS_COLS);
        var u0 = col * INV_ATLAS, v0 = row * INV_ATLAS;
        var u1 = u0 + INV_ATLAS, v1 = v0 + INV_ATLAS;
        var eps = 0.001; // prevent bleeding
        if (corner === 0) return [u0+eps, v1-eps];
        if (corner === 1) return [u1-eps, v1-eps];
        if (corner === 2) return [u1-eps, v0+eps];
        return [u0+eps, v0+eps];
    };

    /** Build geometry arrays for opaque or transparent blocks */
    Chunk.prototype._buildGeomArrays = function (transparent) {
        var positions = [], normals = [], uvs = [], colors = [], indices = [];
        var vertCount = 0;

        for (var y = 0; y < CH; y++) {
            for (var z = 0; z < CD; z++) {
                for (var x = 0; x < CW; x++) {
                    var id = this.getBlock(x, y, z);
                    if (id === BLOCK.AIR) continue;
                    var isTransp = blockIsTransparent(id) || blockIsLiquid(id);
                    if (isTransp !== transparent) continue;

                    var tiles = BLOCK_TILES[id] || [3, 3, 3];

                    for (var fi = 0; fi < 6; fi++) {
                        var face = FACES[fi];
                        var nx = x + face.dir[0];
                        var ny = y + face.dir[1];
                        var nz = z + face.dir[2];
                        var neighbour = this.getWorldBlock(nx, ny, nz);

                        // Skip face if hidden by opaque neighbour, or (for transparent) same liquid type
                        if (blockIsOpaque(neighbour)) continue;
                        if (transparent && neighbour === id) continue;

                        // Tile index: top=tiles[0], bottom=tiles[2], sides=tiles[1]
                        var tileIdx = fi === 0 ? tiles[0] : (fi === 1 ? tiles[2] : tiles[1]);

                        // AO per vertex
                        var ao = [0, 0, 0, 0];
                        // Simplified AO: check corners for each vertex of this face
                        for (var ci = 0; ci < 4; ci++) {
                            var corner = face.corners[ci];
                            var dx = face.dir[0], dy = face.dir[1], dz = face.dir[2];
                            // Two side axes for AO
                            var ax = dz !== 0 ? 1 : 0, ay = dy !== 0 ? 0 : 1, az = dx !== 0 ? 0 : (dy !== 0 ? 0 : 1);
                            // Pick two perpendicular directions based on face direction
                            var s1x = dy !== 0 ? (corner[0] > 0.5 ? 1 : -1) : dx;
                            var s1z = dy !== 0 ? (corner[2] > 0.5 ? 1 : -1) * 0 : dz;
                            ao[ci] = 0; // simplified: skip AO for transparent
                        }

                        // Better AO for opaque blocks
                        if (!transparent) {
                            for (var ci = 0; ci < 4; ci++) {
                                var corner = face.corners[ci];
                                var bx = x + corner[0], by2 = y + corner[1], bz2 = z + corner[2];
                                var aoVal = 0;
                                var dirs2 = [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1]];
                                if (face.dir[1] !== 0) {
                                    var offsets3 = [
                                        [Math.round(corner[0]*2-1), 0, 0],
                                        [0, 0, Math.round(corner[2]*2-1)],
                                        [Math.round(corner[0]*2-1), 0, Math.round(corner[2]*2-1)]
                                    ];
                                    var side1 = blockIsOpaque(this.getWorldBlock(x + offsets3[0][0], y + face.dir[1], z)) ? 1 : 0;
                                    var side2 = blockIsOpaque(this.getWorldBlock(x, y + face.dir[1], z + offsets3[1][2])) ? 1 : 0;
                                    var cnr = blockIsOpaque(this.getWorldBlock(x + offsets3[0][0], y + face.dir[1], z + offsets3[1][2])) ? 1 : 0;
                                    aoVal = side1 && side2 ? 3 : side1 + side2 + cnr;
                                } else if (face.dir[0] !== 0) {
                                    var dy2 = Math.round(corner[1]*2-1);
                                    var dz3 = Math.round(corner[2]*2-1);
                                    var s1 = blockIsOpaque(this.getWorldBlock(x + face.dir[0], y + dy2, z)) ? 1 : 0;
                                    var s2 = blockIsOpaque(this.getWorldBlock(x + face.dir[0], y, z + dz3)) ? 1 : 0;
                                    var cn = blockIsOpaque(this.getWorldBlock(x + face.dir[0], y + dy2, z + dz3)) ? 1 : 0;
                                    aoVal = s1 && s2 ? 3 : s1 + s2 + cn;
                                } else {
                                    var dx3 = Math.round(corner[0]*2-1);
                                    var dy3 = Math.round(corner[1]*2-1);
                                    var s1 = blockIsOpaque(this.getWorldBlock(x + dx3, y, z + face.dir[2])) ? 1 : 0;
                                    var s2 = blockIsOpaque(this.getWorldBlock(x, y + dy3, z + face.dir[2])) ? 1 : 0;
                                    var cn = blockIsOpaque(this.getWorldBlock(x + dx3, y + dy3, z + face.dir[2])) ? 1 : 0;
                                    aoVal = s1 && s2 ? 3 : s1 + s2 + cn;
                                }
                                ao[ci] = aoVal;
                            }
                        }

                        // Water depth shade
                        var shade = 1.0;
                        if (blockIsLiquid(id)) shade = 0.8;

                        // Add 4 vertices
                        var baseIdx = vertCount;
                        for (var ci = 0; ci < 4; ci++) {
                            var c = face.corners[ci];
                            positions.push(x + c[0], y + c[1], z + c[2]);
                            normals.push(face.dir[0], face.dir[1], face.dir[2]);
                            var uv = this.getTileUV(tileIdx, ci);
                            uvs.push(uv[0], uv[1]);
                            var brightness = shade * (1.0 - ao[ci] * 0.15);
                            // Face shading: top brighter, bottom darker
                            if (fi === 1) brightness *= 0.6;
                            else if (fi === 0) brightness *= 1.0;
                            else brightness *= 0.8;
                            colors.push(brightness, brightness, brightness);
                        }

                        // Two triangles per face (CCW winding)
                        // Check for AO-flipped quad to avoid dark diagonal artifact
                        if (ao[0] + ao[2] > ao[1] + ao[3]) {
                            indices.push(baseIdx+1, baseIdx+2, baseIdx+3, baseIdx+3, baseIdx, baseIdx+1);
                        } else {
                            indices.push(baseIdx, baseIdx+1, baseIdx+2, baseIdx+2, baseIdx+3, baseIdx);
                        }

                        vertCount += 4;
                    }
                }
            }
        }

        return { positions: positions, normals: normals, uvs: uvs, colors: colors, indices: indices };
    };

    /** Build or rebuild Three.js meshes for this chunk. */
    Chunk.prototype.buildMesh = function (THREE, scene, atlasMaterial, transparentMaterial) {
        // Remove old meshes
        if (this.mesh) { scene.remove(this.mesh); this.mesh.geometry.dispose(); }
        if (this.transparentMesh) { scene.remove(this.transparentMesh); this.transparentMesh.geometry.dispose(); }

        var ox = this.cx * CW;
        var oz = this.cz * CD;

        // ── Opaque mesh ──────────────────────────────────────────────────────
        var opaque = this._buildGeomArrays(false);
        if (opaque.positions.length > 0) {
            var geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(opaque.positions, 3));
            geo.setAttribute('normal',   new THREE.Float32BufferAttribute(opaque.normals,   3));
            geo.setAttribute('uv',       new THREE.Float32BufferAttribute(opaque.uvs,       2));
            geo.setAttribute('color',    new THREE.Float32BufferAttribute(opaque.colors,    3));
            geo.setIndex(opaque.indices);
            this.mesh = new THREE.Mesh(geo, atlasMaterial);
            this.mesh.position.set(ox, 0, oz);
            this.mesh.castShadow    = true;
            this.mesh.receiveShadow = true;
            scene.add(this.mesh);
        } else {
            this.mesh = null;
        }

        // ── Transparent mesh ─────────────────────────────────────────────────
        var transp = this._buildGeomArrays(true);
        if (transp.positions.length > 0) {
            var tgeo = new THREE.BufferGeometry();
            tgeo.setAttribute('position', new THREE.Float32BufferAttribute(transp.positions, 3));
            tgeo.setAttribute('normal',   new THREE.Float32BufferAttribute(transp.normals,   3));
            tgeo.setAttribute('uv',       new THREE.Float32BufferAttribute(transp.uvs,       2));
            tgeo.setAttribute('color',    new THREE.Float32BufferAttribute(transp.colors,    3));
            tgeo.setIndex(transp.indices);
            this.transparentMesh = new THREE.Mesh(tgeo, transparentMaterial);
            this.transparentMesh.position.set(ox, 0, oz);
            this.transparentMesh.renderOrder = 1;
            scene.add(this.transparentMesh);
        } else {
            this.transparentMesh = null;
        }

        this.dirty = false;
    };

    /** Remove meshes from scene */
    Chunk.prototype.dispose = function (scene) {
        if (this.mesh) { scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh = null; }
        if (this.transparentMesh) { scene.remove(this.transparentMesh); this.transparentMesh.geometry.dispose(); this.transparentMesh = null; }
    };

    return Chunk;
}());
