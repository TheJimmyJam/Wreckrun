// save.js — localStorage persistence

const KEYS = {
  BEST_SCORE: "wreckrun_best_score",
  BEST_DISTANCE: "wreckrun_best_distance",
};

function safeGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch (e) {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // storage unavailable (private browsing, etc.) — fail silently
  }
}

export function getBestScore() {
  return safeGet(KEYS.BEST_SCORE, 0);
}

export function getBestDistance() {
  return safeGet(KEYS.BEST_DISTANCE, 0);
}

export function submitRun(score, distance) {
  const bestScore = Math.max(getBestScore(), Math.floor(score));
  const bestDistance = Math.max(getBestDistance(), Math.floor(distance));
  safeSet(KEYS.BEST_SCORE, bestScore);
  safeSet(KEYS.BEST_DISTANCE, bestDistance);
  return { bestScore, bestDistance };
}
