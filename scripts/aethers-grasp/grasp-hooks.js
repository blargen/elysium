/**
 * Aether's Grasp Hooks
 *
 * Intercepts item use to show custom spell selection dialog.
 * Also blocks direct casting of spells stored in Aether's Grasp.
 */

import { registerPreUseActivityHandler } from "../hooks/hook-registry.js";
import { getModType } from "../utils/flags.js";
import { handleAethersGraspUse } from "./grasp-handler.js";
import { authorizedGraspCasts } from "./cast.js";

/**
 * Register Aether's Grasp hooks
 */
export function registerAethersGraspHooks() {
  // Hook 1: Intercept Aether's Grasp item use to show custom dialog
  registerPreUseActivityHandler(
    (item) => getModType(item) === "spell-storage" && !item.getFlag("elysium", "isTheMetatron"),
    handleGraspUse
  );

  // Hook 2: Block direct casting of spells stored in Aether's Grasp
  registerPreUseActivityHandler(
    isGraspSpell,
    blockDirectGraspSpellCast
  );

  console.log("Elysium | Aether's Grasp hooks registered");
}

/**
 * Check if an item is a spell stored by Aether's Grasp
 * @param {Item} item - The item being used
 * @returns {boolean} True if this is a Grasp-stored spell
 */
function isGraspSpell(item) {
  return item.type === "spell" && item.getFlag("elysium", "fromAethersGrasp") === true;
}

/**
 * Block direct casting of Grasp spells unless authorized
 * @param {Actor} actor - The actor casting
 * @param {Item} item - The spell being cast
 * @returns {boolean} False to block, undefined to allow
 */
async function blockDirectGraspSpellCast(actor, item) {
  // Check if this cast is authorized (through Aether's Grasp workflow)
  if (authorizedGraspCasts.has(item.id)) {
    console.log(`Elysium | Authorized Grasp cast: ${item.name}`);
    return; // Allow the cast to proceed
  }

  // Block the direct cast
  const fingerName = item.getFlag("elysium", "fingerName") || "a finger";
  ui.notifications.warn(
    `${item.name} must be cast through Aether's Grasp, not directly from your spellbook!`
  );
  console.log(`Elysium | Blocked direct cast of ${item.name} (stored on ${fingerName})`);
  return false; // Cancel the activity
}

/**
 * Handle Aether's Grasp use - show custom dialog
 */
async function handleGraspUse(actor, item) {
  console.log(`Elysium | ${actor.name} is using Aether's Grasp`);
  await handleAethersGraspUse(actor, item);
  return false; // Prevent default item use
}
