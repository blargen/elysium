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
    async (actor, item, activity, { usageConfig, dialogConfig, messageConfig }) => {
      console.log("Elysium | Aether weapon activity intercepted:", item.name);

      // Run our handler
      const result = await handleAetherWeaponUsage(item, actor);

      console.log("Elysium | Handler result:", result);

      // If cancelled, don't re-trigger
      if (result.cancelled) {
        return;
      }

      // Get the correct activity to trigger based on fire mode
      const activityName = result.activityId;

      // Find activity by name (activities Map uses _id as key, so we need to search)
      let targetActivity = null;
      for (const activity of item.system.activities.values()) {
        if (activity.name === activityName) {
          targetActivity = activity;
          break;
        }
      }

      if (!targetActivity) {
        console.error(`Elysium | Activity "${activityName}" not found on weapon ${item.name}`);
        return;
      }

      // Authorize the re-trigger so canHandle returns false next time
      authorizedWeaponUses.add(targetActivity._id);

      try {
        // Trigger the correct activity - skip ALL dialogs
        console.log(`Elysium | Triggering activity: ${activityName} (${targetActivity.name})`);

        // Build config to skip both dnd5e and midi-qol dialogs
        const finalUsageConfig = {
          ...usageConfig,
          // Try midi-qol options at usage level
          skipRollDialog: true,
          forceRollDialog: false
        };

        const finalDialogConfig = {
          ...dialogConfig,
          skipDialog: true // Skip dnd5e dialog
        };

        const finalMessageConfig = {
          ...messageConfig,
          // Also try in flags
          flags: {
            ...messageConfig?.flags,
            "midi-qol": {
              ...messageConfig?.flags?.["midi-qol"],
              skipRollDialog: true,
              forceRollDialog: false
            }
          }
        };

        await targetActivity.use(finalUsageConfig, finalDialogConfig, finalMessageConfig);
      } finally {
        // Clean up authorization
        authorizedWeaponUses.delete(targetActivity._id);
      }
    }
  );
}
