// spawner.js — procedural structure/hazard generation.
// Phase 4: hazard mix now varies by theme (themes.js) and lane density ramps
// up with distance — but never fills all 3 lanes, so there's always at least
// one safe line through, per the design doc.

import { TYPES, createStructureBody, createTower } from "./structures.js";
import { getThemeForDistance } from "./themes.js";

const SPAWN_SPACING_BASE = 260;   // world units between spawn rows at start
const SPAWN_SPACING_MIN = 150;    // tightens as distance increases (difficulty ramp)
const SPACING_TIGHTEN_PER_METER = 0.35;

const DESPAWN_BEHIND = 900;       // remove bodies this far behind the car

export class Spawner {
  constructor(Bodies, roadWidth) {
    this.Bodies = Bodies;
    this.roadWidth = roadWidth;
    this.nextSpawnY = -400; // first row ahead of car start
    this.active = []; // all structure bodies currently in the world
  }

  reset(startY) {
    this.nextSpawnY = startY - 400;
    this.active = [];
  }

  _spacingFor(distanceMeters) {
    return Math.max(
      SPAWN_SPACING_MIN,
      SPAWN_SPACING_BASE - distanceMeters * SPACING_TIGHTEN_PER_METER
    );
  }

  /**
   * Called every frame. carY is the car's current world y (decreasing = forward).
   * Spawns new rows ahead of the car and reports newly-created bodies so the
   * caller can add them to the Matter world.
   */
  update(carY, distanceMeters) {
    const created = [];
    const spawnAhead = 1100; // spawn rows this far above (ahead of) the car
    while (this.nextSpawnY > carY - spawnAhead) {
      created.push(...this._spawnRow(this.nextSpawnY, distanceMeters));
      this.nextSpawnY -= this._spacingFor(distanceMeters);
    }
    return created;
  }

  _spawnRow(y, distanceMeters) {
    const created = [];
    const margin = 50;
    const usableWidth = this.roadWidth - margin * 2;
    const laneCount = 3;
    const laneWidth = usableWidth / laneCount;
    const lanes = [0, 1, 2];

    // Lane density ramp: more likely to fill 2 of 3 lanes as distance grows,
    // but NEVER all 3 — the doc requires at least one safe line every row.
    const pTwoLanes = Math.min(0.85, 0.35 + distanceMeters * 0.0006);
    const numFilled = Math.random() < pTwoLanes ? 2 : 1;
    const shuffled = lanes.sort(() => Math.random() - 0.5);
    const filledLanes = shuffled.slice(0, numFilled);

    const theme = getThemeForDistance(distanceMeters);

    for (const lane of filledLanes) {
      const laneCenterX = margin + laneWidth * lane + laneWidth / 2;
      const jitter = (Math.random() - 0.5) * laneWidth * 0.3;
      const x = laneCenterX + jitter;

      created.push(...this._pickAndCreate(x, y, distanceMeters, theme));
    }

    this.active.push(...created);
    return created;
  }

  /** Weighted type pick for one spawn point, scaled by distance + theme mix. */
  _pickAndCreate(x, y, distanceMeters, theme) {
    // Base weights (before theme multipliers) are proportions, not independent
    // probabilities — they're normalized by their sum below, so every theme's
    // mix multipliers actually shift the odds instead of just being additive
    // on top of an implicit "whatever's left over goes to crates" default.
    const weights = [
      { type: TYPES.PILLAR, w: Math.min(0.18, 0.05 + distanceMeters * 0.0004) * theme.mix.pillar },
      { type: TYPES.TNT, w: Math.min(0.14, 0.04 + distanceMeters * 0.0003) * theme.mix.tnt },
      { type: TYPES.TOWER_BLOCK, w: 0.28 * theme.mix.tower },
      { type: TYPES.GLASS, w: 0.18 * theme.mix.glass },
      { type: TYPES.CRATE, w: 0.32 * theme.mix.crate },
    ];
    const total = weights.reduce((sum, e) => sum + e.w, 0);
    let roll = Math.random() * total;
    for (const { type, w } of weights) {
      if (roll < w) {
        if (type === TYPES.TOWER_BLOCK) {
          return createTower(this.Bodies, x, y, 2 + Math.floor(Math.random() * 2));
        }
        return [createStructureBody(this.Bodies, type, x, y)];
      }
      roll -= w;
    }
    return [createStructureBody(this.Bodies, TYPES.CRATE, x, y)]; // floating-point fallback
  }

  /** Returns bodies that have scrolled far behind the car and should be removed. */
  collectDespawned(carY) {
    const gone = this.active.filter((b) => b.position.y > carY + DESPAWN_BEHIND);
    this.active = this.active.filter((b) => b.position.y <= carY + DESPAWN_BEHIND);
    return gone;
  }

  removeBody(body) {
    this.active = this.active.filter((b) => b.id !== body.id);
  }
}
