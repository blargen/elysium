/**
 * Damage Modification Hook Registration
 *
 * Registers hooks to modify weapon damage based on fire mode.
 */

import { modifyWeaponDamage } from "./damage-modification.js";

/**
 * Register the damage modification hook (using midi-qol)
 */
export function registerDamageModificationHook() {
  console.log("Elysium | Registering damage modification hook (midi-qol.preDamageRoll)");

  // Hook into midi-qol damage calculation
  Hooks.on("midi-qol.preDamageRoll", async (workflow) => {
    const item = workflow.item;
    if (!item) return true;

    // Check if this is an overclock shot
    const fireMode = item.getFlag("elysium", "currentFireMode");
    if (!fireMode || fireMode !== "overclock") return true;

    // Get the activity from the workflow
    const activity = workflow.activity;
    if (!activity?.damage?.parts?.[0]) {
      console.error(`Elysium | ${item.name} activity has no damage parts!`);
      return true;
    }

    // Modify the activity's damage parts directly (4d6 instead of 2d6)
    const originalNumber = activity.damage.parts[0].number;
    activity.damage.parts[0].number = 4;

    console.log(`Elysium | Modified damage: ${originalNumber}d6 → 4d6`);

    // Clear the fire mode flag after using it
    await item.unsetFlag("elysium", "currentFireMode");

    return true;
  });
}
