// scoring.js — points, combo multiplier, distance, callouts

const COMBO_DECAY_MS = 1800;      // time without a smash before combo starts decaying
const COMBO_DECAY_RATE = 1.5;     // multiplier lost per second once decaying
const COMBO_STEP = 0.25;          // multiplier gained per smash
const COMBO_MAX = 8;

const CALLOUT_LIFETIME_MS = 1100;

export class ScoringSystem {
  constructor() {
    this.score = 0;
    this.distanceMeters = 0;
    this.combo = 1;
    this.timeSinceLastSmash = 0;
    this.callouts = []; // { text, age, x, y }
  }

  reset() {
    this.score = 0;
    this.distanceMeters = 0;
    this.combo = 1;
    this.timeSinceLastSmash = 0;
    this.callouts = [];
  }

  addDistance(meters) {
    this.distanceMeters += meters;
  }

  registerSmash(basePoints, speedFactor, worldX, worldY, calloutText) {
    this.combo = Math.min(COMBO_MAX, this.combo + COMBO_STEP);
    this.timeSinceLastSmash = 0;
    const points = Math.round(basePoints * this.combo * speedFactor);
    this.score += points;
    if (calloutText) {
      this.callouts.push({ text: calloutText, age: 0, x: worldX, y: worldY });
    }
    return points;
  }

  update(dtMs) {
    this.timeSinceLastSmash += dtMs;
    if (this.timeSinceLastSmash > COMBO_DECAY_MS && this.combo > 1) {
      this.combo = Math.max(1, this.combo - COMBO_DECAY_RATE * (dtMs / 1000));
    }
    for (const c of this.callouts) c.age += dtMs;
    this.callouts = this.callouts.filter((c) => c.age < CALLOUT_LIFETIME_MS);
  }

  get comboDisplay() {
    return `x${this.combo.toFixed(1)}`;
  }
}
