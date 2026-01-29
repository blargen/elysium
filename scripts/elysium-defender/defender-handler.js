/**
 * Elysium Defender Handler
 *
 * Handles the overload mechanic for The Elysium Defender.
 * Uses shared overload utilities for the risk/dormancy pattern.
 */

import {
  calculateOverloadThreshold,
  isOverloadFailure,
  disableItem,
} from "../utils/overload.js";
import { getDailyDoses, setDailyDoses, getATL, setATL, getAetherQuality } from "../utils/flags.js";
import { consumeAetherFuelItem } from "../aether-fuel/consumption.js";

/**
 * Handle a regular Fire shot from the Elysium Defender
 *
 * Consumes aether fuel but does not apply toxicity or risk dormancy.
 *
 * @param {Actor} actor - The actor firing the weapon
 * @param {Item} item - The Elysium Defender item
 * @param {Item|null} fuel - The aether fuel to consume
 * @returns {Object} Result with success and fuel info
 */
export async function handleDefenderFire(actor, item, fuel) {
  if (!fuel) {
    return { success: false, reason: "no-fuel" };
  }

  const fuelQuality = getAetherQuality(fuel);

  await consumeAetherFuelItem(fuel);

  return {
    success: true,
    fuelConsumed: true,
    fuelQuality,
  };
}

/**
 * Execute the Elysium Defender's overload attack
 *
 * Flow:
 * 1. Consume aether fuel
 * 2. Increment daily doses and ATL
 * 3. Roll d20 for weapon stability
 * 4. If failed, disable weapon until long rest
 *
 * @param {Actor} actor - The actor using the weapon
 * @param {Item} item - The Elysium Defender item
 * @param {Item|null} fuel - The aether fuel to consume
 * @param {Object} options - Options including roll override for testing
 * @returns {Object} Result with success, damage, stability info
 */
export async function handleDefenderOverload(actor, item, fuel, options = {}) {
  if (!fuel) {
    return { success: false, reason: "no-fuel" };
  }

  // Step 1: Consume the aether fuel
  await consumeAetherFuelItem(fuel);

  // Step 2: Increment daily doses
  const currentDoses = getDailyDoses(actor);
  await setDailyDoses(actor, currentDoses + 1);

  // Step 3: Increment ATL
  const currentATL = getATL(actor);
  const newATL = currentATL + 1;
  await setATL(actor, newATL);

  // Step 4: Calculate stability threshold based on NEW ATL
  const threshold = calculateOverloadThreshold(newATL);

  // Step 5: Roll d20 (or use provided roll for testing)
  const roll = options.roll ?? Math.floor(Math.random() * 20) + 1;

  // Step 6: Check for weapon failure
  const failed = isOverloadFailure(roll, threshold);

  if (failed) {
    await disableItem(item);
  }

  // Step 7: Get overload damage from item flags
  const overload = item.getFlag("elysium", "overload") || {};
  const damageDice = overload.damageDice || "4d6";
  const damageType = overload.damageType || "force";

  return {
    success: true,
    fuelConsumed: true,
    damageDice,
    damageType,
    roll,
    threshold,
    newATL,
    weaponDisabled: failed,
  };
}
