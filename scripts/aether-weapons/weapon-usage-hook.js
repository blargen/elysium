/**
 * Weapon Usage Hook Integration
 *
 * Connects the overpower prompt and execution to actual weapon usage in Foundry.
 * Building incrementally with TDD!
 */

import { createOverpowerDialog } from "./overpower-prompt.js";
import {
  checkAetherFuelAvailable,
  executeOverclock,
} from "./overclock-execution.js";
import { showFuelSelectionPrompt } from "./fuel-selection-prompt.js";
import { getAvailableAetherFuel } from "../aether-fuel/fuel-selection.js";

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
  const dialogConfig = createOverpowerDialog(weapon, actor);
  const choice = await Dialog.wait(dialogConfig);
  return choice;
}

/**
 * Handle normal fire choice - no overclock, just store the mode
 * @param {Object} weapon - The weapon item
 * @param {Object} actor - The actor using the weapon
 * @returns {Promise<Object>} Result with continue:true
 */
export async function handleNormalFire(weapon, actor) {
  // Store the fire mode on the weapon for damage calculation
  await weapon.setFlag("elysium", "currentFireMode", "normal");

  return {
    continue: true,
    mode: "normal",
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

  // Show the overpower prompt dialog
  const choice = await showOverpowerPrompt(weapon, actor);

  // If cancelled, abort
  if (!choice) {
    return {
      continue: false,
      cancelled: true,
    };
  }

  // Handle normal fire
  if (choice === "normal") {
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

  // Prompt for CON save roll
  const saveRoll = await actor.rollSavingThrow("con");

  // Execute the overclock!
  const overclockResult = await executeOverclock(
    actor,
    weapon,
    aetherFuel,
    saveRoll
  );

  // Store overpower mode on weapon
  await weapon.setFlag("elysium", "currentFireMode", "overpower");

  return {
    continue: true,
    mode: "overpower",
    overclockResult,
  };
}
