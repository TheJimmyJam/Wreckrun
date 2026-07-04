// game.js — game loop + state machine (menu / play / paused / gameover)

import { createPhysicsWorld, CATEGORY } from "./physics.js";
import { Car } from "./car.js";
import { InputSystem } from "./input.js";
import { Spawner } from "./spawner.js";
import { DEFS, TYPES } from "./structures.js";
import { ScoringSystem } from "./scoring.js";
import * as UI from "./ui.js";
import * as Save from "./save.js";
import { loadAssets } from "./assets.js";
import { CAR_DEFS, CAR_ORDER, MAX_UPGRADE_LEVEL, ARMOR_HEALTH_PER_LEVEL, SPEED_BONUS_PER_LEVEL, coinsEarnedForRun } from "./cars.js";
import * as Economy from "./economy.js";
import { getThemeForDistance, THEMES } from "./themes.js";

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

const STATE = { LOADING: "loading", MENU: "menu", GARAGE: "garage", PLAY: "play", PAUSED: "paused", GAMEOVER: "gameover" };

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

    const carDef = CAR_DEFS[Economy.getSelectedCarId()] || CAR_DEFS.sedan;
    const upgrades = {
      armorLevel: Economy.getUpgradeLevel("armor"),
      speedLevel: Economy.getUpgradeLevel("speed"),
    };
    this.car = new Car(Bodies, GAME_WIDTH / 2, 0, carDef, upgrades);
    Composite.add(world, this.car.body);

    this.spawner.reset(this.car.body.position.y);
    this.scoring.reset();
    this.cameraOffsetY = 0;
    this.screenCarY = GAME_HEIGHT * 0.76;
    this.currentTheme = THEMES[0];
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
    } else if (info.type === TYPES.TNT) {
      calloutText = "BOOM!"; // may get overwritten below with a chain count
    }

    this.scoring.registerSmash(def.points, speedFactor, structureBody.position.x, structureBody.position.y, calloutText);
    this.car.applyImpact(def.kickback, def.damage);

    // Fling the structure clear of the lane so a "smash" actually reads as
    // one — a force nudge here is too weak to fight Matter's own collision
    // response, so we directly set velocity for a guaranteed, visible scatter.
    if (def.destructible) {
      this._scatterBody(structureBody, this.car.body.position);
    }

    if (info.type === TYPES.TNT) {
      this._detonateTNT(structureBody, speedFactor);
    }
  }

  /** Directly sets velocity/spin on a body so an impact reads as a visible scatter. */
  _scatterBody(body, awayFrom) {
    const dx = body.position.x - awayFrom.x;
    const dirX = dx === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(dx);
    const kickSpeed = this.car.forwardSpeed * (1.1 + Math.random() * 0.6);
    this.Body.setVelocity(body, {
      x: dirX * kickSpeed * (0.5 + Math.random() * 0.6),
      y: body.velocity.y - kickSpeed * (0.4 + Math.random() * 0.3),
    });
    this.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.6);
  }

  /**
   * Chain-detonates any other not-yet-hit TNT barrels within blast radius of
   * the one that just went off, breadth-first so a cluster of barrels all
   * pop in sequence. Chained barrels score their own points and scatter, but
   * don't hit the car directly (only the barrel actually rammed does that).
   */
  _detonateTNT(originBody, speedFactor) {
    const radius = originBody.wreckrun.def.explosionRadius;
    const queue = [originBody];
    let chainCount = 0;

    while (queue.length) {
      const center = queue.pop();
      for (const candidate of this.spawner.active) {
        if (candidate === originBody || candidate.wreckrun.type !== TYPES.TNT || candidate.wreckrun.hit) continue;
        const dx = candidate.position.x - center.position.x;
        const dy = candidate.position.y - center.position.y;
        if (Math.sqrt(dx * dx + dy * dy) > radius) continue;

        candidate.wreckrun.hit = true;
        chainCount++;
        const def = candidate.wreckrun.def;
        this.scoring.registerSmash(def.points, speedFactor, candidate.position.x, candidate.position.y, null);
        this._scatterBody(candidate, center.position);
        queue.push(candidate);
      }
    }

    if (chainCount >= 1) {
      this.scoring.callouts.push({ text: `CHAIN x${chainCount + 1}`, age: 0, x: originBody.position.x, y: originBody.position.y - 40 });
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
      const scaled = this._cssToGamePoint(tap.x, tap.y);
      if (this.state === STATE.MENU) {
        const garageBtn = UI.getGarageButtonRect(GAME_WIDTH, GAME_HEIGHT);
        if (UI.pointInRect(scaled.x, scaled.y, garageBtn)) {
          this.state = STATE.GARAGE;
        } else {
          this._handleTapOrKeyStart();
        }
      } else if (this.state === STATE.GARAGE) {
        this._handleGarageTap(scaled);
      } else if (this.state === STATE.GAMEOVER) {
        this._handleTapOrKeyStart();
      } else if (this.state === STATE.PLAY || this.state === STATE.PAUSED) {
        const rect = UI.getPauseButtonRect();
        if (UI.pointInRect(scaled.x, scaled.y, rect)) this._togglePause();
      }
    }
    if (this.state === STATE.MENU) {
      if (this.input.steerDirection !== 0) this._handleTapOrKeyStart();
    }
  }

  _handleGarageTap(point) {
    const layout = UI.getGarageLayout(GAME_WIDTH, GAME_HEIGHT, CAR_ORDER, ["armor", "speed"]);

    if (UI.pointInRect(point.x, point.y, layout.backBtn)) {
      this.state = STATE.MENU;
      return;
    }

    for (const { carId, rect } of layout.carRows) {
      if (!UI.pointInRect(point.x, point.y, rect)) continue;
      const def = CAR_DEFS[carId];
      if (Economy.ownsCar(carId)) {
        Economy.setSelectedCarId(carId);
      } else {
        Economy.buyCar(carId, def.price);
      }
      return;
    }

    for (const { track, rect } of layout.upgradeRows) {
      if (!UI.pointInRect(point.x, point.y, rect)) continue;
      Economy.buyUpgrade(track);
      return;
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
    this.currentTheme = getThemeForDistance(this.car.distanceMeters);
    this.car.traction = this.currentTheme.traction;

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
      this.coinsAwarded = coinsEarnedForRun(this.scoring.score);
      Economy.addCoins(this.coinsAwarded);
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

    if (this.state === STATE.GARAGE) {
      UI.drawGarage(this.ctx, GAME_WIDTH, GAME_HEIGHT, {
        cars: CAR_DEFS,
        carOrder: CAR_ORDER,
        coins: Economy.getCoins(),
        ownedIds: Economy.getOwnedCarIds(),
        selectedId: Economy.getSelectedCarId(),
        upgrades: {
          armor: this._upgradeDisplayInfo("armor"),
          speed: this._upgradeDisplayInfo("speed"),
        },
      });
      return;
    }

    // Road background
    const themeTile = this.images[this.currentTheme.bgSpriteKey];
    this._drawRoadBackground(themeTile);
    if (!themeTile) this._drawLaneMarkings(); // fallback color has no baked-in lane markings

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
      this._drawThemeLabel();
    }

    if (this.state === STATE.MENU) {
      UI.drawMenu(this.ctx, GAME_WIDTH, GAME_HEIGHT, this.best, Economy.getCoins());
    } else if (this.state === STATE.PAUSED) {
      UI.drawPaused(this.ctx, GAME_WIDTH, GAME_HEIGHT);
    } else if (this.state === STATE.GAMEOVER) {
      UI.drawGameOver(
        this.ctx,
        GAME_WIDTH,
        GAME_HEIGHT,
        { score: this.scoring.score, distanceMeters: this.scoring.distanceMeters, coinsAwarded: this.coinsAwarded },
        this.best,
        this.isNewBest
      );
    }
  }

  _upgradeDisplayInfo(track) {
    const level = Economy.getUpgradeLevel(track);
    const cost = Economy.getUpgradeCost(track);
    const description =
      track === "armor" ? `+${ARMOR_HEALTH_PER_LEVEL} max health` : `+${Math.round(SPEED_BONUS_PER_LEVEL * 100)}% top speed`;
    return { level, maxLevel: MAX_UPGRADE_LEVEL, cost, description };
  }

  _drawRoadBackground(tile) {
    const { ctx } = this;
    if (!tile) {
      ctx.fillStyle = this.currentTheme.fallbackColor;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      return;
    }
    // Scale the (square) generated tile to the road width, repeat vertically
    // as the camera scrolls. Each theme's art drops in here with no code
    // changes once its PNG exists in assets/sprites/.
    const tileH = GAME_WIDTH * (tile.height / tile.width);
    const offset = ((-this.cameraOffsetY % tileH) + tileH) % tileH;
    for (let y = -tileH + offset; y < GAME_HEIGHT; y += tileH) {
      ctx.drawImage(tile, 0, y, GAME_WIDTH, tileH);
    }
  }

  _drawThemeLabel() {
    const { ctx } = this;
    ctx.save();
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 3;
    ctx.strokeText(this.currentTheme.name, GAME_WIDTH - 16, 44);
    ctx.fillText(this.currentTheme.name, GAME_WIDTH - 16, 44);
    ctx.restore();
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
    const w = car.width;
    const h = car.height;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(car.body.angle);
    if (sprite) {
      // car_default.png is drawn with the front pointing up, matching the car's
      // forward-is-up orientation, so no extra rotation offset is needed.
      ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
      // Non-default cars don't have unique art yet (Phase 3 art pack has the
      // prompts) — tint the default sprite so each vehicle at least reads as
      // a distinct car in the garage/on the road.
      if (car.carDef.tint) {
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = car.carDef.tint;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      if (car.spinOutMs > 0) {
        ctx.fillStyle = "rgba(255,80,80,0.35)";
        ctx.fillRect(-w / 2, -h / 2, w, h);
      }
    } else {
      ctx.fillStyle = car.spinOutMs > 0 ? "#ff6b6b" : car.carDef.tint || "#e63946";
      ctx.strokeStyle = "#7a1620";
      ctx.lineWidth = 3;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = "#a8dadc";
      ctx.fillRect(-w / 2 + 6, -h / 2 + 8, w - 12, 14);
    }
    ctx.restore();
  }
}
