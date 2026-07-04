// spawner.js — procedural structure/hazard generation
// Phase 1 set only: crates, brick towers, one hazard (concrete pillar).

import { TYPES, createStructureBody, createTower } from "./structures.js";

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

    // Weighted pick of row layout. Always leave a "safe line" per the design doc.
    const roll = Math.random();
    const laneCount = 3;
    const laneWidth = usableWidth / laneCount;
    const lanes = [0, 1, 2];

    // Pick which lanes get something; always keep at least one lane clear.
    const numFilled = 1 + Math.floor(Math.random() * 2); // 1 or 2 of 3 lanes filled
    const shuffled = lanes.sort(() => Math.random() - 0.5);
    const filledLanes = shuffled.slice(0, numFilled);

    for (const lane of filledLanes) {
      const laneCenterX = margin + laneWidth * lane + laneWidth / 2;
      const jitter = (Math.random() - 0.5) * laneWidth * 0.3;
      const x = laneCenterX + jitter;

      const pillarChance = Math.min(0.18, 0.05 + distanceMeters * 0.0004);
      const towerChance = 0.35;

      if (Math.random() < pillarChance) {
        created.push(createStructureBody(this.Bodies, TYPES.PILLAR, x, y));
      } else if (Math.random() < towerChance) {
        created.push(...createTower(this.Bodies, x, y, 2 + Math.floor(Math.random() * 2)));
      } else {
        created.push(createStructureBody(this.Bodies, TYPES.CRATE, x, y));
      }
    }

    this.active.push(...created);
    return created;
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
