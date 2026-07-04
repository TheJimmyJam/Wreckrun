// economy.js — Phase 3 persistence: coins, car unlocks, selected car, upgrades.
// Separate from save.js (which owns best-score/best-distance) so the two
// concerns don't tangle, but uses the same safe-localStorage pattern.

import { UPGRADE_COSTS, MAX_UPGRADE_LEVEL } from "./cars.js";

const KEYS = {
  COINS: "wreckrun_coins",
  OWNED_CARS: "wreckrun_owned_cars",
  SELECTED_CAR: "wreckrun_selected_car",
  ARMOR_LEVEL: "wreckrun_upgrade_armor_level",
  SPEED_LEVEL: "wreckrun_upgrade_speed_level",
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
    // storage unavailable — fail silently, same as save.js
  }
}

export function getCoins() {
  return safeGet(KEYS.COINS, 0);
}

export function addCoins(amount) {
  const next = getCoins() + Math.max(0, Math.floor(amount));
  safeSet(KEYS.COINS, next);
  return next;
}

function spendCoins(amount) {
  const balance = getCoins();
  if (balance < amount) return false;
  safeSet(KEYS.COINS, balance - amount);
  return true;
}

export function getOwnedCarIds() {
  return safeGet(KEYS.OWNED_CARS, ["sedan"]);
}

export function ownsCar(carId) {
  return getOwnedCarIds().includes(carId);
}

/** Attempts to buy a car. Returns true on success, false if already owned or insufficient coins. */
export function buyCar(carId, price) {
  if (ownsCar(carId)) return false;
  if (!spendCoins(price)) return false;
  const owned = getOwnedCarIds();
  owned.push(carId);
  safeSet(KEYS.OWNED_CARS, owned);
  return true;
}

export function getSelectedCarId() {
  return safeGet(KEYS.SELECTED_CAR, "sedan");
}

export function setSelectedCarId(carId) {
  if (!ownsCar(carId)) return false;
  safeSet(KEYS.SELECTED_CAR, carId);
  return true;
}

export function getUpgradeLevel(track) {
  const key = track === "armor" ? KEYS.ARMOR_LEVEL : KEYS.SPEED_LEVEL;
  return safeGet(key, 0);
}

export function getUpgradeCost(track) {
  const level = getUpgradeLevel(track);
  if (level >= MAX_UPGRADE_LEVEL) return null; // maxed out
  return UPGRADE_COSTS[level];
}

/** Attempts to buy the next level of an upgrade track ("armor" | "speed"). */
export function buyUpgrade(track) {
  const cost = getUpgradeCost(track);
  if (cost === null) return false; // already maxed
  if (!spendCoins(cost)) return false;
  const key = track === "armor" ? KEYS.ARMOR_LEVEL : KEYS.SPEED_LEVEL;
  safeSet(key, getUpgradeLevel(track) + 1);
  return true;
}
