/**
 * The Metatron Hooks
 *
 * Intercepts item use and handles long rest re-enabling.
 */

import {
  registerPreUseActivityHandler,
  registerRestCompletedHandler,
} from "../hooks/hook-registry.js";
import { handleMetatronUse } from "./metatron-handler.js";
import { enableMetatron } from "./metatron-gambit.js";

/**
 * Register The Metatron hooks
 */
export function registerMetatronHooks() {
  // Intercept use to show custom dialog
  registerPreUseActivityHandler(
    (item) => item.getFlag("elysium", "isTheMetatron"),
    handleMetatronPreUse
  );

  // Re-enable disabled Metatrons on long rest
  registerRestCompletedHandler(
    (actor) => hasDisabledMetatron(actor),
    handleMetatronLongRest
  );

  console.log("Elysium | The Metatron hooks registered");
}

/**
 * Check if actor has a disabled Metatron
 */
function hasDisabledMetatron(actor) {
  return actor.items.some(
    (item) =>
      item.getFlag("elysium", "isTheMetatron") &&
      item.getFlag("elysium", "disabled")
  );
}

/**
 * Handle Metatron use - show custom dialog
 */
async function handleMetatronPreUse(actor, item) {
  console.log(`Elysium | ${actor.name} is using The Metatron`);
  await handleMetatronUse(actor, item);
  return false; // Prevent default item use
}

/**
 * Handle long rest - re-enable disabled Metatrons
 */
async function handleMetatronLongRest(actor) {
  const disabledMetatrons = actor.items.filter(
    (item) =>
      item.getFlag("elysium", "isTheMetatron") &&
      item.getFlag("elysium", "disabled")
  );

  for (const metatron of disabledMetatrons) {
    await enableMetatron(metatron);
    console.log(`Elysium | Re-enabled The Metatron for ${actor.name}`);
    ui.notifications.info("The Metatron awakens from its dormant state.");
  }
}
