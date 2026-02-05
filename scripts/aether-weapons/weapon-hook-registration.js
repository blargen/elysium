/**
 * Weapon Hook Registration
 *
 * Registers the hook that intercepts aether weapon usage in Foundry.
 */

import { handleAetherWeaponUsage } from "./weapon-usage-hook.js";

/**
 * Register the weapon usage hook with Foundry (using midi-qol)
 */
export function registerWeaponUsageHook() {
  console.log("Elysium | Registering weapon usage hook (midi-qol.preItemRoll)");

  Hooks.on("midi-qol.preItemRoll", async (workflow) => {
    const item = workflow.item;
    const actor = workflow.actor;

    console.log("Elysium | midi-qol.preItemRoll fired for:", item?.name);

    // Only process if item has an actor
    if (!item || !actor) return true;

    // Let our handler process it
    const result = await handleAetherWeaponUsage(item, actor);

    console.log("Elysium | Handler result:", result);

    // If not intercepted, let it continue normally
    if (!result.intercepted && result.intercepted !== undefined) {
      return true;
    }

    // If cancelled, prevent the item use
    if (result.cancelled) {
      return false;
    }

    // Otherwise continue (normal fire or overpower completed)
    return true;
  });
}
