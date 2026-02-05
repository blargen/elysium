/**
 * Weapon Hook Registration
 *
 * Registers the hook that intercepts aether weapon usage in Foundry.
 * Uses the activity system hook pattern for D&D 5e v4+.
 */

import { registerPreUseActivityHandler } from "../hooks/hook-registry.js";
import { handleAetherWeaponUsage } from "./weapon-usage-hook.js";

/**
 * Set of activity IDs authorized to bypass our handler on re-trigger.
 */
const authorizedWeaponUses = new Set();

/**
 * Register the weapon usage hook (using activity system)
 */
export function registerWeaponUsageHook() {
  console.log("Elysium | Registering weapon usage hook (dnd5e.preUseActivity)");

  registerPreUseActivityHandler(
    // canHandle - check if this is an aether weapon
    (item, activity) => {
      const isAetherWeapon = item.getFlag("elysium", "isAetherWeapon");
      const isAuthorized = authorizedWeaponUses.has(activity?._id);

      // Only intercept if it's an aether weapon AND not already authorized
      return isAetherWeapon && !isAuthorized;
    },

    // handle - async handler that shows dialogs and re-triggers
    async (actor, item, activity) => {
      console.log("Elysium | Aether weapon activity intercepted:", item.name);

      // Run our handler
      const result = await handleAetherWeaponUsage(item, actor);

      console.log("Elysium | Handler result:", result);

      // If cancelled, don't re-trigger
      if (result.cancelled) {
        return;
      }

      // Authorize the re-trigger so canHandle returns false next time
      authorizedWeaponUses.add(activity._id);

      try {
        // Re-trigger the activity - this time it will proceed normally
        await activity.use({});
      } finally {
        // Clean up authorization
        authorizedWeaponUses.delete(activity._id);
      }
    }
  );
}
