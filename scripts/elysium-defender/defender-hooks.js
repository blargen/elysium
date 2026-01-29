/**
 * Elysium Defender Hooks
 *
 * Registers handlers for The Elysium Defender's Fire and Overload activities.
 * Both require aether fuel selection before the attack proceeds.
 *
 * Uses the "authorize and re-trigger" pattern:
 * 1. preUseActivity fires -> cancel immediately (return false)
 * 2. Show fuel dialog (async)
 * 3. Consume fuel, apply effects
 * 4. Add activity to authorized set
 * 5. Re-trigger activity.use() -> hook fires again -> authorized -> let through
 * 6. Clean up authorized set
 *
 * This pattern is necessary because Foundry's hook system does NOT await
 * async callbacks. See foundry-dnd5e skill for details.
 */

import {
  registerPreUseActivityHandler,
  registerRestCompletedHandler,
} from "../hooks/hook-registry.js";
import { isItemDisabled, enableItem } from "../utils/overload.js";
import { selectAetherFuel } from "../utils/fuel-selection-dialog.js";
import { handleDefenderFire, handleDefenderOverload } from "./defender-handler.js";

/**
 * Set of activity IDs authorized to bypass our handler on re-trigger.
 */
const authorizedDefenderUses = new Set();

/**
 * Register Elysium Defender hooks
 */
export function registerDefenderHooks() {
  registerPreUseActivityHandler(
    (item, activity) =>
      item.getFlag("elysium", "isElysiumDefender") &&
      !authorizedDefenderUses.has(activity?._id),
    handleDefenderActivity,
  );

  registerRestCompletedHandler(
    (actor) =>
      actor.items.some(
        (item) =>
          item.getFlag("elysium", "isElysiumDefender") &&
          isItemDisabled(item),
      ),
    handleDefenderRest,
  );

  console.log("Elysium | Elysium Defender hooks registered");
}

/**
 * Handle Elysium Defender activity use (Fire or Overload)
 *
 * Always cancels the default activity, shows fuel dialog,
 * then re-triggers the activity after fuel is consumed.
 */
async function handleDefenderActivity(actor, item, activity) {
  // Check if weapon is disabled
  if (isItemDisabled(item)) {
    ui.notifications.warn(
      "The Elysium Defender's internal mechanisms have seized up. It needs a long rest to recover.",
    );
    return false;
  }

  // Show fuel selection dialog
  const fuel = await selectAetherFuel(actor);
  if (!fuel) return false;

  // Handle based on activity type
  if (activity.name === "Overload") {
    const result = await handleDefenderOverload(actor, item, fuel);

    if (result.weaponDisabled) {
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `
          <div class="elysium-info-box-warning elysium-text-center">
            <h3 class="elysium-header">Overload!</h3>
            <p class="elysium-text-orange"><strong>Stability Roll:</strong> ${result.roll} (needed > ${result.threshold})</p>
            <p class="elysium-text-orange">The Elysium Defender's mechanisms seize up! <strong>Inert</strong> until long rest.</p>
          </div>
        `,
      });
    } else {
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `
          <div class="elysium-info-box elysium-text-center">
            <h3 class="elysium-header">Overload!</h3>
            <p><strong>Stability Roll:</strong> ${result.roll} (needed > ${result.threshold}) - The weapon holds!</p>
          </div>
        `,
      });
    }
  } else {
    const result = await handleDefenderFire(actor, item, fuel);
    if (!result.success) return false;
  }

  // Authorize the re-trigger so canHandle returns false and the registry
  // lets the activity proceed normally (with attack/damage rolls)
  authorizedDefenderUses.add(activity._id);

  try {
    await activity.use({});
  } finally {
    authorizedDefenderUses.delete(activity._id);
  }
}

/**
 * Handle long rest - re-enable disabled Elysium Defenders
 */
async function handleDefenderRest(actor) {
  const disabledDefenders = actor.items.filter(
    (item) =>
      item.getFlag("elysium", "isElysiumDefender") && isItemDisabled(item),
  );

  for (const defender of disabledDefenders) {
    await enableItem(defender);
    ui.notifications.info(
      "The Elysium Defender hums back to life, its mechanisms restored.",
    );
  }
}
