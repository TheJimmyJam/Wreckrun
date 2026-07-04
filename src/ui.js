// ui.js — HUD, menus, game-over screen, pause button hit-testing

import { POWERUP_DEFS } from "./powerups.js";

const PAUSE_BTN = { x: 16, y: 16, w: 44, h: 44 };

const BUFF_LABELS = {
  boostMs: { text: "BOOST", color: POWERUP_DEFS.boost.color },
  ramMs: { text: "RAM", color: POWERUP_DEFS.ram.color },
  magnetMs: { text: "MAGNET", color: POWERUP_DEFS.magnet.color },
  plowMs: { text: "PLOW", color: POWERUP_DEFS.plow.color },
  slowMoMs: { text: "SLOW-MO", color: POWERUP_DEFS.slowMo.color },
};

/** Small pill row under the HUD showing active power-up timers. */
export function drawBuffBar(ctx, canvasWidth, buffs) {
  const active = Object.entries(buffs).filter(([, ms]) => ms > 0);
  if (!active.length) return;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 12px system-ui, sans-serif";

  const pillW = 90;
  const pillH = 20;
  const gap = 8;
  const totalW = active.length * pillW + (active.length - 1) * gap;
  let x = canvasWidth / 2 - totalW / 2;
  const y = 58;

  for (const [key, ms] of active) {
    const info = BUFF_LABELS[key] || { text: key, color: "#fff" };
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRect(ctx, x, y, pillW, pillH, 6);
    ctx.fill();
    ctx.fillStyle = info.color;
    ctx.fillText(`${info.text} ${(ms / 1000).toFixed(1)}s`, x + pillW / 2, y + pillH / 2 + 1);
    x += pillW + gap;
  }
  ctx.restore();
}

export function getPauseButtonRect() {
  return PAUSE_BTN;
}

export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export function drawHUD(ctx, canvasWidth, { score, comboDisplay, distanceMeters, healthFraction }) {
  ctx.save();
  ctx.textBaseline = "top";

  // Score (top center)
  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = 4;
  const scoreText = Math.floor(score).toString();
  ctx.strokeText(scoreText, canvasWidth / 2, 14);
  ctx.fillText(scoreText, canvasWidth / 2, 14);

  // Combo just under score
  ctx.font = "bold 16px system-ui, sans-serif";
  ctx.fillStyle = "#ffd23f";
  ctx.strokeText(comboDisplay, canvasWidth / 2, 48);
  ctx.fillText(comboDisplay, canvasWidth / 2, 48);

  // Distance (top right)
  ctx.textAlign = "right";
  ctx.font = "bold 16px system-ui, sans-serif";
  ctx.fillStyle = "#fff";
  const distText = `${Math.floor(distanceMeters)}m`;
  ctx.strokeText(distText, canvasWidth - 16, 20);
  ctx.fillText(distText, canvasWidth - 16, 20);

  // Health bar (top left, next to pause button)
  const barX = PAUSE_BTN.x + PAUSE_BTN.w + 12;
  const barY = 26;
  const barW = 140;
  const barH = 18;
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(barX, barY, barW, barH);
  const hf = Math.max(0, Math.min(1, healthFraction));
  ctx.fillStyle = hf > 0.5 ? "#4caf50" : hf > 0.25 ? "#ffa726" : "#e53935";
  ctx.fillRect(barX, barY, barW * hf, barH);
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barW, barH);

  // Pause button
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  roundRect(ctx, PAUSE_BTN.x, PAUSE_BTN.y, PAUSE_BTN.w, PAUSE_BTN.h, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillRect(PAUSE_BTN.x + 14, PAUSE_BTN.y + 10, 6, 24);
  ctx.fillRect(PAUSE_BTN.x + 26, PAUSE_BTN.y + 10, 6, 24);

  ctx.restore();
}

export function drawCallouts(ctx, callouts, worldToScreen) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const c of callouts) {
    const t = c.age / 1100;
    const alpha = 1 - t;
    const scale = 1 + t * 0.6;
    const { x, y } = worldToScreen(c.x, c.y - t * 60);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.font = "bold 26px system-ui, sans-serif";
    ctx.fillStyle = `rgba(255,210,20,${alpha})`;
    ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.7})`;
    ctx.lineWidth = 4;
    ctx.strokeText(c.text, 0, 0);
    ctx.fillText(c.text, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

/** Three menu buttons (Garage / Daily / Stats) laid out side by side. */
export function getMenuButtonsLayout(w, h) {
  const btnW = 150;
  const btnH = 44;
  const gap = 16;
  const totalW = btnW * 3 + gap * 2;
  const startX = w / 2 - totalW / 2;
  const y = h / 2 + 90;
  return {
    garage: { x: startX, y, w: btnW, h: btnH },
    daily: { x: startX + btnW + gap, y, w: btnW, h: btnH },
    stats: { x: startX + (btnW + gap) * 2, y, w: btnW, h: btnH },
  };
}

export function drawMenu(ctx, w, h, best, coins, dailyBest) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = "bold 48px system-ui, sans-serif";
  ctx.fillText("WRECK RUN", w / 2, h / 2 - 60);
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText("Tap or press an arrow key to start", w / 2, h / 2 - 10);
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillStyle = "#ffd23f";
  ctx.fillText(`Best score: ${best.bestScore}  •  Best distance: ${best.bestDistance}m`, w / 2, h / 2 + 30);
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillStyle = "#ccc";
  ctx.fillText("Hold left/right half of screen to steer, or arrow keys / A-D", w / 2, h / 2 + 60);

  const layout = getMenuButtonsLayout(w, h);
  const labels = { garage: "GARAGE", daily: "DAILY", stats: "STATS" };
  for (const key of ["garage", "daily", "stats"]) {
    const btn = layout[key];
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 10);
    ctx.fill();
    ctx.strokeStyle = "#ffd23f";
    ctx.lineWidth = 2;
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 10);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.fillText(labels[key], btn.x + btn.w / 2, btn.y + 12);
  }

  ctx.font = "14px system-ui, sans-serif";
  ctx.fillStyle = "#ffd23f";
  ctx.fillText(
    `\u{1FA99} ${coins}  •  Today's best: ${dailyBest ?? 0}`,
    w / 2,
    layout.garage.y + layout.garage.h + 18
  );
  ctx.restore();
}

