/**
 * Vinecraft - UI Manager
 * Manages all DOM-based HUD elements: hotbar, health, hunger, crosshair,
 * inventory screen, pause menu, crafting UI, and coordinates display.
 */

var UI = (function () {
    'use strict';

    // ─── State ───────────────────────────────────────────────────────────────
    var _inventory   = null;
    var _world       = null;
    var _player      = null;
    var _isOpen      = false;       // inventory/menu open?
    var _activePanel = null;        // 'inventory' | 'crafting' | 'pause'
    var _craftGrid   = [];          // 9-element array of block IDs
    var _craftResult = null;

    // ─── Elements ────────────────────────────────────────────────────────────
    var els = {};

    function _q(id) { return document.getElementById(id); }

    function init(inventory, player, world) {
        _inventory = inventory;
        _player    = player;
        _world     = world;

        els.hotbar        = _q('hotbar');
        els.health        = _q('health-bar');
        els.hunger        = _q('hunger-bar');
        els.coords        = _q('coords');
        els.time          = _q('time-display');
        els.weather       = _q('weather-display');
        els.crosshair     = _q('crosshair');
        els.breakProgress = _q('break-progress');
        els.breakBar      = _q('break-bar');
        els.blockName     = _q('block-name');
        els.inventoryPanel= _q('inventory-panel');
        els.pauseMenu     = _q('pause-menu');
        els.loading       = _q('loading-screen');
        els.flashOverlay  = _q('flash-overlay');
        els.tooltip       = _q('tooltip');
        els.fps           = _q('fps-display');
        els.biome         = _q('biome-display');

        _buildHotbar();
        _buildInventoryPanel();
        _initEvents();
    }

    function _buildHotbar() {
        if (!els.hotbar) return;
        els.hotbar.innerHTML = '';
        for (var i = 0; i < Inventory.HOTBAR_SIZE; i++) {
            var slot = document.createElement('div');
            slot.className = 'hotbar-slot';
            slot.dataset.idx = i;
            var label = document.createElement('span');
            label.className = 'slot-count';
            slot.appendChild(label);
            var key = document.createElement('span');
            key.className = 'slot-key';
            key.textContent = (i + 1) % 10;
            slot.appendChild(key);
            els.hotbar.appendChild(slot);
        }
    }

    function _buildInventoryPanel() {
        var panel = els.inventoryPanel;
        if (!panel) return;
        panel.innerHTML = '<h2>Inventory</h2><div id="inv-main-grid" class="inv-grid"></div>' +
            '<div id="inv-hotbar-row" class="inv-grid"></div>' +
            '<div id="craft-area"><h3>Crafting</h3><div id="craft-grid" class="craft-grid-2x2"></div>' +
            '<div class="craft-arrow">→</div><div id="craft-result" class="craft-slot"></div></div>';

        // Main grid (27 slots)
        var mainGrid = panel.querySelector('#inv-main-grid');
        for (var i = 0; i < Inventory.MAIN_SIZE; i++) {
            mainGrid.appendChild(_makeSlotEl('inv', Inventory.HOTBAR_SIZE + i));
        }
        // Hotbar row (9 slots)
        var hotbarRow = panel.querySelector('#inv-hotbar-row');
        for (var i = 0; i < Inventory.HOTBAR_SIZE; i++) {
            hotbarRow.appendChild(_makeSlotEl('inv', i));
        }
        // Craft grid (2×2 = 4 slots)
        var craftGrid = panel.querySelector('#craft-grid');
        _craftGrid = [0, 0, 0, 0];
        for (var i = 0; i < 4; i++) {
            craftGrid.appendChild(_makeCraftSlotEl(i));
        }
        // Craft result
        var resultEl = panel.querySelector('#craft-result');
        resultEl.className = 'craft-slot craft-result-slot';
        resultEl.dataset.type = 'result';
    }

    function _makeSlotEl(type, slotIdx) {
        var el = document.createElement('div');
        el.className = 'inv-slot';
        el.dataset.type = type;
        el.dataset.idx  = slotIdx;
        var count = document.createElement('span');
        count.className = 'slot-count';
        el.appendChild(count);
        el.addEventListener('mousedown', _onSlotClick);
        return el;
    }

    function _makeCraftSlotEl(i) {
        var el = document.createElement('div');
        el.className = 'craft-slot';
        el.dataset.type = 'craft';
        el.dataset.idx  = i;
        var count = document.createElement('span');
        count.className = 'slot-count';
        el.appendChild(count);
        el.addEventListener('mousedown', _onSlotClick);
        return el;
    }

    function _onSlotClick(e) {
        e.preventDefault();
        if (!_inventory) return;
        var type = this.dataset.type;
        var idx  = parseInt(this.dataset.idx);

        if (type === 'inv') {
            // Swap hand ↔ slot
            var slot = _inventory.slots[idx];
            if (_inventory.hand && _inventory.hand.count > 0) {
                if (slot.id === 0) {
                    slot.id    = _inventory.hand.id;
                    slot.count = _inventory.hand.count;
                    _inventory.hand = null;
                } else {
                    var tmp = { id: slot.id, count: slot.count };
                    slot.id = _inventory.hand.id; slot.count = _inventory.hand.count;
                    _inventory.hand = tmp;
                }
            } else {
                if (slot.count > 0) {
                    _inventory.hand = { id: slot.id, count: slot.count };
                    slot.id = 0; slot.count = 0;
                }
            }
        } else if (type === 'craft') {
            var hand = _inventory ? _inventory.hand : null;
            if (hand && hand.count > 0) {
                _craftGrid[idx] = hand.id;
            } else {
                _craftGrid[idx] = 0;
            }
            _updateCraftResult();
        } else if (type === 'result') {
            if (_craftResult) {
                _inventory.add(_craftResult.output, _craftResult.count);
                _craftGrid = [0, 0, 0, 0];
                _craftResult = null;
            }
        }
        updateInventory();
    }

    function _updateCraftResult() {
        _craftResult = Crafting.craft2x2(_craftGrid);
        var resultEl = document.querySelector('.craft-result-slot');
        if (resultEl) {
            if (_craftResult) {
                resultEl.style.background = _blockColor(_craftResult.output);
                resultEl.querySelector('.slot-count').textContent = _craftResult.count > 1 ? _craftResult.count : '';
            } else {
                resultEl.style.background = '';
                resultEl.querySelector('.slot-count').textContent = '';
            }
        }
    }

    function _initEvents() {
        document.addEventListener('wheel', function (e) {
            if (_isOpen || !_inventory) return;
            e.preventDefault();
            _inventory.scroll(e.deltaY > 0 ? 1 : -1);
            updateInventory();
        }, { passive: false });

        document.addEventListener('keydown', function (e) {
            if (e.code === 'KeyE') toggleInventory();
            if (e.code === 'Escape') {
                if (_isOpen) closeAll(); else togglePause();
            }
            // Number keys 1-9 for hotbar
            var num = parseInt(e.key);
            if (!isNaN(num) && num >= 1 && num <= 9) {
                if (_inventory) { _inventory.selectSlot(num - 1); updateInventory(); }
            }
        });
    }

    function toggleInventory() {
        if (_activePanel === 'inventory') { closeAll(); return; }
        closeAll();
        _isOpen = true;
        _activePanel = 'inventory';
        if (els.inventoryPanel) els.inventoryPanel.style.display = 'block';
        document.exitPointerLock();
        updateInventory();
    }

    function togglePause() {
        if (_activePanel === 'pause') { closeAll(); return; }
        closeAll();
        _isOpen = true;
        _activePanel = 'pause';
        if (els.pauseMenu) els.pauseMenu.style.display = 'flex';
        document.exitPointerLock();
    }

    function closeAll() {
        _isOpen = false;
        _activePanel = null;
        if (els.inventoryPanel) els.inventoryPanel.style.display = 'none';
        if (els.pauseMenu)      els.pauseMenu.style.display      = 'none';
    }

    function isOpen() { return _isOpen; }

    // ─── Colours by block type ───────────────────────────────────────────────
    var BLOCK_COLORS = {
        [BLOCK.GRASS]:       '#5a8a2a',
        [BLOCK.DIRT]:        '#7a5a35',
        [BLOCK.STONE]:       '#888',
        [BLOCK.SAND]:        '#d4c875',
        [BLOCK.GRAVEL]:      '#999',
        [BLOCK.WATER]:       '#3060cc',
        [BLOCK.LOG]:         '#7a5520',
        [BLOCK.LEAVES]:      '#2a7a1a',
        [BLOCK.GLASS]:       '#99ccff',
        [BLOCK.PLANKS]:      '#b08040',
        [BLOCK.BRICK]:       '#c04030',
        [BLOCK.COBBLESTONE]: '#777',
        [BLOCK.OBSIDIAN]:    '#222235',
        [BLOCK.BEDROCK]:     '#333',
        [BLOCK.COAL_ORE]:    '#555',
        [BLOCK.IRON_ORE]:    '#c8a078',
        [BLOCK.GOLD_ORE]:    '#e8c020',
        [BLOCK.DIAMOND_ORE]: '#30d8e8',
        [BLOCK.EMERALD_ORE]: '#20b850',
        [BLOCK.SNOW]:        '#eeeeff',
        [BLOCK.ICE]:         '#88ccee',
        [BLOCK.CACTUS]:      '#3a7020',
        [BLOCK.CLAY]:        '#9099a8',
        [BLOCK.MARBLE]:      '#e8e4e0',
        [BLOCK.LIMESTONE]:   '#c8bc98',
        [BLOCK.BASALT]:      '#383840',
        [BLOCK.CRYSTAL]:     '#80c8ff',
        [BLOCK.GLOWSTONE]:   '#ffd840',
        [BLOCK.PUMPKIN]:     '#c87820',
        [BLOCK.MELON]:       '#60a030',
        [BLOCK.TNT]:         '#cc3333',
        [BLOCK.TERRACOTTA]:  '#a85040',
        [BLOCK.NETHERRACK]:  '#7a2020',
        [BLOCK.NETHER_BRICK]:'#5a1818',
        [BLOCK.PRISMARINE]:  '#40907e',
        [BLOCK.SEA_LANTERN]: '#aaddd0',
        [BLOCK.MYCELIUM]:    '#786488',
        [BLOCK.MOSSY_STONE]: '#608060',
        [BLOCK.BOOKSHELF]:   '#b09050',
        [BLOCK.SANDSTONE]:   '#d0bc80',
        [BLOCK.MAGMA]:       '#c04010',
    };

    function _blockColor(id) { return BLOCK_COLORS[id] || '#666'; }

    // ─── Public update methods ────────────────────────────────────────────────

    function updateInventory() {
        if (!_inventory) return;
        var hotbarSlots = document.querySelectorAll('.hotbar-slot');
        var invSlots    = document.querySelectorAll('.inv-slot[data-type="inv"]');

        // Hotbar
        hotbarSlots.forEach(function (el, i) {
            var slot = _inventory.slots[i];
            el.classList.toggle('selected', i === _inventory.hotbarIndex);
            el.style.background = slot.count > 0 ? _blockColor(slot.id) : '';
            var countEl = el.querySelector('.slot-count');
            if (countEl) countEl.textContent = slot.count > 1 ? slot.count : '';
        });

        // Inventory panel
        invSlots.forEach(function (el) {
            var idx  = parseInt(el.dataset.idx);
            var slot = _inventory.slots[idx];
            el.style.background = slot.count > 0 ? _blockColor(slot.id) : '';
            var countEl = el.querySelector('.slot-count');
            if (countEl) countEl.textContent = slot.count > 1 ? slot.count : '';
        });

        // Craft slots
        var craftSlots = document.querySelectorAll('.craft-slot[data-type="craft"]');
        craftSlots.forEach(function (el) {
            var idx = parseInt(el.dataset.idx);
            var id  = _craftGrid[idx] || 0;
            el.style.background = id ? _blockColor(id) : '';
        });
    }

    function updateHUD(player, sky, weather) {
        // Health
        if (els.health && player) {
            var hp = Math.round(player.health);
            els.health.innerHTML = '';
            for (var i = 0; i < 10; i++) {
                var heart = document.createElement('span');
                heart.className = 'heart';
                heart.textContent = i * 2 < hp ? '❤' : (i * 2 + 1 === hp ? '💔' : '🖤');
                els.health.appendChild(heart);
            }
        }
        // Hunger
        if (els.hunger && player) {
            var hg = Math.round(player.hunger);
            els.hunger.innerHTML = '';
            for (var i = 0; i < 10; i++) {
                var drum = document.createElement('span');
                drum.className = 'hunger';
                drum.textContent = i * 2 < hg ? '🍗' : '🦴';
                els.hunger.appendChild(drum);
            }
        }
        // Time
        if (els.time && sky) els.time.textContent = sky.getTimeString();
        // Weather
        if (els.weather && weather) {
            var icons = { clear:'☀', rain:'🌧', snow:'❄', storm:'⛈', blizzard:'🌨' };
            els.weather.textContent = icons[weather.current] || '';
        }
    }

    function updateCoords(x, y, z, biome) {
        if (els.coords) {
            els.coords.textContent = 'X:' + Math.floor(x) + ' Y:' + Math.floor(y) + ' Z:' + Math.floor(z);
        }
        if (els.biome && biome !== undefined) els.biome.textContent = 'Biome: ' + biome;
    }

    function updateFPS(fps) {
        if (els.fps) els.fps.textContent = fps + ' fps';
    }

    function showBreakProgress(progress, targetId) {
        if (els.breakProgress) {
            if (progress > 0) {
                els.breakProgress.style.display = 'block';
                els.breakBar.style.width = (progress * 100) + '%';
                if (els.blockName) els.blockName.textContent = blockName(targetId);
            } else {
                els.breakProgress.style.display = 'none';
            }
        }
    }

    function hideLoading() {
        if (els.loading) {
            els.loading.style.opacity = '0';
            setTimeout(function () {
                if (els.loading) els.loading.style.display = 'none';
            }, 800);
        }
    }

    function showLoading(text) {
        if (els.loading) {
            els.loading.style.display = 'flex';
            els.loading.style.opacity = '1';
            var el = els.loading.querySelector('#loading-text');
            if (el) el.textContent = text || 'Generating world…';
        }
    }

    function flashScreen(color, duration) {
        if (!els.flashOverlay) return;
        els.flashOverlay.style.background = color || 'rgba(255,255,255,0.4)';
        els.flashOverlay.style.opacity = '1';
        setTimeout(function () {
            if (els.flashOverlay) els.flashOverlay.style.opacity = '0';
        }, (duration || 0.1) * 1000);
    }

    function showTooltip(text) {
        if (!els.tooltip) return;
        els.tooltip.textContent = text;
        els.tooltip.style.opacity = '1';
        clearTimeout(els._ttTimeout);
        els._ttTimeout = setTimeout(function () {
            if (els.tooltip) els.tooltip.style.opacity = '0';
        }, 2000);
    }

    return {
        init: init,
        isOpen: isOpen,
        toggleInventory: toggleInventory,
        togglePause: togglePause,
        closeAll: closeAll,
        updateInventory: updateInventory,
        updateHUD: updateHUD,
        updateCoords: updateCoords,
        updateFPS: updateFPS,
        showBreakProgress: showBreakProgress,
        hideLoading: hideLoading,
        showLoading: showLoading,
        flashScreen: flashScreen,
        showTooltip: showTooltip,
        blockColor: function(id) { return BLOCK_COLORS[id] || '#666'; },
    };
}());
