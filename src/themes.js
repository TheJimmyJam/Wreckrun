// themes.js — Phase 4 level themes. Rotates every THEME_CHANGE_METERS, cycling
// endlessly (this is an endless runner, so themes loop rather than stop).
// Only City has real background art right now — the rest fall back to a
// tinted color until their art (prompts already in ArtPrompts.md, Phase 4
// section) gets generated. bgSpriteKey just needs to exist in assets.js's
// manifest and the swap happens automatically once the PNG is real.

export const THEME_CHANGE_METERS = 450;

export const THEMES = [
  {
    id: "city",
    name: "City",
    bgSpriteKey: "bg_road_city",
    fallbackColor: "#4a4a4a",
    traction: 1.0,
    mix: { crate: 1.0, tower: 1.0, glass: 1.0, tnt: 1.0, pillar: 1.0 },
  },
  {
    id: "construction",
    name: "Construction Site",
    bgSpriteKey: "bg_construction",
    fallbackColor: "#6b5a44",
    traction: 1.0,
    mix: { crate: 1.0, tower: 1.4, glass: 0.6, tnt: 1.0, pillar: 1.1 },
  },
  {
    id: "junkyard",
    name: "Junkyard",
    bgSpriteKey: "bg_junkyard",
    fallbackColor: "#55503f",
    traction: 1.0,
    mix: { crate: 1.3, tower: 0.9, glass: 1.0, tnt: 1.3, pillar: 1.0 },
  },
  {
    id: "ice",
    name: "Ice",
    bgSpriteKey: "bg_ice",
    fallbackColor: "#cfe8ef",
    traction: 0.55, // slippery steering — the theme's signature mechanic
    mix: { crate: 1.0, tower: 0.9, glass: 1.2, tnt: 0.8, pillar: 1.3 },
  },
  {
    id: "night",
    name: "Night",
    bgSpriteKey: "bg_night",
    fallbackColor: "#24262b",
    traction: 1.0,
    mix: { crate: 1.0, tower: 1.0, glass: 1.0, tnt: 1.4, pillar: 1.1 },
  },
];

export function getThemeForDistance(distanceMeters) {
  const index = Math.floor(Math.max(0, distanceMeters) / THEME_CHANGE_METERS) % THEMES.length;
  return THEMES[index];
}
