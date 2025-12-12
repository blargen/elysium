/**
 * Aether's Grasp Hooks
 *
 * Intercepts item use to show custom spell selection dialog.
 */

import { registerPreUseActivityHandler } from "../hooks/hook-registry.js";
import { getModType } from "../utils/flags.js";
import { handleAethersGraspUse } from "./grasp-handler.js";

/**
 * Register Aether's Grasp hooks
 */
export function registerAethersGraspHooks() {
  registerPreUseActivityHandler(
    (item) => getModType(item) === "spell-storage" && !item.getFlag("elysium", "isTheMetatron"),
    handleGraspUse
  );

  console.log("Elysium | Aether's Grasp hooks registered");
}

/**
 * Handle Aether's Grasp use - show custom dialog
 */
async function handleGraspUse(actor, item) {
  console.log(`Elysium | ${actor.name} is using Aether's Grasp`);
  await handleAethersGraspUse(actor, item);
  return false; // Prevent default item use
}
