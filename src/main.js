// main.js — bootstrap: canvas sizing, orientation lock, resize handling

import { Game, GAME_WIDTH, GAME_HEIGHT } from "./game.js";

const canvas = document.getElementById("game-canvas");

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const aspect = GAME_WIDTH / GAME_HEIGHT;

  const stage = document.getElementById("stage");
  const availW = stage.clientWidth;
  const availH = stage.clientHeight;

  let cssW = availW;
  let cssH = cssW / aspect;
  if (cssH > availH) {
    cssH = availH;
    cssW = cssH * aspect;
  }

  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(GAME_WIDTH * dpr);
  canvas.height = Math.round(GAME_HEIGHT * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function tryLockOrientation() {
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock("landscape").catch(() => {
      /* not supported / not allowed — CSS rotate-prompt overlay is the fallback */
    });
  }
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", resizeCanvas);
resizeCanvas();
tryLockOrientation();

// Some mobile browsers only allow orientation lock after a user gesture.
window.addEventListener("touchstart", tryLockOrientation, { once: true, passive: true });
window.addEventListener("mousedown", tryLockOrientation, { once: true });

new Game(canvas);
