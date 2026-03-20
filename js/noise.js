/**
 * Vinecraft - Simplex Noise Module
 * Fast simplex noise for 2D and 3D terrain generation.
 * Based on Stefan Gustavson's simplex noise algorithm.
 */

var Noise = (function () {
    'use strict';

    var grad3 = [
        [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
        [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
        [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];

    var p = [];
    for (var i = 0; i < 256; i++) p[i] = Math.floor(Math.random() * 256);

    var perm = new Array(512);
    var gradP = new Array(512);

    function seedNoise(seed) {
        var xorshift = function (x) {
            x ^= x << 13; x ^= x >> 17; x ^= x << 5; return x;
        };
        var s = seed || Math.random() * 2147483647;
        for (var i = 0; i < 256; i++) {
            s = xorshift(s);
            p[i] = Math.abs(s) % 256;
        }
        for (var i = 0; i < 512; i++) {
            perm[i] = p[i & 255];
            gradP[i] = grad3[perm[i] % 12];
        }
    }
    seedNoise(12345);

    function dot2(g, x, y) { return g[0] * x + g[1] * y; }
    function dot3(g, x, y, z) { return g[0] * x + g[1] * y + g[2] * z; }

    var F2 = 0.5 * (Math.sqrt(3) - 1);
    var G2 = (3 - Math.sqrt(3)) / 6;
    var F3 = 1 / 3;
    var G3 = 1 / 6;

    function noise2(xin, yin) {
        var n0, n1, n2;
        var s = (xin + yin) * F2;
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var t = (i + j) * G2;
        var x0 = xin - i + t;
        var y0 = yin - j + t;
        var i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
        var x1 = x0 - i1 + G2;
        var y1 = y0 - j1 + G2;
        var x2 = x0 - 1 + 2 * G2;
        var y2 = y0 - 1 + 2 * G2;
        var ii = i & 255;
        var jj = j & 255;
        var gi0 = gradP[ii + perm[jj]];
        var gi1 = gradP[ii + i1 + perm[jj + j1]];
        var gi2 = gradP[ii + 1 + perm[jj + 1]];
        var t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) { n0 = 0; } else { t0 *= t0; n0 = t0 * t0 * dot2(gi0, x0, y0); }
        var t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) { n1 = 0; } else { t1 *= t1; n1 = t1 * t1 * dot2(gi1, x1, y1); }
        var t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) { n2 = 0; } else { t2 *= t2; n2 = t2 * t2 * dot2(gi2, x2, y2); }
        return 70 * (n0 + n1 + n2);
    }

    function noise3(xin, yin, zin) {
        var n0, n1, n2, n3;
        var s = (xin + yin + zin) * F3;
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var k = Math.floor(zin + s);
        var t = (i + j + k) * G3;
        var x0 = xin - i + t, y0 = yin - j + t, z0 = zin - k + t;
        var i1, j1, k1, i2, j2, k2;
        if (x0 >= y0) {
            if (y0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
            else if (x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
            else { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
        } else {
            if (y0 < z0) { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
            else if (x0 < z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
            else { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
        }
        var x1=x0-i1+G3, y1=y0-j1+G3, z1=z0-k1+G3;
        var x2=x0-i2+2*G3, y2=y0-j2+2*G3, z2=z0-k2+2*G3;
        var x3=x0-1+3*G3, y3=y0-1+3*G3, z3=z0-1+3*G3;
        var ii=i&255, jj=j&255, kk=k&255;
        var gi0=gradP[ii+perm[jj+perm[kk]]];
        var gi1=gradP[ii+i1+perm[jj+j1+perm[kk+k1]]];
        var gi2=gradP[ii+i2+perm[jj+j2+perm[kk+k2]]];
        var gi3=gradP[ii+1+perm[jj+1+perm[kk+1]]];
        var t0=0.6-x0*x0-y0*y0-z0*z0; if(t0<0){n0=0;}else{t0*=t0;n0=t0*t0*dot3(gi0,x0,y0,z0);}
        var t1=0.6-x1*x1-y1*y1-z1*z1; if(t1<0){n1=0;}else{t1*=t1;n1=t1*t1*dot3(gi1,x1,y1,z1);}
        var t2=0.6-x2*x2-y2*y2-z2*z2; if(t2<0){n2=0;}else{t2*=t2;n2=t2*t2*dot3(gi2,x2,y2,z2);}
        var t3=0.6-x3*x3-y3*y3-z3*z3; if(t3<0){n3=0;}else{t3*=t3;n3=t3*t3*dot3(gi3,x3,y3,z3);}
        return 32*(n0+n1+n2+n3);
    }

    /** Fractal Brownian Motion - sum multiple octaves for realistic terrain */
    function fbm2(x, y, octaves, persistence, lacunarity) {
        octaves = octaves || 6;
        persistence = persistence || 0.5;
        lacunarity = lacunarity || 2.0;
        var value = 0, amplitude = 1, frequency = 1, maxValue = 0;
        for (var i = 0; i < octaves; i++) {
            value += noise2(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        return value / maxValue;
    }

    function fbm3(x, y, z, octaves, persistence, lacunarity) {
        octaves = octaves || 4;
        persistence = persistence || 0.5;
        lacunarity = lacunarity || 2.0;
        var value = 0, amplitude = 1, frequency = 1, maxValue = 0;
        for (var i = 0; i < octaves; i++) {
            value += noise3(x * frequency, y * frequency, z * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        return value / maxValue;
    }

    return { seed: seedNoise, noise2: noise2, noise3: noise3, fbm2: fbm2, fbm3: fbm3 };
}());
