# Vinecraft – Gameplay Guide

## Overview

Vinecraft is a browser-based, ultra-realistic voxel sandbox game inspired by Minecraft. It runs entirely in your browser using WebGL — no installation, no plugins, no downloads beyond opening the page.

---

## Controls

### Desktop (Mouse & Keyboard)

| Action | Key / Button |
|---|---|
| Move forward / backward | W / S |
| Strafe left / right | A / D |
| Sprint | Hold Shift |
| Jump | Space |
| Look around | Move mouse |
| Break block | Hold Left Mouse Button |
| Place block | Right Mouse Button |
| Select hotbar slot | 1 – 9 or Scroll Wheel |
| Open / close Inventory | E |
| Toggle Fly mode | F |
| Pause / Resume | Escape |

### Mobile (Touch)

| Action | Touch |
|---|---|
| Move | Left joystick (left half of screen) |
| Look | Right joystick (right half of screen) |
| Jump | ⬆ button |
| Toggle Fly | ✈ button |
| Break block | ⛏ button (hold) |
| Place block | 🪨 button |
| Open Inventory | 🎒 button |

---

## Game Systems

### Health & Hunger

- You have **10 hearts (20 HP)** and **10 drumsticks (20 hunger)**.
- Hunger depletes over time (every 30 seconds).
- When hunger is ≥ 18/20, health regenerates at 1 HP/second.
- Fall damage: falling below Y = -10 deals 4 hearts and teleports you back to surface.

### Day / Night Cycle

- A full day lasts **10 minutes** (real time).
- 6:00 AM → Sunrise; 12:00 → Noon; 18:00 → Sunset; 0:00 → Midnight.
- Sky colour, fog, and lighting change dynamically.
- Stars appear at night; sun and moon orbit the sky.

### Weather System

Weather changes randomly every 1–4 minutes:

| Weather | Effect |
|---|---|
| ☀ Clear | Bright; low fog |
| 🌧 Rain | Particles; medium fog |
| ⛈ Storm | Heavy rain + lightning + fog |
| ❄ Snow | Snowflakes; medium fog |
| 🌨 Blizzard | Dense snowflakes + wind + thick fog |

### Biomes

| Biome | Features |
|---|---|
| Plains | Flat grassy land; oak trees |
| Forest | Dense oak trees |
| Desert | Sand, sandstone, cacti |
| Mountains | Steep stone peaks, snow caps |
| Jungle | Very dense trees |
| Tundra | Snow covered; sparse trees |
| Ocean | Deep water; sandy floor |
| Savanna | Dry grass; scattered trees |
| Swamp | Waterlogged terrain; clay |
| Mushroom Island | Mycelium ground; mushroom trees |

### Caves & Underground

- Caves are procedurally carved using 3D simplex noise.
- Crystal formations spawn in deep caves (emit soft light).
- Underground features geological layers: marble, limestone, basalt.

### World Generation

- The world is **infinite** (chunks are generated as you explore).
- Terrain uses fractal Brownian motion (6-octave simplex noise).
- Ore distribution matches realistic geological depth:
  - **Bedrock**: Y 0–4
  - **Diamond**: Y 0–20 (rare)
  - **Gold / Redstone / Lapis**: Y 0–35
  - **Iron / Coal**: Y 0–64 (common)
  - **Emerald**: Y 0–15 (very rare)

---

## Fly Mode

Press **F** to toggle flying. While flying:
- **Space** — fly up
- **Shift** — fly down
- WASD — move horizontally
- No gravity applies

---

## Tips

1. Start by collecting wood (break oak logs with bare hands).
2. Open the inventory (E) and use the 2×2 crafting grid to make planks.
3. Build a shelter before nightfall.
4. Dig downward to find ores — bring torches (place Glowstone).
5. Snow biomes have **Ice** and **Snow** blocks; hot biomes have **Terracotta**.
6. Right-click an empty space to place the selected hotbar block.
7. Use Fly mode (F) to explore the world faster.
