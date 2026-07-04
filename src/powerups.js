// powerups.js — Phase 5 smash-to-collect power-up tokens + coin pickups.
// No unique art yet (Phase 5 art pack has the token prompts) — tokens render
// as colored circles with a letter icon until that art lands; same
// auto-swap-when-the-sprite-exists pattern used for cars/themes.

import { CATEGORY } from "./physics.js";

export const POWERUP_TYPES = {
  BOOST: "boost",
  RAM: "ram",
  MAGNET: "magnet",
  PLOW: "plow",
  SLOWMO: "slowMo",
};

export const POWERUP_DEFS = {
  [POWERUP_TYPES.BOOST]: {
    label: "BOOST",
    icon: "B",
    color: "#ff8a3d",
    durationMs: 4000,
    sprite: "powerup_boost",
  },
  [POWERUP_TYPES.RAM]: {
    label: "INVINCIBLE RAM",
    icon: "R",
    color: "#c94b4b",
    durationMs: 3500,
    sprite: "powerup_ram",
  },
  [POWERUP_TYPES.MAGNET]: {
    label: "COIN MAGNET",
    icon: "M",
    color: "#e0c93f",
    durationMs: 6000,
    sprite: "powerup_magnet",
    pullRadius: 220,
  },
  [POWERUP_TYPES.PLOW]: {
    label: "PLOW BLADE",
    icon: "P",
    color: "#4f9bd9",
    durationMs: 6000,
    sprite: "powerup_plow",
  },
  [POWERUP_TYPES.SLOWMO]: {
    label: "SLOW-MO",
    icon: "S",
    color: "#7d5fd1",
    durationMs: 3000,
    sprite: "powerup_slowmo",
    timeScale: 0.45,
  },
};

export const POWERUP_ORDER = Object.values(POWERUP_TYPES);

export const POWERUP_TOKEN_SIZE = 34;
export const POWERUP_SPAWN_CHANCE_PER_ROW = 0.05; // rolled once per spawned row

export const COIN_PICKUP = {
  size: 22,
  value: 3, // coins granted instantly on pickup
  sprite: "coin",
  color: "#f2c94c",
};
export const COIN_SPAWN_CHANCE_PER_ROW = 0.35;

let pickupIdCounter = 1;

/** A power-up token: sensor body, only ever interacts with the car. */
export function createPowerupBody(Bodies, powerupType, x, y) {
  const def = POWERUP_DEFS[powerupType];
  const body = Bodies.circle(x, y, POWERUP_TOKEN_SIZE / 2, {
    isStatic: true,
    isSensor: true,
    collisionFilter: { category: CATEGORY.PICKUP, mask: CATEGORY.CAR },
    label: `powerup:${powerupType}:${pickupIdCounter++}`,
  });
  body.wreckrun = { pickupKind: "powerup", powerupType, def, collected: false };
  return body;
}

/** A coin pickup: sensor body, instant coin grant on touch. */
export function createCoinBody(Bodies, x, y) {
  const body = Bodies.circle(x, y, COIN_PICKUP.size / 2, {
    isStatic: true,
    isSensor: true,
    collisionFilter: { category: CATEGORY.PICKUP, mask: CATEGORY.CAR },
    label: `coin:${pickupIdCounter++}`,
  });
  body.wreckrun = { pickupKind: "coin", def: COIN_PICKUP, collected: false };
  return body;
}
