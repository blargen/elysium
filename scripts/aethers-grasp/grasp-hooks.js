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
  // Authorization check is in canHandle so the registry can let authorized casts through synchronously
  registerPreUseActivityHandler(
    (item) => isGraspSpell(item) && !authorizedGraspCasts.has(item.id),
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
 * Block direct casting of Grasp spells (unauthorized casts only - authorized
 * casts are filtered out in canHandle so the registry lets them through)
 * @param {Actor} actor - The actor casting
 * @param {Item} item - The spell being cast
 */
async function blockDirectGraspSpellCast(actor, item) {
  const fingerName = item.getFlag("elysium", "fingerName") || "a finger";
  ui.notifications.warn(
    `${item.name} must be cast through Aether's Grasp, not directly from your spellbook!`
  );
  console.log(`Elysium | Blocked direct cast of ${item.name} (stored on ${fingerName})`);
}

/**
 * Handle Aether's Grasp use - show custom dialog
 */
async function handleGraspUse(actor, item) {
  console.log(`Elysium | ${actor.name} is using Aether's Grasp`);
  await handleAethersGraspUse(actor, item);
}
