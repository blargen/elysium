/**
 * Overclock Execution Logic
 *
 * The "Oh Shit Button" - executes the dangerous overclock:
 * - GUARANTEES +1 ATL (no roll for toxicity)
 * - Requires CON save or weapon locks until long rest
 * - Consumes aether fuel
 * - Applies toxicity conditions
 */

import { calculateToxicityDC } from "../utils/calculations.js";
import {
  getDailyDoses,
  setDailyDoses,
  getATL,
  setATL,
} from "../utils/flags.js";
import { applyToxicityEffects } from "../aether-fuel/toxicity.js";

/**
 * Check if actor has any aether fuel available
 * @param {Object} actor - The actor
 * @returns {boolean} True if aether fuel is available
 */
export function checkAetherFuelAvailable(actor) {
  if (!actor || !actor.items) return false;

  const aetherFuel = actor.items.filter((item) => {
    // Check if item has the flag method and is aether fuel
    if (typeof item.getFlag !== "function") return false;
    if (item.getFlag("elysium", "isAetherFuel") !== true) return false;

    // Check if it has uses remaining
    const uses = item.system?.uses?.value || 0;
    return uses > 0;
  });

  return aetherFuel.length > 0;
}

/**
 * Execute the overclock sequence
 * @param {Object} actor - The actor using overclock
 * @param {Object} weapon - The weapon being overclocked
 * @param {Object} aetherFuel - The aether fuel item being consumed
 * @param {Object} saveRoll - The CON save roll result
 * @returns {Promise<Object>} Result object with all overclock data
 */
export async function executeOverclock(actor, weapon, aetherFuel, saveRoll) {
  // Get current state
  const currentDoses = getDailyDoses(actor);
  const currentATL = getATL(actor);

  // Calculate DC for this overclock
  const dc = calculateToxicityDC(currentDoses);

  // Increment daily doses
  const newDailyDoses = currentDoses + 1;
  await setDailyDoses(actor, newDailyDoses);

  // GUARANTEED ATL increase (no roll)
  const newATL = currentATL + 1;
  await setATL(actor, newATL);

  // Apply toxicity conditions based on new ATL
  await applyToxicityEffects(actor, newATL);

  // Consume aether fuel
  await consumeAetherFuel(aetherFuel);

  // Check CON save for weapon lock (not ATL - that's guaranteed)
  const saveTotal = saveRoll.total || 0;
  const saveSuccess = saveTotal > dc; // Must beat DC, not meet it

  // If save failed, lock the weapon
  let weaponLocked = false;
  if (!saveSuccess) {
    await weapon.setFlag("elysium", "isLocked", true);
    weaponLocked = true;
  }

  return {
    success: true,
    newDailyDoses,
    newATL,
    dc,
    saveSuccess,
    weaponLocked,
    rollTotal: saveTotal,
  };
}

/**
 * Consume one use of aether fuel, delete if last use
 * @param {Object} aetherFuel - The aether fuel item
 * @returns {Promise<void>}
 */
async function consumeAetherFuel(aetherFuel) {
  const currentUses = aetherFuel.system?.uses?.value || 0;

  if (currentUses <= 1) {
    // Last use - delete the item
    await aetherFuel.delete();
  } else {
    // Decrement uses
    await aetherFuel.update({
      "system.uses.value": currentUses - 1,
    });
  }
}

/**
 * Validate an overclock result object
 * @param {Object} result - The result to validate
 * @returns {boolean} True if valid
 */
export function validateOverclockResult(result) {
  if (!result) return false;

  const requiredFields = [
    "success",
    "newDailyDoses",
    "newATL",
    "dc",
    "saveSuccess",
    "weaponLocked",
  ];

  return requiredFields.every((field) => result.hasOwnProperty(field));
}
