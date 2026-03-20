/**
 * Vinecraft - Block Definitions
 * All block types with their properties.
 */

var BLOCK = {
    AIR:          0,
    GRASS:        1,
    DIRT:         2,
    STONE:        3,
    SAND:         4,
    GRAVEL:       5,
    WATER:        6,
    LOG:          7,
    LEAVES:       8,
    GLASS:        9,
    PLANKS:       10,
    BRICK:        11,
    COBBLESTONE:  12,
    OBSIDIAN:     13,
    BEDROCK:      14,
    COAL_ORE:     15,
    IRON_ORE:     16,
    GOLD_ORE:     17,
    DIAMOND_ORE:  18,
    EMERALD_ORE:  19,
    SNOW:         20,
    ICE:          21,
    CACTUS:       22,
    CLAY:         23,
    MARBLE:       24,
    LIMESTONE:    25,
    BASALT:       26,
    CRYSTAL:      27,
    SANDSTONE:    28,
    WOOD_PLANKS:  29,
    GLOWSTONE:    30,
    MOSSY_STONE:  31,
    REDSTONE_ORE: 32,
    LAPIS_ORE:    33,
    NETHERRACK:   34,
    SOUL_SAND:    35,
    MAGMA:        36,
    PRISMARINE:   37,
    SEA_LANTERN:  38,
    TERRACOTTA:   39,
    PUMPKIN:      40,
    MELON:        41,
    TNT:          42,
    BOOKSHELF:    43,
    MYCELIUM:     44,
    NETHER_BRICK: 45,
};

// Texture atlas tile indices for each block face [top, side, bottom]
// The atlas is 16 columns x 16 rows, each tile 16x16 px → 256x256 total.
var BLOCK_TILES = {
    //            [top,  side, bottom]
    [BLOCK.GRASS]:       [0,   1,   2],
    [BLOCK.DIRT]:        [2,   2,   2],
    [BLOCK.STONE]:       [3,   3,   3],
    [BLOCK.SAND]:        [4,   4,   4],
    [BLOCK.GRAVEL]:      [5,   5,   5],
    [BLOCK.WATER]:       [6,   6,   6],
    [BLOCK.LOG]:         [7,   8,   7],
    [BLOCK.LEAVES]:      [9,   9,   9],
    [BLOCK.GLASS]:       [10,  10,  10],
    [BLOCK.PLANKS]:      [11,  11,  11],
    [BLOCK.BRICK]:       [12,  12,  12],
    [BLOCK.COBBLESTONE]: [13,  13,  13],
    [BLOCK.OBSIDIAN]:    [14,  14,  14],
    [BLOCK.BEDROCK]:     [15,  15,  15],
    [BLOCK.COAL_ORE]:    [16,  16,  16],
    [BLOCK.IRON_ORE]:    [17,  17,  17],
    [BLOCK.GOLD_ORE]:    [18,  18,  18],
    [BLOCK.DIAMOND_ORE]: [19,  19,  19],
    [BLOCK.EMERALD_ORE]: [20,  20,  20],
    [BLOCK.SNOW]:        [21,  21,  21],
    [BLOCK.ICE]:         [22,  22,  22],
    [BLOCK.CACTUS]:      [23,  24,  23],
    [BLOCK.CLAY]:        [25,  25,  25],
    [BLOCK.MARBLE]:      [26,  26,  26],
    [BLOCK.LIMESTONE]:   [27,  27,  27],
    [BLOCK.BASALT]:      [28,  28,  28],
    [BLOCK.CRYSTAL]:     [29,  29,  29],
    [BLOCK.SANDSTONE]:   [30,  31,  30],
    [BLOCK.WOOD_PLANKS]: [11,  11,  11],
    [BLOCK.GLOWSTONE]:   [32,  32,  32],
    [BLOCK.MOSSY_STONE]: [33,  33,  33],
    [BLOCK.REDSTONE_ORE]:[34,  34,  34],
    [BLOCK.LAPIS_ORE]:   [35,  35,  35],
    [BLOCK.NETHERRACK]:  [36,  36,  36],
    [BLOCK.SOUL_SAND]:   [37,  37,  37],
    [BLOCK.MAGMA]:       [38,  38,  38],
    [BLOCK.PRISMARINE]:  [39,  39,  39],
    [BLOCK.SEA_LANTERN]: [40,  40,  40],
    [BLOCK.TERRACOTTA]:  [41,  41,  41],
    [BLOCK.PUMPKIN]:     [42,  43,  42],
    [BLOCK.MELON]:       [44,  45,  44],
    [BLOCK.TNT]:         [46,  47,  48],
    [BLOCK.BOOKSHELF]:   [11,  49,  11],
    [BLOCK.MYCELIUM]:    [50,  51,   2],
    [BLOCK.NETHER_BRICK]:[52,  52,  52],
};

