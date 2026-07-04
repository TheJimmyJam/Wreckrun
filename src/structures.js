// structures.js — target/hazard definitions (Phase 1 set: crate, brick tower, concrete pillar)
// Placeholder art: colored rectangles. Real sprites drop in at Phase 2.

import { CATEGORY } from "./physics.js";

export const TYPES = {
  CRATE: "crate",
  TOWER_BLOCK: "tower_block",
  PILLAR: "pillar",
};

// Visual + gameplay constants per type
export const DEFS = {
  [TYPES.CRATE]: {
    color: "#b57b3d",
    strokeColor: "#7a5228",
    sprite: "crate_wood",
    size: 44,
    mass: 3,
    points: 10,
    kickback: 0.04,      // fraction of current speed shaved off
    damage: 2,
    destructible: true,
  },
  [TYPES.TOWER_BLOCK]: {
    color: "#b04632",
    strokeColor: "#7a2e20",
    sprite: "block_brick",
    size: 40,
    mass: 6,
    points: 18,
    kickback: 0.09,
    damage: 6,
    destructible: true,
  },
  [TYPES.PILLAR]: {
    color: "#8a8f99",
    strokeColor: "#4b4f57",
    sprite: "pillar_concrete",
    size: 50,
    mass: 999,
    points: 0,
    kickback: 0.55,
    damage: 30,
    destructible: false,
  },
};

let bodyIdCounter = 1;

/**
 * Create a single physics body for a target type at a world position.
 */
export function createStructureBody(Bodies, type, x, y, extra = {}) {
  const def = DEFS[type];
  const isHazard = type === TYPES.PILLAR;
  const body = Bodies.rectangle(x, y, def.size, def.size, {
    isStatic: isHazard, // pillars never move; crates/towers are dynamic from the start
    frictionAir: 0.12,
    friction: 0.4,
    restitution: 0.15,
    density: 0.01 * def.mass,
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
