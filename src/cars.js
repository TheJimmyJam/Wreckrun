// cars.js — Phase 3 vehicle roster. Real trade-offs per the design doc:
// width, mass/speed, and how much a car shrugs off (or suffers from) impacts.
// No unique art yet (Phase 3 art pack has extra-car prompts) — non-default
// cars render as a tinted version of car_default.png until that art lands.

export const CAR_DEFS = {
  sedan: {
    id: "sedan",
    name: "Sedan",
    price: 0, // owned from the start
    width: 40,
    height: 64,
    density: 0.02,
    speedMult: 1.0,
    healthMult: 1.0,
    kickbackResistance: 1.0, // multiplier on incoming kickback (lower = shrugs it off better)
    damageResistance: 1.0,   // multiplier on incoming damage
    lateralAccelMult: 1.0,   // steering agility
    tint: null,
    trait: "Balanced all-rounder. No weaknesses, no superpowers.",
  },
  plow_truck: {
    id: "plow_truck",
    name: "The Plow",
    price: 500,
    width: 60,
    height: 66,
    density: 0.028,
    speedMult: 0.85,
    healthMult: 1.3,
    kickbackResistance: 0.6,
    damageResistance: 0.7,
    lateralAccelMult: 0.8,
    tint: "#3a6ea8",
    trait: "Wide plow blade shrugs off smashes — but turns like a boat.",
  },
  hot_rod: {
    id: "hot_rod",
    name: "Hot Rod",
    price: 500,
    width: 34,
    height: 60,
    density: 0.016,
    speedMult: 1.25,
    healthMult: 0.75,
    kickbackResistance: 1.3,
    damageResistance: 1.3,
    lateralAccelMult: 1.1,
    tint: "#e0b400",
    trait: "Blistering top speed, glass-cannon durability.",
  },
  armored_van: {
    id: "armored_van",
    name: "Armored Van",
    price: 900,
    width: 48,
    height: 70,
    density: 0.03,
    speedMult: 0.75,
    healthMult: 1.6,
    kickbackResistance: 0.5,
    damageResistance: 0.6,
    lateralAccelMult: 0.75,
    tint: "#3a8a4a",
    trait: "Built like a tank. Drives like one too.",
  },
  buggy: {
    id: "buggy",
    name: "Nimble Buggy",
    price: 700,
    width: 30,
    height: 50,
    density: 0.014,
    speedMult: 1.0,
    healthMult: 0.65,
    kickbackResistance: 1.4,
    damageResistance: 1.4,
    lateralAccelMult: 1.4,
    tint: "#d9722a",
    trait: "Threads gaps like nothing else — but one big hit ends the run.",
  },
};

export const CAR_ORDER = ["sedan", "plow_truck", "hot_rod", "armored_van", "buggy"];

// --- Upgrades (armor: +max health per level, speed: +top speed per level) ---
export const UPGRADE_COSTS = [200, 400, 700, 1100, 1600]; // cost to buy level N (index 0 = level 1)
export const MAX_UPGRADE_LEVEL = UPGRADE_COSTS.length;

export const ARMOR_HEALTH_PER_LEVEL = 10;  // flat max-health bonus per level
export const SPEED_BONUS_PER_LEVEL = 0.05; // +5% top speed per level

export function coinsEarnedForRun(score) {
  return Math.floor(score / 5);
}