export function drawPaused(ctx, w, h) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.fillText("PAUSED", w / 2, h / 2 - 10);
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillText("Tap the pause button or press Esc/P to resume", w / 2, h / 2 + 30);
  ctx.restore();
}

export function drawGameOver(ctx, w, h, { score, distanceMeters, coinsAwarded }, best, isNewBest, extra = {}) {
  const { dailyMode, dailyBest, newlyCompletedMissions } = extra;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = "bold 40px system-ui, sans-serif";
  ctx.fillText(dailyMode ? "WRECKED! (Daily)" : "WRECKED!", w / 2, h / 2 - 90);

  ctx.font = "22px system-ui, sans-serif";
  ctx.fillText(`Score: ${Math.floor(score)}`, w / 2, h / 2 - 40);
  ctx.fillText(`Distance: ${Math.floor(distanceMeters)}m`, w / 2, h / 2 - 10);

  if (coinsAwarded) {
    ctx.fillStyle = "#ffd23f";
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText(`+${coinsAwarded} \u{1FA99} earned`, w / 2, h / 2 + 12);
  }

  ctx.fillStyle = "#ffd23f";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.fillText(
    dailyMode
      ? `Today's best: ${dailyBest}`
      : isNewBest
      ? "NEW BEST!"
      : `Best: ${best.bestScore}  •  ${best.bestDistance}m`,
    w / 2,
    h / 2 + 40
  );

  ctx.fillStyle = "#fff";
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText("Tap to restart", w / 2, h / 2 + 78);

  if (newlyCompletedMissions && newlyCompletedMissions.length) {
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillStyle = "#8fd18f";
    let y = h / 2 + 106;
    for (const m of newlyCompletedMissions) {
      ctx.fillText(`✓ ${m.description} (+${m.reward} \u{1FA99})`, w / 2, y);
      y += 18;
    }
  }
  ctx.restore();
}

const GARAGE_BACK_BTN = { x: 16, y: 16, w: 80, h: 36 };

/**
 * Computes hit-test rects for the garage screen so drawGarage() and
 * game.js's tap handling always agree on where things are.
 */
export function getGarageLayout(w, h, carOrder, upgradeTracks = ["armor", "speed"]) {
  const backBtn = GARAGE_BACK_BTN;

  const listX = 40;
  const listY = 90;
  const rowH = 76;
  const rowW = w * 0.55;
  const carRows = carOrder.map((carId, i) => ({
    carId,
    rect: { x: listX, y: listY + i * (rowH + 8), w: rowW, h: rowH },
  }));

  const upgradeX = listX + rowW + 40;
  const upgradeW = w - upgradeX - 40;
  const upgradeRowH = 90;
  const upgradeRows = upgradeTracks.map((track, i) => ({
    track,
    rect: { x: upgradeX, y: listY + i * (upgradeRowH + 16), w: upgradeW, h: upgradeRowH },
  }));

  return { backBtn, carRows, upgradeRows };
}

