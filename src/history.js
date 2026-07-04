// history.js — local run history / high-score table. Capped list of the most
// recent runs, newest first, so the garage-adjacent "STATS" screen has
// something to show beyond just a single best score.

const KEY = "wreckrun_run_history";
const MAX_ENTRIES = 20;

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
    // storage unavailable — fail silently
  }
}

export function getHistory() {
  return safeGet(KEY, []);
}

/** Records a completed run. Returns the updated (capped) history array. */
export function recordRun({ score, distanceMeters, carId, daily = false }) {
  const history = getHistory();
  history.unshift({
    score: Math.floor(score),
    distanceMeters: Math.floor(distanceMeters),
    carId,
    daily,
    date: new Date().toISOString(),
  });
  const trimmed = history.slice(0, MAX_ENTRIES);
  safeSet(KEY, trimmed);
  return trimmed;
}
