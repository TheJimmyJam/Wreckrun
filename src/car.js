// car.js — player car: steering, forward speed, health/damage

import { CATEGORY } from "./physics.js";

export const CAR_WIDTH = 40;
export const CAR_HEIGHT = 64;

const BASE_FORWARD_SPEED = 4.2;   // world units/frame-ish (scaled by dt)
const MAX_FORWARD_SPEED = 9.5;
const SPEED_RAMP_PER_METER = 0.006;

const LATERAL_ACCEL = 0.9;
const LATERAL_MAX = 6.5;
const LATERAL_DAMPING = 0.85; // applied when no input (straighten out)

const MAX_HEALTH = 100;

export class Car {
  constructor(Bodies, x, y) {
    this.body = Bodies.rectangle(x, y, CAR_WIDTH, CAR_HEIGHT, {
      frictionAir: 0.05,
      friction: 0.2,
      restitution: 0.1,
      density: 0.02,
      collisionFilter: {
        category: CATEGORY.CAR,
        mask: CATEGORY.STRUCTURE | CATEGORY.HAZARD | CATEGORY.WALL,
      },
      label: "car",
    });
    this.health = MAX_HEALTH;
    this.maxHealth = MAX_HEALTH;
    this.speedPenalty = 0;      // temporary slowdown from impacts, decays over time
    this.spinOutMs = 0;         // brief control loss after a hazard hit
    this.distanceMeters = 0;
    this.alive = true;
  }

  get forwardSpeed() {
    const ramped = Math.min(
      MAX_FORWARD_SPEED,
      BASE_FORWARD_SPEED + this.distanceMeters * SPEED_RAMP_PER_METER
    );
    return Math.max(1.5, ramped - this.speedPenalty);
  }

  applyImpact(kickbackFraction, damage) {
    this.speedPenalty += this.forwardSpeed * kickbackFraction * 2.2;
    this.health = Math.max(0, this.health - damage);
    if (damage >= 20) this.spinOutMs = 420;
    if (this.health <= 0) this.alive = false;
  }

  update(Body, steerInput, dtMs) {
    const dtScale = dtMs / 16.6667; // normalize to ~60fps steps

    // Decay temporary speed penalty back toward zero
    this.speedPenalty = Math.max(0, this.speedPenalty - 0.06 * dtScale);
    if (this.spinOutMs > 0) this.spinOutMs = Math.max(0, this.spinOutMs - dtMs);

    // Steering: reduced authority mid spin-out
    const control = this.spinOutMs > 0 ? 0.25 : 1;
    let vx = this.body.velocity.x;
    if (steerInput !== 0) {
      vx += steerInput * LATERAL_ACCEL * control * dtScale;
      vx = Math.max(-LATERAL_MAX, Math.min(LATERAL_MAX, vx));
    } else {
      vx *= Math.pow(LATERAL_DAMPING, dtScale);
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
