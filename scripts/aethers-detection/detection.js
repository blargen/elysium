/**
 * Aether's Detection Item
 *
 * Grants advantage on Investigation checks for examining fine details (like Eyes of Minute Seeing)
 */

import { useAetherPoweredItem } from "../utils/aether-items.js";

/**
 * Apply the Investigation advantage effect to an actor (Aether's Detection)
 *
 * Eyes of Minute Seeing: Advantage on Investigation checks that rely on sight
 * while searching an area or studying an object within 1 foot.
 * Duration: 10 minutes (no concentration)
 *
 * @param {Actor} actor - The actor to receive the Detection effect
 * @param {string} fuelQuality - The quality of aether fuel used
 * @returns {Promise<Object>} Result with success and effectApplied
 */
export async function applyDetectionEffect(actor, fuelQuality) {
  console.log(
    `Elysium | Applying Detection effect to ${actor.name} (${fuelQuality} aether)`,
  );

  try {
    // Check if the effect already exists
    const existingEffect = actor.effects?.contents?.find(
      (e) => e.name === "Aether's Detection" && !e.disabled,
    );

    if (existingEffect) {
      // Refresh the existing effect by updating its duration
      console.log(`Elysium | Refreshing existing Detection effect`);

      await existingEffect.update({
        duration: {
          rounds: 100, // Reset to 10 minutes
        },
      });

      if (typeof ui !== "undefined") {
        ui.notifications?.info(`Aether's Detection effect refreshed!`);
      }

      return {
        success: true,
        effectApplied: true,
        refreshed: true,
      };
    }

    // Create the Detection active effect (just a timer/marker, no stat changes)
    const effectData = {
      name: "Aether's Detection",
      icon: "modules/elysium/assets/AethersDetection.png",
      origin: actor.uuid,
      duration: {
        rounds: 100, // 10 minutes = 100 rounds
        seconds: 600, // Also track real time outside combat
      },
      flags: {
        elysium: {
          aetherPowered: true,
          fuelQuality: fuelQuality,
        },
      },
      changes: [], // No stat changes - the Detect action grants advantage when rolled
    };

    await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);

    console.log(`Elysium | Detection effect applied successfully`);

    // Show a chat message about the effect
    if (typeof ChatMessage !== "undefined") {
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `
          <div class="elysium-chat-card">
            <h3 class="elysium-header">👁️ Aether's Detection</h3>
            <p><strong>${actor.name}</strong> activates their Aether's Detection!</p>
            <p class="elysium-effect-description">
              For the next 10 minutes, you have advantage on Intelligence (Investigation) checks
              that rely on sight while searching an area or studying an object within 1 foot of you.
            </p>
            <p class="elysium-text-muted">
              Powered by ${fuelQuality} aether.
            </p>
          </div>
        `,
      });
    }

    return {
      success: true,
      effectApplied: true,
    };
  } catch (error) {
    console.error(`Elysium | Failed to apply Detection effect:`, error);
    return {
      success: false,
      effectApplied: false,
      error: error.message,
    };
  }
}

/**
 * Use an Aether's Detection item
 *
 * @param {Actor} actor - The actor using the item
 * @param {Item} item - The Aether's Detection item
 * @param {Item} selectedFuel - Optional pre-selected fuel (for testing)
 * @returns {Promise<Object>} Result object
 */
export async function useAethersDetection(actor, item, selectedFuel = null) {
  console.log(`Elysium | ${actor.name} using ${item.name}`);

  // Check if item is equipped
  if (!item.system?.equipped) {
    console.log(`Elysium | ${item.name} is not equipped`);

    if (typeof ui !== "undefined") {
      ui.notifications?.warn(`You must equip ${item.name} to use it!`);
    }

    return {
      success: false,
      reason: "not-equipped",
      fuelConsumed: false,
    };
  }

  return await useAetherPoweredItem(
    actor,
    item,
    applyDetectionEffect,
    selectedFuel,
  );
}

/**
 * Roll an Investigation check with advantage (using Aether's Detection)
 * This requires the Detection effect to be active on the actor
 *
 * @param {Actor} actor - The actor making the check
 * @param {Item} item - The Aether's Detection item
 * @returns {Promise<Object>} Result object with roll total
 */
export async function rollDetectionCheck(actor, item) {
  console.log(`Elysium | ${actor.name} rolling Detection check`);

  // Check if item is equipped
  if (!item.system?.equipped) {
    console.log(`Elysium | ${item.name} is not equipped`);

    if (typeof ui !== "undefined") {
      ui.notifications?.warn(`You must equip ${item.name} to use it!`);
    }

    return {
      success: false,
      reason: "not-equipped",
    };
  }

  // Check if the Detection effect is active
  const hasActiveEffect = actor.effects?.contents?.some(
    (effect) => effect.name === "Aether's Detection" && !effect.disabled,
  );

  if (!hasActiveEffect) {
    console.log(`Elysium | Aether's Detection effect is not active`);

    if (typeof ui !== "undefined") {
      ui.notifications?.warn(
        `You must activate Aether's Detection first (costs aether fuel)!`,
      );
    }

    return {
      success: false,
      reason: "effect-not-active",
    };
  }

  try {
    // Roll Investigation with advantage (auto-roll, no dialogs)
    console.log(`Elysium | Auto-rolling Investigation check with advantage`);

    const roll = await actor.rollSkill({
      skill: "inv", // Investigation
      advantage: true, // Force advantage
      configure: false, // dnd5e v5.x: skip configuration dialog
      chatMessage: true,
      flavor: "👁️ Aether's Detection — Investigation (Advantage)",
      midiOptions: {
        skipRollDialog: true, // midi-qol: skip midi's dialog
      },
    });

    console.log(`Elysium | Detection check rolled:`, roll?.total);

    return {
      success: true,
      total: roll?.total,
      roll,
    };
  } catch (error) {
    console.error(`Elysium | Failed to roll Detection check:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
}