export function drawGarage(ctx, w, h, data) {
  const { cars, carOrder, coins, ownedIds, selectedId, upgrades } = data;
  const layout = getGarageLayout(w, h, carOrder, Object.keys(upgrades));

  ctx.save();
  ctx.fillStyle = "#1c1c1c";
  ctx.fillRect(0, 0, w, h);

  // Back button
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  roundRect(ctx, layout.backBtn.x, layout.backBtn.y, layout.backBtn.w, layout.backBtn.h, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 15px system-ui, sans-serif";
  ctx.fillText("< BACK", layout.backBtn.x + layout.backBtn.w / 2, layout.backBtn.y + layout.backBtn.h / 2);

  // Title + coins
  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.fillText("GARAGE", w / 2, 40);
  ctx.font = "bold 16px system-ui, sans-serif";
  ctx.fillStyle = "#ffd23f";
  ctx.textAlign = "right";
  ctx.fillText(`\u{1FA99} ${coins}`, w - 24, 32);

  // Car rows
  ctx.textAlign = "left";
  for (const { carId, rect } of layout.carRows) {
    const def = cars[carId];
    const owned = ownedIds.includes(carId);
    const selected = carId === selectedId;

    ctx.fillStyle = selected ? "rgba(255,210,63,0.18)" : "rgba(255,255,255,0.06)";
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
    ctx.fill();
    if (selected) {
      ctx.strokeStyle = "#ffd23f";
      ctx.lineWidth = 2;
      roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
      ctx.stroke();
    }

    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText(def.name, rect.x + 16, rect.y + 14);

    ctx.font = "13px system-ui, sans-serif";
    ctx.fillStyle = "#bbb";
    wrapText(ctx, def.trait, rect.x + 16, rect.y + 38, rect.w - 140, 15);

    ctx.textAlign = "right";
    ctx.font = "bold 14px system-ui, sans-serif";
    if (selected) {
      ctx.fillStyle = "#ffd23f";
      ctx.fillText("SELECTED", rect.x + rect.w - 16, rect.y + rect.h / 2 - 7);
    } else if (owned) {
      ctx.fillStyle = "#8fd18f";
      ctx.fillText("SELECT", rect.x + rect.w - 16, rect.y + rect.h / 2 - 7);
    } else {
      ctx.fillStyle = "#ffd23f";
      ctx.fillText(`\u{1FA99} ${def.price}`, rect.x + rect.w - 16, rect.y + rect.h / 2 - 7);
    }
    ctx.textAlign = "left";
  }

  // Upgrade rows
  const labels = { armor: "ARMOR", speed: "TOP SPEED" };
  for (const { track, rect } of layout.upgradeRows) {
    const info = upgrades[track];
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.fillText(labels[track] || track.toUpperCase(), rect.x + 16, rect.y + 14);

    // Level dots
    const dotY = rect.y + 42;
    for (let i = 0; i < info.maxLevel; i++) {
      ctx.beginPath();
      ctx.arc(rect.x + 20 + i * 20, dotY, 6, 0, Math.PI * 2);
      ctx.fillStyle = i < info.level ? "#ffd23f" : "rgba(255,255,255,0.2)";
      ctx.fill();
    }

    ctx.font = "13px system-ui, sans-serif";
    ctx.fillStyle = "#ccc";
    ctx.fillText(
      info.cost === null ? "MAX LEVEL" : `Next: ${info.description}`,
      rect.x + 16,
      rect.y + 60
    );
    if (info.cost !== null) {
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffd23f";
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.fillText(`\u{1FA99} ${info.cost}`, rect.x + rect.w - 16, rect.y + 60);
      ctx.textAlign = "left";
    }
  }

  ctx.restore();
}

export function getStatsBackButtonRect() {
  return GARAGE_BACK_BTN; // same top-left "< BACK" spot as the garage screen
}

/** Missions (left column) + recent run history (right column). */
export function drawStats(ctx, w, h, { missions, history }) {
  ctx.save();
  ctx.fillStyle = "#1c1c1c";
  ctx.fillRect(0, 0, w, h);

  const backBtn = GARAGE_BACK_BTN;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  roundRect(ctx, backBtn.x, backBtn.y, backBtn.w, backBtn.h, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 15px system-ui, sans-serif";
  ctx.fillText("< BACK", backBtn.x + backBtn.w / 2, backBtn.y + backBtn.h / 2);

  ctx.font = "bold 26px system-ui, sans-serif";
  ctx.fillText("STATS", w / 2, 40);

  const colY = 90;
  const colW = w * 0.46;
  const leftX = 40;
  const rightX = w - 40 - colW;

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "bold 16px system-ui, sans-serif";
  ctx.fillStyle = "#ffd23f";
  ctx.fillText("MISSIONS", leftX, colY);
  ctx.fillText("RECENT RUNS", rightX, colY);

  let y = colY + 28;
  ctx.font = "13px system-ui, sans-serif";
  if (!missions.length) {
    ctx.fillStyle = "#888";
    ctx.fillText("No missions yet.", leftX, y);
  }
  for (const m of missions) {
    ctx.fillStyle = m.completed ? "#8fd18f" : "#ccc";
    const mark = m.completed ? "✓" : "•";
    wrapText(ctx, `${mark} ${m.description} (+${m.reward})`, leftX, y, colW, 16);
    y += 20;
    if (y > h - 24) break;
  }

  y = colY + 28;
  if (!history.length) {
    ctx.fillStyle = "#888";
    ctx.fillText("No runs recorded yet.", rightX, y);
  }
  for (const run of history) {
    ctx.fillStyle = "#fff";
    const dateStr = new Date(run.date).toLocaleDateString();
    const tag = run.daily ? " [Daily]" : "";
    ctx.fillText(`${run.score} pts • ${run.distanceMeters}m${tag}`, rightX, y);
    ctx.fillStyle = "#888";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(dateStr, rightX, y + 13);
    ctx.font = "13px system-ui, sans-serif";
    y += 32;
    if (y > h - 24) break;
  }

  ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
