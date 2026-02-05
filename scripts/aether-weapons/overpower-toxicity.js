/**
 * Overpower Toxicity System
 *
 * The "Oh Shit Button" - guaranteed toxicity with weapon lock risk
 */

import {
  getDailyDoses,
  setDailyDoses,
  getATL,
  setATL,
} from "../utils/flags.js";
import { calculateToxicityDC } from "../utils/calculations.js";
import { applyToxicityEffects } from "../aether-fuel/toxicity.js";
import { lockWeapon } from "./weapon-detection.js";

/**
 * Apply overpower toxicity - guaranteed ATL increase with weapon lock risk
 *
 * @param {Actor} actor - The actor using overpower
 * @param {Item} weapon - The aether weapon being overpowered
 * @param {Roll} roll - The CON save roll
 * @returns {Promise<Object>} Result with saveSuccess, weaponLocked, newATL, newDailyDoses
 */
export async function applyOverpowerToxicity(actor, weapon, roll) {
  // Get current toxicity state
  const dailyDoses = getDailyDoses(actor);
  const currentATL = getATL(actor);

  // Increment daily doses
  const newDailyDoses = dailyDoses + 1;
  await setDailyDoses(actor, newDailyDoses);

  // GUARANTEED ATL increase (no roll needed)
  const newATL = currentATL + 1;
  await setATL(actor, newATL);

  // Apply toxicity conditions for new ATL level
  await applyToxicityEffects(actor, newATL);

  // Calculate DC for weapon lock save
  const dc = calculateToxicityDC(dailyDoses);

  // Handle roll format (might be array or object)
  const actualRoll = Array.isArray(roll) ? roll[0] : roll;
  const rollTotal = actualRoll?._total ?? actualRoll?.total ?? 0;
  const saveSuccess = rollTotal >= dc;

  console.log(
    `Elysium | Overpower Save: ${saveSuccess ? "✅ WEAPON SAFE" : "❌ WEAPON LOCKED"} (rolled ${rollTotal} vs DC ${dc})`
  );

  // Lock weapon on failed save
  let weaponLocked = false;
  if (!saveSuccess) {
    await lockWeapon(weapon);
    weaponLocked = true;
  }

  return {
    saveSuccess,
    weaponLocked,
    newATL,
    newDailyDoses,
  };
}
