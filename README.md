# Bonus Run

## About
**Bonus Run** is a retro arcade 2D platformer inspired by classic mobile titles. Built with vanilla HTML5, CSS3, and JavaScript Canvas API, it features tight physics, coin collection, dynamic obstacles, and an upgradeable Ability Shop with persistent `localStorage` progress.

## Features
- 🕹️ **Retro Aesthetic:** Pixel-art inspired visuals with custom canvas rendering.
- ⚙️ **Real Physics & Controls:** Acceleration, friction, gravity, jump mechanics, and mobile touch support.
- 🧲 **Ability Shop:** Purchase Speed Boosts, Double Jump, Shields, and Coin Magnets.
- 💾 **Persistence:** Player names, high scores, and shop progress saved securely via `localStorage`.
- 🔊 **Procedural Audio:** Synthesized sound effects using the Web Audio API without external audio files.

## Controls
- **Movement:** `A` / `D` or `←` / `→` keys
- **Jump:** `Space`, `W`, or `↑` key
- **Pause:** `ESC` or pause button
- **Mobile:** On-screen touch buttons for left, right, and jump.

## Abilities
1. **Speed Boost:** Increases movement speed (Upgradable to Level 3).
2. **Double Jump:** Allows a second jump while airborne.
3. **Shield:** Absorbs one obstacle collision.
4. **Coin Magnet:** Automatically pulls nearby coins toward the player.

## How to Run Locally
1. Clone or download the repository.
2. Open `index.html` in any modern web browser or serve via a local static server (e.g., Live Server in VS Code).

## GitHub Pages Deployment
1. Create a new repository on GitHub.
2. Push all project files (`index.html`, `style.css`, `game.js`, `README.md`) to the `main` branch.
3. Go to your repository **Settings** → **Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Choose the `main` branch and `/ (root)` folder, then click **Save**.
6. Access your deployed game via the provided GitHub Pages URL!

## Technologies
- HTML5 Canvas
- CSS3 (Retro Typography & Responsive Layout)
- Vanilla JavaScript (ES6+ Classes, Game Loop, AABB Collision)
- Web Audio API

## Project Structure
```text
bonus-game/
├── index.html
├── style.css
├── game.js
└── README.md
