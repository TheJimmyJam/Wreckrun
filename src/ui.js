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

export function drawMenu(ctx, w, h, best) {
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

export function drawGameOver(ctx, w, h, { score, distanceMeters }, best, isNewBest) {
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

  ctx.fillStyle = "#ffd23f";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.fillText(
    isNewBest ? "NEW BEST!" : `Best: ${best.bestScore}  •  ${best.bestDistance}m`,
    w / 2,
    h / 2 + 24
  );

  ctx.fillStyle = "#fff";
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText("Tap to restart", w / 2, h / 2 + 70);
  ctx.restore();
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
