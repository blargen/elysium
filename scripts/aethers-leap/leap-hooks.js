/**
 * Aether's Leap Hooks
 *
 * Handles leap activation after activity consumption.
 */

import { registerPostActivityConsumptionHandler } from "../hooks/hook-registry.js";
import { useAethersLeap } from "./leap.js";

/**
 * Register Aether's Leap hooks
 */
export function registerAethersLeapHooks() {
  registerPostActivityConsumptionHandler(
    (item) => item.getFlag("elysium", "isAethersLeap"),
    handleLeapActivity
  );

  console.log("Elysium | Aether's Leap hooks registered");
}

/**
 * Handle Aether's Leap activity
 */
async function handleLeapActivity(actor, item) {
  console.log(`Elysium | Detected Aether's Leap item: ${item.name}`);
  await useAethersLeap(actor, item);
}
