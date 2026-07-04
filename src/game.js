// game.js — game loop + state machine (menu / play / paused / gameover)

import { createPhysicsWorld, CATEGORY } from "./physics.js";
import { Car, CAR_WIDTH, CAR_HEIGHT } from "./car.js";
import { InputSystem } from "./input.js";
import { Spawner } from "./spawner.js";
import { DEFS, TYPES } from "./structures.js";
import { ScoringSystem } from "./scoring.js";
import * as UI from "./ui.js";
import * as Save from "./save.js";
import { loadAssets } from "./assets.js";

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

const STATE = { LOADING: "loading", MENU: "menu", PLAY: "play", PAUSED: "paused", GAMEOVER: "gameover" };

const CALLOUTS_BY_TYPE = {
  [TYPES.TOWER_BLOCK]: null, // set per-chain below
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.input = new InputSystem(canvas);

    const { engine, world, Body, Bodies, Composite, Events } = createPhysicsWorld();
    this.engine = engine;
    this.world = world;
    this.Body = Body;
    this.Bodies = Bodies;
    this.Composite = Composite;
    this.Events = Events;

    this.spawner = new Spawner(Bodies, GAME_WIDTH);
    this.scoring = new ScoringSystem();
    this.best = { bestScore: Save.getBestScore(), bestDistance: Save.getBestDistance() };

    this.state = STATE.LOADING;
    this.images = {};
    this.lastTime = null;
    this.pillarChainWindowMs = 0;
    this.recentSmashCount = 0;

    this._buildWalls();
    this._resetRun();
    this._bindCollisions();

    loadAssets().then((images) => {
      this.images = images;
      this.state = STATE.MENU;
    });

    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  _buildWalls() {
    const { Bodies, Composite, world } = this;
    const thickness = 60;
    this.wallLeft = Bodies.rectangle(-thickness / 2, 0, thickness, 20000, {
      isStatic: true,
      collisionFilter: { category: CATEGORY.WALL, mask: CATEGORY.CAR | CATEGORY.STRUCTURE },
      label: "wall",
    });
    this.wallRight = Bodies.rectangle(GAME_WIDTH + thickness / 2, 0, thickness, 20000, {
      isStatic: true,
      collisionFilter: { category: CATEGORY.WALL, mask: CATEGORY.CAR | CATEGORY.STRUCTURE },
      label: "wall",
    });
    Composite.add(world, [this.wallLeft, this.wallRight]);
  }

  _resetRun() {
    const { Bodies, Composite, world } = this;

    // Clear existing structures
    for (const b of this.spawner.active) Composite.remove(world, b);
    if (this.car) Composite.remove(world, this.car.body);

    this.car = new Car(Bodies, GAME_WIDTH / 2, 0);
    Composite.add(world, this.car.body);

    this.spawner.reset(this.car.body.position.y);
    this.scoring.reset();
    this.cameraOffsetY = 0;
    this.screenCarY = GAME_HEIGHT * 0.76;
  }

  _bindCollisions() {
    this.Events.on(this.engine, "collisionStart", (evt) => {
      if (this.state !== STATE.PLAY) return;
      for (const pair of evt.pairs) {
        const { bodyA, bodyB } = pair;
        const carBody = bodyA.label === "car" ? bodyA : bodyB.label === "car" ? bodyB : null;
        const other = carBody === bodyA ? bodyB : bodyA;
        if (!carBody || !other.wreckrun) continue;
        this._handleCarStructureHit(other, pair);
      }
    });
  }

  _handleCarStructureHit(structureBody, pair) {
    const info = structureBody.wreckrun;
    if (info.hit) return; // already scored, physics keeps scattering it naturally
    info.hit = true;

    const def = info.def;
    const speedFactor = Math.min(1.8, 0.6 + this.car.forwardSpeed / 6);
    let calloutText = null;

    if (info.type === TYPES.PILLAR) {
      calloutText = "WRECKED!";
    } else if (info.type === TYPES.TOWER_BLOCK) {
      calloutText = this.scoring.combo >= 3 ? "DEMOLITION!" : null;
    }

    this.scoring.registerSmash(def.points, speedFactor, structureBody.position.x, structureBody.position.y, calloutText);
    this.car.applyImpact(def.kickback, def.damage);

    // Give the structure a little scatter impulse away from the car for juice,
    // proportional to car speed (heavier hits = bigger scatter).
    if (def.destructible) {
      const impulse = {
        x: (structureBody.position.x - this.car.body.position.x) * 0.0006 * this.car.forwardSpeed,
        y: -0.001 * this.car.forwardSpeed,
      };
      this.Body.applyForce(structureBody, structureBody.position, impulse);
    }
  }

  // ---- input-driven state transitions ----

  _handleTapOrKeyStart() {
    if (this.state === STATE.MENU || this.state === STATE.GAMEOVER) {
      this._resetRun();
      this.state = STATE.PLAY;
    }
  }

  _togglePause() {
    if (this.state === STATE.PLAY) this.state = STATE.PAUSED;
    else if (this.state === STATE.PAUSED) this.state = STATE.PLAY;
  }

  // ---- main loop ----

  _loop(timestamp) {
    if (this.lastTime === null) this.lastTime = timestamp;
    const dtMs = Math.min(50, timestamp - this.lastTime); // clamp to avoid spiral of death
    this.lastTime = timestamp;

    this._handleInputEvents();

    if (this.state === STATE.PLAY) {
      this._update(dtMs);
    }

    this._render();
    requestAnimationFrame(this._loop);
  }

  _handleInputEvents() {
    if (this.state === STATE.LOADING) {
      this.input.consumeTap();
      return;
    }
    if (this.input.consumePause()) {
      if (this.state === STATE.PLAY || this.state === STATE.PAUSED) this._togglePause();
    }
    const tap = this.input.consumeTap();
    if (tap) {
      if (this.state === STATE.MENU || this.state === STATE.GAMEOVER) {
        this._handleTapOrKeyStart();
      } else if (this.state === STATE.PLAY || this.state === STATE.PAUSED) {
        const rect = UI.getPauseButtonRect();
        // tap coordinates are in CSS px on the displayed canvas; caller (main.js)
        // keeps canvas internal resolution mapped 1:1 via CSS scale, so convert:
        const scaled = this._cssToGamePoint(tap.x, tap.y);
        if (UI.pointInRect(scaled.x, scaled.y, rect)) this._togglePause();
      }
    }
    if (this.state === STATE.MENU) {
      if (this.input.steerDirection !== 0) this._handleTapOrKeyStart();
    }
  }

  _cssToGamePoint(cssX, cssY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (cssX / rect.width) * GAME_WIDTH,
      y: (cssY / rect.height) * GAME_HEIGHT,
    };
  }

  _update(dtMs) {
    const steer = this.input.steerDirection;
    this.car.update(this.Body, steer, dtMs);

    const { engine } = this;
    Matter.Engine.update(engine, dtMs);

    this.scoring.addDistance(0); // distance now tracked via car.distanceMeters
    this.scoring.distanceMeters = this.car.distanceMeters;
    this.scoring.update(dtMs);

    // Spawn new rows ahead of the car
    const created = this.spawner.update(this.car.body.position.y, this.car.distanceMeters);
    if (created.length) this.Composite.add(this.world, created);

    // Despawn far-behind bodies
    const gone = this.spawner.collectDespawned(this.car.body.position.y);
    if (gone.length) this.Composite.remove(this.world, gone);

    // Camera follows the car
    this.cameraOffsetY = this.car.body.position.y - this.screenCarY;

    if (!this.car.alive) {
      const result = Save.submitRun(this.scoring.score, this.scoring.distanceMeters);
      this.isNewBest = result.bestScore <= this.scoring.score && this.scoring.score > this.best.bestScore;
      this.best = result;
      this.state = STATE.GAMEOVER;
    }
  }

  _worldToScreen(x, y) {
    return { x, y: y - this.cameraOffsetY };
  }

  _render() {
    const { ctx } = this;
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (this.state === STATE.LOADING) {
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "24px system-ui, sans-serif";
      ctx.fillText("Loading...", GAME_WIDTH / 2, GAME_HEIGHT / 2);
      return;
    }

    // Road background
    this._drawRoadBackground();
    if (!this.images.bg_road_city) this._drawLaneMarkings(); // fallback art already has lane markings baked in

    if (this.state !== STATE.MENU) {
      this._drawStructures();
      this._drawCar();
      UI.drawCallouts(this.ctx, this.scoring.callouts, this._worldToScreen.bind(this));
      UI.drawHUD(this.ctx, GAME_WIDTH, {
        score: this.scoring.score,
        comboDisplay: this.scoring.comboDisplay,
        distanceMeters: this.scoring.distanceMeters,
        healthFraction: this.car.healthFraction,
      });
    }

    if (this.state === STATE.MENU) {
      UI.drawMenu(this.ctx, GAME_WIDTH, GAME_HEIGHT, this.best);
    } else if (this.state === STATE.PAUSED) {
      UI.drawPaused(this.ctx, GAME_WIDTH, GAME_HEIGHT);
    } else if (this.state === STATE.GAMEOVER) {
      UI.drawGameOver(
        this.ctx,
        GAME_WIDTH,
        GAME_HEIGHT,
        { score: this.scoring.score, distanceMeters: this.scoring.distanceMeters },
        this.best,
        this.isNewBest
      );
    }
  }

  _drawRoadBackground() {
    const { ctx } = this;
    const tile = this.images.bg_road_city;
    if (!tile) {
      ctx.fillStyle = "#4a4a4a";
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      return;
    }
    // Scale the (square) generated tile to the road width, repeat vertically
    // as the camera scrolls. Seamless-tiling art from Phase 4 pack can drop
    // in here with no code changes.
    const tileH = GAME_WIDTH * (tile.height / tile.width);
    const offset = ((-this.cameraOffsetY % tileH) + tileH) % tileH;
    for (let y = -tileH + offset; y < GAME_HEIGHT; y += tileH) {
      ctx.drawImage(tile, 0, y, GAME_WIDTH, tileH);
    }
  }

  _drawLaneMarkings() {
    const { ctx } = this;
    const offset = this.cameraOffsetY || 0;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 4;
    ctx.setLineDash([30, 24]);
    const dashOffset = (-offset) % 54;
    ctx.lineDashOffset = dashOffset;
    for (const fx of [GAME_WIDTH / 3, (GAME_WIDTH / 3) * 2]) {
      ctx.beginPath();
      ctx.moveTo(fx, 0);
      ctx.lineTo(fx, GAME_HEIGHT);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  _drawStructures() {
    const { ctx } = this;
    for (const body of this.spawner.active) {
      const info = body.wreckrun;
      if (!info) continue;
      const { x, y } = this._worldToScreen(body.position.x, body.position.y);
      if (y < -80 || y > GAME_HEIGHT + 80) continue;
      const def = info.def;
      const sprite = def.sprite && this.images[def.sprite];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(body.angle);
      const half = def.size / 2;
      if (sprite) {
        ctx.drawImage(sprite, -half, -half, def.size, def.size);
      } else {
        ctx.fillStyle = def.color;
        ctx.strokeStyle = def.strokeColor;
        ctx.lineWidth = 3;
        ctx.fillRect(-half, -half, def.size, def.size);
        ctx.strokeRect(-half, -half, def.size, def.size);
        if (info.type === TYPES.PILLAR) {
          ctx.fillStyle = "#e8b100";
          ctx.fillRect(-half, -6, def.size, 12);
        }
      }
      ctx.restore();
    }
  }

  _drawCar() {
    const { ctx, car } = this;
    const { x, y } = this._worldToScreen(car.body.position.x, car.body.position.y);
    const sprite = this.images.car_default;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(car.body.angle);
    if (sprite) {
      // car_default.png is drawn with the front pointing up, matching the car's
      // forward-is-up orientation, so no extra rotation offset is needed.
      ctx.drawImage(sprite, -CAR_WIDTH / 2, -CAR_HEIGHT / 2, CAR_WIDTH, CAR_HEIGHT);
      if (car.spinOutMs > 0) {
        ctx.fillStyle = "rgba(255,80,80,0.35)";
        ctx.fillRect(-CAR_WIDTH / 2, -CAR_HEIGHT / 2, CAR_WIDTH, CAR_HEIGHT);
      }
    } else {
      ctx.fillStyle = car.spinOutMs > 0 ? "#ff6b6b" : "#e63946";
      ctx.strokeStyle = "#7a1620";
      ctx.lineWidth = 3;
      ctx.fillRect(-CAR_WIDTH / 2, -CAR_HEIGHT / 2, CAR_WIDTH, CAR_HEIGHT);
      ctx.strokeRect(-CAR_WIDTH / 2, -CAR_HEIGHT / 2, CAR_WIDTH, CAR_HEIGHT);
      ctx.fillStyle = "#a8dadc";
      ctx.fillRect(-CAR_WIDTH / 2 + 6, -CAR_HEIGHT / 2 + 8, CAR_WIDTH - 12, 14);
    }
    ctx.restore();
  }
}
