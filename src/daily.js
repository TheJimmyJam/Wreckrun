// daily.js — seeded daily challenge: same obstacle layout for everyone who
// plays on a given calendar day. No backend (per the doc's Phase 1-5 scope),
// so "same for everyone" means "same seed for that date," not synced state.

const KEY_PREFIX = "wreckrun_daily_";

/** Today's date as YYYYMMDD in the player's local time zone. */
export function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/** Deterministic 32-bit PRNG (mulberry32) — small, fast, good enough for
 *  spawner variety, and same seed always produces the same sequence. */
export function createSeededRng(seedInt) {
  let seed = seedInt | 0;
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Builds today's RNG from the date key so every player gets an identical run. */
export function getTodayRng() {
  const dateKey = getTodayKey();
  const seed = Number(dateKey); // e.g. 20260704 — plain integer seed
  return createSeededRng(seed);
}

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

export function getDailyBest(dateKey = getTodayKey()) {
  return safeGet(`${KEY_PREFIX}best_${dateKey}`, 0);
}

export function submitDailyRun(score, dateKey = getTodayKey()) {
  const best = Math.max(getDailyBest(dateKey), Math.floor(score));
  safeSet(`${KEY_PREFIX}best_${dateKey}`, best);
  return best;
}
