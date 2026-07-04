// missions.js — persistent lifetime stats + one-time mission rewards.
// Missions are checked after every run (and after every TNT chain) against
// cumulative counters; each mission pays out coins exactly once.

const STATS_KEY = "wreckrun_stats";
const COMPLETED_KEY = "wreckrun_completed_missions";

const DEFAULT_STATS = {
  cratesSmashed: 0,
  glassSmashed: 0,
  towerBlocksSmashed: 0,
  tntDetonated: 0,
  coinsCollected: 0,
  runsPlayed: 0,
  bestDistanceMeters: 0,
  bestTntChain: 0, // biggest single chain-detonation count in one run
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
    // storage unavailable — fail silently
  }
}

export function getStats() {
  return { ...DEFAULT_STATS, ...safeGet(STATS_KEY, {}) };
}

function setStats(stats) {
  safeSet(STATS_KEY, stats);
}

export function incrementStat(key, amount = 1) {
  const stats = getStats();
  stats[key] = (stats[key] || 0) + amount;
  setStats(stats);
  return stats;
}

export function recordRunEnd({ distanceMeters, tntChainThisRun }) {
  const stats = getStats();
  stats.runsPlayed += 1;
  stats.bestDistanceMeters = Math.max(stats.bestDistanceMeters, Math.floor(distanceMeters));
  stats.bestTntChain = Math.max(stats.bestTntChain, tntChainThisRun || 0);
  setStats(stats);
  return stats;
}

export function getCompletedMissionIds() {
  return safeGet(COMPLETED_KEY, []);
}

export const MISSIONS = [
  { id: "crates_50", description: "Smash 50 crates", reward: 100, check: (s) => s.cratesSmashed >= 50 },
  { id: "crates_250", description: "Smash 250 crates", reward: 300, check: (s) => s.cratesSmashed >= 250 },
  { id: "glass_50", description: "Shatter 50 glass panes", reward: 100, check: (s) => s.glassSmashed >= 50 },
  { id: "towers_100", description: "Smash 100 tower blocks", reward: 200, check: (s) => s.towerBlocksSmashed >= 100 },
  { id: "tnt_chain_3", description: "Chain 3 TNT in one run", reward: 250, check: (s) => s.bestTntChain >= 3 },
  { id: "tnt_total_25", description: "Detonate 25 TNT barrels total", reward: 200, check: (s) => s.tntDetonated >= 25 },
  { id: "distance_1000", description: "Reach 1000m in one run", reward: 300, check: (s) => s.bestDistanceMeters >= 1000 },
  { id: "distance_3000", description: "Reach 3000m in one run", reward: 600, check: (s) => s.bestDistanceMeters >= 3000 },
  { id: "coins_100", description: "Collect 100 coins from pickups", reward: 150, check: (s) => s.coinsCollected >= 100 },
  { id: "runs_20", description: "Play 20 runs", reward: 150, check: (s) => s.runsPlayed >= 20 },
];

/**
 * Checks every not-yet-completed mission against current stats. Any newly
 * satisfied ones get their coin reward and are marked completed (one-time).
 * Returns the list of newly completed mission defs for a "MISSION COMPLETE"
 * callout/notification.
 */
export function checkNewlyCompleted(addCoinsFn) {
  const stats = getStats();
  const completed = new Set(getCompletedMissionIds());
  const newlyCompleted = [];

  for (const mission of MISSIONS) {
    if (completed.has(mission.id)) continue;
    if (mission.check(stats)) {
      completed.add(mission.id);
      addCoinsFn(mission.reward);
      newlyCompleted.push(mission);
    }
  }

  if (newlyCompleted.length) safeSet(COMPLETED_KEY, [...completed]);
  return newlyCompleted;
}

/** For the missions UI screen: every mission with its completion state + progress. */
export function getMissionsWithProgress() {
  const stats = getStats();
  const completedIds = new Set(getCompletedMissionIds());
  return MISSIONS.map((m) => ({ ...m, completed: completedIds.has(m.id) || m.check(stats) }));
}