/** Properties for each block type */
var BLOCK_DATA = {};
(function () {
    var def = function (id, name, opts) {
        BLOCK_DATA[id] = Object.assign({
            name: name,
            solid: true,
            transparent: false,
            opaque: true,
            hardness: 1.0,     // seconds to break with bare hand
            toolType: 'any',   // 'pickaxe','axe','shovel','any'
            drops: [id],       // what block IDs drop
            luminance: 0,      // light emitted (0-15)
            liquid: false,
            flammable: false,
            gravity: false,    // falls when unsupported
            blastResistance: 1.0,
        }, opts);
    };

    def(BLOCK.AIR,          'Air',          { solid:false, opaque:false, hardness:0, drops:[] });
    def(BLOCK.GRASS,        'Grass',        { hardness:0.6, toolType:'shovel', drops:[BLOCK.DIRT], flammable:false });
    def(BLOCK.DIRT,         'Dirt',         { hardness:0.5, toolType:'shovel', flammable:false });
    def(BLOCK.STONE,        'Stone',        { hardness:1.5, toolType:'pickaxe', drops:[BLOCK.COBBLESTONE], blastResistance:6 });
    def(BLOCK.SAND,         'Sand',         { hardness:0.5, toolType:'shovel', gravity:true });
    def(BLOCK.GRAVEL,       'Gravel',       { hardness:0.6, toolType:'shovel', gravity:true });
    def(BLOCK.WATER,        'Water',        { solid:false, opaque:false, transparent:true, liquid:true, hardness:100, drops:[] });
    def(BLOCK.LOG,          'Oak Log',      { hardness:2.0, toolType:'axe', flammable:true });
    def(BLOCK.LEAVES,       'Oak Leaves',   { opaque:false, transparent:true, hardness:0.2, toolType:'any', drops:[], flammable:true });
    def(BLOCK.GLASS,        'Glass',        { opaque:false, transparent:true, hardness:0.3, drops:[], blastResistance:0.3 });
    def(BLOCK.PLANKS,       'Wood Planks',  { hardness:2.0, toolType:'axe', flammable:true });
    def(BLOCK.BRICK,        'Brick',        { hardness:2.0, toolType:'pickaxe', blastResistance:6 });
    def(BLOCK.COBBLESTONE,  'Cobblestone',  { hardness:2.0, toolType:'pickaxe', blastResistance:6 });
    def(BLOCK.OBSIDIAN,     'Obsidian',     { hardness:50, toolType:'pickaxe', blastResistance:1200 });
    def(BLOCK.BEDROCK,      'Bedrock',      { hardness:Infinity, blastResistance:3600000, drops:[] });
    def(BLOCK.COAL_ORE,     'Coal Ore',     { hardness:3.0, toolType:'pickaxe' });
    def(BLOCK.IRON_ORE,     'Iron Ore',     { hardness:3.0, toolType:'pickaxe' });
    def(BLOCK.GOLD_ORE,     'Gold Ore',     { hardness:3.0, toolType:'pickaxe' });
    def(BLOCK.DIAMOND_ORE,  'Diamond Ore',  { hardness:3.0, toolType:'pickaxe' });
    def(BLOCK.EMERALD_ORE,  'Emerald Ore',  { hardness:3.0, toolType:'pickaxe' });
    def(BLOCK.SNOW,         'Snow',         { hardness:0.2, toolType:'shovel' });
    def(BLOCK.ICE,          'Ice',          { opaque:false, transparent:true, hardness:0.5, toolType:'pickaxe', drops:[] });
    def(BLOCK.CACTUS,       'Cactus',       { hardness:0.4, drops:[BLOCK.CACTUS] });
    def(BLOCK.CLAY,         'Clay',         { hardness:0.6, toolType:'shovel' });
    def(BLOCK.MARBLE,       'Marble',       { hardness:1.5, toolType:'pickaxe', blastResistance:6 });
    def(BLOCK.LIMESTONE,    'Limestone',    { hardness:1.2, toolType:'pickaxe' });
    def(BLOCK.BASALT,       'Basalt',       { hardness:1.25, toolType:'pickaxe' });
    def(BLOCK.CRYSTAL,      'Crystal',      { opaque:false, transparent:true, hardness:1.5, toolType:'pickaxe', luminance:5 });
    def(BLOCK.SANDSTONE,    'Sandstone',    { hardness:0.8, toolType:'pickaxe' });
    def(BLOCK.WOOD_PLANKS,  'Wood Planks',  { hardness:2.0, toolType:'axe', flammable:true });
    def(BLOCK.GLOWSTONE,    'Glowstone',    { hardness:0.3, luminance:15, blastResistance:0.3 });
    def(BLOCK.MOSSY_STONE,  'Mossy Stone',  { hardness:1.5, toolType:'pickaxe' });
    def(BLOCK.REDSTONE_ORE, 'Redstone Ore', { hardness:3.0, toolType:'pickaxe', luminance:9 });
    def(BLOCK.LAPIS_ORE,    'Lapis Ore',    { hardness:3.0, toolType:'pickaxe' });
    def(BLOCK.NETHERRACK,   'Netherrack',   { hardness:0.4, toolType:'pickaxe', flammable:true });
    def(BLOCK.SOUL_SAND,    'Soul Sand',    { hardness:0.5, toolType:'shovel' });
    def(BLOCK.MAGMA,        'Magma Block',  { hardness:0.5, toolType:'pickaxe', luminance:3 });
    def(BLOCK.PRISMARINE,   'Prismarine',   { hardness:1.5, toolType:'pickaxe' });
    def(BLOCK.SEA_LANTERN,  'Sea Lantern',  { hardness:0.3, luminance:15 });
    def(BLOCK.TERRACOTTA,   'Terracotta',   { hardness:1.25, toolType:'pickaxe', blastResistance:4.2 });
    def(BLOCK.PUMPKIN,      'Pumpkin',      { hardness:1.0, toolType:'axe' });
    def(BLOCK.MELON,        'Melon',        { hardness:1.0, toolType:'axe' });
    def(BLOCK.TNT,          'TNT',          { hardness:0, flammable:true, blastResistance:0 });
    def(BLOCK.BOOKSHELF,    'Bookshelf',    { hardness:1.5, toolType:'axe', flammable:true });
    def(BLOCK.MYCELIUM,     'Mycelium',     { hardness:0.6, toolType:'shovel' });
    def(BLOCK.NETHER_BRICK, 'Nether Brick', { hardness:2.0, toolType:'pickaxe', blastResistance:6 });
}());

/** Returns whether a block allows light/air through for face culling */
function blockIsOpaque(id) {
    if (id === BLOCK.AIR) return false;
    var d = BLOCK_DATA[id];
    return d ? d.opaque : true;
}

/** Returns whether a block should be rendered in the transparent pass */
function blockIsTransparent(id) {
    if (id === BLOCK.AIR) return false;
    var d = BLOCK_DATA[id];
    return d ? d.transparent : false;
}

function blockIsLiquid(id) {
    var d = BLOCK_DATA[id];
    return d ? d.liquid : false;
}

function blockIsSolid(id) {
    if (id === BLOCK.AIR) return false;
    var d = BLOCK_DATA[id];
    return d ? d.solid : true;
}

/** Display name for a block */
function blockName(id) {
    var d = BLOCK_DATA[id];
    return d ? d.name : 'Unknown';
}
