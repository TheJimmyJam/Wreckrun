// ui.js — HUD, menus, game-over screen, pause button hit-testing

const PAUSE_BTN = { x: 16, y: 16, w: 44, h: 44 };

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

export function getGarageButtonRect(w, h) {
  return { x: w / 2 - 90, y: h / 2 + 90, w: 180, h: 44 };
}

export function drawMenu(ctx, w, h, best, coins) {
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

  const btn = getGarageButtonRect(w, h);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 10);
  ctx.fill();
  ctx.strokeStyle = "#ffd23f";
  ctx.lineWidth = 2;
  roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 10);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.fillText("GARAGE", w / 2, btn.y + 12);

  ctx.font = "14px system-ui, sans-serif";
  ctx.fillStyle = "#ffd23f";
  ctx.fillText(`\u{1FA99} ${coins}`, w / 2, btn.y + btn.h + 14);
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

export function drawGameOver(ctx, w, h, { score, distanceMeters, coinsAwarded }, best, isNewBest) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = "bold 40px system-ui, sans-serif";
  ctx.fillText("WRECKED!", w / 2, h / 2 - 90);

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
    isNewBest ? "NEW BEST!" : `Best: ${best.bestScore}  •  ${best.bestDistance}m`,
    w / 2,
    h / 2 + 40
  );

  ctx.fillStyle = "#fff";
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText("Tap to restart", w / 2, h / 2 + 78);
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
