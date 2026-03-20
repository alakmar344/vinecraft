/**
 * Vinecraft - Inventory System
 * Manages player inventory: hotbar (9 slots) + main inventory (27 slots).
 */

var Inventory = (function () {
    'use strict';

    var HOTBAR_SIZE   = 9;
    var MAIN_SIZE     = 27;
    var TOTAL_SIZE    = HOTBAR_SIZE + MAIN_SIZE;

    function Slot(id, count) {
        this.id    = id    || 0;
        this.count = count || 0;
    }

    function Inventory() {
        this.slots       = [];
        this.hotbarIndex = 0;
        this.hand        = null; // item being dragged

        for (var i = 0; i < TOTAL_SIZE; i++) {
            this.slots.push(new Slot());
        }

        // Give starter items
        this._give(BLOCK.PLANKS,    64);
        this._give(BLOCK.DIRT,      64);
        this._give(BLOCK.STONE,     64);
        this._give(BLOCK.GLASS,     32);
        this._give(BLOCK.LOG,       32);
        this._give(BLOCK.COBBLESTONE, 64);
        this._give(BLOCK.SAND,      32);
        this._give(BLOCK.GLOWSTONE, 16);
        this._give(BLOCK.BRICK,     32);
    }

    Inventory.HOTBAR_SIZE = HOTBAR_SIZE;
    Inventory.MAIN_SIZE   = MAIN_SIZE;
    Inventory.TOTAL_SIZE  = TOTAL_SIZE;

    Inventory.prototype._give = function (id, count) {
        for (var i = 0; i < TOTAL_SIZE; i++) {
            if (this.slots[i].id === id && this.slots[i].count < 64) {
                var room = 64 - this.slots[i].count;
                var add  = Math.min(room, count);
                this.slots[i].count += add;
                count -= add;
                if (count <= 0) return true;
            }
        }
        for (var i = 0; i < TOTAL_SIZE; i++) {
            if (this.slots[i].id === 0) {
                this.slots[i].id    = id;
                this.slots[i].count = Math.min(64, count);
                count -= 64;
                if (count <= 0) return true;
            }
        }
        return false; // inventory full
    };

    /** Add items to inventory; returns amount that didn't fit */
    Inventory.prototype.add = function (id, count) {
        count = count || 1;
        // Try to stack first
        for (var i = 0; i < TOTAL_SIZE; i++) {
            if (this.slots[i].id === id && this.slots[i].count < 64) {
                var room = 64 - this.slots[i].count;
                var add  = Math.min(room, count);
                this.slots[i].count += add;
                count -= add;
                if (count <= 0) return 0;
            }
        }
        // Then fill empty slots
        for (var i = 0; i < TOTAL_SIZE; i++) {
            if (this.slots[i].id === 0) {
                this.slots[i].id    = id;
                this.slots[i].count = Math.min(64, count);
                count -= 64;
                if (count <= 0) return 0;
            }
        }
        return count; // leftover that didn't fit
    };

    /** Remove one item from hotbar slot; returns the block id or 0 */
    Inventory.prototype.consumeHotbar = function () {
        var slot = this.slots[this.hotbarIndex];
        if (slot.id === 0 || slot.count === 0) return 0;
        slot.count--;
        var id = slot.id;
        if (slot.count === 0) slot.id = 0;
        return id;
    };

    /** Peek at hotbar selected block id (without consuming) */
    Inventory.prototype.selectedBlock = function () {
        var slot = this.slots[this.hotbarIndex];
        return slot.count > 0 ? slot.id : 0;
    };

    /** Scroll hotbar selection */
    Inventory.prototype.scroll = function (delta) {
        this.hotbarIndex = ((this.hotbarIndex + delta) % HOTBAR_SIZE + HOTBAR_SIZE) % HOTBAR_SIZE;
    };

    /** Select hotbar slot by number key */
    Inventory.prototype.selectSlot = function (idx) {
        if (idx >= 0 && idx < HOTBAR_SIZE) this.hotbarIndex = idx;
    };

    /** Get hotbar slots array */
    Inventory.prototype.getHotbar = function () {
        return this.slots.slice(0, HOTBAR_SIZE);
    };

    /** Get main inventory slots */
    Inventory.prototype.getMain = function () {
        return this.slots.slice(HOTBAR_SIZE);
    };

    return Inventory;
}());
