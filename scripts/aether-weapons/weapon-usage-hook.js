/**
 * Weapon Usage Hook Integration
 *
 * Connects the overpower prompt and execution to actual weapon usage in Foundry.
 * Building incrementally with TDD!
 */

import { showFireModeDialog } from "./fire-mode-dialog.js";
import {
  checkAetherFuelAvailable,
  executeOverclock,
} from "./overclock-execution.js";
import { showFuelSelectionPrompt } from "./fuel-selection-prompt.js";
import { getAvailableAetherFuel } from "../aether-fuel/fuel-selection.js";
import { showAmmoSelectionDialog } from "../ammo-selection/ammo-dialog.js";
import { consumeAmmo } from "../ammo-selection/ammo-utils.js";
import { rollConstitutionSave } from "../aether-fuel/consumption.js";
import { calculateToxicityDC } from "../utils/calculations.js";
import { getDailyDoses } from "../utils/flags.js";
import { getActivityIdForFireMode } from "./activity-selection.js";

/**
 * Check if we should intercept this weapon's usage
 * @param {Object} weapon - The weapon item
 * @returns {boolean} True if should intercept
 */
export function shouldInterceptWeapon(weapon) {
  if (!weapon) return false;

  // Check if it's an aether weapon
  const isAetherWeapon = weapon.getFlag?.("elysium", "isAetherWeapon");
  if (!isAetherWeapon) return false;

  // Don't intercept if weapon is locked
  const isLocked = weapon.getFlag?.("elysium", "isLocked");
  if (isLocked) return false;

  return true;
}

/**
 * Show the overpower prompt dialog and return user's choice
 * @param {Object} weapon - The weapon item
 * @param {Object} actor - The actor using the weapon
 * @returns {Promise<string|null>} User's choice ("normal", "overpower", or null if cancelled)
 */
export async function showOverpowerPrompt(weapon, actor) {
  return await showOverpowerDialog(weapon, actor);
}

/**
 * Handle normal fire choice - no overclock, just return activity ID
 * @param {Object} weapon - The weapon item
 * @param {Object} actor - The actor using the weapon
 * @returns {Promise<Object>} Result with continue:true and activityId
 */
export async function handleNormalFire(weapon, actor) {
  const activityId = getActivityIdForFireMode("normal");

  return {
    continue: true,
    mode: "normal",
    activityId,
  };
}

/**
 * Check if actor has aether fuel for overpower mode
 * Shows warning if no fuel available
 * @param {Object} actor - The actor
 * @returns {boolean} True if fuel available
 */
export function checkFuelForOverpower(actor) {
  const hasFuel = checkAetherFuelAvailable(actor);

  if (!hasFuel) {
    ui.notifications.warn(
      "No aether fuel available! Overpower requires aether fuel to activate."
    );
  }

  return hasFuel;
}

/**
 * Main orchestrator - handles the complete aether weapon usage flow
 * @param {Object} weapon - The weapon item
 * @param {Object} actor - The actor using the weapon
 * @returns {Promise<Object>} Result object with continue, mode, cancelled, etc.
 */
export async function handleAetherWeaponUsage(weapon, actor) {
  // Check if it's an aether weapon
  const isAetherWeapon = weapon?.getFlag?.("elysium", "isAetherWeapon");
  if (!isAetherWeapon) {
    return { continue: true, intercepted: false };
  }

  // Check if weapon is locked
  if (weapon.getFlag("elysium", "isLocked")) {
    ui.notifications.warn(
      `${weapon.name} is locked due to aether overload! Rest to unlock.`
    );
    return {
      continue: false,
      cancelled: true,
      reason: "weapon-locked",
    };
  }

  // Step 1: Show fire mode selection dialog
  const fireMode = await showFireModeDialog(weapon, actor);

  console.log("Elysium | weapon-usage-hook - fire mode selected:", fireMode);

  // If cancelled, abort
  if (!fireMode) {
    console.log("Elysium | weapon-usage-hook - fire mode selection cancelled");
    return {
      continue: false,
      cancelled: true,
    };
  }

  // Step 2: Show ammo selection dialog (no overclock toggle)
  const selection = await showAmmoSelectionDialog(actor, weapon, { showOverclock: false });

  console.log("Elysium | weapon-usage-hook - ammo selection received:", selection);

  // If cancelled, abort
  if (!selection) {
    console.log("Elysium | weapon-usage-hook - ammo selection cancelled");
    return {
      continue: false,
      cancelled: true,
    };
  }

  const { ammo: selectedAmmo } = selection;

  // Consume the selected ammunition
  await consumeAmmo(selectedAmmo);

  // Handle normal fire
  if (fireMode === "normal") {
    return await handleNormalFire(weapon, actor);
  }

  // Handle overpower - check for fuel
  if (!checkFuelForOverpower(actor)) {
    return {
      continue: false,
      cancelled: true,
      reason: "no-fuel",
    };
  }

  // Get available fuels and prompt for selection
  const availableFuels = getAvailableAetherFuel(actor);
  const aetherFuel = await showFuelSelectionPrompt(availableFuels);
  if (!aetherFuel) {
    return {
      continue: false,
      cancelled: true,
      reason: "fuel-selection-cancelled",
    };
  }

  // Calculate DC and roll CON save (using existing toxicity system)
  const currentDoses = getDailyDoses(actor);
  const dc = calculateToxicityDC(currentDoses);
  const saveRollArray = await rollConstitutionSave(actor, dc);

  // Extract roll from array (v4.1+ returns array)
  const saveRoll = Array.isArray(saveRollArray)
    ? saveRollArray[0]
    : saveRollArray;

  // Execute the overclock!
  const overclockResult = await executeOverclock(
    actor,
    weapon,
    aetherFuel,
    saveRoll
  );

  // Get activity ID for overclock mode
  const activityId = getActivityIdForFireMode("overclock");

  return {
    continue: true,
    mode: "overclock",
    activityId,
    overclockResult,
  };
}
