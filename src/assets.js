// assets.js — sprite preloading. Falls back gracefully if an image 404s
// (game.js draws colored placeholder shapes for anything not yet loaded).

export const SPRITES = {
  car_default: "assets/sprites/car_default.png",
  crate_wood: "assets/sprites/crate_wood.png",
  block_brick: "assets/sprites/block_brick.png",
  pillar_concrete: "assets/sprites/pillar_concrete.png",
  glass_pane: "assets/sprites/glass_pane.png",
  tnt_barrel: "assets/sprites/tnt_barrel.png",
  bg_road_city: "assets/sprites/bg_road_city.png",
  // Phase 4 theme backgrounds — not generated yet, so these 404 and resolve to
  // null (see loadOne below); game.js falls back to each theme's flat color
  // until the real PNGs land in assets/sprites/ (prompts in ArtPrompts.md).
  bg_construction: "assets/sprites/bg_construction.png",
  bg_junkyard: "assets/sprites/bg_junkyard.png",
  bg_ice: "assets/sprites/bg_ice.png",
  bg_night: "assets/sprites/bg_night.png",
};

function loadOne(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // missing/broken asset — caller falls back to placeholder shape
    img.src = src;
  });
}

/**
 * Loads every sprite in the manifest. Never rejects — entries that fail to
 * load resolve to null so the game can fall back to placeholder rendering.
 */
export async function loadAssets() {
  const entries = Object.entries(SPRITES);
  const images = await Promise.all(entries.map(([, src]) => loadOne(src)));
  const result = {};
  entries.forEach(([key], i) => (result[key] = images[i]));
  return result;
}
