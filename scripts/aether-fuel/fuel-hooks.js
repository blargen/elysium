/**
 * Aether Fuel Hooks
 *
 * Handles toxicity warnings, consumption effects, and long rest recovery
 * for the aether fuel system.
 */

import {
  registerPreUseActivityHandler,
  registerPostActivityConsumptionHandler,
  registerRestCompletedHandler,
} from "../hooks/hook-registry.js";
import { resetToxicityOnLongRest, applyUnrefinedAetherUse } from "./toxicity.js";
import { rollConstitutionSave, showToxicityWarning } from "./consumption.js";
import { isAetherFuel, getAetherQuality, getDailyDoses } from "../utils/flags.js";
import { calculateToxicityDC } from "../utils/calculations.js";
import { createAetherRecoveryMessage } from "../ui/chat-messages.js";

/**
 * Register all aether fuel hooks
 */
export function registerAetherFuelHooks() {
  // Show toxicity warning before using unrefined aether
  registerPreUseActivityHandler(
    (item) => isAetherFuel(item) && getAetherQuality(item) === "unrefined",
    handleUnrefinedAetherWarning
  );

  // Apply toxicity after consuming unrefined aether
  registerPostActivityConsumptionHandler(
    (item) => isAetherFuel(item),
    handleAetherFuelConsumption
  );

  // Reset toxicity and remove effects on long rest
  registerRestCompletedHandler(
    () => true, // Always check - toxicity could apply to any actor
    handleLongRestRecovery
  );

  console.log("Elysium | Aether fuel hooks registered");
}

/**
 * Show toxicity warning before using unrefined aether
 */
async function handleUnrefinedAetherWarning(actor, item, activity, config) {
  const proceed = await showToxicityWarning(actor);
  if (!proceed) {
    ui.notifications.warn("Unrefined aether use cancelled.");
    return false;
  }

  // Skip system configuration dialog
  if (config.dialogConfig) {
    config.dialogConfig.configure = false;
  }
}

/**
 * Apply toxicity effects after consuming aether fuel
 */
async function handleAetherFuelConsumption(actor, item) {
  console.log(`Elysium | ${actor.name} used aether fuel: ${item.name}`);
  const quality = getAetherQuality(item);

  if (quality === "unrefined") {
    const dailyDoses = getDailyDoses(actor);
    const dc = calculateToxicityDC(dailyDoses);
    const roll = await rollConstitutionSave(actor, dc);
    await applyUnrefinedAetherUse(actor, roll);
    console.log(`Elysium | Toxicity applied for ${quality} aether`);
  } else {
    console.log(`Elysium | ${quality} aether consumed safely (no toxicity)`);
  }
}

/**
 * Handle long rest recovery - reset toxicity and remove aether effects
 */
async function handleLongRestRecovery(actor) {
  const resetOccurred = await resetToxicityOnLongRest(actor);

  // Remove all aether-related active effects
  const aetherEffects = actor.effects.filter(
    (effect) =>
      effect.origin?.includes("elysium") ||
      effect.getFlag("elysium", "isAetherEffect")
  );

  if (aetherEffects.length > 0) {
    console.log(`Elysium | Removing ${aetherEffects.length} aether effects from ${actor.name}`);
    await Promise.all(
      aetherEffects.map((effect) =>
        effect.delete().catch((err) => {
          console.warn(`Elysium | Could not delete effect ${effect.id}: ${err.message}`);
        })
      )
    );
  }

  // Show recovery message if anything was reset
  if (resetOccurred || aetherEffects.length > 0) {
    await createAetherRecoveryMessage(actor, aetherEffects.length);
    ui.notifications.info(`${actor.name} recovers from aether effects!`);
  }
}
