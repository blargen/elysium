/**
 * Gift of a Thousand Strikes Hooks
 *
 * Intercepts item use to show custom focus/aether selection dialog.
 */

import { registerPreUseActivityHandler } from "../hooks/hook-registry.js";
import { getModType } from "../utils/flags.js";
import { handleGiftOfThousandStrikes } from "./gift-handler.js";

/**
 * Register Gift of a Thousand Strikes hooks
 */
export function registerGiftHooks() {
  // Note: "ki-enhancement" is the legacy flag name, kept for compatibility
  registerPreUseActivityHandler(
    (item) => getModType(item) === "ki-enhancement",
    handleGiftUse
  );

  console.log("Elysium | Gift of a Thousand Strikes hooks registered");
}

/**
 * Handle Gift use - show custom dialog
 */
async function handleGiftUse(actor, item) {
  console.log(`Elysium | ${actor.name} is using Gift of a Thousand Strikes`);
  await handleGiftOfThousandStrikes(actor, item);
  return false; // Prevent default item use
}
