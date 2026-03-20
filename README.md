# 🌿 Vinecraft

> **Ultra-realistic, browser-based voxel sandbox game — no install required.**
> Run it on any device: desktop, laptop, tablet, or phone.

[![Live Demo](https://img.shields.io/badge/play-online-brightgreen?style=for-the-badge)](https://alakmar344.github.io/vinecraft/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

---

## 🎮 What is Vinecraft?

Vinecraft is a high-quality, Minecraft-inspired voxel world built entirely in the browser using **Three.js** and the Web APIs. It features:

- 🌍 **Infinite procedural worlds** with 10 unique biomes
- 🪨 **46 block types** — including Marble, Basalt, Crystal & Prismarine (Vinecraft exclusives!)
- ⛏ **Block breaking & placing** with realistic hardness and tool types
- 🏔 **Caves, ore veins, geological strata** (realistic depth-based ore distribution)
- 🌲 **Trees, cacti, pumpkins, melons** — biome-appropriate vegetation
- ☀ **Dynamic day/night cycle** — sun, moon, stars, atmospheric sky
- 🌧 **Weather system** — Rain, Snow, Thunderstorms, Blizzards
- 🎒 **Inventory + 2×2 crafting** — build and combine blocks
- ❤ **Health & hunger** — survival mechanics
- 📱 **Mobile-friendly** — full touch controls with virtual joystick
- 🌟 **Ambient occlusion** — block corners darken realistically
- 🎨 **Procedural pixel-art textures** — hand-crafted block atlas
- 🔥 **Shadow mapping** — real-time directional shadows from the sun

---

## 🚀 Quick Start (No Install)

**Option 1 — Open directly in browser (simplest)**

1. Download / clone this repository
2. Open `index.html` in any modern browser (Chrome, Firefox, Safari, Edge)
3. Click the game window to lock your mouse and start playing!

```bash
# Clone the repository
git clone https://github.com/alakmar344/vinecraft.git

# Navigate to folder
cd vinecraft

# Open in your default browser (Linux/Mac)
xdg-open index.html   # Linux
open index.html       # macOS
start index.html      # Windows
```

**Option 2 — Local web server (recommended for best performance)**

```bash
# Using Python 3 (pre-installed on most systems)
cd vinecraft
python3 -m http.server 8080
# Then open: http://localhost:8080

# Using Node.js / npx
npx serve .
# Then open the URL shown in the terminal

# Using PHP
php -S localhost:8080
```

**Option 3 — Play online (GitHub Pages)**

Visit: **https://alakmar344.github.io/vinecraft/**

---

## 📋 System Requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| Browser | Chrome 80+ / Firefox 75+ | Chrome 110+ |
| RAM | 512 MB free | 2 GB |
| GPU | Any WebGL-capable GPU | Dedicated GPU |
| OS | Any (Windows, macOS, Linux, Android, iOS) | — |
| Internet | Only needed to load Three.js from CDN¹ | — |

> ¹ After first load, the game assets are cached and work offline.

---

## 🎮 Controls

### Desktop

| Action | Control |
|---|---|
| Move | WASD |
| Sprint | Hold Shift |
| Jump | Space |
| Look | Mouse |
| Break block | Hold Left Click |
| Place block | Right Click |
| Select hotbar | 1–9 or Scroll Wheel |
| Inventory | E |
| Toggle Fly | F |
| Pause | Escape |

### Mobile / Touch

| Action | Control |
|---|---|
| Move | Left-side swipe (joystick) |
| Look | Right-side swipe |
| Jump | ⬆ button |
| Fly | ✈ button |
| Break | ⛏ button (hold) |
| Place | 🪨 button |
| Inventory | 🎒 button |

---

## 🗺 Biomes

| Biome | Description |
|---|---|
| 🌾 Plains | Flat grasslands with scattered trees |
| 🌲 Forest | Dense oak woodland |
| 🏜 Desert | Sand, sandstone columns, cacti |
| 🏔 Mountains | Jagged peaks; snow caps above Y=85 |
| 🌴 Jungle | Very dense, tall trees |
| ❄ Tundra | Snow-covered flat terrain |
| 🌊 Ocean | Deep water; sandy floor; clay pockets |
| 🌵 Savanna | Dry grass; sparse flat trees |
| 🌿 Swamp | Waterlogged terrain; clay deposits |
| 🍄 Mushroom Island | Rare mycelium biome; mushroom trees |

---

## 💎 Vinecraft-Exclusive Features

Features **not in vanilla Minecraft**:

1. **Geological strata** — Marble, Limestone, and Basalt appear in realistic underground bands
2. **Crystal caves** — Luminous crystal formations in deep caverns
3. **Prismarine crafting** — Craft beautiful teal prismarine from crystals
4. **Blizzard weather** — A 5th extreme weather type with heavy wind
5. **Mushroom trees** — Giant mycelium-capped trees in the Mushroom Island biome
6. **Biome-aware ore distribution** — Emeralds only in mountain biomes, etc.
7. **Dynamic fog density** — Fog thickens during storms and blizzards
8. **Ambient occlusion** — Corners and crevices darken naturally
9. **Procedural textures** — Every block texture is generated programmatically (no image files)
10. **Infinite geology** — World generates unique rock formations every run

---

## 📁 Project Structure

```
vinecraft/
├── index.html          ← Main game page (open this!)
├── css/
│   └── style.css       ← HUD, inventory, menus, responsive layout
├── js/
│   ├── noise.js        ← Simplex noise (2D + 3D + fBm)
│   ├── blocks.js       ← Block definitions & properties (46 types)
│   ├── textures.js     ← Procedural pixel-art texture atlas
│   ├── chunk.js        ← Chunk class: storage + mesh generation
│   ├── world.js        ← World gen: terrain, biomes, caves, trees
│   ├── player.js       ← FPS controller: physics, collisions, interaction
│   ├── inventory.js    ← Inventory: 27 main + 9 hotbar slots
│   ├── crafting.js     ← Crafting recipes (2×2 and 3×3)
│   ├── sky.js          ← Sky dome, sun, moon, stars, day/night
│   ├── weather.js      ← Rain, snow, storm, blizzard particles
│   ├── ui.js           ← DOM HUD, menus, inventory UI
│   └── game.js         ← Main game loop & orchestration
├── docs/
│   ├── GAMEPLAY.md     ← Full gameplay guide
│   ├── BLOCKS.md       ← Block reference
│   └── CRAFTING.md     ← Crafting recipes
└── README.md           ← This file
```

---

## 🛠 Technical Details

| Technology | Usage |
|---|---|
| **Three.js r155** | 3D rendering, geometry, lighting, shadows |
| **WebGL** | Hardware-accelerated GPU rendering |
| **HTML5 Canvas** | Procedural texture atlas generation |
| **Pointer Lock API** | Mouse capture for FPS look |
| **Touch Events API** | Mobile joystick controls |
| **Web Audio API** | (planned — ambient sounds) |
| **Simplex Noise** | Terrain generation (hand-rolled, no libs) |

### Performance

- Chunks are 16×16×128 blocks (same as Minecraft)
- Render distance: **4 chunks** by default (= 64-block radius)
- Face culling: only visible faces are rendered
- Ambient occlusion baked into vertex colours (free GPU-wise)
- At most **2 chunk meshes rebuilt per frame** to avoid stutter
- Fog hides chunk load boundary seams

---

## 📖 Documentation

| Document | Description |
|---|---|
| [GAMEPLAY.md](docs/GAMEPLAY.md) | Controls, mechanics, tips |
| [BLOCKS.md](docs/BLOCKS.md) | All block types with properties |
| [CRAFTING.md](docs/CRAFTING.md) | All crafting recipes |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Ideas for Contributions

- [ ] Smelting furnace
- [ ] Mob AI (animals and hostile mobs)
- [ ] Sound effects (Web Audio API)
- [ ] Saving/loading worlds (IndexedDB)
- [ ] Multiplayer (WebSockets)
- [ ] More biomes (Mesa, Mangrove Swamp, Deep Ocean)
- [ ] Nether dimension
- [ ] Enchanting table
- [ ] Water physics (flowing water)
- [ ] Redstone mechanics

---

## 📜 License

**MIT License** — Free to use, modify, and distribute.

See [LICENSE](LICENSE) for full details.

---

## 🙏 Credits

- **Author**: AL-Aqmar Tinwala ([@alakmar344](https://github.com/alakmar344))
- **3D Engine**: [Three.js](https://threejs.org/) by Mr.doob & contributors
- **Noise Algorithm**: Stefan Gustavson's simplex noise (JS port)
- **Inspiration**: Minecraft® by Mojang / Microsoft (Vinecraft is an independent project)

---

*Vinecraft is not affiliated with, endorsed by, or sponsored by Mojang or Microsoft.*
