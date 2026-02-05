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

    const result = modifyWeaponDamage(item);

    if (result.modified) {
      // Modify the damage formula in the workflow
      if (workflow.damageRoll) {
        workflow.damageRoll = await new Roll(result.newFormula).evaluate();
      }

      console.log(
        `Elysium | Modified damage: ${result.originalFormula} → ${result.newFormula} (${result.damageType})`
      );

      // Clear the fire mode flag after using it
      await item.unsetFlag("elysium", "currentFireMode");
    }

    return true;
  });
}
