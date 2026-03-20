/**
 * Vinecraft - Crafting System
 * Handles 2×2 (inventory) and 3×3 (crafting table) recipes.
 */

var Crafting = (function () {
    'use strict';

    // Helper: convert pattern + key to recipe definition
    function recipe(grid, output, count) {
        return { grid: grid, output: output, count: count || 1 };
    }

    var B = BLOCK;

    // Each recipe grid is a flat array of BLOCK IDs (0 = any/empty).
    // 2x2 patterns are given as 4-element arrays; 3x3 as 9-element arrays.
    var RECIPES_2x2 = [
        recipe([B.LOG,   B.LOG,   B.LOG,   B.LOG  ],   B.PLANKS,        4),
        recipe([B.PLANKS,B.PLANKS,B.PLANKS,B.PLANKS],  B.WOOD_PLANKS,   4),
        recipe([B.SAND,  0,       B.SAND,  0      ],   B.SANDSTONE,     1),
        recipe([B.COBBLESTONE,B.COBBLESTONE,B.COBBLESTONE,B.COBBLESTONE],B.STONE,4),
    ];

    var RECIPES_3x3 = [
        // Tools (simplified — just placeholders; material = stone)
        recipe([B.COBBLESTONE,B.COBBLESTONE,B.COBBLESTONE,
                0,            B.PLANKS,     0,
                0,            B.PLANKS,     0],            BLOCK.IRON_ORE,  1), // pickaxe proxy
        // Bricks
        recipe([B.CLAY,B.CLAY,0,
                B.CLAY,B.CLAY,0,
                0,     0,     0],                           B.BRICK,         4),
        // Glass pane
        recipe([B.GLASS,B.GLASS,B.GLASS,
                B.GLASS,B.GLASS,B.GLASS,
                0,      0,      0],                         B.GLASS,         6),
        // Chest (8 planks around empty center)
        recipe([B.PLANKS,B.PLANKS,B.PLANKS,
                B.PLANKS,0,      B.PLANKS,
                B.PLANKS,B.PLANKS,B.PLANKS],               B.BOOKSHELF,     1),
        // TNT
        recipe([B.SAND,        B.GRAVEL, B.SAND,
                B.GRAVEL,      B.SAND,   B.GRAVEL,
                B.SAND,        B.GRAVEL, B.SAND],           B.TNT,           1),
        // Bookshelf
        recipe([B.PLANKS,B.PLANKS,B.PLANKS,
                B.STONE, B.STONE, B.STONE,
                B.PLANKS,B.PLANKS,B.PLANKS],               B.BOOKSHELF,     1),
        // Obsidian pillar (placeholder for portal)
        recipe([B.OBSIDIAN,B.OBSIDIAN,B.OBSIDIAN,
                B.OBSIDIAN,0,          B.OBSIDIAN,
                B.OBSIDIAN,B.OBSIDIAN,B.OBSIDIAN],         B.OBSIDIAN,      8),
        // Marble bricks
        recipe([B.MARBLE,B.MARBLE,0,
                B.MARBLE,B.MARBLE,0,
                0,       0,       0],                       B.MARBLE,        4),
        // Terracotta from clay
        recipe([B.CLAY, B.CLAY, B.CLAY,
                B.CLAY, B.CLAY, B.CLAY,
                B.CLAY, B.CLAY, B.CLAY],                   B.TERRACOTTA,    8),
        // Prismarine
        recipe([B.CRYSTAL, B.CRYSTAL, B.CRYSTAL,
                B.CRYSTAL, B.CRYSTAL, B.CRYSTAL,
                B.CRYSTAL, B.CRYSTAL, B.CRYSTAL],          B.PRISMARINE,    4),
        // Nether Brick
        recipe([B.BASALT, B.BASALT, B.BASALT,
                B.BASALT, B.BASALT, B.BASALT,
                B.BASALT, B.BASALT, B.BASALT],             B.NETHER_BRICK,  8),
    ];

    /** Match a flat grid (length 4 or 9) against a recipe.
     *  Recipes can match in any orientation (left-aligned). */
    function matchRecipe(grid, recipes) {
        for (var ri = 0; ri < recipes.length; ri++) {
            var r = recipes[ri];
            if (r.grid.length !== grid.length) continue;
            var match = true;
            for (var i = 0; i < grid.length; i++) {
                var rg = r.grid[i];
                var gg = grid[i] || 0;
                if (rg !== 0 && rg !== gg) { match = false; break; }
                if (rg === 0 && gg !== 0) { match = false; break; }
            }
            if (match) return { output: r.output, count: r.count };
        }
        return null;
    }

    function craft2x2(grid) { return matchRecipe(grid, RECIPES_2x2); }
    function craft3x3(grid) { return matchRecipe(grid, RECIPES_3x3); }

    /** Returns list of all available recipes for display */
    function getAllRecipes() {
        return {
            small: RECIPES_2x2.map(function(r){ return { grid: r.grid, output: r.output, count: r.count, size: 2 }; }),
            big:   RECIPES_3x3.map(function(r){ return { grid: r.grid, output: r.output, count: r.count, size: 3 }; }),
        };
    }

    return { craft2x2: craft2x2, craft3x3: craft3x3, getAllRecipes: getAllRecipes };
}());
