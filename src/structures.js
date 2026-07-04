// structures.js — target/hazard definitions.
// Phase 1 set: crate, brick tower, concrete pillar (placeholder art).
// Phase 4 adds: glass pane (free points, litters debris) and TNT barrel
// (chain-detonates nearby TNT, big knockback) — real art for both already
// dropped in during Phase 2.

import { CATEGORY } from "./physics.js";

export const TYPES = {
  CRATE: "crate",
  TOWER_BLOCK: "tower_block",
  PILLAR: "pillar",
  GLASS: "glass",
  TNT: "tnt",
};

// Visual + gameplay constants per type
export const DEFS = {
  [TYPES.CRATE]: {
    color: "#b57b3d",
    strokeColor: "#7a5228",
    sprite: "crate_wood",
    size: 44,
    // Car is ~51 mass units (see car.js). Crates must be much lighter than
    // that or they read as immovable walls instead of stuff you smash through.
    density: 0.0026, // -> mass ~5 at this size
    frictionAir: 0.025,
    points: 10,
    kickback: 0.04,      // fraction of current speed shaved off
    // Per the design doc's target table: crates are "almost none [risk] —
    // free points." No health cost at all — the only "risk" is the tiny
    // speed kickback. This is the thing that makes the greedy line worth it.
    damage: 0,
    destructible: true,
  },
  [TYPES.TOWER_BLOCK]: {
    color: "#b04632",
    strokeColor: "#7a2e20",
    sprite: "block_brick",
    size: 40,
    density: 0.0075, // -> mass ~12: heavier than a crate, still far lighter than the car
    frictionAir: 0.03,
    points: 18,
    kickback: 0.09,
    // Doc calls tower risk "Med" (vs. crate's "almost none" and pillar's
    // "severe") — a real but survivable cost, not a fast track to zero health.
    damage: 3,
    destructible: true,
  },
  [TYPES.PILLAR]: {
    color: "#8a8f99",
    strokeColor: "#4b4f57",
    sprite: "pillar_concrete",
    size: 50,
    density: 0.05, // irrelevant while isStatic, kept sane in case that ever changes
    frictionAir: 0.12,
    points: 0,
    kickback: 0.55,
    damage: 30,
    destructible: false,
    isHazard: true, // static, indestructible
  },
  [TYPES.GLASS]: {
    color: "#5fb3c9",
    strokeColor: "#2f6b7a",
    sprite: "glass_pane",
    size: 40,
    density: 0.002, // very light — "none [risk], but debris litters the lane"
    frictionAir: 0.02,
    points: 15,
    kickback: 0.02,
    damage: 0, // doc: glass risk is "None, but debris litters the lane" — no health cost
    destructible: true,
  },
  [TYPES.TNT]: {
    color: "#c23b2c",
    strokeColor: "#7a1f14",
    sprite: "tnt_barrel",
    size: 46,
    density: 0.004,
    frictionAir: 0.02,
    points: 30, // "High" per doc's target table
    kickback: 0.22, // "Big blast knock-back"
    damage: 12, // "can clear or can hurt" — real cost, well short of the pillar's severe hit
    destructible: true,
    explosionRadius: 150, // chain-detonates other unhit TNT barrels within this radius
  },
};

let bodyIdCounter = 1;

/**
 * Create a single physics body for a target type at a world position.
 */
export function createStructureBody(Bodies, type, x, y, extra = {}) {
  const def = DEFS[type];
  const isHazard = !!def.isHazard;
  const body = Bodies.rectangle(x, y, def.size, def.size, {
    isStatic: isHazard, // pillars never move; everything else is dynamic from the start
    frictionAir: def.frictionAir,
    friction: 0.4,
    restitution: 0.15,
    density: def.density,
    collisionFilter: {
      category: isHazard ? CATEGORY.HAZARD : CATEGORY.STRUCTURE,
      mask: CATEGORY.CAR | CATEGORY.STRUCTURE | CATEGORY.WALL,
    },
    label: `structure:${type}:${bodyIdCounter++}`,
    ...extra,
  });
  body.wreckrun = {
    type,
    def,
    hit: false,
    spawnY: y,
  };
  return body;
}

/**
 * A brick tower is a small vertical stack of tower blocks (compound via
 * separate bodies, not a single Composite, so each brick topples/scatters
 * independently once smashed).
 */
export function createTower(Bodies, x, baseY, blockCount = 3) {
  const def = DEFS[TYPES.TOWER_BLOCK];
  const bodies = [];
  for (let i = 0; i < blockCount; i++) {
    const y = baseY - i * (def.size - 4); // slight overlap so it reads as a stack
    bodies.push(createStructureBody(Bodies, TYPES.TOWER_BLOCK, x, y));
  }
  return bodies;
}
