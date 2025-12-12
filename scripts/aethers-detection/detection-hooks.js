/**
 * Aether's Detection Hooks
 *
 * Handles detection activation and detection roll activities.
 */

import { registerPostActivityConsumptionHandler } from "../hooks/hook-registry.js";
import { useAethersDetection, rollDetectionCheck } from "./detection.js";

/**
 * Register Aether's Detection hooks
 */
export function registerAethersDetectionHooks() {
  registerPostActivityConsumptionHandler(
    (item) => item.getFlag("elysium", "isAethersDetection"),
    handleDetectionActivity
  );

  console.log("Elysium | Aether's Detection hooks registered");
}

/**
 * Handle Aether's Detection activities
 */
async function handleDetectionActivity(actor, item, activity) {
  if (activity.name === "Detect") {
    console.log(`Elysium | Detected Detection roll activity: ${activity.name}`);
    await rollDetectionCheck(actor, item);
    return;
  }

  if (activity.name?.includes("Activate")) {
    console.log(`Elysium | Detected Activate Detection activity: ${activity.name}`);
    await useAethersDetection(actor, item);
    return;
  }
}
