// car.js — player car: steering, forward speed, health/damage
// Phase 3: stats now come from a car definition (cars.js) + upgrade levels
// (economy.js) instead of fixed constants, so different vehicles/upgrades
// actually change how the car handles.

import { CATEGORY } from "./physics.js";
import { CAR_DEFS, ARMOR_HEALTH_PER_LEVEL, SPEED_BONUS_PER_LEVEL } from "./cars.js";

const PLOW_WIDTH_MULT = 1.5;
const BOOST_SPEED_MULT = 1.6;

// Sedan's dimensions, kept as the default export for anything that hasn't
// been updated to read per-instance car.width/car.height.
export const CAR_WIDTH = CAR_DEFS.sedan.width;
export const CAR_HEIGHT = CAR_DEFS.sedan.height;

const BASE_FORWARD_SPEED = 4.2;   // world units/frame-ish (scaled by dt)
const MAX_FORWARD_SPEED = 9.5;
const SPEED_RAMP_PER_METER = 0.006;

const LATERAL_ACCEL = 0.9;
const LATERAL_MAX = 6.5;
const LATERAL_DAMPING = 0.85; // applied when no input (straighten out)

const BASE_MAX_HEALTH = 100;

export class Car {
  constructor(Bodies, x, y, carDef = CAR_DEFS.sedan, upgrades = { armorLevel: 0, speedLevel: 0 }) {
    this.carDef = carDef;
    this.width = carDef.width;
    this.height = carDef.height;

    this.body = Bodies.rectangle(x, y, this.width, this.height, {
      frictionAir: 0.05,
      friction: 0.2,
      restitution: 0.1,
      density: carDef.density,
      collisionFilter: {
        category: CATEGORY.CAR,
        mask: CATEGORY.STRUCTURE | CATEGORY.HAZARD | CATEGORY.WALL | CATEGORY.PICKUP,
      },
      label: "car",
    });

    this.maxHealth = Math.round(BASE_MAX_HEALTH * carDef.healthMult + upgrades.armorLevel * ARMOR_HEALTH_PER_LEVEL);
    this.health = this.maxHealth;
    this.speedMult = carDef.speedMult * (1 + upgrades.speedLevel * SPEED_BONUS_PER_LEVEL);
    this.speedPenalty = 0;      // temporary slowdown from impacts, decays over time
    this.spinOutMs = 0;         // brief control loss after a hazard hit
    this.distanceMeters = 0;
    this.alive = true;
    this.traction = 1.0;        // set each frame by game.js from the current theme (ice = slippery)

    // Phase 5 power-up timers (ms remaining). Decremented in update() on raw
    // wall-clock dt, not the slow-mo-scaled dt, so a buff's duration always
    // means the same thing regardless of whether slow-mo is also active.
    this.buffs = { boostMs: 0, ramMs: 0, magnetMs: 0, plowMs: 0, slowMoMs: 0 };
  }

  get isRamming() {
    return this.buffs.ramMs > 0 || this.buffs.boostMs > 0;
  }

  get forwardSpeed() {
    const boostMult = this.buffs.boostMs > 0 ? BOOST_SPEED_MULT : 1;
    const ramped = Math.min(
      MAX_FORWARD_SPEED * this.speedMult * boostMult,
      (BASE_FORWARD_SPEED + this.distanceMeters * SPEED_RAMP_PER_METER) * this.speedMult * boostMult
    );
    return Math.max(1.5, ramped - this.speedPenalty);
  }

  /** Activates a power-up's effect for durationMs. Widening for Plow Blade is
   *  applied here as a one-time body scale so repeated pickups don't compound. */
  applyBuff(Body, type, durationMs) {
    if (type === "plow" && this.buffs.plowMs <= 0) {
      Body.scale(this.body, PLOW_WIDTH_MULT, 1);
      this.width *= PLOW_WIDTH_MULT;
    }
    this.buffs[`${type}Ms`] = Math.max(this.buffs[`${type}Ms`] ?? 0, durationMs);
  }

  applyImpact(kickbackFraction, damage) {
    if (this.isRamming) return; // Boost/Invincible Ram: plow through, no cost at all
    const resistedKickback = kickbackFraction * this.carDef.kickbackResistance;
    const resistedDamage = damage * this.carDef.damageResistance;
    this.speedPenalty += this.forwardSpeed * resistedKickback * 2.2;
    this.health = Math.max(0, this.health - resistedDamage);
    if (resistedDamage >= 20) this.spinOutMs = 420;
    if (this.health <= 0) this.alive = false;
  }

  update(Body, steerInput, dtMs, rawDtMs = dtMs) {
    const dtScale = dtMs / 16.6667; // normalize to ~60fps steps

    // Buff countdowns run on rawDtMs (real wall-clock time), not dtMs, which
    // game.js may have scaled down for the Slow-Mo power-up — otherwise
    // Slow-Mo would extend its own duration by slowing its own countdown.
    for (const key of Object.keys(this.buffs)) {
      if (this.buffs[key] > 0) this.buffs[key] = Math.max(0, this.buffs[key] - rawDtMs);
    }
    if (this.buffs.plowMs <= 0 && this.width !== this.carDef.width) {
      // Plow Blade just expired — shrink back to the car's normal width.
      Body.scale(this.body, this.carDef.width / this.width, 1);
      this.width = this.carDef.width;
    }

    // Decay temporary speed penalty back toward zero
    this.speedPenalty = Math.max(0, this.speedPenalty - 0.06 * dtScale);
    if (this.spinOutMs > 0) this.spinOutMs = Math.max(0, this.spinOutMs - dtMs);

    // Invincible Ram / Boost: "plow through anything, including pillars."
    // Dropping HAZARD from the collision mask means the car physically passes
    // through the pillar instead of just not taking damage from it — a real
    // collisionFilter change, not only a gameplay-side damage skip.
    this.body.collisionFilter.mask = this.isRamming
      ? CATEGORY.STRUCTURE | CATEGORY.WALL | CATEGORY.PICKUP
      : CATEGORY.STRUCTURE | CATEGORY.HAZARD | CATEGORY.WALL | CATEGORY.PICKUP;

    // Steering: reduced authority mid spin-out, and on ice (this.traction < 1)
    // both the steering response and the "straighten out" damping are weaker,
    // so the car keeps sliding instead of snapping back — the ice theme's
    // signature mechanic.
    const control = (this.spinOutMs > 0 ? 0.25 : 1) * this.carDef.lateralAccelMult * this.traction;
    const damping = 1 - (1 - LATERAL_DAMPING) * this.traction;
    let vx = this.body.velocity.x;
    if (steerInput !== 0) {
      vx += steerInput * LATERAL_ACCEL * control * dtScale;
      vx = Math.max(-LATERAL_MAX, Math.min(LATERAL_MAX, vx));
    } else {
      vx *= Math.pow(damping, dtScale);
    }

    const vy = -this.forwardSpeed; // negative y = forward (up-screen)

    Body.setVelocity(this.body, { x: vx, y: vy });

    // Track distance from forward motion (in "meters", 1 world unit ~ 0.05m)
    this.distanceMeters += this.forwardSpeed * dtScale * 0.05;
  }

  get healthFraction() {
    return this.health / this.maxHealth;
  }
}
